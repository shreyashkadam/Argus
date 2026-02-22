import { generateObject } from "ai";
import { model } from "@/lib/ai/model";
import { ResearchPlanSchema, type ResearchPlan } from "@/lib/schemas";
import { withTelemetry, metrics } from "@/lib/telemetry";

const PLANNER_SYSTEM_PROMPT = `You are a research planning specialist. Given a user's research query, you produce a structured investigation plan.
Identify 2-6 distinct research ANGLES — these are sub-questions or perspectives that together cover the query comprehensively.
For each angle, specify: what to search for, which source types to prioritize (academic papers, industry reports, news articles, government sources), and the priority level.
Refine the user's query into a clearer, more precise research question.
Consider: What claims are we likely to find? What types (factual, statistical, causal, comparative, evaluative)? What might be controversial or need extra verification?
The plan guides the Researcher's search strategy — be specific about search queries and source targeting.`;

export async function runPlanner(query: string): Promise<ResearchPlan> {
  return withTelemetry("planner-agent", { query }, async () => {
    const { object } = await generateObject({
      model: model,
      schema: ResearchPlanSchema,
      system: PLANNER_SYSTEM_PROMPT,
      prompt: query,
    });

    metrics.increment("llm_calls");

    return {
      ...object,
      createdAt: new Date().toISOString(),
      originalQuery: query,
    };
  });
}
