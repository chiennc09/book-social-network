// src/api/recommendationApi.ts
import axios from 'axios';
import { SERVICE_PATHS } from '../config/env';
import storage from '../utils/storage';

/**
 * Dedicated Axios client for recommendation-service.
 * Routes through API Gateway: {GATEWAY}/recommendation/api/v1
 *
 * On Android Emulator: 10.0.2.2 → host machine's localhost.
 * Configure API_GATEWAY_URL in src/config/env.ts for other environments.
 */
const recommendationAxiosClient = axios.create({
  baseURL: SERVICE_PATHS.recommendation,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8_000, // fail fast — recommendations are non-critical
});

recommendationAxiosClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

recommendationAxiosClient.interceptors.response.use(
  (response) => response.data ?? response,
  (error) => Promise.reject(error.response?.data ?? error),
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookList {
  bookIds: string[];
  source: string;
}

export interface RecommendationResponse {
  userId: string;
  longTerm?: BookList;
  shortTerm?: BookList;
  trending?: BookList;
}

export interface SimilarBooksResponse {
  bookId: string;
  similarBookIds: string[];
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const recommendationApi = {
  /**
   * Fetch personalised book IDs for a user (Long Term ALS only).
   * Returns an empty array for cold-start users or when the backend falls
   * back to trending — trending books are displayed separately in the
   * dedicated "Sách Trending" section so we must not duplicate them here.
   */
  getRecommendations: async (
    userId: string,
    limit = 20,
  ): Promise<string[]> => {
    try {
      const resp: RecommendationResponse = await recommendationAxiosClient.get(
        `/recommendations/${userId}`,
        { params: { limit } },
      );
      // Only return personalised long-term recommendations.
      // If the API falls back to trending (cold-start / no ALS data), we
      // intentionally return [] so the "Có thể bạn cũng thích" section stays
      // hidden — trending books are already shown in the dedicated
      // "Sách Trending" section further down the screen.
      if (resp.longTerm) {
        return resp.longTerm.bookIds ?? [];
      }
      return [];
    } catch (error) {
      console.warn('[recommendationApi] Failed to fetch recommendations:', error);
      return [];
    }
  },

  /**
   * Fetch similar book IDs for a given bookId (Book Detail screen).
   * Uses Content-Based Filtering — vector similarity.
   */
  getSimilarBooks: async (
    bookId: string,
    limit = 8,
  ): Promise<string[]> => {
    try {
      const resp: SimilarBooksResponse = await recommendationAxiosClient.get(
        `/similar/${bookId}`,
        { params: { limit } },
      );
      return resp.similarBookIds ?? [];
    } catch (error) {
      console.warn('[recommendationApi] Failed to fetch similar books:', error);
      return [];
    }
  },

  /**
   * Fetch Today's Picks (Short Term) based on user's recent session activity.
   */
  getTodayRecommendations: async (
    userId: string,
    limit = 10,
  ): Promise<{ ids: string[]; source: string }> => {
    try {
      const resp: RecommendationResponse = await recommendationAxiosClient.get(
        `/recommendations/${userId}`,
        { params: { limit } },
      );
      if (resp.shortTerm) {
        return {
          ids: resp.shortTerm.bookIds ?? [],
          source: resp.shortTerm.source ?? 'empty',
        };
      }
      return { ids: [], source: 'empty' };
    } catch (error) {
      console.warn('[recommendationApi] Failed to fetch today recs:', error);
      return { ids: [], source: 'error' };
    }
  },
};
