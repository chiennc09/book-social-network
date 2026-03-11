package com.chiennc.book.controller;

import com.chiennc.book.dto.ApiResponse;
import com.chiennc.book.entity.Category;
import com.chiennc.book.service.CategoryService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CategoryController {
    CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<Category>> getAllCategories() {
        return ApiResponse.<List<Category>>builder().result(categoryService.getAllCategories()).build();
    }

    @PostMapping
    public ApiResponse<Category> createCategory(@RequestBody Category category) {
        return ApiResponse.<Category>builder().result(categoryService.createCategory(category)).build();
    }

    @PutMapping("/{id}")
    public ApiResponse<Category> updateCategory(@PathVariable String id, @RequestBody Category category) {
        return ApiResponse.<Category>builder().result(categoryService.updateCategory(id, category)).build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable String id) {
        categoryService.deleteCategory(id);
        return ApiResponse.<Void>builder().message("Category deleted successfully").build();
    }
}
