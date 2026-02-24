package com.chiennc.profile.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.chiennc.profile.dto.ApiResponse;
import com.chiennc.profile.dto.request.ProfileCreationRequest;
import com.chiennc.profile.dto.response.UserProfileResponse;
import com.chiennc.profile.service.BadgeService;
import com.chiennc.profile.service.UserProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InternalUserProfileController {
    UserProfileService userProfileService;
    BadgeService badgeService;

    @PostMapping("/internal/users")
    ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileService.createProfile(request))
                .build();
    }

    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable String userId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileService.getByUserId(userId))
                .build();
    }

    @PostMapping("/internal/users/{userId}/increment-book-count")
    ApiResponse<Void> incrementBookCount(@PathVariable String userId) {
        badgeService.checkAndAwardBadges(userId);
        return ApiResponse.<Void>builder().message("Updated").build();
    }

    @GetMapping("/internal/users/{userId}/friends")
    ApiResponse<java.util.List<String>> getFriendIds(@PathVariable String userId) {
        return ApiResponse.<java.util.List<String>>builder()
                .result(userProfileService.getFriendIds(userId))
                .build();
    }
}
