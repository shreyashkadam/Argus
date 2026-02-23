"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { FinalReport } from "@/lib/schemas";

const INITIAL_SOURCE_COUNT = 10;

const sourceTypeStyles: Record<string, string> = {
  academic: "bg-violet-500/10 text-violet-500",
  industry: "bg-blue-500/10 text-blue-500",
  news: "bg-amber-500/10 text-amber-500",
  government: "bg-emerald-500/10 text-emerald-500",
  other: "bg-zinc-500/10 text-zinc-400",
};

interface ReportSectionProps {
  report: FinalReport;
}

export function ReportSection({ report }: ReportSectionProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayedSources = showAllSources
    ? report.sources
    : report.sources.slice(0, INITIAL_SOURCE_COUNT);
  const hiddenSourceCount = report.sources.length - INITIAL_SOURCE_COUNT;
  const markdownContent = [
    `# ${report.title}`,
    "",
    report.summary,
    "",
    ...report.sections.flatMap((s) => [`## ${s.heading}`, "", s.content, ""]),
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard API may be unavailable */ }
  };

  return (
    <div className="animate-fade-in py-8">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium">
          Report
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
      </div>

      {/* Evidence Scorecard — shown above prose so readers know quality upfront */}
      <div className="mt-4 mb-2 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <StatusDot status="verified" />
          <span className="text-[hsl(var(--foreground))]">
            {report.verifiedClaimCount} Verified
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StatusDot status="refuted" />
          <span className="text-[hsl(var(--foreground))]">
            {report.refutedClaimCount} Refuted
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StatusDot status="insufficient" />
          <span className="text-[hsl(var(--foreground))]">
            {report.insufficientEvidenceCount} Insufficient
          </span>
        </div>
      </div>

      <div className="mt-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-semibold mt-8 mb-3 text-[hsl(var(--foreground))] leading-tight">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mt-7 mb-2 text-[hsl(var(--foreground))] leading-snug">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-5 mb-1.5 text-[hsl(var(--foreground))]">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-base leading-relaxed mb-4 text-[hsl(var(--foreground))]">
                {children}
              </p>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-[hsl(var(--foreground))] hover:text-blue-400 transition-colors"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[hsl(var(--border))] pl-4 my-4 bg-[hsl(var(--muted))] py-3 pr-3 rounded-r-sm">
                {children}
              </blockquote>
            ),
            pre: ({ children }) => (
              <pre className="overflow-x-auto my-4 rounded-md bg-[hsl(var(--muted))] p-4 text-sm">
                {children}
              </pre>
            ),
            code: ({ className, children }) => {
              const isBlock = /language-/.test(className ?? "");
              return (
                <code
                  className={cn(
                    "font-mono text-xs text-[hsl(var(--foreground))]",
                    isBlock ? "" : "bg-[hsl(var(--muted))] rounded px-1 py-0.5"
                  )}
                >
                  {children}
                </code>
              );
            },
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-1 mb-4 text-[hsl(var(--foreground))]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-1 mb-4 text-[hsl(var(--foreground))]">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-sm leading-relaxed">{children}</li>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left text-xs font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-[hsl(var(--border))] px-3 py-2 text-xs text-[hsl(var(--foreground))]">
                {children}
              </td>
            ),
            hr: () => (
              <hr className="border-[hsl(var(--border))] my-6" />
            ),
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>

      {/* Sources */}
      {report.sources.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium">
              Sources
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {report.sources.length} total
            </span>
          </div>
          <ol className="mt-4 space-y-2.5">
            {displayedSources.map((source, i) => (
              <li key={i} className="flex items-center gap-3 text-sm min-w-0">
                <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 w-5 tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.title || source.domain}
                    className="text-sm underline underline-offset-2 text-[hsl(var(--foreground))] hover:text-blue-400 transition-colors truncate"
                  >
                    {source.title || source.domain}
                  </a>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      sourceTypeStyles[source.sourceType] ??
                        sourceTypeStyles.other
                    )}
                  >
                    {source.sourceType}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {report.sources.length > INITIAL_SOURCE_COUNT && (
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-4 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              {showAllSources
                ? "Show fewer sources"
                : `Show ${hiddenSourceCount} more source${hiddenSourceCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
