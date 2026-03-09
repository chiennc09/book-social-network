package com.chiennc.chat.dto.response;

import java.time.Instant;

import com.chiennc.chat.entity.BookAttachment;
import com.chiennc.chat.entity.ParticipantInfo;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageResponse {
    String id;
    String conversationId;
    boolean me;
    String message;
    ParticipantInfo sender;
    Instant createdDate;
    BookAttachment bookAttachment;
}
