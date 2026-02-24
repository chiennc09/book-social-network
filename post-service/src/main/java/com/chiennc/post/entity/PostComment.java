package com.chiennc.post.entity;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Getter
@Setter
@Builder
@Document(value = "post_comment")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostComment {
    @MongoId
    String id;
    String postId;
    String userId;
    String username;
    String content;
    String parentId;
    long replyCount;
    Instant createdDate;
    Instant modifiedDate;
}
