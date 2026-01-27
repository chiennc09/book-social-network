package com.chiennc.book.service;

import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.entity.Book;
import com.chiennc.book.mapper.BookMapper;
import com.chiennc.book.repository.BookRepository;
import com.chiennc.book.exception.AppException;
import com.chiennc.book.exception.ErrorCode;
import com.chiennc.book.repository.httpclient.ExternalBookClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookService {
    BookRepository bookRepository;
    BookMapper bookMapper;
    ExternalBookClient externalBookClient;

    public List<BookResponse> searchBooks(String query) {
        // 1. Tìm trong DB nội bộ
        List<Book> localBooks = bookRepository.findByTitleContainingIgnoreCase(query);

        List<Book> finalBooks;
        if (localBooks.isEmpty()) {
            log.info("Fetching from external for query: {}", query);
            // 2. Kéo từ Google Books
            List<BookRequest> externalRequests = externalBookClient.searchExternal(query);

            // 3. Chuyển đổi và Lưu vào DB
            finalBooks = externalRequests.stream()
                    .map(request -> {
                        Book book = bookMapper.toBook(request);
                        return bookRepository.save(book);
                    })
                    .toList();
        } else {
            finalBooks = localBooks;
        }

        // 4. Logic ưu tiên Tiếng Việt: Sắp xếp lại danh sách
        return finalBooks.stream()
                .sorted((b1, b2) -> {
                    boolean isVi1 = "vi".equalsIgnoreCase(b1.getLanguage());
                    boolean isVi2 = "vi".equalsIgnoreCase(b2.getLanguage());
                    if (isVi1 && !isVi2) return -1; // b1 lên đầu
                    if (!isVi1 && isVi2) return 1;  // b2 lên đầu
                    return 0;
                })
                .map(bookMapper::toBookResponse)
                .toList();
    }

    public BookResponse getBookDetails(String id) {
        return bookRepository.findById(id)
                .map(bookMapper::toBookResponse)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
    }
}
