package com.chiennc.profile.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.annotation.PostConstruct;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chiennc.profile.entity.Badge;
import com.chiennc.profile.entity.UserProfile;
import com.chiennc.profile.repository.BadgeRepository;
import com.chiennc.profile.repository.UserProfileRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BadgeService {
    private final UserProfileRepository userProfileRepository;
    private final BadgeRepository badgeRepository;

    // Chạy 1 lần khi start app để tạo data mẫu
    @PostConstruct
    public void initBadges() {
        if (badgeRepository.count() == 0) {
            badgeRepository.save(Badge.builder()
                    .code("NEWBIE")
                    .name("Tập sự")
                    .description("Đọc cuốn sách đầu tiên")
                    .requiredBooks(1)
                    .build());
            badgeRepository.save(Badge.builder()
                    .code("BOOKWORM")
                    .name("Mọt sách")
                    .description("Đọc 5 cuốn sách")
                    .requiredBooks(5)
                    .build());
            badgeRepository.save(Badge.builder()
                    .code("SCHOLAR")
                    .name("Học giả")
                    .description("Đọc 15 cuốn sách")
                    .requiredBooks(15)
                    .build());
            badgeRepository.save(Badge.builder()
                    .code("MASTER")
                    .name("Đại sư")
                    .description("Đọc 30 cuốn sách")
                    .requiredBooks(30)
                    .build());
        }
    }

    // Hàm này được gọi khi BookService báo sang: "User này vừa đọc xong sách"
    @Transactional("transactionManager")
    public void checkAndAwardBadges(String userId) {
        UserProfile user =
                userProfileRepository.findByUserId(userId).orElseThrow(() -> new RuntimeException("User not found"));

        // 1. Tăng biến đếm
        long currentCount = (user.getTotalBooksRead() == null ? 0 : user.getTotalBooksRead()) + 1;
        user.setTotalBooksRead(currentCount);

        // 2. Lấy danh sách badge hiện có để so sánh
        if (user.getBadges() == null) user.setBadges(new HashSet<>());
        Set<String> existingBadges =
                user.getBadges().stream().map(Badge::getCode).collect(Collectors.toSet());

        // 3. Quét tất cả badge trong hệ thống
        List<Badge> allBadges = badgeRepository.findAll();
        boolean isNewBadgeEarned = false;

        for (Badge badge : allBadges) {
            if (!existingBadges.contains(badge.getCode()) && currentCount >= badge.getRequiredBooks()) {
                user.getBadges().add(badge);
                isNewBadgeEarned = true;
                log.info("User {} earned badge {}", userId, badge.getName());
                // TODO: Có thể bắn tiếp event "BADGE_EARNED" sang Notification Service để gửi mail chúc mừng!
            }
        }

        userProfileRepository.save(user);
    }

    public List<Badge> getAllBadges() {
        return badgeRepository.findAll();
    }

    //    public void initBadges() {
    //        if(badgeRepository.count() == 0) {
    //            badgeRepository.save(Badge.builder().code("NEWBIE").name("Người mới bắt
    // đầu").requiredBooks(1).build());
    //            badgeRepository.save(Badge.builder().code("BOOKWORM").name("Mọt sách").requiredBooks(10).build());
    //            badgeRepository.save(Badge.builder().code("LIBRARY_MASTER").name("Cao
    // thủ").requiredBooks(50).build());
    //        }
    //    }
}
