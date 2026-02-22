import { generateText, generateObject, stepCountIs } from "ai";
import { model } from "@/lib/ai/model";
import { webSearchTool } from "@/lib/tools/web-search";
import { webScraperTool, scrapeMultipleUrls } from "@/lib/tools/web-scraper";
import {
  ClaimTypeEnum,
  EvidenceQuoteSchema,
  ResearchState,
  Claim,
  SourceURL,
} from "@/lib/schemas";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import { withRetry } from "@/lib/retry";
import { z } from "zod";
import { ResearcherResult } from "@/lib/agents/types";

const RESEARCH_SYSTEM_PROMPT = `You are a thorough research analyst. You have been given a RESEARCH PLAN with specific angles to investigate. Follow it.

For EACH angle in the plan, conduct targeted searches. Use the angle's \`searchStrategy\` and \`targetSourceTypes\` to guide your queries.

DIVERSITY IS CRITICAL: You must search for academic sources (include 'research paper', 'study', 'arxiv' in queries), industry sources (include company names, 'report', 'whitepaper'), and news sources. Do not rely on a single source type.

After searching, use the web scraper tool to get full text of the 3-5 most relevant pages. Scraping is essential — the downstream claim extractor needs full page text to produce verbatim quotes.

Summarize what you found for each angle in your final text response.`;

const CLAIM_EXTRACTION_PROMPT = `You are a precise claim extractor. Given source content from a research investigation, extract specific, falsifiable claims with verbatim evidence quotes.

Rules:
- Each claim must be a specific, falsifiable statement
- Assign a claimType: factual, statistical, causal, comparative, or evaluative
- Assign a category (e.g. 'data quality', 'bias', 'evaluation methodology')
- Provide at least one EvidenceQuote with a verbatimQuote that is an EXACT substring copied from the provided source content
- Do NOT paraphrase or summarize quotes — copy the exact text as it appears in the source
- The verbatimQuote MUST appear verbatim in the source content. A verification system will check this by doing a substring match.
- Set refutingEvidence to an empty array unless you find contradictory evidence
- Extract 5-15 claims covering all investigation angles`;

export async function runResearcher(
  state: ResearchState
): Promise<ResearcherResult> {
  return withTelemetry(
    "researcher-agent",
    { query: state.query, iteration: state.iterations.toString() },
    async () => {
      const planText = state.plan
        ? `RESEARCH PLAN:\n${state.plan.angles
            .map(
              (a) =>
                `- Angle: ${a.angle}\n  Search Strategy: ${a.searchStrategy}\n  Target Sources: ${a.targetSourceTypes.join(", ")}`
            )
            .join("\n")}`
        : `QUERY: ${state.query}`;

      const feedbackText = state.skepticFeedback
        ? `\n\nPREVIOUS FEEDBACK FROM SKEPTIC: ${state.skepticFeedback}. Address these issues in this iteration.`
        : "";

      const existingClaimsText =
        state.claims.length > 0
          ? `\n\nEXISTING CLAIMS (Do not duplicate these, focus on gaps):\n${JSON.stringify(
              state.claims,
              null,
              2
            )}`
          : "";

      const prompt = `${planText}${feedbackText}${existingClaimsText}`;

      // --- Phase 1: Research via tool-calling (search + optional scraping) ---
      const result = await withRetry(() =>
        generateText({
          model,
          system: RESEARCH_SYSTEM_PROMPT,
          prompt,
          tools: {
            webSearch: webSearchTool,
            webScraper: webScraperTool,
          },
          stopWhen: stepCountIs(20),
        })
      );

      metrics.increment("llm_calls");

      const rawScrapedContent: Record<string, string> = {};
      const sources: SourceURL[] = [];

      const steps = result.steps ?? [];
      for (const step of steps) {
        if (!step.toolResults) continue;
        for (const toolResult of step.toolResults) {
          if (toolResult.toolName === "webSearch") {
            const tr = toolResult.output as {
              sourcesFound?: SourceURL[];
            };
            if (tr.sourcesFound) {
              for (const s of tr.sourcesFound) {
                if (!sources.find((existing) => existing.url === s.url)) {
                  sources.push(s);
                }
              }
            }
          } else if (toolResult.toolName === "webScraper") {
            const tr = toolResult.output as {
              success: boolean;
              url: string;
              content: string;
              contentLength?: number;
            };
            if (tr.success && tr.url && tr.content) {
              rawScrapedContent[tr.url] = tr.content;
            }
          }
        }
      }

      // --- Programmatic scraping fallback ---
      // If the model didn't scrape enough pages, scrape top search results.
      const scrapedCount = Object.keys(rawScrapedContent).length;
      const targetScrapeCount = 5;

      if (scrapedCount < targetScrapeCount && sources.length > 0) {
        const urlsToScrape = sources
          .filter((s) => !rawScrapedContent[s.url])
          .slice(0, targetScrapeCount - scrapedCount)
          .map((s) => s.url);

        if (urlsToScrape.length > 0) {
          logEvent("programmatic_scrape", {
            urlCount: urlsToScrape.length,
            reason:
              scrapedCount === 0
                ? "model_did_not_scrape"
                : "supplementing_model_scrapes",
          });

          const scraped = await scrapeMultipleUrls(urlsToScrape);
          for (const [url, content] of scraped) {
            rawScrapedContent[url] = content;
          }
        }
      }

      // --- Phase 2: Extract claims using generateObject ---
      let claims: Claim[] = [];
      const scrapedEntries = Object.entries(rawScrapedContent);

      if (scrapedEntries.length > 0) {
        const maxCharsPerSource = Math.min(
          Math.floor(50000 / scrapedEntries.length),
          15000
        );

        const contentForExtraction = scrapedEntries
          .map(([url, content], i) => {
            const source = sources.find((s) => s.url === url);
            const title = source?.title ?? url;
            const truncated = content.substring(0, maxCharsPerSource);
            return `SOURCE ${i + 1}: ${title}\nURL: ${url}\n\n${truncated}`;
          })
          .join("\n\n---\n\n");

        const extractionResult = await withRetry(() =>
          generateObject({
            model,
            system: CLAIM_EXTRACTION_PROMPT,
            prompt: `${planText}\n\n--- SOURCE CONTENT ---\n\n${contentForExtraction}`,
            schema: z.object({
              claims: z.array(
                z.object({
                  statement: z
                    .string()
                    .min(1)
                    .describe("A specific, falsifiable claim"),
                  category: z
                    .string()
                    .describe(
                      "Topic area, e.g. 'data quality', 'bias', 'evaluation methodology'"
                    ),
                  claimType: ClaimTypeEnum,
                  supportingEvidence: z
                    .array(EvidenceQuoteSchema)
                    .min(1)
                    .describe(
                      "Evidence quotes — verbatimQuote must be an exact substring of the source content"
                    ),
                  refutingEvidence: z
                    .array(EvidenceQuoteSchema)
                    .describe(
                      "Contradictory evidence, if any. Empty array if none."
                    ),
                })
              ),
            }),
          })
        );

        metrics.increment("llm_calls");

        claims = extractionResult.object.claims.map((c) => ({
          ...c,
          id: crypto.randomUUID(),
          status: "unverified" as const,
          skepticReasoning: undefined,
          confidence: undefined,
        }));
      } else {
        logEvent("researcher_no_scraped_content", {
          sourceCount: sources.length,
        });
      }

      metrics.increment("claims_generated", claims.length);

      return {
        claims,
        sources,
        rawScrapedContent,
        notes: result.text,
      };
    }
  );
}
