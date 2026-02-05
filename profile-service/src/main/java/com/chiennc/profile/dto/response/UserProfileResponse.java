package com.chiennc.profile.dto.response;

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
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String city;
    private String avatar;
    private String bio;
    private String readingLevel;

    // Thêm các trường thống kê [cite: 8, 9, 10]
    private long booksReadCount;
    private long postCount;
    private long followerCount;
    private long friendCount;
}
