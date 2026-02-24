import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { env } from "@/lib/env";

const openrouter = createOpenRouter({ apiKey: env().OPENROUTER_API_KEY });
export const model = openrouter("x-ai/grok-4.1-fast");

export type SkepticModelEntry = { id: string; model: LanguageModel };

export const skepticModels: SkepticModelEntry[] = [
  { id: "grok", model: openrouter("x-ai/grok-4.1-fast") },
  { id: "claude", model: openrouter("minimax/minimax-m2.5") },
  { id: "gemini", model: openrouter("google/gemini-2.5-flash") },
];
