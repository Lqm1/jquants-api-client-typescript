/**
 * J-Quants API Client for TypeScript/Deno
 *
 * @module
 *
 * @example
 * ```ts
 * import { JQuantsClient } from "jquants-api-client-typescript";
 *
 * const client = await JQuantsClient.create({ apiKey: "your-api-key" });
 *
 * // Get listed securities
 * const master = await client.getEqMaster({ date: "2024-01-04" });
 *
 * // Get daily OHLCV
 * const bars = await client.getEqBarsDaily({ code: "27800", from: "2024-01-01", to: "2024-01-31" });
 * ```
 */

export { JQuantsClient } from "./client.ts";
export type { JQuantsClientOptions } from "./client.ts";
export type { ApiRecord, BulkGetResponse, BulkListItem } from "./types.ts";
export { BulkEndpoint, MARKET_API_SECTIONS } from "./enums.ts";
export type { BulkEndpointValue, MarketApiSection } from "./enums.ts";
export {
  EQ_BARS_DAILY_COLUMNS_V2,
  EQ_BARS_MINUTE_COLUMNS_V2,
  EQ_INVESTOR_TYPES_COLUMNS_V2,
  EQ_MASTER_COLUMNS_V2,
  FIN_SUMMARY_COLUMNS_V2,
  MARKET_SEGMENT_COLUMNS_V2,
  MARKET_SEGMENT_DATA,
  MKT_BREAKDOWN_COLUMNS_V2,
  MKT_SHORT_RATIO_COLUMNS_V2,
  PRICES_PRICES_AM_COLUMNS_V2,
  SECTOR_17_COLUMNS_V2,
  SECTOR_17_DATA,
  SECTOR_33_COLUMNS_V2,
  SECTOR_33_DATA,
  BULK_LIST_COLUMNS_V2,
} from "./constants.ts";
