package com.chiennc.book.service;

import com.chiennc.book.constant.ReadStatus;
import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.entity.Book;
import com.chiennc.book.entity.BookRanking;
import com.chiennc.book.entity.ReadHistory;
import com.chiennc.book.mapper.BookMapper;
import com.chiennc.book.repository.BookRankingRepository;
import com.chiennc.book.repository.BookRepository;
import com.chiennc.book.exception.AppException;
import com.chiennc.book.exception.ErrorCode;
//import com.chiennc.book.repository.httpclient.ExternalBookClient;
import com.chiennc.book.repository.ReadHistoryRepository;
import com.chiennc.event.dto.BookCompletedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookService {
    BookRepository bookRepository;
    ReadHistoryRepository historyRepository;
    BookMapper bookMapper;
    FileStorageService fileStorageService;
    BookRankingRepository rankingRepository;
    KafkaTemplate<String, Object> kafkaTemplate;
    // CONSTANT: Topic name
    private static final String BOOK_COMPLETED_TOPIC = "book-completed";

    public BookResponse createBook(BookRequest request) {
        Book book = bookMapper.toBook(request);
        return bookMapper.toBookResponse(bookRepository.save(book));
    }

    public BookResponse updateBook(String id, BookRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
        bookMapper.updateBook(book, request);
        return bookMapper.toBookResponse(bookRepository.save(book));
    }

    public void uploadFiles(String id, MultipartFile cover, MultipartFile pdf, MultipartFile epub) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        if (cover != null) book.setCoverImage(fileStorageService.save(cover, "covers"));
        if (pdf != null) book.setPdfPath(fileStorageService.save(pdf, "pdfs"));
        if (epub != null) book.setEpubPath(fileStorageService.save(epub, "epubs"));

        bookRepository.save(book);
    }

    public List<BookResponse> search(String q) {
        return bookRepository.findByTitleContainingIgnoreCaseOrAuthorsContainingIgnoreCase(q, q).stream()
                .map(bookMapper::toBookResponse).toList();
    }

    public void delete(String id) {
        bookRepository.deleteById(id);
    }

    public BookResponse getById(String id) {
        return bookRepository.findById(id)
                .map(bookMapper::toBookResponse)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
    }

    public BookResponse getBookToRead(String bookId) {
        String userId = getUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        // Map sang response
        BookResponse response = bookMapper.toBookResponse(book);

        // QUAN TRỌNG: Chuyển tên file thành URL đầy đủ để Frontend gọi
        if (book.getPdfPath() != null) {
            String pdfUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/files/pdfs/")
                    .path(book.getPdfPath())
                    .toUriString();
            response.setPdfPath(pdfUrl);
        }

        if (book.getCoverImage() != null) {
            String coverUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/files/covers/")
                    .path(book.getCoverImage())
                    .toUriString();
            response.setCoverImage(coverUrl);
        }

        if (book.getEpubPath() != null) {
            String epubUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/files/epubs/")
                    .path(book.getEpubPath())
                    .toUriString();
            response.setEpubPath(epubUrl);
        }

        // Lấy lịch sử đọc cũ (nếu có)
        historyRepository.findByUserIdAndBookId(userId, bookId).ifPresent(history -> {
            response.setLastPosition(history.getLastPosition());
            response.setProgressPercent(history.getProgressPercent());
        });

        // Tăng view tổng của sách mỗi khi mở đọc
        book.setTotalViews(book.getTotalViews() + 1);
        bookRepository.save(book);

        // Ghi nhận vào bảng xếp hạng ngày
        increaseRankingCount(bookId);

        return response;
    }

//    // API cho client gọi lên khi lật trang/đọc tiếp
//    public void updateProgress(String bookId, String position, double percent) {
//        String userId = getUserId();
//
//        ReadHistory history = historyRepository.findByUserIdAndBookId(userId, bookId)
//                .orElse(ReadHistory.builder().userId(userId).bookId(bookId).build());
//
//        history.setLastPosition(position);
//        history.setProgressPercent(percent);
//        history.setLastReadAt(LocalDateTime.now());
//        historyRepository.save(history);
//
//        // (Tương lai) Chỗ này có thể trigger event update ReadingGoal (số trang đã đọc)
//    }

    // Logic Ranking: Tự động tạo bản ghi mới cho ngày hôm nay nếu chưa có
    private void increaseRankingCount(String bookId) {
        LocalDate today = LocalDate.now();
        BookRanking ranking = rankingRepository.findByBookIdAndDate(bookId, today)
                .orElse(BookRanking.builder().bookId(bookId).date(today).build());

        ranking.setViewCount(ranking.getViewCount() + 1);
        rankingRepository.save(ranking);
    }

    /// 1. API: Thêm vào tủ / Đổi trạng thái (Manual)
    public void updateShelfStatus(String bookId, ReadStatus status) {
        String userId = getUserId();
        ReadHistory history = historyRepository.findByUserIdAndBookId(userId, bookId)
                .orElse(ReadHistory.builder().userId(userId).bookId(bookId).build());

        // Logic logic: Nếu chuyển sang READ thì coi như xong 100%
        if (status == ReadStatus.READ) {
            history.setProgressPercent(100.0);
            history.setCompletedAt(LocalDateTime.now());

            // Bắn event Kafka
            kafkaTemplate.send(BOOK_COMPLETED_TOPIC, new BookCompletedEvent(userId, bookId, LocalDateTime.now()));
        }

        history.setStatus(status);
        historyRepository.save(history);
    }

    // 2. Refactor: Update Progress (Auto logic)
    public void updateProgress(String bookId, String position, double percent) {
        String userId = getUserId();
        ReadHistory history = historyRepository.findByUserIdAndBookId(userId, bookId)
                .orElse(ReadHistory.builder()
                        .userId(userId)
                        .bookId(bookId)
                        .status(ReadStatus.READING) // Mặc định là đang đọc
                        .build());

        // Logic check lùi:
        // Nếu user đã ĐỌC XONG (READ) mà mở lại trang cũ -> Không update trạng thái về READING, chỉ update position để lần sau mở lại đúng chỗ đó.
        if (history.getStatus() == ReadStatus.READ) {
            history.setLastPosition(position);
            historyRepository.save(history);
            return;
        }

        history.setLastPosition(position);
        history.setProgressPercent(percent);
        history.setLastReadAt(LocalDateTime.now());

        // Logic hoàn thành tự động: > 95% coi như xong
        if (percent >= 95.0) {
            history.setStatus(ReadStatus.READ);
            history.setCompletedAt(LocalDateTime.now());
            history.setProgressPercent(100.0); // Làm tròn 100%

            // Bắn event Kafka sang Profile Service
            kafkaTemplate.send(BOOK_COMPLETED_TOPIC, new BookCompletedEvent(userId, bookId, LocalDateTime.now()));
        } else {
            // Đảm bảo trạng thái là READING nếu chưa xong
            if (history.getStatus() == null || history.getStatus() == ReadStatus.WANT_TO_READ) {
                history.setStatus(ReadStatus.READING);
            }
        }

        historyRepository.save(history);
    }

    // 3. API: Lấy tủ sách
    public List<BookResponse> getBookshelf(ReadStatus status) {
        String userId = getUserId();
        // Cần viết thêm method này trong Interface ReadHistoryRepository
        List<ReadHistory> histories = historyRepository.findAllByUserIdAndStatus(userId, status);

        return histories.stream().map(h -> {
            // Lấy thông tin sách gốc
            var bookParams = bookRepository.findById(h.getBookId()).orElseThrow();
            var response = bookMapper.toBookResponse(bookParams);

            // Override thông tin cá nhân hóa
            response.setLastPosition(h.getLastPosition());
            response.setProgressPercent(h.getProgressPercent());
            return response;
        }).toList();
    }

    private String getUserId() {
        String userId = ((JwtAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication())
                .getToken()
                .getClaim("userId");
        return userId;
    }
}
