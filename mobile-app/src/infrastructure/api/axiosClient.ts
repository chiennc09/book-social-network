import axios from 'axios';
import { SERVICE_PATHS } from '../../config/env';
import storage from '../../utils/storage';

/**
 * Primary Axios client — all calls go through the API Gateway.
 * Base URL: {GATEWAY}/identity  (used for auth + generic calls)
 */
const axiosClient = axios.create({
  baseURL: SERVICE_PATHS.identity,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Auth navigator reference ─────────────────────────────────────────────────
// Allows axiosClient to trigger logout/redirect without importing React Navigation
// directly (which would create a circular dependency).
interface AuthNavigator {
  resetToAuth: () => void;
}
let _authNavigator: AuthNavigator | null = null;

export function setAuthNavigator(navigator: AuthNavigator) {
  _authNavigator = navigator;
}

// ── Request Interceptor: attach JWT ─────────────────────────────────────────
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[axiosClient] Failed to get token', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: handle 401 + token refresh ────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const oldToken = await storage.getToken();
        if (!oldToken) {
          // No refresh token — force logout
          await storage.clearTokens();
          _authNavigator?.resetToAuth();
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${SERVICE_PATHS.identity}/auth/refresh`,
          { token: oldToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { result } = response.data;
        if (result?.token) {
          await storage.setToken(result.token);
          originalRequest.headers.Authorization = `Bearer ${result.token}`;
          return axiosClient(originalRequest);
        }

        // Refresh succeeded but no token in response — something is wrong
        throw new Error('Refresh token returned no token');
      } catch (refreshError) {
        // Refresh failed → session truly expired → force logout
        await storage.clearTokens();
        _authNavigator?.resetToAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default axiosClient;
