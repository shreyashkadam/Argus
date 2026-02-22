import { z } from "zod";
import { ClaimTypeEnum } from "./claim";

export const ResearchAngleSchema = z.object({
  angle: z
    .string()
    .describe("A specific research angle or sub-question to investigate"),
  rationale: z
    .string()
    .describe("Why this angle matters for the overall query"),
  searchStrategy: z
    .string()
    .describe(
      "How to search for this: what queries, what source types"
    ),
  targetSourceTypes: z
    .array(z.enum(["academic", "industry", "news", "government", "other"]))
    .describe("What kinds of sources to prioritize for this angle"),
  priority: z.enum(["high", "medium", "low"]),
});

export const ResearchPlanSchema = z.object({
  originalQuery: z.string(),
  refinedQuestion: z
    .string()
    .describe("A clearer, more precise version of the user's query"),
  angles: z
    .array(ResearchAngleSchema)
    .min(2)
    .max(6)
    .describe("2-6 distinct research angles to investigate"),
  expectedClaimTypes: z
    .array(ClaimTypeEnum)
    .describe("What types of claims we expect to find"),
  createdAt: z.string().datetime(),
});

export type ResearchAngle = z.infer<typeof ResearchAngleSchema>;
export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;
