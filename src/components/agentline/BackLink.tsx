import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  to,
  label,
  className,
}: {
  to: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to as any}
      className={cn(
        "type-caption mb-4 inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}