package com.chiennc.book.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewResponse {
    private String id;
    private String content;
    private String userId;
    private String username;
    private String userDisplayName;
    private String userAvatar;
    private java.util.Set<com.chiennc.book.entity.Badge> userBadges;
    private Integer rating;
    private int likes;
    LocalDateTime createdAt;
}
