import { z } from "zod";

const BenchmarkConfigSchema = z.object({
  skepticMode: z.enum(["single", "quorum"]),
  models: z.array(z.string()),
  maxIterations: z.number().int().positive(),
});

const BenchmarkTimingSchema = z.object({
  totalDurationMs: z.number().int().nonnegative(),
  planningDurationMs: z.number().int().nonnegative(),
  researchDurationMs: z.number().int().nonnegative(),
  skepticDurationMs: z.number().int().nonnegative(),
  synthesisDurationMs: z.number().int().nonnegative(),
});

const BenchmarkClaimsSchema = z.object({
  total: z.number().int().nonnegative(),
  verified: z.number().int().nonnegative(),
  refuted: z.number().int().nonnegative(),
  insufficientEvidence: z.number().int().nonnegative(),
  unverified: z.number().int().nonnegative(),
});

const BenchmarkVerificationSchema = z.object({
  verificationRate: z.number().min(0).max(1).describe("verified / total"),
  refutationRate: z.number().min(0).max(1).describe("refuted / total"),
  quoteMatchRate: z
    .number()
    .min(0)
    .max(1)
    .describe("quotes that passed substring check / total quotes"),
});

const BenchmarkSourcesSchema = z.object({
  total: z.number().int().nonnegative(),
  scraped: z.number().int().nonnegative(),
  byType: z.record(z.string(), z.number().int().nonnegative()),
});

const QuorumPerModelStatsSchema = z.object({
  modelId: z.string(),
  verifiedCount: z.number().int().nonnegative(),
  refutedCount: z.number().int().nonnegative(),
  insufficientCount: z.number().int().nonnegative(),
  avgConfidence: z.number().min(0).max(1),
  durationMs: z.number().int().nonnegative(),
});

const BenchmarkQuorumDetailsSchema = z.object({
  modelsUsed: z.array(z.string()),
  modelAgreementRate: z
    .number()
    .min(0)
    .max(1)
    .describe("fraction of claims where all models agreed"),
  perModelStats: z.array(QuorumPerModelStatsSchema),
});

const BenchmarkCacheSchema = z.object({
  hits: z.number().int().nonnegative(),
  misses: z.number().int().nonnegative(),
  hitRate: z.number().min(0).max(1),
  enabled: z.boolean(),
});

export const SessionBenchmarkSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  query: z.string(),
  version: z.string(),
  config: BenchmarkConfigSchema,
  timing: BenchmarkTimingSchema,
  claims: BenchmarkClaimsSchema,
  verification: BenchmarkVerificationSchema,
  sources: BenchmarkSourcesSchema,
  iterations: z.number().int().nonnegative(),
  llmCalls: z.number().int().nonnegative(),
  quorumDetails: BenchmarkQuorumDetailsSchema.optional(),
  cache: BenchmarkCacheSchema.optional(),
  traceStepCount: z.number().int().nonnegative(),
  metricsSnapshot: z.record(z.string(), z.number()),
});

export type SessionBenchmark = z.infer<typeof SessionBenchmarkSchema>;
