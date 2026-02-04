package com.chiennc.book.controller;

import com.chiennc.book.dto.ApiResponse;
import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.service.BookService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    // 2. Upload file PDF/EPUB và Cover
    @PostMapping("/{id}/upload")
    ApiResponse<String> upload(@PathVariable String id,
                               @RequestParam(required = false) MultipartFile cover,
                               @RequestParam(required = false) MultipartFile pdf,
                               @RequestParam(required = false) MultipartFile epub) {
        bookService.uploadFiles(id, cover, pdf, epub);
        return ApiResponse.<String>builder().result("Files uploaded successfully").build();
    }

    // 3. Chức năng Đọc sách (Trả về link file + Lịch sử đọc cũ)
    @GetMapping("/{id}/read")
    ApiResponse<BookResponse> readBook(@PathVariable String id) {
        // Lưu ý: Trong thực tế userId sẽ lấy từ JWT token (SecurityContextHolder)
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
}