package com.chiennc.post.controller;

import com.chiennc.post.dto.ApiResponse;
import com.chiennc.post.dto.PageResponse;
import com.chiennc.post.dto.request.PostRequest;
import com.chiennc.post.dto.response.PostResponse;
import com.chiennc.post.service.PostService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PostController {
    PostService postService;

    @PostMapping("/create")
    ApiResponse<PostResponse> createPost(@RequestBody PostRequest request){
        return ApiResponse.<PostResponse>builder()
                .result(postService.createPost(request))
                .build();
    }

    @GetMapping("/my-posts")
    ApiResponse<PageResponse<PostResponse>> myPosts(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getMyPosts(page, size))
                .build();
    }

    @GetMapping("/all")
    ApiResponse<PageResponse<PostResponse>> getAllPosts(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getAllPosts(page, size))
                .build();
    }

    @GetMapping("/users/{userId}/posts")
    ApiResponse<PageResponse<PostResponse>> getUserPosts(
            @PathVariable String userId,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getUserPosts(userId, page, size))
                .build();
    }

    @GetMapping("/feed")
    ApiResponse<PageResponse<PostResponse>> getFeed(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getFeed(page, size))
                .build();
    }

    @PostMapping("/{postId}/like")
    ApiResponse<Void> likePost(@PathVariable String postId){
        postService.likePost(postId);
        return ApiResponse.<Void>builder().message("Post liked successfully").build();
    }

    @DeleteMapping("/{postId}")
    ApiResponse<Void> deletePost(@PathVariable String postId){
        postService.deletePost(postId);
        return ApiResponse.<Void>builder().message("Post deleted successfully").build();
    }

    @PutMapping("/{postId}")
    ApiResponse<PostResponse> updatePost(@PathVariable String postId, @RequestBody PostRequest request){
        return ApiResponse.<PostResponse>builder()
                .result(postService.updatePost(postId, request))
                .build();
    }

    @DeleteMapping("/{postId}/like")
    ApiResponse<Void> unlikePost(@PathVariable String postId){
        postService.unlikePost(postId);
        return ApiResponse.<Void>builder().message("Post unliked successfully").build();
    }

    @PostMapping("/{postId}/comments")
    ApiResponse<com.chiennc.post.dto.response.CommentResponse> addComment(
            @PathVariable String postId,
            @RequestBody com.chiennc.post.dto.request.CommentRequest request
    ){
        return ApiResponse.<com.chiennc.post.dto.response.CommentResponse>builder()
                .result(postService.addComment(postId, request))
                .build();
    }

    @GetMapping("/{postId}/comments")
    ApiResponse<PageResponse<com.chiennc.post.dto.response.CommentResponse>> getComments(
            @PathVariable String postId,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<com.chiennc.post.dto.response.CommentResponse>>builder()
                .result(postService.getComments(postId, page, size))
                .build();
    }

    @GetMapping("/{postId}/comments/{commentId}/replies")
    ApiResponse<PageResponse<com.chiennc.post.dto.response.CommentResponse>> getReplies(
            @PathVariable String postId,
            @PathVariable String commentId,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ){
        return ApiResponse.<PageResponse<com.chiennc.post.dto.response.CommentResponse>>builder()
                .result(postService.getReplies(commentId, page, size))
                .build();
    }
}