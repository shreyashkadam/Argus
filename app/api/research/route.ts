import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runResearchLoop } from "@/lib/agents/orchestrator";
import { StreamEventSchema, type StreamEvent } from "@/lib/schemas/stream-events";
import { validateEnv } from "@/lib/env";
import { logEvent } from "@/lib/telemetry";

const RequestBodySchema = z.object({
  query: z.string().min(1).max(1000),
  maxIterations: z.number().int().min(1).max(5).optional().default(3),
});

export async function POST(req: NextRequest) {
  try {
    validateEnv();
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error: Invalid environment configuration" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = RequestBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: result.error.errors },
      { status: 400 }
    );
  }

  const { query, maxIterations } = result.data;
  logEvent("research_started", { query, maxIterations });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runResearchLoop(query, { maxIterations })) {
          const encodedEvent = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(encodedEvent));
        }
      } catch (error) {
        const errorEvent: StreamEvent = {
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        const encodedEvent = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(new TextEncoder().encode(encodedEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/research",
    method: "POST",
  });
}
