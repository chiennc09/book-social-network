// src/services/book.service.ts
import { Book } from '../types';
import { bookApi } from '../api/bookApi';
import { resolveMediaUrl, resolveReaderUrl } from '../config/env';

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
  async getBookDetails(id: string, fromSearch = false): Promise<BookDetail> {
    try {
      // readBook (GET /{id}/read) = endpoint xem chi tiết sách
      // → Backend bắn VIEW (+ SEARCH_CLICK nếu fromSearch=true)
      // getById (GET /{id}) chỉ dùng cho danh sách/cards, không bắn event
      const [bookResp, reviewsResp] = await Promise.all([
        bookApi.readBook(id, fromSearch),
        bookApi.getReviews(id).catch(e => ({ result: [] as any[] }))
      ]);

      const data: any = (bookResp as any).result;
      const reviewsData = (reviewsResp as any).result || [];

      // Resolve cover URL (full MinIO URL or legacy relative path)
      let coverUrl = resolveMediaUrl(data.coverImage, 'covers');

      return {
        id: data.id,
        title: data.title,
        authors: data.authors,
        author: data.authors?.[0] || 'Unknown',
        description: data.description || '',
        category: data.category,
        coverImage: coverUrl,
        coverUrl: coverUrl,
        pdfPath: data.pdfPath,
        epubPath: data.epubPath,
        isPublic: data.isPublic,
        totalViews: data.totalViews,
        totalPages: data.totalPages,
        totalPage: data.totalPages,
        averageRating: data.averageRating,
        ratingAverage: data.averageRating || 0,
        lastPosition: data.lastPosition,
        progressPercent: data.progressPercent,
        progress: data.progressPercent || 0,
        
        totalFavorites: data.totalFavorites || 0,
        isFavorited: data.isFavorited || false,
        userRating: data.userRating || 0,
        ratingCount: data.ratingCount || reviewsData.length || 0,
        
        status: data.shelfStatus || 'none',
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

      let coverUrl = resolveMediaUrl(data.coverImage, 'covers');

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
