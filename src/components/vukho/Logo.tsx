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

      {/* Hollow chevron "V" outline — single winding traces outer then inner */}
      <path
        d="M6 8 L18 8 L32 40 L46 8 L58 8 L34.2 58 a2.6 2.6 0 0 1 -4.4 0 Z"
        fill={ink}
      />

      {/* Green equalizer — five rounded pills, symmetric arch */}
      <g fill={bar}>
        <rect x="19.5" y="24" width="3" height="12" rx="1.5" />
        <rect x="24.5" y="20" width="3" height="20" rx="1.5" />
        <rect x="30.5" y="16" width="3" height="28" rx="1.5" />
        <rect x="36.5" y="20" width="3" height="20" rx="1.5" />
        <rect x="41.5" y="24" width="3" height="12" rx="1.5" />
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
