export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 6h6M4 12h10M4 18h6" />
          <circle cx="18" cy="18" r="2" fill="currentColor" />
        </svg>
      </div>
      <span className="text-[15px] font-semibold tracking-tight">AgentLine</span>
    </div>
  );
}
