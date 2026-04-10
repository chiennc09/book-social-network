package com.chiennc.book.repository;

import com.chiennc.book.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends MongoRepository<Book, String> {

    @Query("{ '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'authors': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Book> searchByRegex(String regex);

    /** Fetch all books in a given category, sorted by totalViews desc. */
    List<Book> findByCategoryIdOrderByTotalViewsDesc(String categoryId);
}
