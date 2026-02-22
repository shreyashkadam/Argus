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

function ResearchingSkeleton() {
  return (
    <div className="animate-fade-in space-y-4 py-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(var(--border))] flex-shrink-0 animate-skeleton" />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 rounded bg-[hsl(var(--muted))] animate-skeleton"
              style={{ width: `${65 + i * 10}%`, animationDelay: `${i * 0.15}s` }}
            />
            <div
              className="h-3 rounded bg-[hsl(var(--muted))] animate-skeleton"
              style={{ width: `${40 + i * 8}%`, animationDelay: `${i * 0.15 + 0.1}s` }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-[hsl(var(--muted-foreground))] pt-2 animate-skeleton">
        Searching the web and extracting evidence…
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="animate-fade-in mt-6 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-base leading-none mt-0.5 flex-shrink-0">✕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400 mb-1">Research failed</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed wrap-break-word">
            {message}
          </p>
          <button
            onClick={onRetry}
            className="mt-3 text-xs text-[hsl(var(--foreground))] underline underline-offset-2 hover:text-red-400 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const showSkeleton =
    (phase === "researching" || phase === "critiquing" || phase === "synthesizing") &&
    claims.length === 0;

  const handleSubmit = (q: string) => {
    setQuery(q);
    startResearch(q);
  };

  const handleReset = () => {
    reset();
    setQuery("");
  };

  const handleRetry = () => {
    if (query) startResearch(query);
  };

  if (isIdle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-14 select-none">
            <h1 className="text-5xl font-semibold tracking-tight text-[hsl(var(--foreground))] mb-3">
              Argus
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Multi-agent research with adversarial fact-checking
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 opacity-60">
              by{" "}
              <a
                href="https://shreyashkadam.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-100 hover:text-[hsl(var(--foreground))] transition-all"
              >
                Shreyash Kadam
              </a>
            </p>
          </div>
          <QueryInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky query bar */}
      <div className="sticky top-0 z-20 bg-[hsl(var(--background))]/95 backdrop-blur-sm">
        <div className="content-column">
          <ResearchHeader
            query={query}
            phase={phase}
            iteration={iteration}
            onReset={handleReset}
          />
        </div>
      </div>

      <div className="relative content-column pt-8">
        <PhaseTimeline phase={phase} events={events} />

        {error && <ErrorState message={error} onRetry={handleRetry} />}

        {plan && (
          <PlanSection plan={plan} isCollapsible={phase !== "planning"} />
        )}

        {sources.length > 0 && <SourceBar sources={sources} />}

        {showSkeleton && <ResearchingSkeleton />}

        {claims.length > 0 && <ClaimsSection claims={claims} />}

        {report && (
          <div className="border-t border-[hsl(var(--border))]">
            <ReportSection report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
