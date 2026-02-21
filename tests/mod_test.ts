import { assertEquals, assertRejects } from "@std/assert";
import {
  BulkEndpoint,
  JQuantsClient,
  MARKET_API_SECTIONS,
  MARKET_SEGMENT_DATA,
  SECTOR_17_DATA,
  SECTOR_33_DATA,
} from "../src/mod.ts";

// ============================================================================
// Constants & Enums tests
// ============================================================================

Deno.test("SECTOR_17_DATA has 18 entries", () => {
  assertEquals(SECTOR_17_DATA.length, 18);
});

Deno.test("SECTOR_33_DATA has 34 entries", () => {
  assertEquals(SECTOR_33_DATA.length, 34);
});

Deno.test("MARKET_SEGMENT_DATA has 10 entries", () => {
  assertEquals(MARKET_SEGMENT_DATA.length, 10);
});

Deno.test("MARKET_API_SECTIONS contains TSEPrime", () => {
  assertEquals(MARKET_API_SECTIONS.TSEPrime, "TSEPrime");
});

Deno.test("BulkEndpoint contains correct paths", () => {
  assertEquals(BulkEndpoint.EQ_MASTER, "/equities/master");
  assertEquals(BulkEndpoint.EQ_BARS_DAILY, "/equities/bars/daily");
  assertEquals(BulkEndpoint.FIN_SUMMARY, "/fins/summary");
  assertEquals(BulkEndpoint.DRV_BARS_DAILY_FUT, "/derivatives/bars/daily/futures");
});

// ============================================================================
// Client creation tests
// ============================================================================

Deno.test("JQuantsClient.create throws without API key", async () => {
  // Ensure JQUANTS_API_KEY is not set for this test
  const original = Deno.env.get("JQUANTS_API_KEY");
  try {
    Deno.env.delete("JQUANTS_API_KEY");
    await assertRejects(
      async () => {
        await JQuantsClient.create();
      },
      Error,
      "api_key is required",
    );
  } finally {
    if (original !== undefined) {
      Deno.env.set("JQUANTS_API_KEY", original);
    }
  }
});

Deno.test("JQuantsClient.create succeeds with apiKey option", async () => {
  const client = await JQuantsClient.create({ apiKey: "test-key" });
  assertEquals(typeof client, "object");
});

// ============================================================================
// Utility method tests (no API call required)
// ============================================================================

Deno.test("getMarketSegments returns sorted segments", async () => {
  const client = await JQuantsClient.create({ apiKey: "test-key" });
  const segments = client.getMarketSegments();
  assertEquals(segments.length, 10);
  assertEquals(segments[0].Mkt, "0101");
  assertEquals(segments[0].MktNm, "東証一部");
  assertEquals(segments[0].MktNmEn, "1st Section");
  // Verify sorted
  for (let i = 1; i < segments.length; i++) {
    assertEquals(segments[i - 1].Mkt <= segments[i].Mkt, true);
  }
});

Deno.test("get17Sectors returns sorted 17-sector data", async () => {
  const client = await JQuantsClient.create({ apiKey: "test-key" });
  const sectors = client.get17Sectors();
  assertEquals(sectors.length, 18);
  assertEquals(sectors[0].S17, "1");
  assertEquals(sectors[0].S17Nm, "食品");
  assertEquals(sectors[0].S17NmEn, "FOODS");
});

Deno.test("get33Sectors returns sorted 33-sector data with S17 mapping", async () => {
  const client = await JQuantsClient.create({ apiKey: "test-key" });
  const sectors = client.get33Sectors();
  assertEquals(sectors.length, 34);
  assertEquals(sectors[0].S33, "0050");
  assertEquals(sectors[0].S33Nm, "水産・農林業");
  assertEquals(sectors[0].S17, "1");
});

// ============================================================================
// Mock fetch tests for API methods
// ============================================================================

Deno.test("getEqMaster makes correct API request", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("/equities/master"), true);
      assertEquals(url.includes("code=27800"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              { Date: "2024-01-04", Code: "27800", CoName: "テスト株式会社" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    const result = await client.getEqMaster({ code: "27800" });
    assertEquals(result.length, 1);
    assertEquals(result[0].Code, "27800");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getEqBarsDaily builds params correctly", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("/equities/bars/daily"), true);
      assertEquals(url.includes("code=27800"), true);
      assertEquals(url.includes("from=2024-01-01"), true);
      assertEquals(url.includes("to=2024-01-31"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              { Date: "2024-01-04", Code: "27800", O: 1000, H: 1100, L: 900, C: 1050 },
              { Date: "2024-01-05", Code: "27800", O: 1050, H: 1150, L: 950, C: 1100 },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    const result = await client.getEqBarsDaily({
      code: "27800",
      from: "2024-01-01",
      to: "2024-01-31",
    });
    assertEquals(result.length, 2);
    assertEquals(result[0].Date, "2024-01-04");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getEqBarsDaily with date param uses date instead of from/to", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("date=2024-01-04"), true);
      assertEquals(url.includes("from="), false);
      return Promise.resolve(
        new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    await client.getEqBarsDaily({ date: "2024-01-04" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("pagination support: fetches multiple pages", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      callCount++;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (!url.includes("pagination_key")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ Date: "2024-01-04", Code: "10000" }],
              pagination_key: "page2",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      } else {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ Date: "2024-01-04", Code: "20000" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    const result = await client.getEqMaster();
    assertEquals(callCount, 2);
    assertEquals(result.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getMktShortRatio maps sector33Code to s33 param", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("s33=0050"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    await client.getMktShortRatio({ sector33Code: "0050" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getMktCalendar maps holidayDivision to hol_div param", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("hol_div=1"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    await client.getMktCalendar({ holidayDivision: "1" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getDrvBarsDailyFut requires date parameter", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("date=2024-01-04"), true);
      assertEquals(url.includes("/derivatives/bars/daily/futures"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    await client.getDrvBarsDailyFut("2024-01-04");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("API error throws with status and message", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => {
      return Promise.resolve(
        new Response(
          JSON.stringify({ message: "Forbidden" }),
          { status: 403, statusText: "Forbidden" },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "bad-key" });
    await assertRejects(
      async () => {
        await client.getEqMaster();
      },
      Error,
      "403",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getBulk returns URL string", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertEquals(url.includes("/bulk/get"), true);
      return Promise.resolve(
        new Response(
          JSON.stringify({ url: "https://example.com/download/data.gz" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    const downloadUrl = await client.getBulk("some-key");
    assertEquals(downloadUrl, "https://example.com/download/data.gz");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("result data is sorted correctly", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              { Date: "2024-01-05", Code: "20000" },
              { Date: "2024-01-04", Code: "10000" },
              { Date: "2024-01-04", Code: "20000" },
              { Date: "2024-01-05", Code: "10000" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };

    const client = await JQuantsClient.create({ apiKey: "test-key" });
    const result = await client.getEqBarsDaily();
    assertEquals(result[0].Code, "10000");
    assertEquals(result[0].Date, "2024-01-04");
    assertEquals(result[1].Code, "10000");
    assertEquals(result[1].Date, "2024-01-05");
    assertEquals(result[2].Code, "20000");
    assertEquals(result[2].Date, "2024-01-04");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
