/**
 * Shared API utilities
 * Common functions used across API routes
 */

/**
 * Map service error codes to HTTP status codes
 * Used by API routes to translate ServiceResult errors to HTTP responses
 */
export function errorCodeToStatus(code: string): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
    case 'MAX_GOALS_REACHED':
      return 400;
    default:
      return 500;
  }
}
