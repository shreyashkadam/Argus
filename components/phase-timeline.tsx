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
    <div className="hidden lg:flex flex-col absolute top-4 left-0 -translate-x-full pr-8">
      {ORDERED_PHASES.map((p, i) => {
        const status = getPhaseStatus(p, phase);
        const isLast = i === ORDERED_PHASES.length - 1;

        return (
          <div key={p} className="flex flex-col items-center">
            <div
              className={cn(
                "flex items-center gap-2 transition-opacity duration-500",
                status === "pending" && "opacity-20"
              )}
            >
              {status === "completed" ? (
                <span className="text-[hsl(var(--muted-foreground))] text-xs w-2 text-center leading-none">
                  ✓
                </span>
              ) : (
                <StatusDot
                  status={status === "active" ? "active" : "idle"}
                  className="flex-shrink-0"
                />
              )}
              <span
                className={cn(
                  "text-xs whitespace-nowrap transition-colors duration-500",
                  status === "active"
                    ? "text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))]"
                )}
              >
                {phaseLabels[p]}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "w-px h-5 my-0.5 transition-opacity duration-500",
                  status === "completed"
                    ? "bg-[hsl(var(--border))] opacity-100"
                    : status === "active"
                    ? "bg-[hsl(var(--border))] opacity-60"
                    : "bg-[hsl(var(--border))] opacity-20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
