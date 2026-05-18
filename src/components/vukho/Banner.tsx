import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "error" | "warning" | "info" | "success";

const TONES: Record<Variant, { wrap: string; icon: string; Icon: typeof Info }> = {
  error: {
    wrap: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: "text-destructive",
    Icon: XCircle,
  },
  warning: {
    wrap: "border-warning/40 bg-warning/10 text-[oklch(0.40_0.12_75)]",
    icon: "text-[oklch(0.55_0.14_75)]",
    Icon: AlertTriangle,
  },
  info: {
    wrap: "border-info/30 bg-info/5 text-info",
    icon: "text-info",
    Icon: Info,
  },
  success: {
    wrap: "border-success/30 bg-success/5 text-success",
    icon: "text-success",
    Icon: CheckCircle2,
  },
};

export interface BannerProps {
  variant?: Variant;
  title?: ReactNode;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
}

export function Banner({ variant = "info", title, message, action, onDismiss, className }: BannerProps) {
  const tone = TONES[variant];
  const Icon = tone.Icon;
  const isAlert = variant === "error" || variant === "warning";
  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "polite" : "off"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-foreground",
        tone.wrap,
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", tone.icon)} />
      <div className="min-w-0 flex-1">
        {title && <div className="type-link mb-0.5 leading-snug">{title}</div>}
        <div className="type-caption leading-snug">{message}</div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="type-link rounded-md px-2 py-1 text-foreground transition-colors hover:bg-foreground/5"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-current/70 transition-colors hover:bg-foreground/5"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}