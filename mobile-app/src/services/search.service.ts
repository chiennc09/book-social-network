// src/services/search.service.ts
import { Book } from '../types/index';
import bookAxiosClient from '../api/bookAxiosClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Genre {
  id: string;
  name: string;
  color: string; // Background colour for the genre card
}

// Default palette used when a category has no colour set in the DB.
const DEFAULT_GENRE_COLORS = [
  '#E94057', '#8A2BE2', '#F27121',
  '#11998e', '#F9D423', '#3494E6',
  '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD',
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const searchService = {
  /**
   * Fetch book genres/categories from the backend.
   * Falls back to an empty array on error so the UI degrades gracefully.
   * The `color` field is mandatory in the UI — if the server omits it
   * we assign a colour from the default palette deterministically.
   */
  async getGenres(): Promise<Genre[]> {
    try {
      const resp: any = await bookAxiosClient.get('/categories');
      const items: any[] = resp?.result ?? resp ?? [];

      return items.map((item: any, index: number) => ({
        id:    String(item.id ?? item._id ?? index),
        name:  item.name ?? 'Unknown',
        color: item.color ?? DEFAULT_GENRE_COLORS[index % DEFAULT_GENRE_COLORS.length],
      }));
    } catch (error) {
      console.error('[searchService] Failed to load genres:', error);
      return [];
    }
  },

  /**
   * Fetch trending books (top by view count in the last 7 days).
   * Maps the BookResponse from the server to the Book type used by the UI.
   */
  async getTrendingBooks(days = 7, limit = 10): Promise<Book[]> {
    try {
      const resp: any = await bookAxiosClient.get('/trending', {
        params: { days, limit },
      });
      const items: any[] = resp?.result ?? resp ?? [];

      return items.map((item: any) => {
        let coverUrl: string = item.coverImage ?? item.coverUrl ?? '';
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = `http://10.0.2.2:8888/file/legacy/covers/${coverUrl}`;
        }
        return {
          id:            String(item.id),
          title:         item.title ?? '',
          authors:       item.authors ?? [],
          author:        item.authors?.[0] ?? 'Unknown',
          coverUrl,
          coverImage:    coverUrl,
          status:        item.shelfStatus ?? 'none',
          progress:      item.progressPercent ?? 0,
          totalPages:    item.totalPages ?? 0,
          totalPage:     item.totalPages ?? 0,
          currentPage:   0,
          averageRating: item.averageRating ?? 0,
          totalViews:    item.totalViews ?? 0,
        } as Book;
      });
    } catch (error) {
      console.error('[searchService] Failed to load trending books:', error);
      return [];
    }
  },

  /**
   * Search books by query string and filter type.
   * Already uses the real search API — kept as-is.
   */
  async searchBooks(query: string, type: 'all' | 'title' | 'author'): Promise<Book[]> {
    try {
      const { bookApi } = require('../api/bookApi');
      const resp: any = await bookApi.search(query);
      const dataList: any[] = resp?.result ?? [];

      return dataList.map((item: any) => {
        let coverUrl: string = item.coverImage ?? '';
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = `http://10.0.2.2:8888/file/legacy/covers/${coverUrl}`;
        }
        return {
          id:            String(item.id),
          title:         item.title,
          authors:       item.authors,
          author:        item.authors?.[0] ?? 'Unknown',
          coverUrl,
          coverImage:    coverUrl,
          status:        item.shelfStatus ?? 'none',
          progress:      item.progressPercent ?? 0,
          totalPage:     item.totalPages ?? 0,
          currentPage:   0,
          description:   item.description,
          averageRating: item.averageRating ?? 0,
        } as Book;
      });
    } catch (error) {
      console.error('[searchService] Search failed:', error);
      return [];
    }
  },
};