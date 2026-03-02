package com.chiennc.book.dto.response;

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
public class BookResponse {
    String id;
    String title;
    List<String> authors;
    String description;
    String category;
    String coverImage;
    String pdfPath;
    String epubPath;
    boolean isPublic;
    int totalViews;
    int totalPages;
    double averageRating;
    //  2 trường này để phục vụ chức năng Resume Reading
    String lastPosition;
    double progressPercent;
    
    // Yêu thích & Đánh giá
    int ratingCount;
    int totalFavorites;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isFavorited")
    boolean isFavorited;
    
    int userRating;
}
