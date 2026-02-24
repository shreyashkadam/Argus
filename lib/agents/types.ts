import { Claim, SourceURL } from "@/lib/schemas";

export interface ResearcherResult {
  claims: Claim[];
  sources: SourceURL[];
  rawScrapedContent: Record<string, string>;
  notes: string;
}

export interface SingleSkepticVerdict {
  modelId: string;
  claims: Claim[];
  feedback: string;
  success: boolean;
  durationMs: number;
}

export interface QuorumPerModelStats {
  modelId: string;
  verifiedCount: number;
  refutedCount: number;
  insufficientCount: number;
  avgConfidence: number;
  durationMs: number;
}

export interface QuorumDetails {
  modelsUsed: string[];
  modelAgreementRate: number;
  perModelStats: QuorumPerModelStats[];
}

export interface SkepticResult {
  claims: Claim[];
  feedback: string;
  quorumDetails?: QuorumDetails;
}
