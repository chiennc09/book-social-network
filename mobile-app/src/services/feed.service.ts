import { Post, Book } from '../types';
import { postApi } from '../api/postApi';
import { bookService } from './book.service';
import { DEFAULT_AVATAR } from '../constants/theme';

export const feedService = {
  async getFeed(filter: string = 'foryou', page: number = 1, size: number = 10): Promise<Post[]> {
    console.log(`Fetching feed with filter: ${filter}`);
    try {
      const response: any = filter === 'foryou' 
        ? await postApi.getAllPosts(page, size) 
        : await postApi.getFeed(page, size);
      const items = response.result?.data || response.data?.result?.data || [];
      return await this._mapPosts(items);
    } catch (error) {
      console.error("Error fetching feed", error);
      return [];
    }
  },

  async getMyPosts(page: number = 1, size: number = 10): Promise<Post[]> {
    try {
       const response: any = await postApi.getMyPosts(page, size);
       const items = response.result?.data || response.data?.result?.data || [];
       return await this._mapPosts(items);
    } catch (error) {
       console.error("Error fetching my posts", error);
       return [];
    }
  },

  async getUserPosts(userId: string, page: number = 1, size: number = 10): Promise<Post[]> {
    try {
       const response: any = await postApi.getUserPosts(userId, page, size);
       const items = response.result?.data || response.data?.result?.data || [];
       return await this._mapPosts(items);
    } catch (error) {
       console.error("Error fetching user posts", error);
       return [];
    }
  },
  
  async _mapPosts(items: any[]): Promise<Post[]> {
    return await Promise.all(items.map(async (item: any) => {
        let bookObj: Book | undefined;
        if (item.bookId) {
          try {
            bookObj = await bookService.getBookDetails(item.bookId) as Book;
          } catch(_e) { }
        }
        return {
          id: item.id,
          user: {
            id: item.userId || item.user?.id,
            username: item.username || item.user?.username,
            displayName: item.userDisplayName || item.user?.displayName || item.username, 
            avatar: item.userAvatar || item.user?.avatar || DEFAULT_AVATAR,
            badges: item.userBadges || item.user?.badges || [],
          },
          userDisplayName: item.userDisplayName || item.user?.displayName || item.username,
          userBadges: item.userBadges || item.user?.badges || [],
          content: item.content,
          book: bookObj,
          likesCount: item.likeCount || 0,
          commentsCount: item.commentCount || 0,
          repostsCount: item.isRepost ? 1 : 0, 
          timestamp: item.created || 'Vừa xong',
          isLiked: item.isLiked || false,
          isRepost: item.isRepost || false,
        };
      }));
  },
  
  async likePost(postId: string) {
     return postApi.likePost(postId);
  },
  
  async unlikePost(postId: string) {
     return postApi.unlikePost(postId);
  }
};