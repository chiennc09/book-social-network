/**
 * ═══════════════════════════════════════════════════════════════════
 *  CENTRAL ENVIRONMENT CONFIG — book-social-network mobile app
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SINGLE SOURCE OF TRUTH for all external URLs.
 *  Change the values below when switching environments:
 *
 *  ① Android Emulator (default):
 *      API_GATEWAY_URL  = 'http://10.0.2.2:8888'
 *      MINIO_PUBLIC_URL = 'http://10.0.2.2:9000'
 *
 *  ② Real Android Device (same WiFi as dev machine):
 *      API_GATEWAY_URL  = 'http://192.168.x.x:8888'   ← your LAN IP
 *      MINIO_PUBLIC_URL = 'http://192.168.x.x:9000'
 *
 *  ③ Production:
 *      API_GATEWAY_URL  = 'https://api.yourdomain.com'
 *      MINIO_PUBLIC_URL = 'https://cdn.yourdomain.com'
 *
 *  ENV variable override (React Native doesn't ship .env by default
 *  without react-native-config, but we support it via process.env):
 */

/** Base URL for the API Gateway — all REST calls must go through here */
export const API_GATEWAY_URL: string =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'http://10.0.2.2:8888';

/** WebSocket base URL (same host, different scheme) */
export const WS_GATEWAY_URL: string =
  API_GATEWAY_URL.replace(/^http/, 'ws');

/**
 * MinIO public URL — base URL where files are served from.
 * Files uploaded via file-service are stored in MinIO and their
 * public URL is built as: {MINIO_PUBLIC_URL}/{bucket}/{objectKey}
 *
 * For Android emulator this must be 10.0.2.2 (not localhost or minio).
 */
export const MINIO_PUBLIC_URL: string =
  (typeof process !== 'undefined' && process.env?.REACT_APP_MINIO_URL) ||
  'http://10.0.2.2:9000';

/** MinIO bucket name (must match server-side config) */
export const MINIO_BUCKET = 'book-social-network';

// ─── Service path prefixes (route through Gateway) ──────────────────────────

export const SERVICE_PATHS = {
  identity:        `${API_GATEWAY_URL}/identity`,
  profile:         `${API_GATEWAY_URL}/profile`,
  notification:    `${API_GATEWAY_URL}/notification`,
  post:            `${API_GATEWAY_URL}/post`,
  file:            `${API_GATEWAY_URL}/file`,
  books:           `${API_GATEWAY_URL}/books`,
  chat:            `${API_GATEWAY_URL}/chat`,
  chatWs:          `${WS_GATEWAY_URL}/chat/ws/chat`,
  recommendation:  `${API_GATEWAY_URL}/recommendation/api/v1`,
} as const;

// ─── Media URL resolver ──────────────────────────────────────────────────────

type MediaCategory = 'covers' | 'epubs' | 'pdfs' | 'avatars' | 'others';

/**
 * Resolve a media URL for display or loading.
 *
 * Handles three cases:
 *  1. Already a full URL (http/https) → return as-is (MinIO URL from DB)
 *  2. Relative path (legacy local storage) → prefix with MinIO public URL
 *  3. Falsy → return empty string
 *
 * @param url      Raw URL or relative path from server response
 * @param category File category (used for legacy path construction)
 * @returns        Full accessible URL
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  category: MediaCategory = 'covers',
): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url; // Already a full MinIO URL
  }
  // Legacy relative path — construct MinIO URL
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${category}/${url}`;
}

/**
 * Resolve an EPUB/PDF path for the reader.
 * Falls back to the download-via-gateway endpoint if needed.
 */
export function resolveReaderUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Determine category from extension
  const category: MediaCategory = url.toLowerCase().endsWith('.epub') ? 'epubs' : 'pdfs';
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${category}/${url}`;
}
