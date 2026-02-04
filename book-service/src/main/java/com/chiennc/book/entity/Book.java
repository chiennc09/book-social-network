package com.chiennc.book.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "books")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Book {
    @Id
    String id;
    String title;
    List<String> authors;
    String description;
    String category;
    String coverImage;

    // Đường dẫn file thực tế trong server
    String pdfPath;
    String epubPath;

    boolean isPublic;
    String ownerId;

    @Builder.Default
    int totalViews = 0;
    int totalPages;
    double averageRating;
}
