package com.chiennc.chat.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import com.chiennc.chat.dto.request.ChatMessageRequest;
import com.chiennc.chat.dto.response.ChatMessageResponse;
import com.chiennc.chat.entity.ChatMessage;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {
    ChatMessageResponse toChatMessageResponse(ChatMessage chatMessage);

    ChatMessage toChatMessage(ChatMessageRequest request);

    List<ChatMessageResponse> toChatMessageResponses(List<ChatMessage> chatMessages);
}
