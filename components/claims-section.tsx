"use client";

import { useState, useEffect, useRef } from "react";
import { StatusDot, type StatusDotStatus } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { Claim } from "@/lib/schemas";

function claimStatusToDot(status: string): StatusDotStatus {
  if (status === "insufficient_evidence") return "insufficient";
  if (status === "verified") return "verified";
  if (status === "refuted") return "refuted";
  return "unverified";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

interface ClaimItemProps {
  claim: Claim;
  isNew: boolean;
  trackUpdates: boolean;
}

function ClaimItem({ claim, isNew, trackUpdates }: ClaimItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const prevStatus = useRef(claim.status);

  useEffect(() => {
    if (trackUpdates && prevStatus.current !== claim.status) {
      setHighlight(true);
      const t = setTimeout(() => setHighlight(false), 1200);
      prevStatus.current = claim.status;
      return () => clearTimeout(t);
    }
  }, [claim.status, trackUpdates]);

  const dotStatus = claimStatusToDot(claim.status);

  const confidencePct = claim.confidence !== undefined
    ? Math.round(claim.confidence * 100)
    : null;

  return (
    <div
      className={cn(
        "py-5 border-b border-[hsl(var(--border))] transition-colors duration-700",
        isNew && "animate-fade-in",
        highlight && "bg-[hsl(var(--muted))]"
      )}
    >
      <div className="flex items-start gap-3">
        <StatusDot status={dotStatus} className="mt-1.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-[hsl(var(--foreground))] mb-1">
            {claim.statement}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {claim.claimType.charAt(0).toUpperCase() + claim.claimType.slice(1)}
              {" · "}
              {claim.category}
            </p>
            {confidencePct !== null && claim.status !== "unverified" && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums",
                  confidencePct >= 75
                    ? "bg-emerald-500/10 text-emerald-500"
                    : confidencePct >= 40
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-red-500/10 text-red-500"
                )}
              >
                {confidencePct}%
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            {expanded ? "Hide evidence" : "Show evidence"}
          </button>

          {expanded && (
            <div className="mt-4 space-y-4 animate-fade-in">
              {claim.supportingEvidence.length > 0 && (
                <div className="space-y-3">
                  {claim.supportingEvidence.map((ev, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-emerald-500/40 pl-3"
                    >
                      <p className="text-xs italic leading-relaxed text-[hsl(var(--foreground))] mb-1.5">
                        &ldquo;{ev.verbatimQuote}&rdquo;
                      </p>
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline transition-colors"
                      >
                        {ev.sourceTitle || getDomain(ev.sourceUrl)}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {claim.refutingEvidence.length > 0 && (
                <div className="space-y-3">
                  {claim.refutingEvidence.map((ev, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-red-500/40 pl-3"
                    >
                      <p className="text-xs italic leading-relaxed text-[hsl(var(--foreground))] mb-1.5">
                        &ldquo;{ev.verbatimQuote}&rdquo;
                      </p>
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline transition-colors"
                      >
                        {ev.sourceTitle || getDomain(ev.sourceUrl)}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {claim.skepticReasoning && (
                <div className="border-l-2 border-[hsl(var(--border))] pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1 font-medium">
                    Skeptic verdict
                  </p>
                  <p className="text-xs italic text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {claim.skepticReasoning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ClaimsSectionProps {
  claims: Claim[];
}

export function ClaimsSection({ claims }: ClaimsSectionProps) {
  const prevClaimIds = useRef<Set<string>>(new Set());
  const [newClaimIds, setNewClaimIds] = useState<Set<string>>(new Set());
  const [existingClaimIds, setExistingClaimIds] = useState<Set<string>>(
    new Set()
  );
  const [sectionCollapsed, setSectionCollapsed] = useState(false);

  useEffect(() => {
    const currentIds = new Set(claims.map((c) => c.id));
    const fresh = new Set<string>();
    const existing = new Set<string>();

    claims.forEach((c) => {
      if (!prevClaimIds.current.has(c.id)) {
        fresh.add(c.id);
      } else {
        existing.add(c.id);
      }
    });

    setNewClaimIds(fresh);
    setExistingClaimIds(existing);
    prevClaimIds.current = currentIds;
  }, [claims]);

  if (claims.length === 0) return null;

  const verified = claims.filter((c) => c.status === "verified").length;
  const refuted = claims.filter((c) => c.status === "refuted").length;
  const insufficient = claims.filter(
    (c) => c.status === "insufficient_evidence"
  ).length;
  const unverified = claims.filter((c) => c.status === "unverified").length;

  return (
    <div className="animate-fade-in py-8">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium">
          Claims
        </span>
        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] flex-wrap justify-end">
          {verified > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="verified" />
              {verified} verified
            </span>
          )}
          {refuted > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="refuted" />
              {refuted} refuted
            </span>
          )}
          {insufficient > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="insufficient" />
              {insufficient} insufficient
            </span>
          )}
          {unverified > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="unverified" />
              {unverified} unverified
            </span>
          )}
          <span className="text-[hsl(var(--border))]">·</span>
          <button
            onClick={() => setSectionCollapsed(!sectionCollapsed)}
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            {sectionCollapsed ? `Show ${claims.length} claims` : "Hide"}
          </button>
        </div>
      </div>

      {!sectionCollapsed && (
        <div>
          {claims.map((claim) => (
            <ClaimItem
              key={claim.id}
              claim={claim}
              isNew={newClaimIds.has(claim.id)}
              trackUpdates={existingClaimIds.has(claim.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
