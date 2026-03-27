package com.chiennc.book.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.List;

/**
 * Kafka event published to 'book-events' topic whenever a book is
 * created, updated, or deleted. The recommendation-service consumes
 * this event and keeps its Qdrant vector index up to date.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookIndexEvent {

    /** BOOK_CREATED | BOOK_UPDATED | BOOK_DELETED */
    String eventType;

    BookData book;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BookData {
        String id;
        String title;
        String description;
        List<String> authors;
        /** Raw category ID — kept for traceability. */
        String categoryId;
        /** Resolved human-readable category name used for embedding. */
        String categoryName;
    }
}
