export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-[7px] bg-white text-sidebar shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_1px_2px_rgba(0,0,0,0.18)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5l8 7-8 7" />
          <path d="M13 19h6" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.18_255)] shadow-[0_0_0_2px_var(--color-sidebar)]" />
      </div>
      <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-current">
        Agent<span className="opacity-70">Line</span>
      </span>
    </div>
  );
}
