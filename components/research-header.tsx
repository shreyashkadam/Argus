"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { StatusDot, type StatusDotStatus } from "@/components/ui/status-dot";
import type { ResearchPhase } from "@/lib/schemas";

const phaseLabels: Record<ResearchPhase, string> = {
  idle: "Idle",
  planning: "Planning",
  researching: "Researching",
  critiquing: "Critiquing",
  synthesizing: "Synthesizing",
  complete: "Complete",
  error: "Error",
};

function phaseToStatus(phase: ResearchPhase): StatusDotStatus {
  if (phase === "complete") return "verified";
  if (phase === "error") return "refuted";
  if (phase === "idle") return "idle";
  return "active";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ResearchHeaderProps {
  query: string;
  phase: ResearchPhase;
  iteration?: number;
  maxIterations?: number;
  onReset: () => void;
}

export function ResearchHeader({
  query,
  phase,
  iteration,
  maxIterations = 3,
  onReset,
}: ResearchHeaderProps) {
  const mountTime = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase === "complete" || phase === "error") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - mountTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const showIteration =
    (phase === "researching" || phase === "critiquing") &&
    iteration !== undefined &&
    iteration > 0;

  return (
    <div className="flex items-center gap-3 py-4 border-b border-[hsl(var(--border))]">
      <span className="text-xs font-bold tracking-[0.18em] uppercase text-[hsl(var(--muted-foreground))] select-none shrink-0">
        Argus
      </span>
      <span className="text-[hsl(var(--border))] shrink-0 text-base leading-none">·</span>
      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <StatusDot status={phaseToStatus(phase)} className="shrink-0" />
        <span className="text-sm font-medium truncate text-[hsl(var(--foreground))]">
          {query}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums font-mono hidden sm:inline">
          {formatElapsed(elapsed)}
        </span>
        {showIteration && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums hidden sm:inline">
            Iter {iteration}/{maxIterations}
          </span>
        )}
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {phaseLabels[phase]}
        </span>
        <Button variant="ghost" size="sm" onClick={onReset}>
          New
        </Button>
      </div>
    </div>
  );
}
