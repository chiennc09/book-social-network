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

export interface RecommendationResponse {
  userId: string;
  recommendedBookIds: string[];
  source: 'hybrid-als-cbf' | 'cbf-only' | 'trending' | 'empty';
}

export interface SimilarBooksResponse {
  bookId: string;
  similarBookIds: string[];
}

export interface TodayRecommendationResponse {
  userId: string;
  todayBookIds: string[];
  /** 'session-cbf' | 'recency-cbf' | 'trending' | 'empty' */
  source: string;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const recommendationApi = {
  /**
   * Fetch personalised book IDs for a user.
   * Returns an empty array for cold-start users.
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
   * Fetch Today's Picks based on user's recent session activity.
   * Cached 24h on server; invalidated on each interaction event.
   */
  getTodayRecommendations: async (
    userId: string,
    limit = 10,
  ): Promise<{ ids: string[]; source: string }> => {
    try {
      const resp: TodayRecommendationResponse = await recommendationAxiosClient.get(
        `/recommendations/${userId}/today`,
        { params: { limit } },
      );
      return { ids: resp.todayBookIds ?? [], source: resp.source ?? 'empty' };
    } catch (error) {
      console.warn('[recommendationApi] Failed to fetch today recs:', error);
      return { ids: [], source: 'error' };
    }
  },
};
