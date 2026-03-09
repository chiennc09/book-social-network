package com.chiennc.chat.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookAttachment {
    String bookId;
    String title;
    String author;
    String coverUrl;
    Double ratingAverage;
}
