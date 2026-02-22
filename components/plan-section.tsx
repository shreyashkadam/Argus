"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ResearchPlan } from "@/lib/schemas";

const sourceTypeStyles: Record<string, string> = {
  academic: "bg-violet-500/10 text-violet-500",
  industry: "bg-blue-500/10 text-blue-500",
  news: "bg-amber-500/10 text-amber-500",
  government: "bg-emerald-500/10 text-emerald-500",
  other: "bg-zinc-500/10 text-zinc-400",
};

interface PlanSectionProps {
  plan: ResearchPlan;
  isCollapsible?: boolean;
}

export function PlanSection({ plan, isCollapsible = false }: PlanSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse when the phase moves past planning
  useEffect(() => {
    if (isCollapsible) {
      const timer = setTimeout(() => setCollapsed(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isCollapsible]);

  return (
    <div className="animate-fade-in py-8 border-b border-[hsl(var(--border))]">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-medium">
          Research Plan
        </span>
        {isCollapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            {collapsed ? "Show plan" : "Hide plan"}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <blockquote className="border-l-2 border-[hsl(var(--border))] pl-4 mb-7">
            <p className="text-lg italic leading-relaxed text-[hsl(var(--foreground))]">
              {plan.refinedQuestion}
            </p>
          </blockquote>

          <ol className="space-y-6">
            {plan.angles.map((angle, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex-shrink-0 w-4 pt-0.5 tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed text-[hsl(var(--foreground))] mb-2.5">
                    {angle.angle}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {angle.targetSourceTypes.map((type) => (
                      <span
                        key={type}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          sourceTypeStyles[type] ?? sourceTypeStyles.other
                        )}
                      >
                        {type}
                      </span>
                    ))}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {angle.priority.charAt(0).toUpperCase() +
                        angle.priority.slice(1)}{" "}
                      priority
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
