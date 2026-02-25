import axiosClient from './axiosClient';
import { Post } from '../types';

export interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  data: T[];
}

// User yêu cầu đổi sang port 8083
const BASE_URL = 'http://10.0.2.2:8083/post';

export const postApi = {
  createPost: (data: { content: string; bookId?: string; isRepost?: boolean; originalPostId?: string }) => {
    return axiosClient.post(`${BASE_URL}/create`, data);
  },

  getMyPosts: (page: number = 1, size: number = 10) => {
    return axiosClient.get<any, { result: PageResponse<Post> }>(`${BASE_URL}/my-posts`, {
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
  }
};
