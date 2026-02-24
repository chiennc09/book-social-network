package com.chiennc.post.mapper;

import com.chiennc.post.dto.response.CommentResponse;
import com.chiennc.post.entity.PostComment;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CommentMapper {
    CommentResponse toCommentResponse(PostComment postComment);
}
