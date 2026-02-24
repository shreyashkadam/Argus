import { generateObject, type LanguageModel } from "ai";
import { skepticModels } from "@/lib/ai/model";
import { ClaimStatusEnum, Claim, ResearchState } from "@/lib/schemas";
import { withTelemetry, logEvent, metrics } from "@/lib/telemetry";
import {
  SkepticResult,
  SingleSkepticVerdict,
  QuorumDetails,
  QuorumPerModelStats,
} from "@/lib/agents/types";
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

type SkepticVerdictResult = z.infer<typeof SkepticVerdictSchema>;

const SKEPTIC_SYSTEM_PROMPT = `You are a rigorous fact-checking Skeptic. Your job is to VERIFY, not to research. You do NOT have access to search or scrape tools.
For each claim submitted by the Researcher, you will receive: (1) the claim statement, (2) the supporting evidence quotes with their source URLs, and (3) the RAW SCRAPED TEXT of each source page.
Your CRITICAL task: For each \`verbatimQuote\` in the evidence, check if it appears as an EXACT SUBSTRING in the corresponding raw scraped text. Use case-insensitive matching but the text must otherwise match exactly. If the quote is NOT found, set \`quoteVerified: false\` and \`status: 'refuted'\`.
Even if the quote is verified, evaluate whether it actually SUPPORTS the claim statement. A real quote that doesn't support the claim is still 'insufficient_evidence'.
A claim is 'verified' ONLY if: (1) at least one supporting quote is an exact substring of the raw text, AND (2) the quote logically supports the claim.
A claim is 'insufficient_evidence' if the quotes are real but don't strongly support the claim.
A claim is 'refuted' if: the quotes are fabricated (not found in raw text), OR contradictory evidence exists in the raw text.
In your overallFeedback, tell the Researcher which claims failed and what specific information to search for next.`;

export function verifyQuotesAgainstRawContent(
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

function buildPromptData(
  state: ResearchState,
  quoteVerification: Map<string, boolean[]>
): string {
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

  return JSON.stringify(promptData, null, 2);
}

function applyVerdicts(
  claims: Claim[],
  verdicts: SkepticVerdictResult,
  quoteVerification: Map<string, boolean[]>
): { claims: Claim[]; verifiedCount: number; refutedCount: number; insufficientCount: number } {
  let verifiedCount = 0;
  let refutedCount = 0;
  let insufficientCount = 0;

  const updatedClaims = claims.map(claim => {
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

  return { claims: updatedClaims, verifiedCount, refutedCount, insufficientCount };
}

export async function runSingleSkeptic(
  state: ResearchState,
  skepticModel: LanguageModel,
  quoteVerification: Map<string, boolean[]>
): Promise<{ verdicts: SkepticVerdictResult; claims: Claim[]; durationMs: number }> {
  const startTime = Date.now();
  const promptStr = buildPromptData(state, quoteVerification);

  const result = await withRetry(() =>
    generateObject({
      model: skepticModel,
      schema: SkepticVerdictSchema,
      system: SKEPTIC_SYSTEM_PROMPT,
      prompt: promptStr,
    })
  );

  const { claims: updatedClaims } = applyVerdicts(state.claims, result.object, quoteVerification);
  const durationMs = Date.now() - startTime;

  return { verdicts: result.object, claims: updatedClaims, durationMs };
}

const STATUS_PRIORITY: Record<string, number> = {
  refuted: 0,
  insufficient_evidence: 1,
  verified: 2,
  unverified: 3,
};

function majorityVoteStatus(statuses: string[]): string {
  if (statuses.length === 0) return "unverified";

  const counts = new Map<string, number>();
  for (const s of statuses) {
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  let maxCount = 0;
  for (const c of counts.values()) {
    if (c > maxCount) maxCount = c;
  }

  const tied = [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([s]) => s);

  if (tied.length === 1) return tied[0];

  tied.sort((a, b) => (STATUS_PRIORITY[a] ?? 99) - (STATUS_PRIORITY[b] ?? 99));
  return tied[0];
}

export async function runSkepticQuorum(state: ResearchState): Promise<SkepticResult> {
  return withTelemetry(
    "skeptic-quorum",
    { claimCount: state.claims.length.toString(), models: skepticModels.length.toString() },
    async () => {
      const quoteVerification = verifyQuotesAgainstRawContent(state.claims, state.rawScrapedContent);

      const settled = await Promise.allSettled(
        skepticModels.map(async ({ id, model }) => {
          const startTime = Date.now();
          try {
            const { verdicts, claims: updatedClaims, durationMs } = await runSingleSkeptic(
              state,
              model,
              quoteVerification
            );
            metrics.increment(`skeptic_quorum_${id}_success`);
            return {
              modelId: id,
              claims: updatedClaims,
              feedback: verdicts.overallFeedback,
              success: true,
              durationMs,
            } satisfies SingleSkepticVerdict;
          } catch (err) {
            metrics.increment(`skeptic_quorum_${id}_failure`);
            logEvent("skeptic_model_failure", {
              modelId: id,
              error: err instanceof Error ? err.message : String(err),
            });
            throw err;
          }
        })
      );

      const successful: SingleSkepticVerdict[] = [];
      for (const result of settled) {
        if (result.status === "fulfilled") {
          successful.push(result.value);
        }
      }

      if (successful.length === 0) {
        throw new Error("All skeptic models failed. Cannot produce a quorum verdict.");
      }

      metrics.increment("llm_calls", successful.length);

      const mergedClaims = state.claims.map(claim => {
        const verificationResults = quoteVerification.get(claim.id) || [];
        const allQuotesFailed = verificationResults.length > 0 && verificationResults.every(r => !r);

        const statusVotes: string[] = [];
        const confidences: number[] = [];
        const reasoningParts: string[] = [];

        for (const sv of successful) {
          const modelClaim = sv.claims.find(c => c.id === claim.id);
          if (modelClaim) {
            statusVotes.push(modelClaim.status);
            confidences.push(modelClaim.confidence ?? 0);
            if (modelClaim.skepticReasoning) {
              reasoningParts.push(`[${sv.modelId}] ${modelClaim.skepticReasoning}`);
            }
          }
        }

        let mergedStatus = majorityVoteStatus(statusVotes);

        if (allQuotesFailed) {
          mergedStatus = "refuted";
        }

        const avgConfidence = confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0;

        return {
          ...claim,
          status: mergedStatus,
          skepticReasoning: reasoningParts.join("\n"),
          confidence: avgConfidence,
        } as Claim;
      });

      let verifiedCount = 0;
      let refutedCount = 0;
      let insufficientCount = 0;
      for (const c of mergedClaims) {
        if (c.status === "verified") verifiedCount++;
        else if (c.status === "refuted") refutedCount++;
        else if (c.status === "insufficient_evidence") insufficientCount++;
      }

      if (verifiedCount > 0) metrics.increment("claims_verified", verifiedCount);
      if (refutedCount > 0) metrics.increment("claims_refuted", refutedCount);
      if (insufficientCount > 0) metrics.increment("claims_insufficient", insufficientCount);

      const combinedFeedback = successful
        .map(sv => `[${sv.modelId}] ${sv.feedback}`)
        .join("\n\n");

      // Compute quorum details
      let agreedCount = 0;
      for (const claim of state.claims) {
        const statuses = successful
          .map(sv => sv.claims.find(c => c.id === claim.id)?.status)
          .filter(s => s !== undefined);
        if (statuses.length > 0 && statuses.every(s => s === statuses[0])) {
          agreedCount++;
        }
      }
      const totalClaims = state.claims.length;
      const modelAgreementRate = totalClaims > 0 ? agreedCount / totalClaims : 1;

      const perModelStats: QuorumPerModelStats[] = successful.map(sv => {
        let verified = 0;
        let refuted = 0;
        let insufficient = 0;
        let totalConf = 0;
        let confCount = 0;
        for (const c of sv.claims) {
          if (c.status === "verified") verified++;
          else if (c.status === "refuted") refuted++;
          else if (c.status === "insufficient_evidence") insufficient++;
          if (c.confidence !== undefined) {
            totalConf += c.confidence;
            confCount++;
          }
        }
        return {
          modelId: sv.modelId,
          verifiedCount: verified,
          refutedCount: refuted,
          insufficientCount: insufficient,
          avgConfidence: confCount > 0 ? totalConf / confCount : 0,
          durationMs: sv.durationMs,
        };
      });

      const quorumDetails: QuorumDetails = {
        modelsUsed: successful.map(sv => sv.modelId),
        modelAgreementRate,
        perModelStats,
      };

      return {
        claims: mergedClaims,
        feedback: combinedFeedback,
        quorumDetails,
      };
    }
  );
}

export async function runSkepticSingle(state: ResearchState): Promise<SkepticResult> {
  return withTelemetry(
    "skeptic-agent",
    { claimCount: state.claims.length.toString() },
    async () => {
      const quoteVerification = verifyQuotesAgainstRawContent(state.claims, state.rawScrapedContent);
      const { verdicts, claims: updatedClaims, durationMs } = await runSingleSkeptic(
        state,
        skepticModels[0].model,
        quoteVerification
      );

      metrics.increment("llm_calls");

      let verifiedCount = 0;
      let refutedCount = 0;
      let insufficientCount = 0;
      for (const c of updatedClaims) {
        if (c.status === "verified") verifiedCount++;
        else if (c.status === "refuted") refutedCount++;
        else if (c.status === "insufficient_evidence") insufficientCount++;
      }

      if (verifiedCount > 0) metrics.increment("claims_verified", verifiedCount);
      if (refutedCount > 0) metrics.increment("claims_refuted", refutedCount);
      if (insufficientCount > 0) metrics.increment("claims_insufficient", insufficientCount);

      return {
        claims: updatedClaims,
        feedback: verdicts.overallFeedback,
      };
    }
  );
}
