package com.chiennc.book.controller;

import com.chiennc.book.dto.ApiResponse;
import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.service.BookService;
import com.chiennc.book.service.FileStorageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookController {
    BookService bookService;
    FileStorageService fileStorageService;

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
        return ApiResponse.<BookResponse>builder()
                .result(bookService.getBookToRead(id))
                .build();
    }
    @GetMapping("/files/{subDir}/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String subDir, @PathVariable String filename, HttpServletRequest request) {
        Resource resource = fileStorageService.load(filename, subDir);

        // Tự động xác định Content Type (PDF, Image, etc.)
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // fallback
        }
        if(contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
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