package com.chiennc.profile.controller;

import com.chiennc.profile.dto.request.ProfileCreationRequest;
import com.chiennc.profile.dto.response.UserProfileResponse;
import com.chiennc.profile.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService userProfileService;

    @PostMapping("/users")
    UserProfileResponse createProfile(@RequestBody ProfileCreationRequest request){

        return userProfileService.createProfile(request);
    }

    @GetMapping("/users")
    List<UserProfileResponse> getAllProfiles() {
        return userProfileService.getAllProfiles();
    }

    @GetMapping("/users/{profileId}")
    UserProfileResponse getProfile(@PathVariable String profileId) {

        return userProfileService.getProfile(profileId);
    }


}
