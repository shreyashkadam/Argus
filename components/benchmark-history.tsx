"use client";

import { useState, useEffect, useMemo } from "react";
import type { SessionBenchmark } from "@/lib/schemas";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

type SortKey =
  | "timestamp"
  | "query"
  | "version"
  | "verificationRate"
  | "quoteMatchRate"
  | "totalDuration"
  | "iterations"
  | "skepticMode";

function getSortValue(b: SessionBenchmark, key: SortKey): string | number {
  switch (key) {
    case "timestamp": return b.timestamp;
    case "query": return b.query.toLowerCase();
    case "version": return b.version;
    case "verificationRate": return b.verification.verificationRate;
    case "quoteMatchRate": return b.verification.quoteMatchRate;
    case "totalDuration": return b.timing.totalDurationMs;
    case "iterations": return b.iterations;
    case "skepticMode": return b.config.skepticMode;
  }
}

export function BenchmarkHistory() {
  const [benchmarks, setBenchmarks] = useState<SessionBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch("/api/benchmarks")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setBenchmarks(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const arr = [...benchmarks];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [benchmarks, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading benchmarks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-400">
        Failed to load benchmarks: {error}
      </div>
    );
  }

  if (benchmarks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        No benchmarks recorded yet. Run a research session to generate the first one.
      </div>
    );
  }

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "timestamp", label: "Time" },
    { key: "query", label: "Query" },
    { key: "version", label: "Version" },
    { key: "verificationRate", label: "Verified", align: "right" },
    { key: "quoteMatchRate", label: "Quotes", align: "right" },
    { key: "totalDuration", label: "Duration", align: "right" },
    { key: "iterations", label: "Iters", align: "right" },
    { key: "skepticMode", label: "Mode" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`py-2 px-3 border-b border-[hsl(var(--border))] font-medium text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))] transition-colors select-none whitespace-nowrap ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}{sortIndicator(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(b => (
            <tr key={b.id} className="hover:bg-[hsl(var(--muted))] transition-colors">
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-[hsl(var(--foreground))] whitespace-nowrap tabular-nums">
                {new Date(b.timestamp).toLocaleDateString()} {new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-[hsl(var(--foreground))] max-w-[200px]" title={b.query}>
                {truncate(b.query, 40)}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                {b.version}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))] font-medium">
                {pct(b.verification.verificationRate)}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">
                {pct(b.verification.quoteMatchRate)}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">
                {formatMs(b.timing.totalDurationMs)}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-right tabular-nums text-[hsl(var(--foreground))]">
                {b.iterations}
              </td>
              <td className="py-2 px-3 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                {b.config.skepticMode}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
