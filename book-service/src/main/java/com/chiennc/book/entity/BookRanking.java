package com.chiennc.book.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "book_ranking")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookRanking {
    @Id
    String id;
    String bookId;
    LocalDate date; // Lưu ngày để truy vấn thống kê (Daily, Weekly)
    @Builder.Default
    int viewCount = 0;
}