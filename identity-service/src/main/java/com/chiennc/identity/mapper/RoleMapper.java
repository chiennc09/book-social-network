package com.chiennc.identity.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.chiennc.identity.dto.request.RoleRequest;
import com.chiennc.identity.dto.response.RoleResponse;
import com.chiennc.identity.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
