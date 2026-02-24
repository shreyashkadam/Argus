import { promises as fs } from "fs";
import path from "path";
import { type ResearchState, type SessionBenchmark } from "@/lib/schemas";
import { type QuorumDetails } from "@/lib/agents/types";
import { verifyQuotesAgainstRawContent } from "@/lib/agents/skeptic";

const BENCHMARKS_DIR = path.join(process.cwd(), "benchmarks");
const HISTORY_FILE = path.join(BENCHMARKS_DIR, "history.json");

const ARGUS_VERSION = process.env.ARGUS_VERSION ?? "0.1.0";

export function captureBenchmark(
  state: ResearchState,
  quorumDetails?: QuorumDetails
): SessionBenchmark {
  const trace = state.trace!;
  const steps = trace.steps;

  const sumDurationByAgent = (agent: string): number =>
    steps.filter(s => s.agent === agent).reduce((sum, s) => sum + s.durationMs, 0);

  const planningDurationMs = sumDurationByAgent("planner");
  const researchDurationMs = sumDurationByAgent("researcher");
  const skepticDurationMs =
    sumDurationByAgent("skeptic") + sumDurationByAgent("skeptic-quorum");
  const synthesisDurationMs = sumDurationByAgent("report-generator");

  const verified = state.claims.filter(c => c.status === "verified").length;
  const refuted = state.claims.filter(c => c.status === "refuted").length;
  const insufficientEvidence = state.claims.filter(c => c.status === "insufficient_evidence").length;
  const unverified = state.claims.filter(c => c.status === "unverified").length;
  const total = state.claims.length;

  const quoteVerification = verifyQuotesAgainstRawContent(
    state.claims,
    state.rawScrapedContent
  );
  let totalQuotes = 0;
  let matchedQuotes = 0;
  for (const results of quoteVerification.values()) {
    for (const r of results) {
      totalQuotes++;
      if (r) matchedQuotes++;
    }
  }
  const quoteMatchRate = totalQuotes > 0 ? matchedQuotes / totalQuotes : 0;

  const byType: Record<string, number> = {};
  for (const source of state.sources) {
    const st = source.sourceType ?? "other";
    byType[st] = (byType[st] ?? 0) + 1;
  }

  const scrapedCount = Object.keys(state.rawScrapedContent).length;
  const metricsSnapshot = trace.metricsSnapshot ?? {};
  const llmCalls = metricsSnapshot["llm_calls"] ?? 0;

  const skepticMode = quorumDetails ? "quorum" : "single";
  const models = quorumDetails
    ? quorumDetails.modelsUsed
    : ["grok"];

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    query: state.query,
    version: ARGUS_VERSION,
    config: {
      skepticMode,
      models,
      maxIterations: state.maxIterations,
    },
    timing: {
      totalDurationMs: trace.totalDurationMs,
      planningDurationMs,
      researchDurationMs,
      skepticDurationMs,
      synthesisDurationMs,
    },
    claims: {
      total,
      verified,
      refuted,
      insufficientEvidence,
      unverified,
    },
    verification: {
      verificationRate: total > 0 ? verified / total : 0,
      refutationRate: total > 0 ? refuted / total : 0,
      quoteMatchRate,
    },
    sources: {
      total: state.sources.length,
      scraped: scrapedCount,
      byType,
    },
    iterations: state.iterations,
    llmCalls,
    quorumDetails: quorumDetails ?? undefined,
    traceStepCount: steps.length,
    metricsSnapshot,
  };
}

export async function saveBenchmark(benchmark: SessionBenchmark): Promise<void> {
  await fs.mkdir(BENCHMARKS_DIR, { recursive: true });

  let history: SessionBenchmark[] = [];
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    history = JSON.parse(raw);
  } catch {
    // File doesn't exist yet or is invalid — start fresh
  }

  history.push(benchmark);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

export async function loadBenchmarks(): Promise<SessionBenchmark[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
