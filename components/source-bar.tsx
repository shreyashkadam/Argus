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
    <div className="animate-fade-in py-4">
      <div className="flex h-2.5 rounded-full overflow-hidden w-full gap-0.5">
        {types.map(([type, count]) => (
          <div
            key={type}
            className={cn(
              "h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full",
              sourceTypeColors[type] ?? sourceTypeColors.other
            )}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${count} ${type} source${count !== 1 ? "s" : ""}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <span className="text-xs font-medium text-[hsl(var(--foreground))]">
          {total} source{total !== 1 ? "s" : ""}
        </span>
        <span className="text-[hsl(var(--border))] text-xs">·</span>
        {types.map(([type, count]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", sourceTypeColors[type] ?? sourceTypeColors.other)} />
            {count} {type}
          </span>
        ))}
      </div>
    </div>
  );
}
