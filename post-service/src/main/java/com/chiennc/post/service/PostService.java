package com.chiennc.post.service;

import com.chiennc.post.dto.PageResponse;
import com.chiennc.post.dto.request.PostRequest;
import com.chiennc.post.dto.response.PostResponse;
import com.chiennc.post.dto.response.UserProfileResponse;
import com.chiennc.post.entity.Post;
import com.chiennc.post.mapper.PostMapper;
import com.chiennc.post.repository.PostRepository;
import com.chiennc.post.repository.PostCommentRepository;
import com.chiennc.post.repository.PostLikeRepository;
import com.chiennc.post.repository.httpclient.ProfileClient;
import com.chiennc.post.dto.request.CommentRequest;
import com.chiennc.post.dto.response.CommentResponse;
import com.chiennc.post.entity.PostLike;
import com.chiennc.post.entity.PostComment;
import com.chiennc.post.mapper.CommentMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.ArrayList;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PostService {
    PostRepository postRepository;
    PostLikeRepository postLikeRepository;
    PostCommentRepository postCommentRepository;
    PostMapper postMapper;
    CommentMapper commentMapper;
    DateTimeFormatter dateTimeFormatter;
    ProfileClient profileClient;

    public PostResponse createPost(PostRequest request){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Post post = Post.builder()
                .content(request.getContent())
                .bookId(request.getBookId())
                .isRepost(request.getIsRepost())
                .originalPostId(request.getOriginalPostId())
                .userId(getUserIdByToken())
                .username(authentication.getName())
                .createdDate(Instant.now())
                .modifiedDate(Instant.now())
                .build();

        post = postRepository.save(post);
        return postMapper.toPostResponse(post);
    }

    public PageResponse<PostResponse> getMyPosts(int page, int size){
        UserProfileResponse userProfile = null;

        try {
            userProfile = profileClient.getProfile(getUserIdByToken()).getResult();
        } catch (Exception e) {
            log.error("Error while getting user profile", e);
        }
        /// lấy theo ngày mới nhất
        Sort sort = Sort.by("createdDate").descending();

        /// Pageable bắt đầu từ 0
        Pageable pageable = PageRequest.of(page - 1, size, sort);

        var pageData = postRepository.findAllByUserId(getUserIdByToken(), pageable);

        String username = userProfile != null ? userProfile.getUsername() : null;
        String userAvatar = userProfile != null ? userProfile.getAvatar() : null;

        var postList = pageData.getContent().stream().map(post -> enrichPostResponse(post, username, userAvatar)).toList();

        return PageResponse.<PostResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(postList)
                .build();
    }

    public PageResponse<PostResponse> getUserPosts(String userId, int page, int size) {
        Sort sort = Sort.by("createdDate").descending();
        Pageable pageable = PageRequest.of(page - 1, size, sort);
        var pageData = postRepository.findAllByUserId(userId, pageable);

        var postList = pageData.getContent().stream()
                .map(post -> enrichPostResponse(post, null, null))
                .toList();

        return PageResponse.<PostResponse>builder()
                .currentPage(page)
                .totalPages(pageData.getTotalPages())
                .pageSize(pageData.getSize())
                .totalElements(pageData.getTotalElements())
                .data(postList)
                .build();
    }

    private PostResponse enrichPostResponse(Post post, String username, String userAvatar) {
        PostResponse response = postMapper.toPostResponse(post);
        response.setCreated(dateTimeFormatter.format(post.getCreatedDate()));
        if (username != null) {
            response.setUsername(username);
        }
        if (userAvatar != null) {
            response.setUserAvatar(userAvatar);
        } else {
            // fallback if not provided directly
            try {
                UserProfileResponse profile = profileClient.getProfile(post.getUserId()).getResult();
                if(profile != null) {
                    response.setUsername(profile.getUsername());
                    response.setUserDisplayName(profile.getDisplayName());
                    response.setUserAvatar(profile.getAvatar());
                    response.setUserBadges(profile.getBadges());
                }    
            } catch(Exception e) {
                log.warn("Could not fetch profile for user {}", post.getUserId());
            }
        }
        
        response.setLikeCount(postLikeRepository.countByPostId(post.getId()));
        response.setCommentCount(postCommentRepository.countByPostId(post.getId()));
        response.setLiked(postLikeRepository.existsByPostIdAndUserId(post.getId(), getUserIdByToken()));
        return response;
    }

    public PageResponse<PostResponse> getAllPosts(int page, int size) {
        Sort sort = Sort.by("createdDate").descending();
        Pageable pageable = PageRequest.of(page - 1, size, sort);
        var pageData = postRepository.findAll(pageable);

        var postList = pageData.getContent().stream().map(post -> enrichPostResponse(post, null, null)).toList();

        return PageResponse.<PostResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(postList)
                .build();
    }

    public PageResponse<PostResponse> getFeed(int page, int size) {
        String currentUserId = getUserIdByToken();
        List<String> userIds = new ArrayList<>();
        userIds.add(currentUserId);

        try {
            var friendsResult = profileClient.getFriendIds(currentUserId).getResult();
            if (friendsResult != null) {
                userIds.addAll(friendsResult);
            }
        } catch (Exception e) {
            log.error("Error while getting friend ids", e);
        }

        Sort sort = Sort.by("createdDate").descending();
        Pageable pageable = PageRequest.of(page - 1, size, sort);
        var pageData = postRepository.findByUserIdIn(userIds, pageable);

        var postList = pageData.getContent().stream().map(post -> enrichPostResponse(post, post.getUsername(), null)).toList();

        return PageResponse.<PostResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(postList)
                .build();
    }

    public void likePost(String postId) {
        String userId = getUserIdByToken();
        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new RuntimeException("Post already liked");
        }
        PostLike postLike = PostLike.builder()
                .postId(postId)
                .userId(userId)
                .createdDate(Instant.now())
                .build();
        postLikeRepository.save(postLike);
    }

    public void unlikePost(String postId) {
        String userId = getUserIdByToken();
        if (!postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new RuntimeException("Post not liked");
        }
        postLikeRepository.deleteByPostIdAndUserId(postId, userId);
    }

    public void deletePost(String postId) {
        String userId = getUserIdByToken();
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        if (!post.getUserId().equals(userId)) {
            throw new RuntimeException("You are not authorized to delete this post");
        }
        
        postCommentRepository.deleteByPostId(postId);
        postLikeRepository.deleteByPostId(postId);
        postRepository.deleteById(postId);
    }

    public CommentResponse addComment(String postId, CommentRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        PostComment comment = PostComment.builder()
                .postId(postId)
                .userId(getUserIdByToken())
                .username(authentication.getName())
                .content(request.getContent())
                .parentId(request.getParentId())
                .createdDate(Instant.now())
                .modifiedDate(Instant.now())
                .build();
        comment = postCommentRepository.save(comment);
        CommentResponse response = commentMapper.toCommentResponse(comment);
        response.setCreated(dateTimeFormatter.format(comment.getCreatedDate()));
        
        try {
            UserProfileResponse profile = profileClient.getProfile(comment.getUserId()).getResult();
            if (profile != null) {
                response.setUserAvatar(profile.getAvatar());
                response.setUsername(profile.getUsername());
                response.setUserDisplayName(profile.getDisplayName());
                response.setUserBadges(profile.getBadges());
            }
        } catch(Exception e) {
            log.warn("Could not fetch profile for new comment user {}", comment.getUserId());
        }
        
        return response;
    }

    public PageResponse<CommentResponse> getComments(String postId, int page, int size) {
        Sort sort = Sort.by("createdDate").ascending();
        Pageable pageable = PageRequest.of(page - 1, size, sort);
        var pageData = postCommentRepository.findByPostIdAndParentIdIsNull(postId, pageable);

        var commentList = pageData.getContent().stream().map(comment -> {
            CommentResponse response = commentMapper.toCommentResponse(comment);
            response.setCreated(dateTimeFormatter.format(comment.getCreatedDate()));
            response.setReplyCount(postCommentRepository.countByParentId(comment.getId()));
            
            try {
                UserProfileResponse profile = profileClient.getProfile(comment.getUserId()).getResult();
                if (profile != null) {
                    response.setUserAvatar(profile.getAvatar());
                    response.setUsername(profile.getUsername());
                    response.setUserDisplayName(profile.getDisplayName());
                    response.setUserBadges(profile.getBadges());
                }
            } catch(Exception e) {
                log.warn("Could not fetch profile for comment user {}", comment.getUserId());
            }
            
            return response;
        }).toList();

        return PageResponse.<CommentResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(commentList)
                .build();
    }

    public PageResponse<CommentResponse> getReplies(String commentId, int page, int size) {
        Sort sort = Sort.by("createdDate").ascending();
        Pageable pageable = PageRequest.of(page - 1, size, sort);
        var pageData = postCommentRepository.findByParentId(commentId, pageable);

        var commentList = pageData.getContent().stream().map(comment -> {
            CommentResponse response = commentMapper.toCommentResponse(comment);
            response.setCreated(dateTimeFormatter.format(comment.getCreatedDate()));
            response.setReplyCount(postCommentRepository.countByParentId(comment.getId()));
            
            try {
                UserProfileResponse profile = profileClient.getProfile(comment.getUserId()).getResult();
                if (profile != null) {
                    response.setUserAvatar(profile.getAvatar());
                    response.setUsername(profile.getUsername());
                    response.setUserDisplayName(profile.getDisplayName());
                    response.setUserBadges(profile.getBadges());
                }
            } catch(Exception e) {
                log.warn("Could not fetch profile for reply user {}", comment.getUserId());
            }

            return response;
        }).toList();

        return PageResponse.<CommentResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(commentList)
                .build();
    }

    public PostResponse updatePost(String postId, PostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        String currentUserId = getUserIdByToken();
        if (!post.getUserId().equals(currentUserId)) {
            throw new RuntimeException("You are not authorized to update this post");
        }

        if (request.getContent() != null) {
            post.setContent(request.getContent());
        }
        if (request.getBookId() != null) {
            post.setBookId(request.getBookId());
        }
        post.setModifiedDate(Instant.now());

        post = postRepository.save(post);
        return enrichPostResponse(post, post.getUsername(), null);
    }

    public String getUserIdByToken(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userId = jwt.getClaim("userId");
        return userId;
    }
}
