package com.chiennc.book.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "book_reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookReview {
    @Id
    String id;
    String userId;
    String bookId;
    int rating; // e.g., 1 to 5
    String content;
    @Builder.Default
    int likes = 0;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
