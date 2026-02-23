import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/status-dot";
import type { ResearchPhase, StreamEvent } from "@/lib/schemas";

const ORDERED_PHASES: ResearchPhase[] = [
  "planning",
  "researching",
  "critiquing",
  "synthesizing",
  "complete",
];

const phaseLabels: Partial<Record<ResearchPhase, string>> = {
  planning: "Plan",
  researching: "Research",
  critiquing: "Critique",
  synthesizing: "Synthesize",
  complete: "Done",
};

type PhaseStatus = "completed" | "active" | "pending";

function getPhaseStatus(
  timelinePhase: ResearchPhase,
  currentPhase: ResearchPhase
): PhaseStatus {
  const safePhase: ResearchPhase =
    currentPhase === "error" ? "synthesizing" : currentPhase;
  const currentIdx = ORDERED_PHASES.indexOf(safePhase);
  const phaseIdx = ORDERED_PHASES.indexOf(timelinePhase);

  if (currentIdx === -1) return "pending";
  if (phaseIdx < currentIdx) return "completed";
  if (phaseIdx === currentIdx) {
    return currentPhase === "complete" ? "completed" : "active";
  }
  return "pending";
}

interface PhaseTimelineProps {
  phase: ResearchPhase;
  events: StreamEvent[];
}

export function PhaseTimeline({ phase }: PhaseTimelineProps) {
  return (
    <>
      {/* Vertical timeline — large screens only */}
      <div className="hidden lg:flex flex-col absolute top-4 left-0 -translate-x-full pr-8">
        {ORDERED_PHASES.map((p, i) => {
          const status = getPhaseStatus(p, phase);
          const isLast = i === ORDERED_PHASES.length - 1;

          return (
            <div key={p} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center gap-2.5 transition-opacity duration-500",
                  status === "pending" && "opacity-25"
                )}
              >
                {status === "completed" ? (
                  <span className="h-4 w-4 rounded-full bg-[hsl(var(--foreground))] flex items-center justify-center shrink-0">
                    <span className="text-[hsl(var(--background))] text-[8px] font-bold leading-none">✓</span>
                  </span>
                ) : status === "active" ? (
                  <span className="h-4 w-4 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0 animate-ring-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </span>
                ) : (
                  <span className="h-4 w-4 rounded-full border border-[hsl(var(--border))] shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs whitespace-nowrap transition-colors duration-500",
                    status === "active"
                      ? "text-[hsl(var(--foreground))] font-medium"
                      : "text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  {phaseLabels[p]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px h-5 my-0.5 transition-all duration-500",
                    status === "completed"
                      ? "bg-[hsl(var(--muted-foreground))] opacity-40"
                      : "bg-[hsl(var(--border))] opacity-20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Horizontal stepper — mobile only */}
      <div className="lg:hidden flex items-center gap-0 mb-6">
        {ORDERED_PHASES.map((p, i) => {
          const status = getPhaseStatus(p, phase);
          const isLast = i === ORDERED_PHASES.length - 1;

          return (
            <div key={p} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    status === "completed"
                      ? "bg-[hsl(var(--foreground))] border-[hsl(var(--foreground))]"
                      : status === "active"
                      ? "border-blue-500 bg-blue-500/10 animate-ring-pulse"
                      : "border-[hsl(var(--border))] bg-transparent opacity-40"
                  )}
                >
                  {status === "completed" ? (
                    <span className="text-[hsl(var(--background))] text-[10px] font-bold leading-none">✓</span>
                  ) : status === "active" ? (
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[10px] whitespace-nowrap transition-all duration-500",
                    status === "active"
                      ? "text-[hsl(var(--foreground))] font-medium"
                      : status === "completed"
                      ? "text-[hsl(var(--muted-foreground))]"
                      : "text-[hsl(var(--muted-foreground))] opacity-40"
                  )}
                >
                  {phaseLabels[p]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-all duration-500",
                    status === "completed"
                      ? "bg-[hsl(var(--foreground))] opacity-30"
                      : "bg-[hsl(var(--border))] opacity-30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
