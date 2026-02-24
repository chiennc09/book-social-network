package com.chiennc.event.dto; // (Package tương ứng ở mỗi service)

import java.time.LocalDateTime;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCompletedEvent {
    private String userId;
    private String bookId;
    private LocalDateTime completedAt;
}
