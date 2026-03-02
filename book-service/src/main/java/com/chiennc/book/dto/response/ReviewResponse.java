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
    String id;
    int rating;
    String content;
    int likes;
    LocalDateTime createdAt;
    
    // User Info to hydrate
    ReviewUser user;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewUser {
        String displayName;
        String avatar;
    }
}
