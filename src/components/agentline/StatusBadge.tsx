import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  operational: "bg-success/10 text-success border-success/20",
  completed: "bg-success/10 text-success border-success/20",
  delivered: "bg-success/10 text-success border-success/20",
  in_progress: "bg-info/10 text-info border-info/20",
  live: "bg-info/10 text-info border-info/20",
  queued: "bg-info/10 text-info border-info/20",
  draft: "bg-muted text-muted-foreground border-border",
  paused: "bg-muted text-muted-foreground border-border",
  released: "bg-muted text-muted-foreground border-border",
  revoked: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  no_answer: "bg-warning/15 text-warning-foreground border-warning/30",
  degraded: "bg-warning/15 text-warning-foreground border-warning/30",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  failing: "bg-destructive/10 text-destructive border-destructive/20",
  sent: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? "bg-muted text-muted-foreground border-border";
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
