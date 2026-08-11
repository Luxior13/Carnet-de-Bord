/**
 * Pagination constants used across the application.
 * Centralized to ensure consistency and easy maintenance.
 */
export const PAGINATION = {
  /**
   * Default number of items per page when not specified.
   */
  DEFAULT_LIMIT: 50,

  /**
   * Maximum number of items that can be requested per page.
   * Prevents overly large queries.
   */
  MAX_LIMIT: 200,

  /**
   * Maximum page accepted by legacy offset-based lists. Cursor-based feeds do
   * not use this value. Bounding it prevents oversized Prisma `skip` values.
   */
  MAX_PAGE: 1_000,

  /**
   * Minimum number of items per page.
   */
  MIN_LIMIT: 1,
} as const;
