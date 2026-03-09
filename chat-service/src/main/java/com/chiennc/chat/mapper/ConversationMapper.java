package com.chiennc.chat.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import com.chiennc.chat.dto.response.ConversationResponse;
import com.chiennc.chat.entity.Conversation;

@Mapper(componentModel = "spring")
public interface ConversationMapper {
    ConversationResponse toConversationResponse(Conversation conversation);

    List<ConversationResponse> toConversationResponseList(List<Conversation> conversations);
}
