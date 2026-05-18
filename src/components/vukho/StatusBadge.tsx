import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // green family — success / completed / healthy
  active: "bg-success/10 text-success ring-success/25",
  operational: "bg-success/10 text-success ring-success/25",
  completed: "bg-success/10 text-success ring-success/25",
  delivered: "bg-success/10 text-success ring-success/25",
  succeeded: "bg-success/10 text-success ring-success/25",
  // blue family — in-flight / live
  in_progress: "bg-info/10 text-info ring-info/25",
  live: "bg-info/10 text-info ring-info/25",
  ringing: "bg-info/10 text-info ring-info/25",
  // amber — queued / pending / waiting
  queued: "bg-warning/12 text-[oklch(0.45_0.12_75)] ring-warning/30",
  pending: "bg-warning/12 text-[oklch(0.45_0.12_75)] ring-warning/30",
  no_answer: "bg-warning/12 text-[oklch(0.45_0.12_75)] ring-warning/30",
  degraded: "bg-warning/12 text-[oklch(0.45_0.12_75)] ring-warning/30",
  // neutral — inactive / disabled
  draft: "bg-muted text-muted-foreground ring-border",
  paused: "bg-muted text-muted-foreground ring-border",
  disabled: "bg-muted text-muted-foreground ring-border",
  released: "bg-muted text-muted-foreground ring-border",
  revoked: "bg-muted text-muted-foreground ring-border",
  sent: "bg-muted text-muted-foreground ring-border",
  // red — failed
  failed: "bg-destructive/10 text-destructive ring-destructive/25",
  failing: "bg-destructive/10 text-destructive ring-destructive/25",
  error: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? "bg-muted text-muted-foreground ring-border";
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium capitalize ring-1 ring-inset",
      cls,
    )}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
