// src/api/recommendationApi.ts
import axios from 'axios';
import storage from '../utils/storage';

/**
 * Dedicated Axios client for the recommendation-service.
 * Base URL points directly at recommendation-service (port 8088).
 *
 * On Android Emulator: 10.0.2.2 maps to the host machine's localhost.
 */
const recommendationAxiosClient = axios.create({
  baseURL: 'http://10.0.2.2:8088/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5_000, // 5 s — recommendations are non-critical; fail fast
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

export interface RecommendationResponse {
  userId: string;
  recommendedBookIds: string[];
  source: 'hybrid-als-cbf' | 'cbf-only' | 'trending' | 'empty';
}

export interface SimilarBooksResponse {
  bookId: string;
  similarBookIds: string[];
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const recommendationApi = {
  /**
   * Fetch personalised book IDs for a user.
   * Returns an empty array for cold-start users (no recommendations yet).
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
      return resp.recommendedBookIds ?? [];
    } catch (error) {
      console.warn('[recommendationApi] Failed to fetch recommendations:', error);
      return [];
    }
  },

  /**
   * Fetch similar book IDs for a given bookId (used on Book Detail screen).
   * Uses Content-Based Filtering — vector similarity on title, description, authors, category.
   * Returns an empty array if the book is not indexed yet or on network error.
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
};
