package com.chiennc.profile.controller;

import com.chiennc.profile.dto.ApiResponse;
import com.chiennc.profile.entity.Badge;
import com.chiennc.profile.service.BadgeService;
import com.chiennc.profile.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class BadgeController {
    private final BadgeService badgeService;
    private final UserProfileService userProfileService;

    // Lấy tất cả badge hệ thống (Trang Thử thách)
    @GetMapping("/badges")
    ApiResponse<List<Badge>> getAllBadges() {
        return ApiResponse.<List<Badge>>builder()
                .result(badgeService.getAllBadges())
                .build();
    }

    // Lấy badge của user cụ thể (Trang Profile)
    // Lưu ý: UserProfileResponse trong code cũ của bạn chưa có list Badge, cần thêm vào
    @GetMapping("/users/{userId}/badges")
    ApiResponse<Set<Badge>> getUserBadges(@PathVariable String userId) {
        // Cách nhanh nhất: Gọi repo lấy UserProfile rồi getBadges()
        // Hoặc refactor UserProfileResponse để trả về luôn trong API getProfile
        return ApiResponse.<Set<Badge>>builder()
                .result(userProfileService.getBadgesByUserId(userId))
                .build();
    }
}
