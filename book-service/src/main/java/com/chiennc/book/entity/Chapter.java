package com.chiennc.book.entity;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder
@Document(value = "chapter")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Chapter {
    String chapterId;
    String title;
    String content; // Nội dung chữ để đọc
}
