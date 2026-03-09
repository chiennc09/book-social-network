package com.chiennc.chat.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    String id;
    String userId;
    String username;
    String firstName;
    String lastName;
    String avatar;
    String displayName;
    java.util.Set<com.chiennc.chat.entity.Badge> badges;
}
