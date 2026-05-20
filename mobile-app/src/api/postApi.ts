import axiosClient from './axiosClient';
import { Post } from '../types';
import { SERVICE_PATHS } from '../config/env';

export interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  data: T[];
}

const BASE_URL = SERVICE_PATHS.post;

export const postApi = {
  createPost: (data: { content: string; bookId?: string; isRepost?: boolean; originalPostId?: string }) => {
    return axiosClient.post(`${BASE_URL}/create`, data);
  },

  updatePost: (postId: string, data: { content: string; bookId?: string }) => {
    return axiosClient.put(`${BASE_URL}/${postId}`, data);
  },

  getMyPosts: (page: number = 1, size: number = 10) => {
    return axiosClient.get<any, { result: PageResponse<Post> }>(`${BASE_URL}/my-posts`, {
        params: { page, size }
    });
  },

  getUserPosts: (userId: string, page: number = 1, size: number = 10) => {
    return axiosClient.get<any, { result: PageResponse<Post> }>(`${BASE_URL}/users/${userId}/posts`, {
        params: { page, size }
    });
  },

  getAllPosts: (page: number = 1, size: number = 10) => {
    return axiosClient.get<any, { result: PageResponse<Post> }>(`${BASE_URL}/all`, {
        params: { page, size }
    });
  },

  getFeed: (page: number = 1, size: number = 10) => {
    return axiosClient.get<any, { result: PageResponse<Post> }>(`${BASE_URL}/feed`, {
        params: { page, size }
    });
  },

  likePost: (postId: string) => {
    return axiosClient.post(`${BASE_URL}/${postId}/like`);
  },

  unlikePost: (postId: string) => {
    return axiosClient.delete(`${BASE_URL}/${postId}/like`);
  },

  addComment: (postId: string, data: { content: string; parentId?: string }) => {
    return axiosClient.post(`${BASE_URL}/${postId}/comments`, data);
  },

  getComments: (postId: string, page: number = 1, size: number = 10) => {
    return axiosClient.get(`${BASE_URL}/${postId}/comments`, {
        params: { page, size }
    });
  },

  getReplies: (postId: string, commentId: string, page: number = 1, size: number = 10) => {
    return axiosClient.get(`${BASE_URL}/${postId}/comments/${commentId}/replies`, {
        params: { page, size }
    });
  },

  deletePost: (postId: string) => {
    return axiosClient.delete(`${BASE_URL}/${postId}`);
  }
};
