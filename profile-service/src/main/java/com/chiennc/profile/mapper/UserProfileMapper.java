package com.chiennc.profile.mapper;

import org.mapstruct.Mapper;

import com.chiennc.profile.dto.request.ProfileCreationRequest;
import com.chiennc.profile.dto.response.UserProfileResponse;
import com.chiennc.profile.entity.UserProfile;

@Mapper(componentModel = "spring")
public interface UserProfileMapper {
    UserProfile toUserProfile(ProfileCreationRequest request);

    UserProfileResponse toUserProfileResponse(UserProfile entity);
}
