import { Book } from '../types/index';

export interface Genre {
  id: string;
  name: string;
  color: string; // Màu nền cho box thể loại
}

export const searchService = {
  // Lấy danh sách thể loại (Image 1)
  async getGenres(): Promise<Genre[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: '1', name: 'Tiểu thuyết', color: '#E94057' },
          { id: '2', name: 'Kinh dị', color: '#8A2BE2' },
          { id: '3', name: 'Lãng mạn', color: '#F27121' },
          { id: '4', name: 'Khoa học', color: '#11998e' },
          { id: '5', name: 'Kinh tế', color: '#F9D423' },
          { id: '6', name: 'Tâm lý học', color: '#3494E6' },
        ]);
      }, 300);
    });
  },

  // Lấy sách gợi ý (Trending - Image 2)
  async getTrendingBooks(): Promise<Book[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
             id: 't1', title: 'The Housemaid', authors: ['Freida McFadden'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg',
             status: 'want_to_read', progress: 0, totalPages: 300, totalPage: 300, currentPage: 0, author: 'Freida McFadden'
          },
          {
             id: 't2', title: 'Anxious People', authors: ['Fredrik Backman'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1436202607i/3735293.jpg',
             status: 'want_to_read', progress: 0, totalPages: 350, totalPage: 350, currentPage: 0, author: 'Fredrik Backman'
          },
          {
             id: 't3', title: 'Of Mice and Men', authors: ['John Steinbeck'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1511302904i/890.jpg',
             status: 'want_to_read', progress: 0, totalPages: 107, totalPage: 107, currentPage: 0, author: 'John Steinbeck'
          },
          {
             id: 't4', title: 'Of Mice and Men', authors: ['John Steinbeck'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1511302904i/890.jpg',
             status: 'want_to_read', progress: 0, totalPages: 107, totalPage: 107, currentPage: 0, author: 'John Steinbeck'
          },
          {
             id: 't5', title: 'Of Mice and Men', authors: ['John Steinbeck'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1511302904i/890.jpg',
             status: 'want_to_read', progress: 0, totalPages: 107, totalPage: 107, currentPage: 0, author: 'John Steinbeck'
          },
          {
             id: 't6', title: 'Of Mice and Men', authors: ['John Steinbeck'], 
             coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1511302904i/890.jpg',
             status: 'want_to_read', progress: 0, totalPages: 107, totalPage: 107, currentPage: 0, author: 'John Steinbeck'
          },
        ]);
      }, 400);
    });
  },

  // Tìm kiếm sách (Image 3)
  async searchBooks(query: string, type: 'all' | 'title' | 'author'): Promise<Book[]> {
    try {
      const { bookApi } = require('../api/bookApi'); // dynamic require to avoid circular dependency
      const resp: any = await bookApi.search(query);
      const dataList = resp.result || [];
      return dataList.map((item: any) => ({
         id: item.id,
         title: item.title,
         authors: item.authors,
         author: item.authors?.[0] || 'Unknown',
         coverUrl: item.coverImage,
         status: item.shelfStatus || 'none',
         progress: item.progressPercent || 0,
         totalPage: item.totalPages || 0,
         currentPage: 0,
         description: item.description,
         ratingAverage: item.averageRating,
      }));
    } catch (error) {
      console.error('Error searching books:', error);
      return [];
    }
  }
};