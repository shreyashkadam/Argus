import { z } from "zod";
import { ResearchPlanSchema } from "./research-plan";
import { ClaimSchema } from "./claim";
import { SourceURLSchema } from "./source";
import { TraceRecordSchema } from "./trace";

export const ResearchPhaseEnum = z.enum([
  "idle",
  "planning",
  "researching",
  "critiquing",
  "synthesizing",
  "complete",
  "error",
]);

export type ResearchPhase = z.infer<typeof ResearchPhaseEnum>;

export const ResearchStateSchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  phase: ResearchPhaseEnum,
  plan: ResearchPlanSchema.optional().describe(
    "The research plan produced by the Planner"
  ),
  iterations: z.number().int().nonnegative().default(0),
  maxIterations: z.number().int().positive().default(3),
  claims: z.array(ClaimSchema).default([]),
  sources: z.array(SourceURLSchema).default([]),
  rawScrapedContent: z.record(z.string(), z.string()).default({}),
  researcherNotes: z.string().default(""),
  skepticFeedback: z.string().default(""),
  trace: TraceRecordSchema.optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ResearchState = z.infer<typeof ResearchStateSchema>;
