"use client";

import { useState, useCallback, useRef } from "react";
import {
  StreamEvent,
  ResearchPhase,
  Claim,
  FinalReport,
  ResearchPlan,
  SessionBenchmark,
} from "@/lib/schemas";

export function useResearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<ResearchPhase>("idle");
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [benchmark, setBenchmark] = useState<SessionBenchmark | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setPhase("idle");
    setPlan(null);
    setEvents([]);
    setClaims([]);
    setReport(null);
    setBenchmark(null);
    setError(null);
  }, []);

  const startResearch = useCallback(
    async (query: string) => {
      reset();
      setIsLoading(true);
      setError(null);
      setPhase("planning");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body returned from the server.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          // The last element is either an empty string (if buffer ends with \n\n)
          // or a partial message. Keep it in the buffer.
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (!jsonStr) continue;

              try {
                const event: StreamEvent = JSON.parse(jsonStr);
                setEvents((prev) => [...prev, event]);

                switch (event.type) {
                  case "phase-change":
                    setPhase(event.phase);
                    break;
                  case "plan-created":
                    setPlan(event.plan);
                    break;
                  case "claim-added":
                    setClaims((prev) => [...prev, event.claim]);
                    break;
                  case "claim-updated":
                    setClaims((prev) =>
                      prev.map((c) => (c.id === event.claim.id ? event.claim : c))
                    );
                    break;
                  case "report-complete":
                    setReport(event.report);
                    break;
                  case "benchmark-complete":
                    setBenchmark(event.benchmark);
                    break;
                  case "error":
                    setError(event.message);
                    setPhase("error");
                    break;
                }
              } catch (e) {
                console.error("Failed to parse SSE event", e, line);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Research request aborted");
        } else {
          setError(err.message || "An unknown error occurred");
          setPhase("error");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [reset]
  );

  return {
    startResearch,
    isLoading,
    phase,
    plan,
    events,
    claims,
    report,
    benchmark,
    error,
    reset,
  };
}
