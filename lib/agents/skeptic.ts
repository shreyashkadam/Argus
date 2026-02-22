import { generateObject } from "ai";
import { model } from "@/lib/ai/model";
import { ClaimStatusEnum, Claim, ResearchState } from "@/lib/schemas";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import { SkepticResult } from "@/lib/agents/types";
import { withRetry } from "@/lib/retry";
import { z } from "zod";

const SkepticVerdictSchema = z.object({
  claimVerdicts: z.array(z.object({
    claimId: z.string().uuid(),
    status: ClaimStatusEnum,
    reasoning: z.string().describe("Detailed reasoning for the verdict"),
    quoteVerified: z.boolean().describe("Whether the verbatim quote was found as an exact substring in the raw scraped content"),
    confidence: z.number().min(0).max(1),
    suggestion: z.string().optional().describe("If rejected, what the Researcher should do differently"),
  })),
  overallFeedback: z.string().describe("Summary feedback for the Researcher to improve in the next iteration"),
});

const SKEPTIC_SYSTEM_PROMPT = `You are a rigorous fact-checking Skeptic. Your job is to VERIFY, not to research. You do NOT have access to search or scrape tools.
For each claim submitted by the Researcher, you will receive: (1) the claim statement, (2) the supporting evidence quotes with their source URLs, and (3) the RAW SCRAPED TEXT of each source page.
Your CRITICAL task: For each \`verbatimQuote\` in the evidence, check if it appears as an EXACT SUBSTRING in the corresponding raw scraped text. Use case-insensitive matching but the text must otherwise match exactly. If the quote is NOT found, set \`quoteVerified: false\` and \`status: 'refuted'\`.
Even if the quote is verified, evaluate whether it actually SUPPORTS the claim statement. A real quote that doesn't support the claim is still 'insufficient_evidence'.
A claim is 'verified' ONLY if: (1) at least one supporting quote is an exact substring of the raw text, AND (2) the quote logically supports the claim.
A claim is 'insufficient_evidence' if the quotes are real but don't strongly support the claim.
A claim is 'refuted' if: the quotes are fabricated (not found in raw text), OR contradictory evidence exists in the raw text.
In your overallFeedback, tell the Researcher which claims failed and what specific information to search for next.`;

function verifyQuotesAgainstRawContent(
  claims: Claim[],
  rawScrapedContent: Record<string, string>
): Map<string, boolean[]> {
  const result = new Map<string, boolean[]>();
  for (const claim of claims) {
    const quoteResults: boolean[] = [];
    for (const evidence of claim.supportingEvidence) {
      const rawText = rawScrapedContent[evidence.sourceUrl];
      if (!rawText) {
        quoteResults.push(false);
        continue;
      }
      const quoteLower = evidence.verbatimQuote.toLowerCase();
      const rawLower = rawText.toLowerCase();
      quoteResults.push(rawLower.includes(quoteLower));
    }
    result.set(claim.id, quoteResults);
  }
  return result;
}

export async function runSkeptic(state: ResearchState): Promise<SkepticResult> {
  return withTelemetry(
    "skeptic-agent",
    { claimCount: state.claims.length.toString() },
    async () => {
      const quoteVerification = verifyQuotesAgainstRawContent(state.claims, state.rawScrapedContent);

      const promptData = state.claims.map(claim => {
        const verificationResults = quoteVerification.get(claim.id) || [];
        const evidenceData = claim.supportingEvidence.map((ev, idx) => {
          const rawText = state.rawScrapedContent[ev.sourceUrl] || "";
          const truncatedRawText = rawText.substring(0, 5000);
          const found = verificationResults[idx];
          return {
            sourceUrl: ev.sourceUrl,
            verbatimQuote: ev.verbatimQuote,
            rawScrapedText: truncatedRawText,
            systemNote: `SYSTEM NOTE: Quote verification results: Claim ${claim.id}, Quote ${idx}: ${found ? "FOUND" : "NOT FOUND"} in raw text`
          };
        });

        return {
          claimId: claim.id,
          statement: claim.statement,
          evidence: evidenceData
        };
      });

      const promptStr = JSON.stringify(promptData, null, 2);

      const result = await withRetry(() => 
        generateObject({
          model: model,
          schema: SkepticVerdictSchema,
          system: SKEPTIC_SYSTEM_PROMPT,
          prompt: promptStr,
        })
      );

      const verdicts = result.object;

      metrics.increment("llm_calls");

      let verifiedCount = 0;
      let refutedCount = 0;
      let insufficientCount = 0;

      const updatedClaims = state.claims.map(claim => {
        const verdict = verdicts.claimVerdicts.find(v => v.claimId === claim.id);
        const verificationResults = quoteVerification.get(claim.id) || [];
        const allQuotesFailed = verificationResults.length > 0 && verificationResults.every(r => !r);
        
        let status = verdict?.status || "unverified";
        let quoteVerified = verdict?.quoteVerified ?? true;
        
        if (verificationResults.includes(false)) {
           quoteVerified = false;
        }

        if (verificationResults.length > 0 && allQuotesFailed) {
          status = "refuted";
        }

        if (status === "verified") verifiedCount++;
        else if (status === "refuted") refutedCount++;
        else if (status === "insufficient_evidence") insufficientCount++;

        return {
          ...claim,
          status,
          skepticReasoning: verdict?.reasoning || "No reasoning provided by Skeptic.",
          confidence: verdict?.confidence ?? 0,
        } as Claim;
      });

      if (verifiedCount > 0) metrics.increment("claims_verified", verifiedCount);
      if (refutedCount > 0) metrics.increment("claims_refuted", refutedCount);
      if (insufficientCount > 0) metrics.increment("claims_insufficient", insufficientCount);

      return {
        claims: updatedClaims,
        feedback: verdicts.overallFeedback
      };
    }
  );
}
