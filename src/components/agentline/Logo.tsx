import { cn } from "@/lib/utils";

/**
 * AgentLine mark — a chunky geometric "A" cut from an emerald tile, with a
 * three-bar voice equalizer in place of the crossbar (live conversation) and
 * a glowing signal node at the top-right (active line). Two variants: a
 * gradient rounded-square "tile" and a flat monochrome mark for headers.
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
  const ink = variant === "tile" ? "white" : "currentColor";
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
          <stop offset="0%" stopColor="oklch(0.84 0.19 152)" />
          <stop offset="50%" stopColor="oklch(0.62 0.16 158)" />
          <stop offset="100%" stopColor="oklch(0.4 0.13 164)" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={`${id}-pulse`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(167,243,208,1)" />
          <stop offset="100%" stopColor="rgba(167,243,208,0)" />
        </radialGradient>
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
            stroke="rgba(255,255,255,0.22)"
          />
        </>
      )}

      {/* Bold geometric "A" — two thick strokes meeting at a soft apex */}
      <path
        d="M8.4 24 L14.7 8.7 a1.45 1.45 0 0 1 2.6 0 L23.6 24"
        fill="none"
        stroke={ink}
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Voice equalizer in place of the crossbar — three ascending bars */}
      <g stroke={ink} strokeWidth="1.7" strokeLinecap="round">
        <line x1="13.0" y1="19.4" x2="13.0" y2="17.2" />
        <line x1="16.0" y1="20.1" x2="16.0" y2="15.4" />
        <line x1="19.0" y1="19.4" x2="19.0" y2="16.3" />
      </g>

      {/* Live signal node — top-right glow */}
      {variant === "tile" && (
        <circle cx="24.2" cy="7.8" r="3.6" fill={`url(#${id}-pulse)`} opacity="0.85" />
      )}
      <circle
        cx="24.2"
        cy="7.8"
        r="1.35"
        fill={ink}
        opacity={variant === "tile" ? 1 : 0.9}
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
        <span className="text-[15px] font-semibold tracking-[-0.018em] text-foreground">
          Agent<span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-strong)] bg-clip-text text-transparent">Line</span>
        </span>
      )}
    </div>
  );
}
