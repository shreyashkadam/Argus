import { generateObject } from "ai";
import { model } from "@/lib/ai/model";
import {
  ResearchState,
  FinalReportSchema,
  FinalReport,
} from "@/lib/schemas";
import { withTelemetry, metrics } from "@/lib/telemetry";

const SYSTEM_PROMPT = `You are a report writer. You receive verified claims with evidence, a research plan, and source metadata.
Structure the report by organizing claims into logical sections based on the research plan's angles.
Begin with an executive summary (2-3 paragraphs) that answers the original research question.
Include a section summarizing the research plan that was followed — what angles were investigated and why.
For each section, write clear prose with inline citations as markdown links: [Source Title](URL).
Include a 'Limitations & Refuted Claims' section covering refuted claims and those with insufficient evidence.
Do NOT invent information. You are a reporter, not a researcher.`;

export async function generateReport(state: ResearchState): Promise<FinalReport> {
  return withTelemetry("report.generate", { query: state.query }, async () => {
    // Separate claims by status
    const verifiedClaims = state.claims.filter((c) => c.status === "verified");
    const refutedClaims = state.claims.filter((c) => c.status === "refuted");
    const insufficientEvidenceClaims = state.claims.filter(
      (c) => c.status === "insufficient_evidence"
    );

    const researchPlanSummary = state.plan
      ? `Original Query: ${state.plan.originalQuery}\nRefined Question: ${state.plan.refinedQuestion}\nAngles:\n${state.plan.angles
          .map((a) => `- ${a.angle}: ${a.rationale}`)
          .join("\n")}`
      : "No formal research plan was provided.";

    const claimsPayload = JSON.stringify(
      {
        verified: verifiedClaims,
        refuted: refutedClaims,
        insufficientEvidence: insufficientEvidenceClaims,
      },
      null,
      2
    );

    const sourcesPayload = JSON.stringify(state.sources, null, 2);

    const prompt = `Research Plan Summary:
${researchPlanSummary}

Claims:
${claimsPayload}

Sources:
${sourcesPayload}

Based on this information, generate the final report.`;

    const result = await generateObject({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      schema: FinalReportSchema.omit({
        verifiedClaimCount: true,
        refutedClaimCount: true,
        insufficientEvidenceCount: true,
        sources: true,
        traceStepCount: true,
        generatedAt: true,
      }),
    });

    metrics.increment("llm_calls");

    return {
      ...result.object,
      verifiedClaimCount: verifiedClaims.length,
      refutedClaimCount: refutedClaims.length,
      insufficientEvidenceCount: insufficientEvidenceClaims.length,
      sources: state.sources,
      traceStepCount: state.trace?.steps.length ?? 0,
      generatedAt: new Date().toISOString(),
    };
  });
}
