import {
  ResearchState,
  StreamEvent,
  Claim,
  SourceURL,
  TraceRecord,
  TraceStep,
  FinalReport,
} from "@/lib/schemas";
import { runPlanner } from "@/lib/agents/planner";
import { ResearcherResult, SkepticResult } from "@/lib/agents/types";
import { metrics } from "@/lib/telemetry";

export async function* runResearchLoop(
  query: string,
  options?: { maxIterations?: number }
): AsyncGenerator<StreamEvent> {
  const maxIterations = options?.maxIterations ?? 3;
  const startTime = Date.now();
  const id = crypto.randomUUID();

  const state: ResearchState = {
    id,
    query,
    phase: "idle",
    iterations: 0,
    maxIterations,
    claims: [],
    sources: [],
    rawScrapedContent: {},
    researcherNotes: "",
    skepticFeedback: "",
    startedAt: new Date(startTime).toISOString(),
    updatedAt: new Date().toISOString(),
    trace: {
      researchId: id,
      query,
      steps: [],
      totalDurationMs: 0,
    },
  };

  try {
    // PLANNING PHASE
    const prevPhase = state.phase;
    state.phase = "planning";
    state.updatedAt = new Date().toISOString();
    yield {
      type: "phase-change",
      phase: "planning",
      previousPhase: prevPhase,
      message: "Creating research plan...",
    } as unknown as StreamEvent;

    const planStartTime = Date.now();
    const plan = await runPlanner(query);
    const planDuration = Date.now() - planStartTime;

    state.plan = plan;
    state.trace!.steps.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent: "planner",
      action: "create-plan",
      input: query,
      output: "Research plan created",
      durationMs: planDuration,
    });

    yield { type: "plan-created", plan };

    // RESEARCH LOOP
    while (state.iterations < state.maxIterations) {
      const prevPhaseResearch = state.phase;
      state.phase = "researching";
      state.iterations++;
      state.updatedAt = new Date().toISOString();
      yield { type: "phase-change", phase: "researching", previousPhase: prevPhaseResearch };

      const researcherStartTime = Date.now();
      const researcherResult = await runResearcher(state);
      const researcherDuration = Date.now() - researcherStartTime;

      state.claims = researcherResult.claims;
      state.sources = researcherResult.sources;
      state.rawScrapedContent = researcherResult.rawScrapedContent;
      state.researcherNotes = researcherResult.notes;

      for (const claim of researcherResult.claims) {
        yield { type: "claim-added", claim };
      }
      for (const source of researcherResult.sources) {
        yield { type: "source-added", source };
      }

      state.trace!.steps.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        agent: "researcher",
        action: "research",
        input: state.plan ? "Research plan" : "Query",
        output: `Found ${researcherResult.claims.length} claims`,
        durationMs: researcherDuration,
      });

      const prevPhaseCritique = state.phase;
      state.phase = "critiquing";
      state.updatedAt = new Date().toISOString();
      yield { type: "phase-change", phase: "critiquing", previousPhase: prevPhaseCritique };

      const skepticStartTime = Date.now();
      const skepticResult = await runSkeptic(state);
      const skepticDuration = Date.now() - skepticStartTime;

      state.claims = skepticResult.claims;
      state.skepticFeedback = skepticResult.feedback;

      for (const claim of skepticResult.claims) {
        yield { type: "claim-updated", claim };
      }

      state.trace!.steps.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        agent: "skeptic",
        action: "critique",
        input: "Claims and raw content",
        output: "Critique completed",
        durationMs: skepticDuration,
      });

      const totalClaims = state.claims.length;
      const claimsNeedingWork = state.claims.filter(
        (c) => c.status === "insufficient_evidence" || c.status === "refuted"
      ).length;

      metrics.increment("iterations_completed");

      if (totalClaims > 0 && claimsNeedingWork / totalClaims > 0.3 && state.iterations < state.maxIterations) {
        continue;
      } else {
        break;
      }
    }

    // SYNTHESIS PHASE
    const prevPhaseSynth = state.phase;
    state.phase = "synthesizing";
    state.updatedAt = new Date().toISOString();
    yield { type: "phase-change", phase: "synthesizing", previousPhase: prevPhaseSynth };

    const synthStartTime = Date.now();
    const report = await generateReport(state);
    const synthDuration = Date.now() - synthStartTime;

    state.trace!.steps.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent: "report-generator",
      action: "synthesis",
      input: "Verified claims",
      output: "Final report generated",
      durationMs: synthDuration,
    });

    state.trace!.totalDurationMs = Date.now() - startTime;
    state.trace!.metricsSnapshot = metrics.getCounters();

    yield { type: "report-complete", report };

    const prevPhaseComplete = state.phase;
    state.phase = "complete";
    state.updatedAt = new Date().toISOString();
    yield { type: "phase-change", phase: "complete", previousPhase: prevPhaseComplete };
  } catch (error) {
    state.phase = "error";
    state.error = error instanceof Error ? error.message : String(error);
    yield { type: "error", message: state.error };
  }
}

// STUBS
async function runResearcher(state: ResearchState): Promise<ResearcherResult> {
  return {
    claims: [],
    sources: [],
    rawScrapedContent: {},
    notes: "Stub researcher",
  };
}

async function runSkeptic(state: ResearchState): Promise<SkepticResult> {
  return {
    claims: state.claims,
    feedback: "Stub skeptic",
  };
}

async function generateReport(state: ResearchState): Promise<FinalReport> {
  return {
    title: "Stub Report",
    summary: "Stub summary",
    sections: [],
    overallConfidence: "medium",
    createdAt: new Date().toISOString(),
  };
}
