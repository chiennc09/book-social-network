package com.chiennc.book.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

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
    String language;
    int publishedYear;
    int totalPages;

    // Phần nội dung để đọc
    String contentUrl;      // Link file PDF/EPUB (Cloudinary/MinIO)
    String webReaderLink; // Link đọc online của Google (rất quan trọng)
    String downloadUrl;
    List<Chapter> chapters; // Hoặc lưu theo từng chương nếu là sách chữ
    boolean isPublic;
}
