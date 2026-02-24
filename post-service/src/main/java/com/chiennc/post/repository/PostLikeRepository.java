package com.chiennc.post.repository;

import com.chiennc.post.entity.PostLike;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends MongoRepository<PostLike, String> {
    Optional<PostLike> findByPostIdAndUserId(String postId, String userId);
    void deleteByPostIdAndUserId(String postId, String userId);
    long countByPostId(String postId);
    boolean existsByPostIdAndUserId(String postId, String userId);
}
