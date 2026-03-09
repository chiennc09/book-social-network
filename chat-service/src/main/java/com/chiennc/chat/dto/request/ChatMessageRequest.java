package com.chiennc.chat.dto.request;

import jakarta.validation.constraints.NotBlank;

import com.chiennc.chat.entity.BookAttachment;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageRequest {
    @NotBlank
    String conversationId;

    String message;

    BookAttachment bookAttachment;
}
