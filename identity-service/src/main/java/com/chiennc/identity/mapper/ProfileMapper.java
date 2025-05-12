package com.chiennc.identity.mapper;

import com.chiennc.identity.dto.request.ProfileCreationRequest;
import com.chiennc.identity.dto.request.UserCreationRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProfileMapper {
    ProfileCreationRequest toProfileCreationRequest(UserCreationRequest request);
}
