import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard data table container used across every list view.
 *
 * Provides:
 * - Consistent surface, border, radius, and elevation
 * - Horizontal scroll with thin scrollbars and `overscroll-behavior-x: contain`
 * - A min-width so columns don't collapse on narrow viewports
 * - Tabular numerals via the global `table` rule in styles.css
 */
export function DataTable({
  children,
  minWidth = 960,
  className,
  tableClassName,
}: {
  children: ReactNode;
  minWidth?: number;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <div
      className={cn(
        "data-table-scroll min-w-0 max-w-full rounded-lg border bg-surface shadow-sm scrollbar-thin",
        className,
      )}
    >
      <table
        style={{ minWidth: `${minWidth}px` }}
        className={cn("w-full text-[13px] leading-5", tableClassName)}
      >
        {children}
      </table>
    </div>
  );
}

/** Standard <thead> styling — small uppercase muted labels. */
export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
      {children}
    </thead>
  );
}

/** Standard <tbody> styling — bottom borders, subtle hover. */
export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="[&>tr]:border-b [&>tr:last-child]:border-b-0 [&>tr]:hover:bg-muted/35">{children}</tbody>;
}