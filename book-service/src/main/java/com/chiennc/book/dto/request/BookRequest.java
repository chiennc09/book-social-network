package com.chiennc.book.dto.request;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookRequest {
    String title;
    List<String> authors;
    String description;
    String category;
    String coverImage;
    String language;
    int publishedYear;
    int totalPages;
    String content;
}
