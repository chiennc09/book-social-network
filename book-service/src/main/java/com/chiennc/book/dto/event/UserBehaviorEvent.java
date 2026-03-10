package com.chiennc.book.dto.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserBehaviorEvent {
    String eventId;
    String userId;
    String bookId;
    String actionType; // FAVORITE, RATING, ADD_BOOKSHELF, SEARCH_CLICK, VIEW, READ_TIME
    double value;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    LocalDateTime timestamp;
}
