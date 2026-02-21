/**
 * J-Quants API Client TypeScript - Type Definitions
 */

// deno-lint-ignore no-explicit-any
export type ApiRecord = Record<string, any>;

/** GET request options */
export interface GetOptions {
  params?: Record<string, string>;
}

/** Paginated API response */
export interface PaginatedResponse {
  data?: ApiRecord[];
  pagination_key?: string;
  [key: string]: unknown;
}

/** Bulk list item */
export interface BulkListItem {
  Key: string;
  Size: number;
  LastModified: string;
}

/** Bulk get response */
export interface BulkGetResponse {
  url: string;
}
