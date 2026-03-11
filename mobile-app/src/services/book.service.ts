// src/services/book.service.ts
import { Book } from '../types';

import { bookApi } from '../api/bookApi';

export interface Review {
  id: string;
  user: { id: string; displayName: string; avatar: string; badges?: any[] };
  rating: number;
  content: string;
  date: string;
  likes: number;
}

export interface BookDetail extends Book {
  description: string;
  ratingAverage: number;
  ratingCount: number;
  publisher: string;
  publishDate: string;
  isbn: string;
  language: string;
  pages: number;
  totalFavorites?: number;
  isFavorited?: boolean;
  userRating?: number;
  reviews: Review[];
}

export const bookService = {
  async getBookDetails(id: string): Promise<BookDetail> {
    try {
      const [bookResp, reviewsResp] = await Promise.all([
        bookApi.readBook(id),
        bookApi.getReviews(id).catch(e => ({ result: [] as any[] }))
      ]);
      const data: any = (bookResp as any).result;
      const reviewsData = (reviewsResp as any).result || [];

      // Xử lý URL ảnh bìa
      let coverUrl = data.coverImage;
      if (coverUrl && !coverUrl.startsWith('http')) {
         coverUrl = `http://10.0.2.2:8888/file/legacy/covers/${coverUrl}`;
      }

      // Mapping từ BookResponse sang BookDetail để tương thích UI hiện tại
      // Chú ý sau này sẽ cập nhật UI theo cấu trúc thật của DB
      return {
        id: data.id,
        title: data.title,
        authors: data.authors,
        author: data.authors?.[0] || 'Unknown', // fallback
        description: data.description || '',
        category: data.category,
        coverImage: coverUrl,
        coverUrl: coverUrl, // fallback
        pdfPath: data.pdfPath,
        epubPath: data.epubPath,
        isPublic: data.isPublic,
        totalViews: data.totalViews,
        totalPages: data.totalPages,
        totalPage: data.totalPages, // fallback
        averageRating: data.averageRating,
        ratingAverage: data.averageRating || 0,
        lastPosition: data.lastPosition,
        progressPercent: data.progressPercent,
        progress: data.progressPercent || 0, // fallback
        
        // New fields
        totalFavorites: data.totalFavorites || 0,
        isFavorited: data.isFavorited || false,
        userRating: data.userRating || 0,
        ratingCount: data.ratingCount || reviewsData.length || 0,
        
        // Dummy data for missing fields
        status: data.shelfStatus || 'none', // Sẽ cần API shelf để biết status
        currentPage: 0,
        publisher: 'N/A',
        publishDate: 'N/A',
        isbn: 'N/A',
        language: 'N/A',
        pages: data.totalPages,
        reviews: reviewsData.map((r: any) => ({
             id: r.id,
             user: { 
                 id: r.userId, 
                 displayName: r.userDisplayName || r.username || 'Ẩn danh', 
                 avatar: r.userAvatar,
                 badges: r.userBadges 
             },
             rating: r.rating,
             content: r.content,
             date: r.createdAt,
             likes: r.likes || 0
        })),
      };
    } catch (error) {
      console.error('Error fetching book details:', error);
      throw error;
    }
  },

  async getBookBasicInfo(id: string): Promise<Book> {
    try {
      const resp = await bookApi.getById(id);
      const data: any = (resp as any).result;

      let coverUrl = data.coverImage;
      if (coverUrl && !coverUrl.startsWith('http')) {
         coverUrl = `http://10.0.2.2:8888/file/legacy/covers/${coverUrl}`;
      }

      return {
        id: data.id,
        title: data.title,
        authors: data.authors,
        author: data.authors?.[0] || 'Unknown',
        coverUrl: coverUrl,
        averageRating: data.averageRating || 0,
      } as Book;
    } catch (error) {
       console.error('Error fetching book basic info:', error);
       throw error;
    }
  }
};
