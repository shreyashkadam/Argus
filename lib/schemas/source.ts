import { z } from "zod";

export const SourceURLSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
  sourceType: z
    .enum(["academic", "industry", "news", "government", "other"])
    .default("other")
    .describe("Classification of the source"),
  scrapedAt: z.string().datetime(),
  rawContentLength: z.number().int().nonnegative(),
});

export type SourceURL = z.infer<typeof SourceURLSchema>;
