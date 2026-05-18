import { cn } from "@/lib/utils";

function SkeletonRow({ className }: { className?: string }) {
  return <div className={cn("h-10 animate-pulse rounded-md bg-muted", className)} />;
}

function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("h-24 animate-pulse rounded-lg bg-muted", className)} />;
}

function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-lg border bg-surface p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export const Skeleton = {
  Row: SkeletonRow,
  Card: SkeletonCard,
  Table: SkeletonTable,
  Block: SkeletonBlock,
};