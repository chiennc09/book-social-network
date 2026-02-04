package com.chiennc.book.mapper;

import com.chiennc.book.dto.request.BookRequest;
import com.chiennc.book.dto.response.BookResponse;
import com.chiennc.book.entity.Book;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface BookMapper {
    Book toBook(BookRequest request);
    BookResponse toBookResponse(Book book);
    void updateBook(@MappingTarget Book book, BookRequest request);
}
