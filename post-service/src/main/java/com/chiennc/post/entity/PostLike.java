package com.chiennc.post.entity;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Getter
@Setter
@Builder
@Document(value = "post_like")
@CompoundIndex(name = "postid_userid_idx", def = "{'postId': 1, 'userId': 1}", unique = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostLike {
    @MongoId
    String id;
    String postId;
    String userId;
    Instant createdDate;
}
