package com.chiennc.book.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "reading_goal")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReadingGoal {
    @Id
    String id;
    String userId;
    String goalType; // "BOOKS" hoặc "PAGES"
    String timeFrame; // "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
    int goalAmount;
    @Builder.Default
    int currentProgress = 0;
    LocalDateTime startDate;
    LocalDateTime endDate;
}