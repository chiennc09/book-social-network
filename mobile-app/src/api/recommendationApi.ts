// src/api/recommendationApi.ts
import axios from 'axios';
import storage from '../utils/storage';

/**
 * Dedicated Axios client for the recommendation-service.
 * Base URL points at the recommendation service through the API gateway
 * (port 8888 is the gateway; recommendation-service is registered at /recommendation).
 *
 * On Android Emulator: 10.0.2.2 maps to the host machine's localhost.
 */
const recommendationAxiosClient = axios.create({
  baseURL: 'http://10.0.2.2:8088/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5_000, // 5 s — recommendations are non-critical; fail fast
});

// Attach JWT so the service can identify the caller if needed in the future.
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

// ─── API Methods ────────────────────────────────────────────────────────────

export interface RecommendationResponse {
  userId: string;
  recommendedBookIds: string[];
}

export const recommendationApi = {
  /**
   * Fetch personalised book IDs for a user.
   * Returns an empty array for cold-start users (no recommendations yet).
   *
   * @param userId  The authenticated user's ID
   * @param limit   Max number of results (1–50, server default 20)
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
      // Network errors, 5xx → silently return empty so the UI degrades gracefully
      console.warn('[recommendationApi] Failed to fetch recommendations:', error);
      return [];
    }
  },
};
