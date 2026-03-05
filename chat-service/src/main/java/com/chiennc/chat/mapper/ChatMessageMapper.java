package com.chiennc.chat.mapper;

import com.chiennc.chat.dto.request.ChatMessageRequest;
import com.chiennc.chat.dto.response.ChatMessageResponse;
import com.chiennc.chat.entity.ChatMessage;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {
    ChatMessageResponse toChatMessageResponse(ChatMessage chatMessage);

    ChatMessage toChatMessage(ChatMessageRequest request);

    List<ChatMessageResponse> toChatMessageResponses(List<ChatMessage> chatMessages);
}
