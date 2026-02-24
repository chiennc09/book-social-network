package com.chiennc.book.entity;

import com.chiennc.book.constant.ReadStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "read_history")
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReadHistory {
    @Id
    String id;
    String userId;
    String bookId;

    String lastPosition; // Có thể là số trang (PDF) hoặc CFI (EPUB)
    double progressPercent;
    LocalDateTime lastReadAt;

    @Field("status")
    ReadStatus status; // Trạng thái tủ sách

    LocalDateTime completedAt; // Thời điểm đọc xong (để tính huy hiệu theo thời gian)
}
