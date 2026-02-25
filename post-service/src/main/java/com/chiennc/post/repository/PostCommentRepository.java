package com.chiennc.post.repository;

import com.chiennc.post.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostCommentRepository extends MongoRepository<PostComment, String> {
    Page<PostComment> findByPostIdAndParentIdIsNull(String postId, Pageable pageable);
    Page<PostComment> findByParentId(String parentId, Pageable pageable);
    long countByPostId(String postId);
    long countByParentId(String parentId);
    void deleteByPostId(String id);
}
