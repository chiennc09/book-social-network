package com.chiennc.chat.service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.chiennc.chat.dto.request.ChatMessageRequest;
import com.chiennc.chat.dto.response.ChatMessageResponse;
import com.chiennc.chat.entity.ChatMessage;
import com.chiennc.chat.entity.ParticipantInfo;
import com.chiennc.chat.exception.AppException;
import com.chiennc.chat.exception.ErrorCode;
import com.chiennc.chat.mapper.ChatMessageMapper;
import com.chiennc.chat.repository.ChatMessageRepository;
import com.chiennc.chat.repository.ConversationRepository;
import com.chiennc.chat.repository.httpclient.ProfileClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageService {
    ChatMessageRepository chatMessageRepository;
    ConversationRepository conversationRepository;
    ProfileClient profileClient;
    SimpMessagingTemplate messagingTemplate;

    ChatMessageMapper chatMessageMapper;

    public List<ChatMessageResponse> getMessages(String conversationId) {
        // Validate conversationId
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = jwt.getClaim("userId");
        conversationRepository
                .findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND))
                .getParticipants()
                .stream()
                .filter(participantInfo -> userId.equals(participantInfo.getUserId()))
                .findAny()
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        var messages = chatMessageRepository.findAllByConversationIdOrderByCreatedDateDesc(conversationId);

        return messages.stream().map(this::toChatMessageResponse).toList();
    }

    public ChatMessageResponse create(ChatMessageRequest request) {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = jwt.getClaim("userId");
        // Validate conversationId
        conversationRepository
                .findById(request.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND))
                .getParticipants()
                .stream()
                .filter(participantInfo -> userId.equals(participantInfo.getUserId()))
                .findAny()
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        // Get UserInfo from ProfileService
        var userResponse = profileClient.getProfile(userId);
        if (Objects.isNull(userResponse)) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        var userInfo = userResponse.getResult();

        // Build Chat message Info
        ChatMessage chatMessage = chatMessageMapper.toChatMessage(request);
        chatMessage.setSender(ParticipantInfo.builder()
                .userId(userInfo.getUserId())
                .username(userInfo.getUsername())
                .firstName(userInfo.getFirstName())
                .lastName(userInfo.getLastName())
                .avatar(userInfo.getAvatar())
                .displayName(userInfo.getDisplayName())
                .badges(userInfo.getBadges())
                .build());
        chatMessage.setCreatedDate(Instant.now());

        // Create chat message
        chatMessage = chatMessageRepository.save(chatMessage);

        // convert to Response
        ChatMessageResponse response = toChatMessageResponse(chatMessage);

        // Push realtime via WebSocket Topic
        messagingTemplate.convertAndSend("/topic/conversation/" + request.getConversationId(), response);

        return response;
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage chatMessage) {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = jwt.getClaim("userId");
        var chatMessageResponse = chatMessageMapper.toChatMessageResponse(chatMessage);

        chatMessageResponse.setMe(userId.equals(chatMessage.getSender().getUserId()));

        if (chatMessage.getSender() != null) {
            try {
                var profileRes =
                        profileClient.getProfile(chatMessage.getSender().getUserId());
                if (profileRes != null && profileRes.getResult() != null) {
                    var result = profileRes.getResult();
                    chatMessageResponse
                            .getSender()
                            .setDisplayName(
                                    result.getDisplayName() != null ? result.getDisplayName() : result.getUsername());
                    chatMessageResponse.getSender().setAvatar(result.getAvatar());
                }
            } catch (Exception e) {
                log.warn(
                        "Failed to fetch fresh sender profile for user {}",
                        chatMessage.getSender().getUserId());
            }
        }

        return chatMessageResponse;
    }
}
