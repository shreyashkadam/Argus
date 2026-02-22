import { z } from "zod";
import { SourceURLSchema } from "./source";

export const ReportSectionSchema = z.object({
  heading: z.string(),
  content: z.string().describe("Markdown body text"),
  claimIds: z.array(z.string().uuid()),
});

export const FinalReportSchema = z.object({
  title: z.string(),
  summary: z
    .string()
    .describe("Executive summary, 2-3 paragraphs"),
  researchPlan: z
    .string()
    .describe("Summary of the investigation plan that was followed"),
  sections: z.array(ReportSectionSchema).min(1),
  verifiedClaimCount: z.number().int().nonnegative(),
  refutedClaimCount: z.number().int().nonnegative(),
  insufficientEvidenceCount: z.number().int().nonnegative(),
  sources: z.array(SourceURLSchema),
  traceStepCount: z
    .number()
    .int()
    .nonnegative()
    .describe("Total number of traced steps for transparency"),
  generatedAt: z.string().datetime(),
});

export type ReportSection = z.infer<typeof ReportSectionSchema>;
export type FinalReport = z.infer<typeof FinalReportSchema>;
