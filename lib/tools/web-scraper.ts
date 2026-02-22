import { tool } from "ai";
import { z } from "zod";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import { scrapeError } from "@/lib/errors";

const MAX_CONTENT_LENGTH = 50_000;
const MIN_CONTENT_LENGTH = 100;
const REQUEST_TIMEOUT_MS = 30_000;

type ScrapeResult =
  | { success: true; url: string; content: string; contentLength: number }
  | { success: false; url: string; error: string; content: "" };

async function scrapeUrlInternal(url: string): Promise<ScrapeResult> {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const response = await fetch(jinaUrl, {
    headers: { Accept: "text/markdown", "X-No-Cache": "true" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw scrapeError(`Jina Reader returned ${response.status} for ${url}`, {
      url,
      status: response.status,
    });
  }

  let text = await response.text();
  text = text.trim().replace(/\n{3,}/g, "\n\n");

  if (text.length < MIN_CONTENT_LENGTH) {
    return { success: false, url, error: "Page content too short or empty", content: "" };
  }

  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated at 50,000 characters]";
  }

  return {
    success: true,
    url,
    content: text,
    contentLength: text.length,
  };
}

const webScraperInputSchema = z.object({
  url: z.string().url().describe("The URL to scrape"),
  purpose: z.string().describe("Brief note on why this page is being scraped, for logging"),
});

export const webScraperTool = tool({
  description:
    "Scrape a URL and extract its full text content as clean markdown. Use this after web search to get the complete text of promising pages. The full text is needed for the Skeptic to verify evidence quotes.",
  inputSchema: webScraperInputSchema,
  execute: async ({ url, purpose }) => {
    return withTelemetry("web-scrape", { url, purpose }, async () => {
      const result = await scrapeUrlInternal(url);

      if (!result.success) {
        return result;
      }

      logEvent("scrape-complete", { url, contentLength: result.contentLength });
      metrics.increment("scrapes_executed");

      return result;
    });
  },
});

export async function scrapeMultipleUrls(urls: string[]): Promise<Map<string, string>> {
  const toScrape = urls.slice(0, 5);
  const results = new Map<string, string>();

  const settled = await Promise.allSettled(
    toScrape.map(async (url) => scrapeUrlInternal(url))
  );

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      console.warn("[scrapeMultipleUrls] Failed:", outcome.reason?.message ?? outcome.reason);
      continue;
    }
    const result = outcome.value;
    if (result.success) {
      results.set(result.url, result.content);
    } else {
      console.warn(`[scrapeMultipleUrls] ${result.url}: ${result.error}`);
    }
  }

  return results;
}
