import { z } from "zod";
import { ResearchPlanSchema } from "./research-plan";
import { ClaimSchema } from "./claim";
import { SourceURLSchema } from "./source";
import { FinalReportSchema } from "./report";
import { ResearchPhaseEnum } from "./research-state";

export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("plan-created"),
    plan: ResearchPlanSchema,
  }),
  z.object({
    type: z.literal("phase-change"),
    phase: ResearchPhaseEnum,
    previousPhase: ResearchPhaseEnum.optional(),
  }),
  z.object({
    type: z.literal("claim-added"),
    claim: ClaimSchema,
  }),
  z.object({
    type: z.literal("claim-updated"),
    claim: ClaimSchema,
  }),
  z.object({
    type: z.literal("source-added"),
    source: SourceURLSchema,
  }),
  z.object({
    type: z.literal("researcher-update"),
    message: z.string(),
  }),
  z.object({
    type: z.literal("skeptic-update"),
    message: z.string(),
  }),
  z.object({
    type: z.literal("report-complete"),
    report: FinalReportSchema,
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;
