package com.chiennc.profile.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.chiennc.profile.dto.ApiResponse;
import com.chiennc.profile.dto.request.ProfileCreationRequest;
import com.chiennc.profile.dto.response.UserProfileResponse;
import com.chiennc.profile.service.UserProfileService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService userProfileService;

    @PostMapping("/users")
    ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileService.createProfile(request))
                .build();
    }

    @GetMapping("/users")
    ApiResponse<List<UserProfileResponse>> getAllProfiles() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userProfileService.getAllProfiles())
                .build();
    }

    @GetMapping("/users/{profileId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable String profileId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileService.getByUserId(profileId))
                .build();
    }

    @GetMapping("/users/my-profile")
    ApiResponse<UserProfileResponse> getMyProfile() {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileService.getMyProfile())
                .build();
    }

    /* ================= FOLLOW ================= */

    @PostMapping("/follow")
    public ApiResponse<?> follow(@RequestParam String toUserId) {
        userProfileService.follow(toUserId);
        return ApiResponse.builder().message("Follow success").build();
    }

    @DeleteMapping("/unfollow")
    public ApiResponse<?> unfollow(@RequestParam String toUserId) {
        userProfileService.unfollow(toUserId);
        return ApiResponse.builder().message("Unfollow success").build();
    }

    /* ================= FRIEND ================= */

    @PostMapping("/friend/request")
    public ApiResponse<?> sendFriendRequest(@RequestParam String toUserId) {
        userProfileService.sendFriendRequest(toUserId);
        return ApiResponse.builder().message("Friend request sent").build();
    }

    @PostMapping("/friend/accept")
    public ApiResponse<?> acceptFriend(@RequestParam String toUserId) {
        userProfileService.acceptFriend(toUserId);
        return ApiResponse.builder().message("Friend accepted").build();
    }

    @DeleteMapping("/friend/remove")
    public ApiResponse<?> removeFriend(@RequestParam String toUserId) {
        userProfileService.removeFriend(toUserId);
        return ApiResponse.builder().message("Friend removed").build();
    }

    @GetMapping("/friend/requests/incoming")
    public ApiResponse<List<UserProfileResponse>> getIncomingRequests() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userProfileService.getIncomingRequests())
                .build();
    }

    @GetMapping("/friend/requests/outgoing")
    public ApiResponse<List<UserProfileResponse>> getOutgoingRequests() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userProfileService.getOutgoingRequests())
                .build();
    }

    /* ================= COUNT ================= */

    @GetMapping("/{userId}/followers")
    public ApiResponse<?> countFollowers(@PathVariable String userId) {
        return ApiResponse.builder()
                .result(userProfileService.countFollowers(userId))
                .build();
    }

    @GetMapping("/{userId}/following")
    public ApiResponse<?> countFollowing(@PathVariable String userId) {
        return ApiResponse.builder()
                .result(userProfileService.countFollowing(userId))
                .build();
    }

    @GetMapping("/{userId}/friends")
    public ApiResponse<?> countFriends(@PathVariable String userId) {
        return ApiResponse.builder()
                .result(userProfileService.countFriends(userId))
                .build();
    }
}
