package com.chiennc.event.dto; // (Package tương ứng ở mỗi service)

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCompletedEvent {
    private String userId;
    private String bookId;
    private LocalDateTime completedAt;
}