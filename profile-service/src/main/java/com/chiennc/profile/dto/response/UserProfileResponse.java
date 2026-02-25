package com.chiennc.profile.dto.response;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    // Badges
    private java.util.Set<com.chiennc.profile.entity.Badge> badges;
    private Long totalBooksRead;
}
