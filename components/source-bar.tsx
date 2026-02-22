import { cn } from "@/lib/utils";
import type { SourceURL } from "@/lib/schemas";

const sourceTypeColors: Record<string, string> = {
  academic: "bg-violet-500",
  industry: "bg-blue-500",
  news: "bg-amber-500",
  government: "bg-emerald-500",
  other: "bg-zinc-500",
};

interface SourceBarProps {
  sources: SourceURL[];
}

export function SourceBar({ sources }: SourceBarProps) {
  if (sources.length === 0) return null;

  const counts = sources.reduce<Record<string, number>>((acc, s) => {
    acc[s.sourceType] = (acc[s.sourceType] ?? 0) + 1;
    return acc;
  }, {});

  const types = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const total = sources.length;

  return (
    <div className="animate-fade-in py-3">
      <div className="flex h-1 rounded-full overflow-hidden w-full gap-px">
        {types.map(([type, count]) => (
          <div
            key={type}
            className={cn(
              "h-full transition-all duration-500",
              sourceTypeColors[type] ?? sourceTypeColors.other
            )}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {types.map(([type, count]) => (
          <span
            key={type}
            className="text-xs text-[hsl(var(--muted-foreground))]"
          >
            {count} {type}
          </span>
        ))}
      </div>
    </div>
  );
}
