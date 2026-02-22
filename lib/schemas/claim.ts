import { z } from "zod";
import { EvidenceQuoteSchema } from "./evidence";

export const ClaimStatusEnum = z.enum([
  "unverified",
  "verified",
  "refuted",
  "insufficient_evidence",
]);

export const ClaimTypeEnum = z
  .enum(["factual", "statistical", "causal", "comparative", "evaluative"])
  .describe(
    "The epistemic type of claim — helps categorize evidence requirements"
  );

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  statement: z.string().min(1),
  category: z
    .string()
    .describe(
      "Topic area, e.g. 'data quality', 'bias', 'evaluation methodology'"
    ),
  claimType: ClaimTypeEnum.default("factual"),
  supportingEvidence: z.array(EvidenceQuoteSchema),
  refutingEvidence: z.array(EvidenceQuoteSchema),
  status: ClaimStatusEnum.default("unverified"),
  skepticReasoning: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;
