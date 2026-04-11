/**
 * ═══════════════════════════════════════════════════════════════════
 *  CENTRAL ENVIRONMENT CONFIG — book-social-network mobile app
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SINGLE SOURCE OF TRUTH for all external URLs.
 *
 *  ─── URL ARCHITECTURE ────────────────────────────────────────────
 *
 *  Files are stored in MinIO with RELATIVE object keys (e.g. "covers/uuid.jpg").
 *  The DB never stores full URLs — only the relative path.
 *
 *  Full URL is built here on the client side:
 *    {MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{objectKey}
 *
 *  This means switching environments only requires changing the two
 *  values below (API_GATEWAY_URL and MINIO_PUBLIC_URL) — no backend
 *  changes, no DB migration.
 *
 *  ─── ENVIRONMENTS ────────────────────────────────────────────────
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
 */

/** Base URL for the API Gateway — all REST calls must go through here */
export const API_GATEWAY_URL: string =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'http://10.0.2.2:8888';

/** WebSocket base URL (same host, ws:// scheme) */
export const WS_GATEWAY_URL: string =
  API_GATEWAY_URL.replace(/^http/, 'ws');

/**
 * MinIO public URL — base URL where MinIO is accessible FROM THIS CLIENT.
 *
 * ⚠️  This is NOT stored in the database.
 *     The DB only stores relative object keys (e.g. "covers/uuid.jpg").
 *     This URL is used ONLY by resolveMediaUrl() to build the display URL.
 *
 * Android emulator → 10.0.2.2 maps to the host machine's localhost.
 */
export const MINIO_PUBLIC_URL: string =
  (typeof process !== 'undefined' && process.env?.REACT_APP_MINIO_URL) ||
  'http://10.0.2.2:9000';

/** MinIO bucket name (must match server-side MINIO_BUCKET_NAME env) */
export const MINIO_BUCKET = 'book-social-network';

// ─── Service path prefixes (all routed through Gateway) ──────────────────────

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

// ─── Media URL resolver ───────────────────────────────────────────────────────

type MediaCategory = 'covers' | 'epubs' | 'pdfs' | 'avatars' | 'others';

/**
 * Resolve a media file path to a fully-qualified URL for display/loading.
 *
 * Handles three cases:
 *  1. Relative object key (production standard)
 *       e.g. "covers/uuid_photo.jpg"
 *       → {MINIO_PUBLIC_URL}/{MINIO_BUCKET}/covers/uuid_photo.jpg
 *
 *  2. Already a full URL (http/https) — legacy data or presigned URL
 *       → returned as-is. If the domain contains 10.0.2.2 and we're NOT
 *         in emulator mode, the URL is normalised with MINIO_PUBLIC_URL's host.
 *
 *  3. Falsy → empty string
 *
 * @param url      Raw value from server response (objectKey or legacy full URL)
 * @param category File category — used for legacy path construction only
 * @returns        Full accessible URL for this client's environment
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  _category: MediaCategory = 'covers',
): string {
  if (!url) return '';

  // Already a full URL (legacy data or presigned URL)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative object key (standard): build full URL using this client's config
  // Format: {MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{objectKey}
  // e.g. http://10.0.2.2:9000/book-social-network/covers/uuid_photo.jpg
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${url}`;
}

/**
 * Resolve an EPUB or PDF object key for the reader component.
 *
 * Uses resolveMediaUrl() — readers can prefetch files as standard HTTP URLs.
 * Falls back to gateway download endpoint only if needed.
 *
 * @param url Raw value from server (objectKey or legacy full URL)
 */
export function resolveReaderUrl(url: string | null | undefined): string {
  return resolveMediaUrl(url);
}
