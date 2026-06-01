/**
 * ═══════════════════════════════════════════════════════════════════
 *  CENTRAL ENVIRONMENT CONFIG — book-social-network admin-web
 * ═══════════════════════════════════════════════════════════════════
 *
 *  URL Architecture:
 *  ─────────────────
 *  Files in MinIO are stored as RELATIVE object keys (e.g. "covers/uuid.jpg").
 *  The browser builds the full URL:
 *    fullUrl = {VITE_MINIO_PUBLIC_URL}/{VITE_MINIO_BUCKET}/{objectKey}
 *
 *  To change environment: update .env / docker-compose.yml build args.
 *  No code changes needed.
 */

// Base URL of the API Gateway — all REST calls go through here
// In development this is proxied by vite (see vite.config.ts)
export const API_GATEWAY_URL: string =
  import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8888';

// MinIO public URL — where files are served from in the browser
export const MINIO_PUBLIC_URL: string =
  import.meta.env.VITE_MINIO_PUBLIC_URL || 'http://localhost:9000';

// MinIO bucket name
export const MINIO_BUCKET: string =
  import.meta.env.VITE_MINIO_BUCKET || 'book-social-network';

// ─── Service paths ────────────────────────────────────────────────────────────

export const API = {
  identity:       `${API_GATEWAY_URL}/identity`,
  profile:        `${API_GATEWAY_URL}/profile`,
  books:          `${API_GATEWAY_URL}/books`,
  file:           `${API_GATEWAY_URL}/file`,
  notification:   `${API_GATEWAY_URL}/notification`,
  recommendation: `${API_GATEWAY_URL}/recommendation/api/v1`,
} as const;

// ─── Media URL resolver ───────────────────────────────────────────────────────

/**
 * Resolve a file objectKey (or legacy full URL) to a browser-accessible URL.
 *
 * @param key  Relative objectKey (e.g. "covers/uuid_photo.jpg") or full URL
 * @returns    Full URL accessible from browser
 */
export function resolveMediaUrl(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key; // Legacy full URL — pass through
  }
  // Relative object key → build full URL
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;
}
