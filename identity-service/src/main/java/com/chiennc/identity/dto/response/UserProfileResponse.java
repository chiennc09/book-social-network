package com.chiennc.identity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private String id;
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String city;
}
