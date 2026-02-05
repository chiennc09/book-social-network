package com.chiennc.identity.repository.httpclient;

import com.chiennc.identity.configuration.AuthenticationRequestInterceptor;
import com.chiennc.identity.dto.request.ApiResponse;
import com.chiennc.identity.dto.request.ProfileCreationRequest;
import com.chiennc.identity.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "profile-service",
        url = "${app.services.profile}",
        configuration = { AuthenticationRequestInterceptor.class }) /// Inject config lấy token vào header
public interface ProfileClient {
    @PostMapping(value = "/internal/users", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request);
}
