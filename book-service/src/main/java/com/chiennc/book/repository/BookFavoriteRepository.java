package com.chiennc.book.repository;

import com.chiennc.book.entity.BookFavorite;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookFavoriteRepository extends MongoRepository<BookFavorite, String> {
    Optional<BookFavorite> findByUserIdAndBookId(String userId, String bookId);
    void deleteByUserIdAndBookId(String userId, String bookId);
    boolean existsByUserIdAndBookId(String userId, String bookId);
}
