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
    String categoryId;
    String coverImage;
    String pdfPath;
    String epubPath;
    @com.fasterxml.jackson.annotation.JsonProperty("isPublic")
    Boolean isPublic;
    int totalPages;
}
