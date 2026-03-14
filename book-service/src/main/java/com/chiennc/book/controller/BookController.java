package com.chiennc.book.controller;

import com.chiennc.book.constant.ReadStatus;
import com.chiennc.book.dto.ApiResponse;
import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.request.ReviewRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.dto.response.ReviewResponse;
import com.chiennc.book.service.BookService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookController {
    BookService bookService;

    // 1. Quản lý sách
    @PostMapping("/create")
    ApiResponse<BookResponse> create(@RequestBody BookRequest request) {
        return ApiResponse.<BookResponse>builder().result(bookService.createBook(request)).build();
    }

    @PutMapping("/{id}")
    ApiResponse<BookResponse> update(@PathVariable String id, @RequestBody BookRequest request) {
        return ApiResponse.<BookResponse>builder().result(bookService.updateBook(id, request)).build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable String id) {
        bookService.delete(id);
        return ApiResponse.<Void>builder().message("Book deleted successfully").build();
    }

    @GetMapping("/search")
    ApiResponse<List<BookResponse>> search(@RequestParam String q) {
        return ApiResponse.<List<BookResponse>>builder().result(bookService.search(q)).build();
    }

    /**
     * Public endpoint — no auth required.
     * Returns top-N trending books by view count over the last `days` days.
     *
     * @param days  look-back window in days (default 7, max 365)
     * @param limit max number of books to return (default 10, max 50)
     */
    @GetMapping("/trending")
    ApiResponse<List<BookResponse>> getTrending(
            @RequestParam(defaultValue = "3")  int days,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<List<BookResponse>>builder()
                .result(bookService.getTrendingBooks(days, limit))
                .build();
    }

    @GetMapping("/{id}")
    ApiResponse<BookResponse> getById(@PathVariable String id) {
        return ApiResponse.<BookResponse>builder().result(bookService.getById(id)).build();
    }

    // 2. Upload file PDF/EPUB và Cover (Now expects URLs from file-service)
    @PostMapping("/{id}/upload")
    ApiResponse<BookResponse> upload(@PathVariable String id,
                               @RequestParam(required = false) String coverUrl,
                               @RequestParam(required = false) String pdfUrl,
                               @RequestParam(required = false) String epubUrl) {
        bookService.uploadFiles(id, coverUrl, pdfUrl, epubUrl);

        return ApiResponse.<BookResponse>builder().result(bookService.getById(id)).build();
    }

    // 3. Chức năng Đọc sách (Trả về link file + Lịch sử đọc cũ)
    @GetMapping("/{id}/read")
    ApiResponse<BookResponse> readBook(@PathVariable String id) {
        return ApiResponse.<BookResponse>builder()
                .result(bookService.getBookToRead(id))
                .build();
    }
    // 4. Lưu tiến trình đọc (Gọi lên khi User lật trang)
    @PostMapping("/{id}/progress")
    ApiResponse<Void> updateProgress(@PathVariable String id,
                                     @RequestParam String position,
                                     @RequestParam double percent) {
        bookService.updateProgress(id, position, percent);
        return ApiResponse.<Void>builder().message("Progress saved").build();
    }
    // API 1: Quản lý tủ sách (Thêm/Sửa trạng thái)
    @PutMapping("/{id}/shelf")
    ApiResponse<String> updateShelf(@PathVariable String id, @RequestParam ReadStatus status) {
        bookService.updateShelfStatus(id, status);
        return ApiResponse.<String>builder().message("Shelf updated").build();
    }

    // API 2: Lấy sách theo trạng thái (Đang đọc/Đã đọc/Muốn đọc)
    @GetMapping("/shelf")
    ApiResponse<List<BookResponse>> getBookshelf(@RequestParam ReadStatus status) {
        return ApiResponse.<List<BookResponse>>builder()
                .result(bookService.getBookshelf(status))
                .build();
    }

    // --- FAVORITES & REVIEWS ---
    @PostMapping("/{id}/favorite")
    ApiResponse<Void> favoriteBook(@PathVariable String id) {
        bookService.favoriteBook(id);
        return ApiResponse.<Void>builder().message("Book favorited").build();
    }

    @DeleteMapping("/{id}/favorite")
    ApiResponse<Void> unfavoriteBook(@PathVariable String id) {
        bookService.unfavoriteBook(id);
        return ApiResponse.<Void>builder().message("Book unfavorited").build();
    }

    @PostMapping("/{id}/review")
    ApiResponse<Void> addReview(@PathVariable String id, @RequestBody ReviewRequest request) {
        bookService.addReview(id, request);
        return ApiResponse.<Void>builder().message("Review added").build();
    }

    @GetMapping("/{id}/reviews")
    ApiResponse<List<ReviewResponse>> getReviews(@PathVariable String id) {
        return ApiResponse.<List<ReviewResponse>>builder()
                .result(bookService.getReviews(id))
                .build();
    }

}