package com.chiennc.book.service;

import com.chiennc.book.dto.event.BookIndexEvent;
import com.chiennc.book.entity.Book;
import com.chiennc.book.entity.Category;
import com.chiennc.book.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Publishes book lifecycle events to the 'book-events' Kafka topic.
 *
 * <p>Called fire-and-forget from BookService so it never blocks a client request.
 * The recommendation-service consumes these events to keep its Qdrant vector
 * index in sync.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookEventProducer {

    private static final String TOPIC = "book-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final CategoryRepository categoryRepository;

    /**
     * Publish a BOOK_CREATED or BOOK_UPDATED event.
     * The category name is resolved here so the Python consumer doesn't need a DB call.
     */
    @Async
    public void publishBookUpserted(Book book, String eventType) {
        try {
            String categoryName = resolveCategoryName(book.getCategoryId());

            BookIndexEvent event = BookIndexEvent.builder()
                    .eventType(eventType)
                    .book(BookIndexEvent.BookData.builder()
                            .id(book.getId())
                            .title(book.getTitle())
                            .description(book.getDescription())
                            .authors(book.getAuthors())
                            .categoryId(book.getCategoryId())
                            .categoryName(categoryName)
                            .build())
                    .build();

            kafkaTemplate.send(TOPIC, book.getId(), event);
            log.info("Published {} event for book '{}'", eventType, book.getId());
        } catch (Exception e) {
            log.error("Failed to publish {} event for book '{}': {}", eventType, book.getId(), e.getMessage());
        }
    }

    /**
     * Publish a BOOK_DELETED event.
     * Only the book ID is needed for deletion.
     */
    @Async
    public void publishBookDeleted(String bookId) {
        try {
            BookIndexEvent event = BookIndexEvent.builder()
                    .eventType("BOOK_DELETED")
                    .book(BookIndexEvent.BookData.builder()
                            .id(bookId)
                            .build())
                    .build();

            kafkaTemplate.send(TOPIC, bookId, event);
            log.info("Published BOOK_DELETED event for book '{}'", bookId);
        } catch (Exception e) {
            log.error("Failed to publish BOOK_DELETED event for book '{}': {}", bookId, e.getMessage());
        }
    }

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------

    private String resolveCategoryName(String categoryId) {
        if (categoryId == null || categoryId.isBlank()) {
            return "";
        }
        return categoryRepository.findById(categoryId)
                .map(Category::getName)
                .orElse("");
    }
}
