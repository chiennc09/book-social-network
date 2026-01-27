package com.chiennc.book.repository;

import com.chiennc.book.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends MongoRepository<Book, String> {
    // Tìm kiếm theo tên sách hoặc tác giả [cite: 31-33]
    List<Book> findByTitleContainingIgnoreCase(String title);
    List<Book> findByAuthorsContainingIgnoreCase(String author);
    List<Book> findByCategory(String category); // [cite: 34]
}
