"use client";

import { useState } from "react";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { SessionBenchmark } from "@/lib/schemas";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface TimingBarProps {
  timing: SessionBenchmark["timing"];
}

function TimingBar({ timing }: TimingBarProps) {
  const total = timing.totalDurationMs || 1;
  const segments = [
    { label: "Plan", ms: timing.planningDurationMs, color: "bg-blue-500" },
    { label: "Research", ms: timing.researchDurationMs, color: "bg-violet-500" },
    { label: "Skeptic", ms: timing.skepticDurationMs, color: "bg-amber-500" },
    { label: "Synthesis", ms: timing.synthesisDurationMs, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-[hsl(var(--muted))]">
        {segments.map(seg => {
          const widthPct = (seg.ms / total) * 100;
          if (widthPct < 0.5) return null;
          return (
            <div
              key={seg.label}
              className={cn("h-full", seg.color)}
              style={{ width: `${widthPct}%` }}
              title={`${seg.label}: ${formatMs(seg.ms)}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {segments.map(seg => (
          <span key={seg.label} className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", seg.color)} />
            {seg.label} {formatMs(seg.ms)}
          </span>
        ))}
      </div>
    </div>
  );
}

interface BenchmarkCardProps {
  benchmark: SessionBenchmark;
}

export function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
  const [expanded, setExpanded] = useState(false);

  const summaryLine = `${pct(benchmark.verification.verificationRate)} verified · ${formatMs(benchmark.timing.totalDurationMs)}`;

  return (
    <div className="animate-fade-in mt-6 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium">
            Benchmark
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">v{benchmark.version}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--foreground))] tabular-nums">{summaryLine}</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-[hsl(var(--border))]">
          {/* Timing */}
          <div className="pt-4">
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-2">
              Timing
            </p>
            <TimingBar timing={benchmark.timing} />
          </div>

          {/* Claims */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-2">
              Claims
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs">
                <StatusDot status="verified" />
                {benchmark.claims.verified} verified
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <StatusDot status="refuted" />
                {benchmark.claims.refuted} refuted
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <StatusDot status="insufficient" />
                {benchmark.claims.insufficientEvidence} insufficient
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <StatusDot status="unverified" />
                {benchmark.claims.unverified} unverified
              </span>
            </div>
          </div>

          {/* Verification & Quote Match */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-1">
                Verification Rate
              </p>
              <p className="text-lg font-semibold text-[hsl(var(--foreground))] tabular-nums">
                {pct(benchmark.verification.verificationRate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-1">
                Quote Match Rate
              </p>
              <p className="text-lg font-semibold text-[hsl(var(--foreground))] tabular-nums">
                {pct(benchmark.verification.quoteMatchRate)}
              </p>
            </div>
          </div>

          {/* Sources */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-2">
              Sources
            </p>
            <div className="flex items-center gap-3 flex-wrap text-xs text-[hsl(var(--foreground))]">
              <span>{benchmark.sources.total} total</span>
              <span className="text-[hsl(var(--muted-foreground))]">·</span>
              <span>{benchmark.sources.scraped} scraped</span>
              {Object.entries(benchmark.sources.byType).map(([type, count]) => (
                <span key={type} className="text-[hsl(var(--muted-foreground))]">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Quorum Details */}
          {benchmark.quorumDetails && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium mb-2">
                Quorum Details
              </p>
              <p className="text-xs text-[hsl(var(--foreground))] mb-2">
                Model agreement: <span className="font-medium tabular-nums">{pct(benchmark.quorumDetails.modelAgreementRate)}</span>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Model</th>
                      <th className="text-right py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Verified</th>
                      <th className="text-right py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Refuted</th>
                      <th className="text-right py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Insufficient</th>
                      <th className="text-right py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Avg Conf</th>
                      <th className="text-right py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.quorumDetails.perModelStats.map(stat => (
                      <tr key={stat.modelId}>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-medium">{stat.modelId}</td>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">{stat.verifiedCount}</td>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">{stat.refutedCount}</td>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">{stat.insufficientCount}</td>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">{pct(stat.avgConfidence)}</td>
                        <td className="py-1.5 px-2 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">{formatMs(stat.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-[hsl(var(--muted-foreground))]">
            <span>v{benchmark.version}</span>
            <span>{benchmark.iterations} iteration{benchmark.iterations !== 1 ? "s" : ""}</span>
            <span>{benchmark.llmCalls} LLM call{benchmark.llmCalls !== 1 ? "s" : ""}</span>
            <span>{benchmark.traceStepCount} trace step{benchmark.traceStepCount !== 1 ? "s" : ""}</span>
            <span>{benchmark.config.skepticMode} mode</span>
          </div>
        </div>
      )}
    </div>
  );
}
