package com.chiennc.profile.service;

import java.util.List;
import java.util.Set;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.chiennc.profile.dto.request.ProfileCreationRequest;
import com.chiennc.profile.dto.response.UserProfileResponse;
import com.chiennc.profile.entity.Badge;
import com.chiennc.profile.entity.UserProfile;
import com.chiennc.profile.exception.AppException;
import com.chiennc.profile.exception.ErrorCode;
import com.chiennc.profile.mapper.UserProfileMapper;
import com.chiennc.profile.repository.UserProfileRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RequiredArgsConstructor
@Slf4j
@Service
public class UserProfileService {
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;

    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        UserProfile userProfile = userProfileMapper.toUserProfile(request);

        userProfile = userProfileRepository.save(userProfile);

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UserProfileResponse> getAllProfiles() {
        var profiles = userProfileRepository.findAll();

        return profiles.stream().map(userProfileMapper::toUserProfileResponse).toList();
    }

    public UserProfileResponse getByUserId(String targetUserId) {
        UserProfile userProfile = userProfileRepository
                .findByUserId(targetUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        UserProfileResponse response = userProfileMapper.toUserProfileResponse(userProfile);

        // Hydrate counts
        response.setFollowerCount(userProfileRepository.countFollowers(targetUserId));
        response.setFriendCount(userProfileRepository.countFriends(targetUserId));

        // Evaluate relationship context if authenticated
        try {
            String myUserId = getUserIdByToken();
            if (myUserId != null && !myUserId.equals(targetUserId)) {
                if (userProfileRepository.checkFriend(myUserId, targetUserId)) {
                    response.setRelationship("FRIEND");
                } else if (userProfileRepository.checkIncomingRequest(myUserId, targetUserId)) {
                    response.setRelationship("PENDING_INCOMING");
                } else if (userProfileRepository.checkOutgoingRequest(myUserId, targetUserId)) {
                    response.setRelationship("PENDING_OUTGOING");
                } else {
                    response.setRelationship("NONE");
                }
            } else {
                response.setRelationship("SELF");
            }
        } catch (Exception e) {
            response.setRelationship("NONE");
        }

        return response;
    }

    public UserProfileResponse getMyProfile() {
        var userId = getUserIdByToken();
        var profile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        UserProfileResponse response = userProfileMapper.toUserProfileResponse(profile);

        // Nạp thống kê từ Repository [cite: 7, 10]
        response.setFollowerCount(userProfileRepository.countFollowers(userId));
        response.setFriendCount(userProfileRepository.countFriends(userId));

        response.setPostCount(0);
        response.setBooksReadCount(0);

        return response;
    }

    public UserProfileResponse updateMyProfile(com.chiennc.profile.dto.request.ProfileUpdateRequest request) {
        var userId = getUserIdByToken();
        var profile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (request.getBio() != null) profile.setBio(request.getBio());
        // if (request.getLink() != null) profile.setLink(request.getLink());
        if (request.getAvatar() != null) profile.setAvatar(request.getAvatar());
        // if (request.getIsPrivate() != null) profile.setIsPrivate(request.getIsPrivate());

        profile = userProfileRepository.save(profile);
        return userProfileMapper.toUserProfileResponse(profile);
    }

    /* ================= FOLLOW ================= */

    public void follow(String toUserId) {
        userProfileRepository.followUser(getUserIdByToken(), toUserId);
    }

    public void unfollow(String toUserId) {
        userProfileRepository.unfollowUser(getUserIdByToken(), toUserId);
    }

    /* ================= FRIEND ================= */

    public void sendFriendRequest(String toUserId) {
        userProfileRepository.sendFriendRequest(getUserIdByToken(), toUserId);
    }

    //    public void cancelFriendRequest(String toUserId) {
    //        userProfileRepository.cancelFriendRequest(getUserIdByToken(), toUserId);
    //    }

    public void acceptFriend(String toUserId) {
        userProfileRepository.acceptFriend(getUserIdByToken(), toUserId);
    }

    public void removeFriend(String toUserId) {
        userProfileRepository.removeFriend(getUserIdByToken(), toUserId);
    }

    public List<UserProfileResponse> getIncomingRequests() {
        String userId = getUserIdByToken();
        return userProfileRepository.getIncomingFriendRequests(userId).stream()
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    public List<UserProfileResponse> getOutgoingRequests() {
        String userId = getUserIdByToken();
        return userProfileRepository.getOutgoingFriendRequests(userId).stream()
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    /* ================= COUNT ================= */

    public Long countFollowers(String userId) {
        return userProfileRepository.countFollowers(userId);
    }

    public Long countFollowing(String userId) {
        return userProfileRepository.countFollowing(userId);
    }

    public Long countFriends(String userId) {
        return userProfileRepository.countFriends(userId);
    }

    private String getUserIdByToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userId = jwt.getClaim("userId");
        return userId;
    }

    public Set<Badge> getBadgesByUserId(String userId) {
        UserProfile user = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Trả về tập danh sách huy hiệu
        return user.getBadges();
    }

    public List<String> getFriendIds(String userId) {
        return userProfileRepository.getFriendIds(userId);
    }

    public List<UserProfileResponse> getFriends() {
        String userId = getUserIdByToken();
        return userProfileRepository.getFriends(userId).stream()
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    public List<UserProfileResponse> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        return userProfileRepository.searchUsers(query.trim()).stream()
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    /* ================= LEADERBOARD ================= */
    public List<UserProfileResponse> getLeaderboard(int limit) {
        List<UserProfile> topUsers = userProfileRepository.getLeaderboard(limit);
        return topUsers.stream().map(userProfileMapper::toUserProfileResponse).toList();
    }
}
