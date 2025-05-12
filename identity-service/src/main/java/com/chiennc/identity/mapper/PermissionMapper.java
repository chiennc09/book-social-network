package com.chiennc.identity.mapper;

import org.mapstruct.Mapper;

import com.chiennc.identity.dto.request.PermissionRequest;
import com.chiennc.identity.dto.response.PermissionResponse;
import com.chiennc.identity.entity.Permission;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
