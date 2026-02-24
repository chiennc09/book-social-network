// src/services/book.service.ts
import { Book } from '../types';

import { bookApi } from '../api/bookApi';

export interface Review {
  id: string;
  user: { displayName: string; avatar: string };
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
  reviews: Review[];
}

export const bookService = {
  async getBookDetails(id: string): Promise<BookDetail> {
    try {
      const resp: any = await bookApi.readBook(id);
      const data = resp.result; // Dữ liệu từ ApiResponse.result

      // Xử lý URL ảnh bìa
      let coverUrl = data.coverImage;
      if (coverUrl && !coverUrl.startsWith('http')) {
         coverUrl = `http://10.0.2.2:8085/books/files/covers/${coverUrl}`;
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
        
        // Dummy data for missing fields
        status: data.shelfStatus || 'none', // Sẽ cần API shelf để biết status
        currentPage: 0,
        ratingCount: 0,
        publisher: 'N/A',
        publishDate: 'N/A',
        isbn: 'N/A',
        language: 'N/A',
        pages: data.totalPages,
        reviews: [],
      };
    } catch (error) {
      console.error('Error fetching book details:', error);
      throw error;
    }
  }
};
