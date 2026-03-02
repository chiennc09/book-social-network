package com.chiennc.book.repository;

import com.chiennc.book.entity.BookReview;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookReviewRepository extends MongoRepository<BookReview, String> {
    List<BookReview> findByBookIdOrderByCreatedAtDesc(String bookId);
    Optional<BookReview> findByUserIdAndBookId(String userId, String bookId);
}
