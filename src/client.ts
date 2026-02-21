/**
 * J-Quants API Client for TypeScript/Deno (V2)
 *
 * Provides access to J-Quants API v2 endpoints.
 * Returns data as arrays of plain objects (Record<string, unknown>[]).
 */

import { parse as parseToml } from "@std/toml";
import { exists } from "@std/fs/exists";
import { join } from "@std/path";
import {
  MARKET_SEGMENT_DATA,
  SECTOR_17_DATA,
  SECTOR_33_DATA,
} from "./constants.ts";
import type { BulkEndpointValue } from "./enums.ts";
import type { ApiRecord } from "./types.ts";

const VERSION = "0.1.0";

export interface JQuantsClientOptions {
  /** J-Quants API v2 API key. If omitted, read from config file or env var. */
  apiKey?: string;
}

/**
 * J-Quants API v2 Client
 *
 * Authentication: Uses `x-api-key` header.
 * API key is resolved in this priority order:
 *   1. `apiKey` constructor option
 *   2. `${HOME}/.jquants-api/jquants-api.toml`
 *   3. `./jquants-api.toml` (current directory)
 *   4. `JQUANTS_API_CLIENT_CONFIG_FILE` env var path
 *   5. `JQUANTS_API_KEY` env var (highest priority)
 */
export class JQuantsClient {
  static readonly JQUANTS_API_BASE = "https://api.jquants.com/v2";
  static readonly USER_AGENT = `jqapi-deno/${VERSION}`;
  static readonly MAX_RETRY = 3;
  static readonly RETRY_STATUS_CODES = [429, 500, 502, 503, 504];
  static readonly TIMEOUT_MS = 30_000;

  private _apiKey: string;

  private constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  /**
   * Create a new JQuantsClient instance.
   * Reads config files and environment variables to resolve the API key.
   */
  static async create(options: JQuantsClientOptions = {}): Promise<JQuantsClient> {
    let apiKey = options.apiKey ?? "";

    if (!apiKey) {
      const config = await JQuantsClient._loadConfig();
      apiKey = config.api_key ?? "";
    }

    if (!apiKey) {
      throw new Error(
        "api_key is required. Set it via apiKey option, config file, or JQUANTS_API_KEY env var.",
      );
    }

    return new JQuantsClient(apiKey);
  }

  // ------------------------------------------------------------------
  // Config loading
  // ------------------------------------------------------------------

  private static async _loadConfig(): Promise<Record<string, string>> {
    let config: Record<string, string> = {};

    // user home config
    const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
    if (home) {
      const userConfigPath = join(home, ".jquants-api", "jquants-api.toml");
      config = { ...config, ...await JQuantsClient._readConfig(userConfigPath) };
    }

    // current dir config
    config = { ...config, ...await JQuantsClient._readConfig("jquants-api.toml") };

    // env specified config
    const envConfigPath = Deno.env.get("JQUANTS_API_CLIENT_CONFIG_FILE");
    if (envConfigPath) {
      config = { ...config, ...await JQuantsClient._readConfig(envConfigPath) };
    }

    // env var (highest priority)
    const envApiKey = Deno.env.get("JQUANTS_API_KEY");
    if (envApiKey) {
      config.api_key = envApiKey;
    }

    return config;
  }

  private static async _readConfig(configPath: string): Promise<Record<string, string>> {
    if (!await exists(configPath)) {
      return {};
    }

    try {
      const content = await Deno.readTextFile(configPath);
      const parsed = parseToml(content) as Record<string, unknown>;
      const section = parsed["jquants-api-client"];
      if (section && typeof section === "object") {
        return section as Record<string, string>;
      }
    } catch {
      // ignore parse errors
    }

    return {};
  }

  // ------------------------------------------------------------------
  // HTTP helpers
  // ------------------------------------------------------------------

  private _baseHeaders(): Record<string, string> {
    return {
      "x-api-key": this._apiKey,
      "User-Agent": JQuantsClient.USER_AGENT,
    };
  }

  private async _get(
    url: string,
    params?: Record<string, string>,
  ): Promise<Response> {
    const u = new URL(url);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) u.searchParams.set(k, v);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= JQuantsClient.MAX_RETRY; attempt++) {
      try {
        const resp = await fetch(u.toString(), {
          method: "GET",
          headers: this._baseHeaders(),
          signal: AbortSignal.timeout(JQuantsClient.TIMEOUT_MS),
        });

        if (
          !resp.ok &&
          JQuantsClient.RETRY_STATUS_CODES.includes(resp.status) &&
          attempt < JQuantsClient.MAX_RETRY
        ) {
          // exponential backoff
          const delay = Math.min(1000 * 2 ** attempt, 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(
            `J-Quants API error: ${resp.status} ${resp.statusText} - ${body}`,
          );
        }

        return resp;
      } catch (e) {
        lastError = e as Error;
        if (
          attempt < JQuantsClient.MAX_RETRY &&
          (e instanceof TypeError || (e as Error).name === "TimeoutError")
        ) {
          const delay = Math.min(1000 * 2 ** attempt, 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw e;
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  /** Paginated GET helper: fetches all pages and returns concatenated data array. */
  private async _getPaginated(
    path: string,
    params?: Record<string, string>,
    dataKey = "data",
  ): Promise<ApiRecord[]> {
    const url = `${JQuantsClient.JQUANTS_API_BASE}${path}`;
    const allData: ApiRecord[] = [];
    const query: Record<string, string> = { ...params };

    while (true) {
      const resp = await this._get(url, query);
      const payload = await resp.json();
      const batch = payload[dataKey];
      if (Array.isArray(batch)) {
        allData.push(...batch);
      }

      const paginationKey = payload.pagination_key;
      if (!paginationKey) break;
      query.pagination_key = paginationKey;
    }

    return allData;
  }

  // ------------------------------------------------------------------
  // eq-master (/equities/master)
  // ------------------------------------------------------------------

  /**
   * 上場銘柄一覧 (Listed securities master)
   *
   * @param options.code - Security code (5 or 4 digits)
   * @param options.date - Reference date (YYYYMMDD or YYYY-MM-DD)
   */
  async getEqMaster(
    options: { code?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) params.date = options.date;

    const data = await this._getPaginated("/equities/master", params, "data");
    return this._sortBy(data, ["Code"]);
  }

  // ------------------------------------------------------------------
  // Utility: sector / market master (local definitions)
  // ------------------------------------------------------------------

  /** 市場区分コードと名称 (Market segment codes) */
  getMarketSegments(): ApiRecord[] {
    return MARKET_SEGMENT_DATA.map(([Mkt, MktNm, MktNmEn]) => ({
      Mkt,
      MktNm,
      MktNmEn,
    })).sort((a, b) => a.Mkt.localeCompare(b.Mkt));
  }

  /** 17業種コードと名称 (17-sector classification) */
  get17Sectors(): ApiRecord[] {
    return SECTOR_17_DATA.map(([S17, S17Nm, S17NmEn]) => ({
      S17,
      S17Nm,
      S17NmEn,
    })).sort((a, b) => a.S17.localeCompare(b.S17));
  }

  /** 33業種コードと名称 (33-sector classification) */
  get33Sectors(): ApiRecord[] {
    return SECTOR_33_DATA.map(([S33, S33Nm, S33NmEn, S17]) => ({
      S33,
      S33Nm,
      S33NmEn,
      S17,
    })).sort((a, b) => a.S33.localeCompare(b.S33));
  }

  /**
   * 上場銘柄一覧 with sector/market English names.
   *
   * @param options.code - Security code
   * @param options.date - Reference date (YYYYMMDD or YYYY-MM-DD)
   */
  async getList(
    options: { code?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const list = await this.getEqMaster(options);
    if (list.length === 0) return [];

    const sectors17 = Object.fromEntries(
      this.get17Sectors().map((s) => [s.S17, s.S17NmEn]),
    );
    const sectors33 = Object.fromEntries(
      this.get33Sectors().map((s) => [s.S33, s.S33NmEn]),
    );
    const segments = Object.fromEntries(
      this.getMarketSegments().map((s) => [s.Mkt, s.MktNmEn]),
    );

    return list
      .map((item): ApiRecord => ({
        ...item,
        S17NmEn: sectors17[item.S17] ?? "",
        S33NmEn: sectors33[item.S33] ?? "",
        MktNmEn: segments[item.Mkt] ?? "",
      }))
      .sort((a, b) => String(a.Code).localeCompare(String(b.Code)));
  }

  // ------------------------------------------------------------------
  // eq-bars-daily (/equities/bars/daily)
  // ------------------------------------------------------------------

  /**
   * 株価四本値 (Daily OHLCV)
   *
   * @param options.code - Security code
   * @param options.from - Start date (YYYYMMDD or YYYY-MM-DD)
   * @param options.to - End date (YYYYMMDD or YYYY-MM-DD)
   * @param options.date - Specific date (YYYYMMDD or YYYY-MM-DD)
   */
  async getEqBarsDaily(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/equities/bars/daily", params);
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // eq-bars-daily-am (/equities/bars/daily/am)
  // ------------------------------------------------------------------

  /**
   * 前場四本値 (Morning session prices)
   *
   * @param options.code - Security code
   */
  async getEqBarsDailyAm(
    options: { code?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;

    const data = await this._getPaginated("/equities/bars/daily/am", params);
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // eq-bars-minute (/equities/bars/minute)
  // ------------------------------------------------------------------

  /**
   * 分足 (Minute bars)
   *
   * @param options.code - Security code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getEqBarsMinute(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/equities/bars/minute", params);
    return this._sortBy(data, ["Code", "Date", "Time"]);
  }

  // ------------------------------------------------------------------
  // eq-investor-types (/equities/investor-types)
  // ------------------------------------------------------------------

  /**
   * 投資部門別売買状況 (Investor type trading data)
   *
   * @param options.section - Market section (e.g., "TSEPrime")
   * @param options.from - Start date
   * @param options.to - End date
   */
  async getEqInvestorTypes(
    options: { section?: string; from?: string; to?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.section) params.section = options.section;
    if (options.from) params.from = options.from;
    if (options.to) params.to = options.to;

    const data = await this._getPaginated("/equities/investor-types", params);
    return this._sortBy(data, ["PubDate", "Section"]);
  }

  // ------------------------------------------------------------------
  // eq-earnings-cal (/equities/earnings-calendar)
  // ------------------------------------------------------------------

  /** 決算発表予定日 (Earnings announcement calendar) */
  async getEqEarningsCal(): Promise<ApiRecord[]> {
    const data = await this._getPaginated("/equities/earnings-calendar", {});
    return this._sortBy(data, ["Date", "Code"]);
  }

  // ------------------------------------------------------------------
  // fin-summary (/fins/summary)
  // ------------------------------------------------------------------

  /**
   * 財務情報サマリ (Financial summary)
   *
   * @param options.code - Security code
   * @param options.date - Disclosure date (YYYYMMDD or YYYY-MM-DD)
   */
  async getFinSummary(
    options: { code?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) params.date = options.date;

    const data = await this._getPaginated("/fins/summary", params);
    return this._sortBy(data, ["DiscDate", "DiscTime", "Code"]);
  }

  // ------------------------------------------------------------------
  // fin-details (/fins/details)
  // ------------------------------------------------------------------

  /**
   * 財務諸表詳細 (Financial statement details)
   *
   * @param options.code - Security code
   * @param options.date - Disclosure date (YYYYMMDD or YYYY-MM-DD)
   */
  async getFinDetails(
    options: { code?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) params.date = options.date;

    const data = await this._getPaginated("/fins/details", params);
    return this._sortBy(data, ["DiscDate", "DiscTime", "Code"]);
  }

  // ------------------------------------------------------------------
  // fin-dividend (/fins/dividend)
  // ------------------------------------------------------------------

  /**
   * 配当金情報 (Dividend information)
   *
   * @param options.code - Security code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getFinDividend(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/fins/dividend", params);
    return this._sortBy(data, ["PubDate", "Code"]);
  }

  // ------------------------------------------------------------------
  // mkt-short-ratio (/markets/short-ratio)
  // ------------------------------------------------------------------

  /**
   * 業種別空売り比率 (Short selling ratio by sector)
   *
   * @param options.sector33Code - 33-sector code (e.g., "0050")
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getMktShortRatio(
    options: {
      sector33Code?: string;
      from?: string;
      to?: string;
      date?: string;
    } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.sector33Code) params.s33 = options.sector33Code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/markets/short-ratio", params);
    return this._sortBy(data, ["Date", "S33"]);
  }

  // ------------------------------------------------------------------
  // mkt-short-sale-report (/markets/short-sale-report)
  // ------------------------------------------------------------------

  /**
   * 空売り残高報告 (Short selling positions report)
   *
   * @param options.code - Security code
   * @param options.disclosedDate - Disclosure date
   * @param options.disclosedDateFrom - Disclosure date range start
   * @param options.disclosedDateTo - Disclosure date range end
   * @param options.calculatedDate - Calculated date
   */
  async getMktShortSaleReport(
    options: {
      code?: string;
      disclosedDate?: string;
      disclosedDateFrom?: string;
      disclosedDateTo?: string;
      calculatedDate?: string;
    } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.disclosedDate) params.disc_date = options.disclosedDate;
    if (options.disclosedDateFrom) params.disc_date_from = options.disclosedDateFrom;
    if (options.disclosedDateTo) params.disc_date_to = options.disclosedDateTo;
    if (options.calculatedDate) params.calc_date = options.calculatedDate;

    const data = await this._getPaginated("/markets/short-sale-report", params);
    return this._sortBy(data, ["DiscDate", "CalcDate", "Code"]);
  }

  // ------------------------------------------------------------------
  // mkt-margin-interest (/markets/margin-interest)
  // ------------------------------------------------------------------

  /**
   * 信用取引週末残高 (Weekly margin interest)
   *
   * @param options.code - Security code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getMktMarginInterest(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/markets/margin-interest", params);
    return this._sortBy(data, ["Date", "Code"]);
  }

  // ------------------------------------------------------------------
  // mkt-margin-alert (/markets/margin-alert)
  // ------------------------------------------------------------------

  /**
   * 日々公表信用取引残高 (Daily margin alert)
   *
   * @param options.code - Security code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getMktMarginAlert(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/markets/margin-alert", params);
    return this._sortBy(data, ["Date", "Code"]);
  }

  // ------------------------------------------------------------------
  // mkt-breakdown (/markets/breakdown)
  // ------------------------------------------------------------------

  /**
   * 売買内訳データ (Trading breakdown)
   *
   * @param options.code - Security code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getMktBreakdown(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/markets/breakdown", params);
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // mkt-calendar (/markets/calendar)
  // ------------------------------------------------------------------

  /**
   * 取引カレンダー (Trading calendar)
   *
   * @param options.holidayDivision - Holiday division code
   * @param options.from - Start date
   * @param options.to - End date
   */
  async getMktCalendar(
    options: { holidayDivision?: string; from?: string; to?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.holidayDivision) params.hol_div = options.holidayDivision;
    if (options.from) params.from = options.from;
    if (options.to) params.to = options.to;

    const data = await this._getPaginated("/markets/calendar", params);
    return this._sortBy(data, ["Date"]);
  }

  // ------------------------------------------------------------------
  // idx-bars-daily (/indices/bars/daily)
  // ------------------------------------------------------------------

  /**
   * 指数四本値 (Index daily OHLCV)
   *
   * @param options.code - Index code
   * @param options.from - Start date
   * @param options.to - End date
   * @param options.date - Specific date
   */
  async getIdxBarsDaily(
    options: { code?: string; from?: string; to?: string; date?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.code) params.code = options.code;
    if (options.date) {
      params.date = options.date;
    } else {
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
    }

    const data = await this._getPaginated("/indices/bars/daily", params);
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // idx-bars-daily-topix (/indices/bars/daily/topix)
  // ------------------------------------------------------------------

  /**
   * TOPIX指数四本値 (TOPIX index daily OHLCV)
   *
   * @param options.from - Start date
   * @param options.to - End date
   */
  async getIdxBarsDailyTopix(
    options: { from?: string; to?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = {};
    if (options.from) params.from = options.from;
    if (options.to) params.to = options.to;

    const data = await this._getPaginated("/indices/bars/daily/topix", params);
    return this._sortBy(data, ["Date"]);
  }

  // ------------------------------------------------------------------
  // drv-bars-daily-fut (/derivatives/bars/daily/futures)
  // ------------------------------------------------------------------

  /**
   * 先物四本値 (Futures daily OHLCV)
   *
   * @param date - Date (YYYYMMDD or YYYY-MM-DD) - required
   * @param options.category - Derivatives product category
   * @param options.contractFlag - Central contract month flag
   */
  async getDrvBarsDailyFut(
    date: string,
    options: { category?: string; contractFlag?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = { date };
    if (options.category) params.category = options.category;
    if (options.contractFlag) params.contract_flag = options.contractFlag;

    const data = await this._getPaginated(
      "/derivatives/bars/daily/futures",
      params,
    );
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // drv-bars-daily-opt (/derivatives/bars/daily/options)
  // ------------------------------------------------------------------

  /**
   * オプション四本値 (Options daily OHLCV)
   *
   * @param date - Date (YYYYMMDD or YYYY-MM-DD) - required
   * @param options.category - Derivatives product category
   * @param options.contractFlag - Central contract month flag
   * @param options.code - Option code
   */
  async getDrvBarsDailyOpt(
    date: string,
    options: { category?: string; contractFlag?: string; code?: string } = {},
  ): Promise<ApiRecord[]> {
    const params: Record<string, string> = { date };
    if (options.category) params.category = options.category;
    if (options.contractFlag) params.contract_flag = options.contractFlag;
    if (options.code) params.code = options.code;

    const data = await this._getPaginated(
      "/derivatives/bars/daily/options",
      params,
    );
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // drv-bars-daily-opt-225 (/derivatives/bars/daily/options/225)
  // ------------------------------------------------------------------

  /**
   * 日経225オプション四本値 (Nikkei 225 options daily OHLCV)
   *
   * @param date - Date (YYYYMMDD or YYYY-MM-DD) - required
   */
  async getDrvBarsDailyOpt225(date: string): Promise<ApiRecord[]> {
    const params: Record<string, string> = { date };

    const data = await this._getPaginated(
      "/derivatives/bars/daily/options/225",
      params,
    );
    return this._sortBy(data, ["Code", "Date"]);
  }

  // ------------------------------------------------------------------
  // Bulk API
  // ------------------------------------------------------------------

  /**
   * バルクデータ一覧 (List available bulk data)
   *
   * @param endpoint - Bulk API endpoint (e.g., BulkEndpoint.EQ_MASTER)
   */
  async getBulkList(endpoint: BulkEndpointValue | string): Promise<ApiRecord[]> {
    const params: Record<string, string> = { endpoint };
    const url = `${JQuantsClient.JQUANTS_API_BASE}/bulk/list`;
    const resp = await this._get(url, params);
    const payload = await resp.json();
    return payload.data ?? [];
  }

  /**
   * バルクデータ取得URL (Get bulk data download URL)
   *
   * @param key - Key from getBulkList
   * @returns Download URL string
   */
  async getBulk(key: string): Promise<string> {
    const params: Record<string, string> = { key };
    const url = `${JQuantsClient.JQUANTS_API_BASE}/bulk/get`;
    const resp = await this._get(url, params);
    const payload = await resp.json();
    return payload.url;
  }

  /**
   * バルクデータをダウンロードして保存 (Download bulk data to file)
   *
   * @param key - Key from getBulkList
   * @param outputPath - Output file path
   */
  async downloadBulk(key: string, outputPath: string): Promise<void> {
    if (!outputPath || !outputPath.trim()) {
      throw new Error("outputPath must not be empty");
    }

    const downloadUrl = await this.getBulk(key);
    const resp = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(300_000), // 5 minute timeout for downloads
    });

    if (!resp.ok) {
      throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
    }

    const data = new Uint8Array(await resp.arrayBuffer());
    await Deno.writeFile(outputPath, data);
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  private _sortBy(data: ApiRecord[], keys: string[]): ApiRecord[] {
    if (data.length === 0) return data;
    return data.sort((a, b) => {
      for (const key of keys) {
        const av = String(a[key] ?? "");
        const bv = String(b[key] ?? "");
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }
}
