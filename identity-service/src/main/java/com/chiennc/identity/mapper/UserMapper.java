package com.chiennc.identity.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.chiennc.identity.dto.request.UserCreationRequest;
import com.chiennc.identity.dto.request.UserUpdateRequest;
import com.chiennc.identity.dto.response.UserResponse;
import com.chiennc.identity.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(UserCreationRequest request);

    UserResponse toUserResponse(User user);

    @Mapping(target = "roles", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
