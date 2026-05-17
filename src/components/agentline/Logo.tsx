import { cn } from "@/lib/utils";

/**
 * AgentLine mark — a geometric "A" formed by a signal-wave apex with a
 * transmission node replacing the crossbar. Ships in a lavender gradient
 * rounded-square tile for color contexts and a flat variant for headers.
 */
export function LogoMark({
  className,
  size = 28,
  variant = "tile",
}: {
  className?: string;
  size?: number;
  variant?: "tile" | "flat";
}) {
  const id = "agentline-mark-grad";
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="AgentLine"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.18 152)" />
          <stop offset="55%" stopColor="oklch(0.62 0.15 158)" />
          <stop offset="100%" stopColor="oklch(0.45 0.13 162)" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {variant === "tile" && (
        <>
          <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill={`url(#${id})`} />
          <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill={`url(#${id}-sheen)`} />
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="8.5"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
          />
        </>
      )}

      {/* Geometric "A" — two strokes meeting at apex */}
      <path
        d="M9.2 23.5 L15.4 8.6 a0.7 0.7 0 0 1 1.2 0 L22.8 23.5"
        fill="none"
        stroke={variant === "tile" ? "white" : "currentColor"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal node replacing the crossbar — transmission accent */}
      <circle
        cx="16"
        cy="18.6"
        r="1.7"
        fill={variant === "tile" ? "white" : "currentColor"}
      />
      {/* Subtle outgoing pulse arc */}
      <path
        d="M19.4 18.6 a3.6 3.6 0 0 0 -6.8 0"
        fill="none"
        stroke={variant === "tile" ? "rgba(255,255,255,0.55)" : "currentColor"}
        strokeOpacity={variant === "tile" ? 1 : 0.4}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  showWordmark = true,
  size = 26,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.015em] text-foreground">
          Agent<span className="text-[var(--primary-strong)]">Line</span>
        </span>
      )}
    </div>
  );
}
