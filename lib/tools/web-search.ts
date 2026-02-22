import { tool } from "ai";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { env } from "@/lib/env";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import { withRetry } from "@/lib/retry";
import { searchError } from "@/lib/errors";
import { type SourceURL } from "@/lib/schemas";

const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  content: z.string(),
  score: z.number().optional(),
  sourceType: z
    .enum(["academic", "industry", "news", "government", "other"])
    .default("other"),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

function classifySourceType(
  url: string,
  title: string
): "academic" | "industry" | "news" | "government" | "other" {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  // Academic: domains containing known academic/research indicators
  const academicPatterns = [
    ".edu",
    "arxiv.org",
    "scholar.google",
    "pubmed",
    "semanticscholar",
    "researchgate",
    "springer",
    "ieee.org",
    "acm.org",
    "nature.com",
    "science.org",
    "jstor",
    "sciencedirect",
    "plos.org",
    "bioRxiv",
    "medrxiv",
  ];
  if (academicPatterns.some((p) => urlLower.includes(p))) {
    return "academic";
  }

  // Government: .gov domains
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith(".gov") || hostname.endsWith(".gov.uk") || hostname.includes(".gov.")) {
      return "government";
    }
  } catch {
    // Invalid URL, continue
  }

  // News: major outlets
  const newsPatterns = [
    "reuters",
    "bbc.",
    "nytimes",
    "techcrunch",
    "wired",
    "arstechnica",
    "theverge",
    "cnn.",
    "npr.org",
    "apnews",
    "bloomberg",
    "wsj",
    "economist",
    "guardian",
    "politico",
    "axios",
    "theatlantic",
  ];
  if (newsPatterns.some((p) => urlLower.includes(p))) {
    return "news";
  }

  // Industry: company domains, blogs, reports, whitepapers
  const industryIndicators = [
    "blog",
    "report",
    "whitepaper",
    "medium.com",
    "substack",
    "dev.to",
    "hashnode",
    "linkedin.com",
    "github.com",
    ".io/",
    "about.",
    "docs.",
  ];
  if (industryIndicators.some((p) => titleLower.includes(p) || urlLower.includes(p))) {
    return "industry";
  }

  return "other";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const webSearchInputSchema = z.object({
  queries: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe("1-5 focused search queries"),
});

export const webSearchTool = tool({
  description:
    "Search the web for information. Returns results with titles, URLs, content snippets, and source type classification (academic, industry, news, government). Use multiple specific queries. To target academic sources, include terms like 'research paper', 'study', 'arxiv'. To target industry, include company names or 'report'.",
  inputSchema: webSearchInputSchema,
  execute: async (
    input: z.infer<typeof webSearchInputSchema>
  ): Promise<{ results: SearchResult[]; sourcesFound: SourceURL[] }> => {
    const { queries } = input;
    const client = tavily({ apiKey: env().TAVILY_API_KEY });

    return withTelemetry(
      "web-search",
      { queryCount: String(queries.length) },
      async () => {
        const settled = await Promise.allSettled(
          queries.map((query) =>
            withRetry(
              () => client.search(query, { maxResults: 10 }),
              { retryIf: () => true }
            )
          )
        );

        const allFailed = settled.every((s) => s.status === "rejected");
        if (allFailed) {
          const errors = settled
            .filter((s): s is PromiseRejectedResult => s.status === "rejected")
            .map((s) => s.reason?.message ?? String(s.reason));
          throw searchError("All web search queries failed", {
            queries,
            errors,
          });
        }

        metrics.increment("searches_executed", queries.length);

        const seenUrls = new Set<string>();
        const results: SearchResult[] = [];
        const sourcesFound: SourceURL[] = [];
        const scrapedAt = new Date().toISOString();

        for (const outcome of settled) {
          if (outcome.status !== "fulfilled") continue;
          const response = outcome.value;
          for (const r of response.results ?? []) {
            const url = r.url?.trim();
            if (!url || seenUrls.has(url)) continue;
            seenUrls.add(url);

            const sourceType = classifySourceType(r.url, r.title ?? "");
            const content = r.content ?? "";
            const domain = extractDomain(r.url);

            const result: SearchResult = {
              title: r.title ?? "",
              url,
              content,
              score: r.score,
              sourceType,
            };
            results.push(result);

            sourcesFound.push({
              url,
              title: r.title ?? "",
              domain,
              sourceType,
              scrapedAt,
              rawContentLength: content.length,
            });
          }
        }

        logEvent("web_search_complete", {
          queries: queries.length,
          resultsCount: results.length,
          sourcesCount: sourcesFound.length,
        });

        return { results, sourcesFound };
      }
    );
  },
});
