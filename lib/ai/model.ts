import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/lib/env";

const openrouter = createOpenRouter({ apiKey: env().OPENROUTER_API_KEY });
export const model = openrouter("x-ai/grok-4.1-fast");
