import { Claim, SourceURL } from "@/lib/schemas";

export interface ResearcherResult {
  claims: Claim[];
  sources: SourceURL[];
  rawScrapedContent: Record<string, string>;
  notes: string;
}

export interface SkepticResult {
  claims: Claim[];
  feedback: string;
}
