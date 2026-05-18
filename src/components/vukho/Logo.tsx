import { cn } from "@/lib/utils";

/**
 * Vukho brand mark — an open chevron "V" outline with a centered green
 * voice equalizer of five bars. Matches the official brand sheet.
 * Variants: "flat" (header use, inherits currentColor) and "tile" (rounded
 * dark square with white V — for app icons / favicons).
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
  const tileId = "vukho-tile-bg";
  const ink = variant === "tile" ? "#FFFFFF" : "currentColor";
  const bar = "#00C896"; // brand Emerald
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Vukho"
      className={cn("shrink-0", className)}
    >
      {variant === "tile" && (
        <>
          <defs>
            <linearGradient id={tileId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A1A1E" />
              <stop offset="100%" stopColor="#0B0F0E" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" rx="14" fill={`url(#${tileId})`} />
        </>
      )}

      {/* Open chevron "V" — two thick strokes forming the outline */}
      <path
        d="M10 10 L32 54 L54 10 L46 10 L32 38 L18 10 Z"
        fill={ink}
      />

      {/* Centered green voice equalizer — five bars, symmetric arch */}
      <g fill={bar}>
        <rect x="22.5" y="24" width="2.6" height="12" rx="1.3" />
        <rect x="26.7" y="20" width="2.6" height="20" rx="1.3" />
        <rect x="30.9" y="16" width="2.6" height="28" rx="1.3" />
        <rect x="35.1" y="20" width="2.6" height="20" rx="1.3" />
        <rect x="39.3" y="24" width="2.6" height="12" rx="1.3" />
      </g>
    </svg>
  );
}

export function Logo({
  className = "",
  showWordmark = true,
  size = 28,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="text-[17px] font-semibold uppercase tracking-[0.22em] text-foreground"
          style={{ fontFamily: '"Space Grotesk", "Geist", "Inter", ui-sans-serif, system-ui' }}
        >
          Vukho
        </span>
      )}
    </div>
  );
}
