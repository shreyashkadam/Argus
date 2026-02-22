"use client";

import { useState, useMemo } from "react";
import { useResearch } from "@/lib/hooks/use-research";
import { QueryInput } from "@/components/query-input";
import { ResearchHeader } from "@/components/research-header";
import { PhaseTimeline } from "@/components/phase-timeline";
import { PlanSection } from "@/components/plan-section";
import { ClaimsSection } from "@/components/claims-section";
import { SourceBar } from "@/components/source-bar";
import { ReportSection } from "@/components/report-section";
import type { StreamEvent, SourceURL } from "@/lib/schemas";

export default function Home() {
  const {
    startResearch,
    isLoading,
    phase,
    plan,
    events,
    claims,
    report,
    error,
    reset,
  } = useResearch();

  const [query, setQuery] = useState("");

  const isIdle = phase === "idle";

  const iteration = useMemo(() => {
    return events.filter(
      (e): e is Extract<StreamEvent, { type: "phase-change" }> =>
        e.type === "phase-change"
    ).filter((e) => e.phase === "researching").length;
  }, [events]);

  const sources = useMemo((): SourceURL[] => {
    if (report?.sources && report.sources.length > 0) return report.sources;
    return events
      .filter(
        (e): e is Extract<StreamEvent, { type: "source-added" }> =>
          e.type === "source-added"
      )
      .map((e) => e.source);
  }, [events, report]);

  const handleSubmit = (q: string) => {
    setQuery(q);
    startResearch(q);
  };

  const handleReset = () => {
    reset();
    setQuery("");
  };

  if (isIdle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <p className="text-center text-xs tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-12 select-none">
            Actor-Critic Research
          </p>
          <QueryInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-32">
      <div className="relative content-column">
        <PhaseTimeline phase={phase} events={events} />

        <ResearchHeader
          query={query}
          phase={phase}
          iteration={iteration}
          onReset={handleReset}
        />

        {error && (
          <div className="mt-6 py-4 text-sm text-red-400 animate-fade-in">
            {error}
          </div>
        )}

        {plan && (
          <PlanSection plan={plan} isCollapsible={phase !== "planning"} />
        )}

        {sources.length > 0 && <SourceBar sources={sources} />}

        {claims.length > 0 && <ClaimsSection claims={claims} />}

        {report && <ReportSection report={report} />}
      </div>
    </div>
  );
}
