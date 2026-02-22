import { z } from "zod";

export const TraceStepSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  agent: z.enum(["planner", "researcher", "skeptic", "report-generator"]),
  action: z
    .string()
    .describe(
      "What the agent did, e.g. 'web-search', 'scrape', 'verify-claim'"
    ),
  input: z.string().describe("Summary of input to this step"),
  output: z.string().describe("Summary of output from this step"),
  durationMs: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const TraceRecordSchema = z.object({
  researchId: z.string().uuid(),
  query: z.string(),
  steps: z.array(TraceStepSchema).default([]),
  totalDurationMs: z.number().int().nonnegative().default(0),
  metricsSnapshot: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      "Snapshot of MetricsCollector counters at completion"
    ),
});

export type TraceStep = z.infer<typeof TraceStepSchema>;
export type TraceRecord = z.infer<typeof TraceRecordSchema>;
