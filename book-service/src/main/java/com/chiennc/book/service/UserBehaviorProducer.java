package com.chiennc.book.service;

import com.chiennc.book.dto.event.UserBehaviorEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserBehaviorProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "user-behavior-events";

    public void sendBehaviorEvent(String userId, String bookId, String actionType, double value) {
        if (userId == null) {
            log.warn("Cannot send behavior event: userId is null");
            return;
        }

        UserBehaviorEvent event = UserBehaviorEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .userId(userId)
                .bookId(bookId)
                .actionType(actionType)
                .value(value)
                .timestamp(LocalDateTime.now())
                .build();

        log.info("Sending UserBehaviorEvent: {}", event);
        kafkaTemplate.send(TOPIC, event);
    }
}
