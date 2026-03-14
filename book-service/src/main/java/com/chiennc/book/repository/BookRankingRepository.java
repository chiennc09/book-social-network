package com.chiennc.book.repository;

import com.chiennc.book.entity.BookRanking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface BookRankingRepository extends MongoRepository<BookRanking, String> {
    Optional<BookRanking> findFirstByBookIdAndDate(String bookId, LocalDate date);
}