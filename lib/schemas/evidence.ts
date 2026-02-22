import { z } from "zod";

export const EvidenceQuoteSchema = z.object({
  verbatimQuote: z
    .string()
    .min(10, "Quote must be at least 10 characters — exact text from source"),
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
  relevanceReasoning: z
    .string()
    .describe("Why this quote supports or refutes the claim"),
});

export type EvidenceQuote = z.infer<typeof EvidenceQuoteSchema>;
