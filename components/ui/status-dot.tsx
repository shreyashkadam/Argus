import { cn } from "@/lib/utils";

export type StatusDotStatus =
  | "verified"
  | "refuted"
  | "insufficient"
  | "unverified"
  | "active"
  | "idle";

const statusColors: Record<StatusDotStatus, string> = {
  verified: "bg-emerald-500",
  refuted: "bg-red-500",
  insufficient: "bg-amber-500",
  unverified: "bg-zinc-400",
  active: "bg-blue-500 animate-pulse",
  idle: "bg-zinc-600",
};

const statusLabels: Record<StatusDotStatus, string> = {
  verified: "Verified",
  refuted: "Refuted",
  insufficient: "Insufficient evidence",
  unverified: "Unverified",
  active: "In progress",
  idle: "Idle",
};

interface StatusDotProps {
  status: StatusDotStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full h-2 w-2 shrink-0",
        statusColors[status],
        className
      )}
      role="status"
      aria-label={statusLabels[status]}
      title={statusLabels[status]}
    />
  );
}
