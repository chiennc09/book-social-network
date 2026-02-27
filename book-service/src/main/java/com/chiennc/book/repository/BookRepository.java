package com.chiennc.book.repository;

import com.chiennc.book.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.Query;

@Repository
public interface BookRepository extends MongoRepository<Book, String> {
    @Query("{ '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'authors': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Book> searchByRegex(String regex);
}
