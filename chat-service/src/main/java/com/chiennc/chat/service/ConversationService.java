package com.chiennc.chat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.StringJoiner;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.chiennc.chat.dto.request.ConversationRequest;
import com.chiennc.chat.dto.response.ConversationResponse;
import com.chiennc.chat.entity.Conversation;
import com.chiennc.chat.entity.ParticipantInfo;
import com.chiennc.chat.exception.AppException;
import com.chiennc.chat.exception.ErrorCode;
import com.chiennc.chat.mapper.ConversationMapper;
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
public class ConversationService {
    ConversationRepository conversationRepository;
    ChatMessageRepository chatMessageRepository;
    ProfileClient profileClient;

    ConversationMapper conversationMapper;

    public List<ConversationResponse> myConversations() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = jwt.getClaim("userId");
        List<Conversation> conversations = conversationRepository.findAllByParticipantIdsContains(userId);

        return conversations.stream().map(this::toConversationResponse).toList();
    }

    public ConversationResponse create(ConversationRequest request) {
        // Fetch user infos
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = jwt.getClaim("userId");
        var userInfoResponse = profileClient.getProfile(userId);
        var participantInfoResponse =
                profileClient.getProfile(request.getParticipantIds().getFirst());

        if (Objects.isNull(userInfoResponse) || Objects.isNull(participantInfoResponse)) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        var userInfo = userInfoResponse.getResult();
        var participantInfo = participantInfoResponse.getResult();

        List<String> userIds = new ArrayList<>();
        userIds.add(userId);
        userIds.add(participantInfo.getUserId());

        var sortedIds = userIds.stream().sorted().toList();
        String userIdHash = generateParticipantHash(sortedIds);

        var conversation = conversationRepository
                .findByParticipantsHash(userIdHash)
                .orElseGet(() -> {
                    List<ParticipantInfo> participantInfos = List.of(
                            ParticipantInfo.builder()
                                    .userId(userInfo.getUserId())
                                    .username(userInfo.getUsername())
                                    .firstName(userInfo.getFirstName())
                                    .lastName(userInfo.getLastName())
                                    .avatar(userInfo.getAvatar())
                                    .displayName(userInfo.getDisplayName())
                                    .badges(userInfo.getBadges())
                                    .build(),
                            ParticipantInfo.builder()
                                    .userId(participantInfo.getUserId())
                                    .username(participantInfo.getUsername())
                                    .firstName(participantInfo.getFirstName())
                                    .lastName(participantInfo.getLastName())
                                    .avatar(participantInfo.getAvatar())
                                    .displayName(participantInfo.getDisplayName())
                                    .badges(participantInfo.getBadges())
                                    .build());

                    // Build conversation info
                    Conversation newConversation = Conversation.builder()
                            .type(request.getType())
                            .participantsHash(userIdHash)
                            .createdDate(Instant.now())
                            .modifiedDate(Instant.now())
                            .participants(participantInfos)
                            .build();

                    return conversationRepository.save(newConversation);
                });

        return toConversationResponse(conversation);
    }

    private String generateParticipantHash(List<String> ids) {
        StringJoiner stringJoiner = new StringJoiner("_");
        ids.forEach(stringJoiner::add);

        // SHA 256

        return stringJoiner.toString();
    }

    private ConversationResponse toConversationResponse(Conversation conversation) {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentUserId = jwt.getClaim("userId");

        ConversationResponse conversationResponse = conversationMapper.toConversationResponse(conversation);

        conversation.getParticipants().stream()
                .filter(participantInfo -> !participantInfo.getUserId().equals(currentUserId))
                .findFirst()
                .ifPresent(participantInfo -> {
                    String displayName = participantInfo.getDisplayName() != null
                            ? participantInfo.getDisplayName()
                            : participantInfo.getUsername();
                    String avatar = participantInfo.getAvatar();

                    try {
                        var profileRes = profileClient.getProfile(participantInfo.getUserId());
                        if (profileRes != null && profileRes.getResult() != null) {
                            var result = profileRes.getResult();
                            displayName =
                                    result.getDisplayName() != null ? result.getDisplayName() : result.getUsername();
                            avatar = result.getAvatar();
                        }
                    } catch (Exception e) {
                        log.warn(
                                "Failed to fetch fresh profile for user {} in conversation mapping",
                                participantInfo.getUserId(),
                                e);
                    }

                    conversationResponse.setConversationName(displayName);
                    conversationResponse.setConversationAvatar(avatar);
                });

        // Attach last message preview
        chatMessageRepository
                .findFirstByConversationIdOrderByCreatedDateDesc(conversation.getId())
                .ifPresent(lastMsg -> conversationResponse.setLastMessage(lastMsg.getMessage()));

        return conversationResponse;
    }
}
