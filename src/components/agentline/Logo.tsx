import { cn } from "@/lib/utils";

/**
 * Vukho mark — a bold geometric "V" with a centered green voice equalizer
 * (five ascending/descending bars) representing live AI-agent conversation.
 * Two variants: a gradient rounded-square "tile" and a flat mark for headers.
 */
export function LogoMark({
  className,
  size = 28,
  variant = "flat",
}: {
  className?: string;
  size?: number;
  variant?: "tile" | "flat";
}) {
  const id = "vukho-mark-grad";
  const barGrad = "vukho-bar-grad";
  const ink = variant === "tile" ? "white" : "currentColor";
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Vukho"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.22 0.01 280)" />
          <stop offset="100%" stopColor="oklch(0.12 0.01 280)" />
        </linearGradient>
        <linearGradient id={barGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.18 152)" />
          <stop offset="100%" stopColor="oklch(0.55 0.16 158)" />
        </linearGradient>
      </defs>

      {variant === "tile" && (
        <>
          <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill={`url(#${id})`} />
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="8.5"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
          />
        </>
      )}

      {/* Bold "V" — thick chevron with a soft inner notch */}
      <path
        d="M4.6 5.2 L9.4 5.2 L16 22.4 L22.6 5.2 L27.4 5.2 L18.2 27.6 a2.4 2.4 0 0 1 -4.4 0 Z"
        fill={ink}
      />

      {/* Centered green voice equalizer — five bars */}
      <g fill={`url(#${barGrad})`}>
        <rect x="11.3" y="13.2" width="1.5" height="5.6" rx="0.75" />
        <rect x="13.4" y="11.0" width="1.5" height="10.0" rx="0.75" />
        <rect x="15.25" y="9.0" width="1.5" height="14.0" rx="0.75" />
        <rect x="17.1" y="11.0" width="1.5" height="10.0" rx="0.75" />
        <rect x="19.2" y="13.2" width="1.5" height="5.6" rx="0.75" />
      </g>
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
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="text-[16px] font-semibold uppercase tracking-[0.14em] text-foreground"
          style={{ fontFamily: '"Space Grotesk", "Geist", ui-sans-serif, system-ui' }}
        >
          Vukho
        </span>
      )}
    </div>
  );
}
