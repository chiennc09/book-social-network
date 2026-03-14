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
import com.chiennc.book.exception.ErrorCode;
import com.chiennc.book.entity.BookFavorite;
import com.chiennc.book.entity.BookReview;
import com.chiennc.book.dto.request.ReviewRequest;
import com.chiennc.book.dto.response.ReviewResponse;
import com.chiennc.book.dto.response.UserProfileResponse;
import com.chiennc.book.exception.ErrorCode;
import com.chiennc.book.utils.TextUtils;
import com.chiennc.book.repository.httpclient.ProfileClient;
import com.chiennc.book.repository.BookReviewRepository;
import com.chiennc.book.repository.CategoryRepository;
import com.chiennc.book.repository.BookFavoriteRepository;
import com.chiennc.book.repository.ReadHistoryRepository;
import com.chiennc.event.dto.BookCompletedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
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
    BookRankingRepository rankingRepository;
    BookFavoriteRepository bookFavoriteRepository;
    BookReviewRepository bookReviewRepository;
    CategoryRepository categoryRepository;
    BookMapper bookMapper;
    ProfileClient profileClient;
    KafkaTemplate<String, Object> kafkaTemplate;
    UserBehaviorProducer userBehaviorProducer;
    MongoTemplate mongoTemplate;
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

    public void uploadFiles(String id, String coverUrl, String pdfUrl, String epubUrl) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        if (coverUrl != null) book.setCoverImage(coverUrl);
        if (pdfUrl != null) book.setPdfPath(pdfUrl);
        if (epubUrl != null) book.setEpubPath(epubUrl);

        bookRepository.save(book);
    }

    public List<BookResponse> search(String q) {
        String regex = TextUtils.toFuzzyRegex(q);
        return bookRepository.searchByRegex(regex).stream()
                .map(this::enrichBookResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Trending books: top N books by total views in the last `days` days.
     * Uses the BookRanking daily counter that is incremented every time a user opens a book.
     * If no ranking data exists yet (e.g. fresh DB), falls back to most-viewed books
     * from the books collection directly (totalViews field).
     *
     * Performance note: The aggregation runs entirely inside MongoDB ($match → $group → $sort → $limit),
     * so only the top-N bookIds are transferred over the wire before resolving to BookResponse.
     */
    public List<BookResponse> getTrendingBooks(int days, int limit) {
        // Clamp inputs to sane boundaries
        days  = Math.max(1, Math.min(days, 365));
        limit = Math.max(1, Math.min(limit, 50));

        LocalDate from = LocalDate.now().minusDays(days);
        LocalDate to   = LocalDate.now();

        List<BookRankingRepository.BookViewAggResult> ranked =
                rankingRepository.findTopBooksByDateRange(from, to, limit);

        if (ranked.isEmpty()) {
            // Fallback: no ranking data yet — return globally most-viewed books
            return bookRepository.findAll(
                    org.springframework.data.domain.PageRequest.of(0, limit,
                            org.springframework.data.domain.Sort.by(
                                    org.springframework.data.domain.Sort.Direction.DESC, "totalViews")))
                    .getContent().stream()
                    .map(this::enrichBookResponsePublic)
                    .collect(java.util.stream.Collectors.toList());
        }

        // Resolve bookId → BookResponse (skip deleted books silently)
        return ranked.stream()
                .map(r -> bookRepository.findById(r.getId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(this::enrichBookResponsePublic)
                .collect(java.util.stream.Collectors.toList());
    }

    public void delete(String id) {
        bookRepository.deleteById(id);
    }

    public BookResponse getById(String id) {
        BookResponse response = bookRepository.findById(id)
                .map(this::enrichBookResponse)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        return response;
    }

    private BookResponse enrichBookResponse(Book book) {
        BookResponse response = bookMapper.toBookResponse(book);
        if (book.getCategoryId() != null) {
            categoryRepository.findById(book.getCategoryId()).ifPresent(response::setCategory);
        }
        try {
            String userId = getUserId(); // current logged in user
            if (userId != null) {
                response.setFavorited(bookFavoriteRepository.existsByUserIdAndBookId(userId, book.getId()));
                bookReviewRepository.findByUserIdAndBookId(userId, book.getId())
                        .ifPresent(review -> response.setUserRating(review.getRating()));
            }
        } catch (Exception e) {
            // Unauthenticated or error parsing token, just ignore
        }
        return response;
    }

    /**
     * Lightweight enrichment for public/unauthenticated endpoints (e.g. /trending).
     * Skips user-specific personalization (isFavorited, userRating) to avoid
     * requiring a JWT and to reduce latency on high-traffic public calls.
     */
    private BookResponse enrichBookResponsePublic(Book book) {
        BookResponse response = bookMapper.toBookResponse(book);
        if (book.getCategoryId() != null) {
            categoryRepository.findById(book.getCategoryId()).ifPresent(response::setCategory);
        }
        return response;
    }

    @NonFinal
    @Value("${app.base-url}")
    String baseUrl;

    public BookResponse getBookToRead(String bookId) {
        String userId = getUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        // Map sang response
        BookResponse response = bookMapper.toBookResponse(book);
        if (book.getCategoryId() != null) {
            categoryRepository.findById(book.getCategoryId()).ifPresent(response::setCategory);
        }

        // QUAN TRỌNG: Chuyển tên file thành URL đầy đủ để Frontend gọi
        if (book.getPdfPath() != null) {
            if (book.getPdfPath().startsWith("http")) {
                response.setPdfPath(book.getPdfPath());
            } else {
                response.setPdfPath("http://10.0.2.2:8888/file/legacy/pdfs/" + book.getPdfPath());
            }
        }

        if (book.getCoverImage() != null) {
            if (book.getCoverImage().startsWith("http")) {
                response.setCoverImage(book.getCoverImage());
            } else {
                response.setCoverImage("http://10.0.2.2:8888/file/legacy/covers/" + book.getCoverImage());
            }
        }

        if (book.getEpubPath() != null) {
            if (book.getEpubPath().startsWith("http")) {
                response.setEpubPath(book.getEpubPath());
            } else {
                response.setEpubPath("http://10.0.2.2:8888/file/legacy/epubs/" + book.getEpubPath());
            }
        }

        // Lấy lịch sử đọc cũ (nếu có)
        historyRepository.findFirstByUserIdAndBookIdOrderByLastReadAtDesc(userId, bookId).ifPresent(history -> {
            response.setLastPosition(history.getLastPosition());
            response.setProgressPercent(history.getProgressPercent());
        });

        // Tăng view tổng của sách mỗi khi mở đọc
        book.setTotalViews(book.getTotalViews() + 1);
        bookRepository.save(book);

        // Lấy lịch sử yêu thích
        response.setFavorited(bookFavoriteRepository.existsByUserIdAndBookId(userId, bookId));
        
        // Lấy lịch sử đánh giá
        bookReviewRepository.findByUserIdAndBookId(userId, bookId).ifPresent(review -> {
            response.setUserRating(review.getRating());
        });

        // Ghi nhận vào bảng xếp hạng ngày
        increaseRankingCount(bookId);

        // Bắn event hành vi VIEW
        userBehaviorProducer.sendBehaviorEvent(userId, bookId, "VIEW", 1.0);

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
        Query query = new Query(Criteria.where("bookId").is(bookId).and("date").is(today));
        Update update = new Update().inc("viewCount", 1);
        mongoTemplate.upsert(query, update, BookRanking.class);
    }

    /// 1. API: Thêm vào tủ / Đổi trạng thái (Manual)
    public void updateShelfStatus(String bookId, ReadStatus status) {
        String userId = getUserId();
        ReadHistory history = historyRepository.findFirstByUserIdAndBookIdOrderByLastReadAtDesc(userId, bookId)
                .orElse(ReadHistory.builder().userId(userId).bookId(bookId).build());

        // Logic logic: Nếu chuyển sang READ thì coi như xong 100%
        if (status == ReadStatus.READ) {
            history.setProgressPercent(100.0);
            history.setCompletedAt(LocalDateTime.now());

            // Bắn event Kafka
            kafkaTemplate.send(BOOK_COMPLETED_TOPIC, new BookCompletedEvent(userId, bookId, LocalDateTime.now()));
        }

        // Bắn event hành vi ADD_BOOKSHELF
        userBehaviorProducer.sendBehaviorEvent(userId, bookId, "ADD_BOOKSHELF", 4.0);

        history.setStatus(status);
        historyRepository.save(history);
    }

    // 2. Refactor: Update Progress (Auto logic)
    public void updateProgress(String bookId, String position, double percent) {
        String userId = getUserId();
        ReadHistory history = historyRepository.findFirstByUserIdAndBookIdOrderByLastReadAtDesc(userId, bookId)
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
            if (bookParams.getCategoryId() != null) {
                categoryRepository.findById(bookParams.getCategoryId()).ifPresent(response::setCategory);
            }

            // Override thông tin cá nhân hóa
            response.setLastPosition(h.getLastPosition());
            response.setProgressPercent(h.getProgressPercent());
            
            // Override thông tin rating nếu có
            bookReviewRepository.findByUserIdAndBookId(userId, h.getBookId())
                    .ifPresent(review -> response.setUserRating(review.getRating()));

            return response;
        }).collect(java.util.stream.Collectors.toList());
    }

    // --- NEW LOGIC: FAVORITES & REVIEWS ---
    public void favoriteBook(String bookId) {
        String userId = getUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        if (bookFavoriteRepository.existsByUserIdAndBookId(userId, bookId)) {
            throw new AppException(ErrorCode.BOOK_NOT_FOUND); // Dùng code tạm hoặc code mới, ở đây throw thay vì return để đảm bảo frontend bắt lội
        }

        bookFavoriteRepository.save(BookFavorite.builder()
                .userId(userId)
                .bookId(bookId)
                .createdAt(LocalDateTime.now())
                .build());
        
        book.setTotalFavorites(book.getTotalFavorites() + 1);
        bookRepository.save(book);

        // Bắn event hành vi FAVORITE
        userBehaviorProducer.sendBehaviorEvent(userId, bookId, "FAVORITE", 5.0);
    }

    public void unfavoriteBook(String bookId) {
        String userId = getUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        if (!bookFavoriteRepository.existsByUserIdAndBookId(userId, bookId)) {
            throw new AppException(ErrorCode.BOOK_NOT_FOUND);
        }

        bookFavoriteRepository.deleteByUserIdAndBookId(userId, bookId);
        book.setTotalFavorites(Math.max(0, book.getTotalFavorites() - 1));
        bookRepository.save(book);
    }

    public void addReview(String bookId, ReviewRequest request) {
        String userId = getUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        BookReview review = bookReviewRepository.findByUserIdAndBookId(userId, bookId)
                .orElse(BookReview.builder()
                        .userId(userId)
                        .bookId(bookId)
                        .createdAt(LocalDateTime.now())
                        .build());

        // Update rating and content
        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review.setUpdatedAt(LocalDateTime.now());
        bookReviewRepository.save(review);

        // Recalculate average (Approximate fast way or query all)
        // Here we'll do an exact recalculation to be safe
        List<BookReview> allReviews = bookReviewRepository.findByBookIdOrderByCreatedAtDesc(bookId);
        double totalScore = allReviews.stream().mapToInt(BookReview::getRating).sum();
        book.setRatingCount(allReviews.size());
        book.setAverageRating(allReviews.size() > 0 ? totalScore / allReviews.size() : 0);
        
        bookRepository.save(book);

        // Bắn event hành vi RATING
        userBehaviorProducer.sendBehaviorEvent(userId, bookId, "RATING", (double) request.getRating());
    }

    public List<ReviewResponse> getReviews(String bookId) {
        List<BookReview> reviews = bookReviewRepository.findByBookIdOrderByCreatedAtDesc(bookId);
        
        return reviews.stream().map(review -> {
            ReviewResponse response = ReviewResponse.builder()
                    .id(review.getId())
                    .rating(review.getRating())
                    .content(review.getContent())
                    .likes(review.getLikes())
                    .createdAt(review.getCreatedAt())
                    .build();

            try {
                var userResponse = profileClient.getProfile(review.getUserId());
                if (userResponse != null && userResponse.getResult() != null) {
                    UserProfileResponse profile = userResponse.getResult();
                    String displayName = profile.getDisplayName();
                    
                    response.setUserDisplayName(displayName != null && !displayName.trim().isEmpty() ? displayName.trim() : profile.getUsername());
                    response.setUsername(profile.getUsername());
                    response.setUserAvatar(profile.getAvatar());
                    response.setUserBadges(profile.getBadges());
                    response.setUserId(profile.getId());
                }
            } catch (Exception e) {
                 response.setUserDisplayName("Người dùng ẩn danh");
            }
            return response;
        }).collect(java.util.stream.Collectors.toList());
    }

    private String getUserId() {
        String userId = ((JwtAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication())
                .getToken()
                .getClaim("userId");
        return userId;
    }
}
