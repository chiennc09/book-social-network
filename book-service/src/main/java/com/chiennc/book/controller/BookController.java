package com.chiennc.book.controller;

import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.service.BookService;
import com.chiennc.book.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookController {
    BookService bookService;

    @GetMapping("/search")
    ApiResponse<List<BookResponse>> search(@RequestParam String q) {
        return ApiResponse.<List<BookResponse>>builder()
                .result(bookService.searchBooks(q))
                .build();
    }

    @GetMapping("/{id}/read")
    ApiResponse<BookResponse> readBook(@PathVariable String id) {
        // Trả về dữ liệu bao gồm contentUrl hoặc chapters để frontend hiển thị viewer
        return ApiResponse.<BookResponse>builder()
                .result(bookService.getBookDetails(id))
                .build();
    }
}
