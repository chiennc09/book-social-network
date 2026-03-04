package com.chiennc.post.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostResponse {
    String id;
    String content;
    String userId;
    String username;
    String userDisplayName;
    String userAvatar;
    java.util.Set<com.chiennc.post.entity.Badge> userBadges;
    String bookId;
    Boolean isRepost;
    String originalPostId;
    long likeCount;
    long commentCount;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isLiked")
    boolean isLiked;
    String created;
    Instant createdDate;
    Instant modifiedDate;
}
