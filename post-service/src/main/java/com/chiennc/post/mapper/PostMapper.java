package com.chiennc.post.mapper;

import com.chiennc.post.dto.response.PostResponse;
import com.chiennc.post.entity.Post;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PostMapper {
    PostResponse toPostResponse(Post post);
}
