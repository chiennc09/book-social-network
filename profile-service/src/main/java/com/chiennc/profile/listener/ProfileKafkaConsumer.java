package com.chiennc.profile.listener;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.chiennc.event.dto.BookCompletedEvent;
import com.chiennc.profile.service.BadgeService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProfileKafkaConsumer {
    private final BadgeService badgeService;

    @KafkaListener(topics = "book-completed", groupId = "profile-group")
    public void listenBookCompleted(BookCompletedEvent event) {
        log.info("Received BookCompletedEvent for user: {}", event.getUserId());
        try {
            badgeService.checkAndAwardBadges(event.getUserId());
        } catch (Exception e) {
            log.error("Error processing badge award", e);
            // Có thể implement retry logic (Dead Letter Queue) nếu muốn xịn
        }
    }
}
