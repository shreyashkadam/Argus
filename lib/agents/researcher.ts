import { generateText } from "ai";
import { model } from "@/lib/ai/model";
import { webSearchTool } from "@/lib/tools/web-search";
import { webScraperTool, scrapeMultipleUrls } from "@/lib/tools/web-scraper";
import { ClaimSchema, ResearchState, Claim, SourceURL } from "@/lib/schemas";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import { withRetry } from "@/lib/retry";
import { ResearcherResult } from "@/lib/agents/types";
import { z } from "zod";

const RESEARCHER_SYSTEM_PROMPT = `You are a thorough research analyst. You have been given a RESEARCH PLAN with specific angles to investigate. Follow it.

For EACH angle in the plan, conduct targeted searches. Use the angle's \`searchStrategy\` and \`targetSourceTypes\` to guide your queries.

DIVERSITY IS CRITICAL: You must search for academic sources (include 'research paper', 'study', 'arxiv' in queries), industry sources (include company names, 'report', 'whitepaper'), and news sources. Do not rely on a single source type.

After searching, use the web scraper tool to get full text of the 3-5 most relevant pages.

Formulate CLAIMS — specific, falsifiable statements. Assign each a \`claimType\` (factual, statistical, causal, comparative, evaluative) and a \`category\`.

For EACH claim, provide at least one EvidenceQuote with a \`verbatimQuote\` that is an EXACT substring copied from the scraped page content. Do not paraphrase. Do not summarize. Copy-paste the exact text.

Your verbatimQuote MUST be an exact copy-paste from the scraped text. The Skeptic agent will verify this by checking if your quote is a substring of the raw page content. If you fabricate or paraphrase a quote, the claim WILL be rejected.

Set all claim statuses to 'unverified'. The Skeptic will verify them.

Return claims as a structured JSON array matching the ClaimSchema.`;

function extractJson(text: string): string {
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : text.trim();
}

export async function runResearcher(state: ResearchState): Promise<ResearcherResult> {
  return withTelemetry(
    "researcher-agent",
    { query: state.query, iteration: state.iterations.toString() },
    async () => {
      const planText = state.plan
        ? `RESEARCH PLAN:\n${state.plan.angles
            .map(
              (a) =>
                `- Angle: ${a.angle}\n  Search Strategy: ${a.searchStrategy}\n  Target Sources: ${a.targetSourceTypes.join(
                  ", "
                )}`
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

      const result = await withRetry(() =>
        generateText({
          model,
          system: RESEARCHER_SYSTEM_PROMPT,
          prompt,
          tools: {
            webSearch: webSearchTool,
            webScraper: webScraperTool,
          },
          maxSteps: 12,
        })
      );

      metrics.increment("llm_calls");

      let claims: Claim[] = [];
      const text = result.text;
      
      try {
        const jsonStr = extractJson(text);
        const parsed = JSON.parse(jsonStr);
        claims = z.array(ClaimSchema).parse(parsed);
      } catch (err) {
        logEvent("researcher_json_parse_error", { error: String(err) });
        // Fallback: try asking the model to fix its JSON format
        try {
          metrics.increment("llm_calls");
          const fixResult = await withRetry(() =>
            generateText({
              model,
              system: "You are a helpful assistant. Extract the JSON array of claims from the following text and return ONLY valid JSON.",
              prompt: `Extract claims as a JSON array matching the schema from this text:\n\n${text}`,
            })
          );
          const fixJsonStr = extractJson(fixResult.text);
          const parsed = JSON.parse(fixJsonStr);
          claims = z.array(ClaimSchema).parse(parsed);
        } catch (fallbackErr) {
          console.warn("[runResearcher] Failed to parse claims even after fallback:", fallbackErr);
          logEvent("researcher_fallback_parse_error", { error: String(fallbackErr) });
        }
      }

      // Assign IDs if missing
      claims = claims.map((c) => ({
        ...c,
        id: c.id || crypto.randomUUID(),
      }));

      // Collect scraped content and sources from tool results
      const rawScrapedContent: Record<string, string> = {};
      const sources: SourceURL[] = [];
      
      const steps = result.steps ?? [];
      for (const step of steps) {
        if (!step.toolResults) continue;
        for (const toolResult of step.toolResults) {
          if (toolResult.toolName === "webSearch") {
            const tr = toolResult.result as { sourcesFound?: SourceURL[] };
            if (tr.sourcesFound) {
              for (const s of tr.sourcesFound) {
                if (!sources.find((existing) => existing.url === s.url)) {
                  sources.push(s);
                }
              }
            }
          } else if (toolResult.toolName === "webScraper") {
            const tr = toolResult.result as { success: boolean; url: string; content: string; contentLength?: number };
            if (tr.success && tr.url && tr.content) {
              rawScrapedContent[tr.url] = tr.content;
            }
          }
        }
      }

      metrics.increment("claims_generated", claims.length);

      return {
        claims,
        sources,
        rawScrapedContent,
        notes: text,
      };
    }
  );
}
