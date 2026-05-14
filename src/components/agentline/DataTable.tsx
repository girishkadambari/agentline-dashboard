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
        "data-table-scroll min-w-0 max-w-full rounded-xl border border-border/80 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.02)] scrollbar-thin",
        className,
      )}
    >
      <table
        style={{ minWidth: `${minWidth}px` }}
        className={cn("w-full text-[13px] leading-5 [&_th]:font-medium", tableClassName)}
      >
        {children}
      </table>
    </div>
  );
}

/** Standard <thead> styling — small uppercase muted labels, calm divider. */
export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border/70 bg-muted/40 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground [&_th]:h-9 [&_th]:px-3 [&_th]:text-left [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
      {children}
    </thead>
  );
}

/** Standard <tbody> styling — softer dividers, subtle hover, comfortable row height. */
export function DataTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="[&>tr]:border-b [&>tr]:border-border/60 [&>tr:last-child]:border-b-0 [&>tr]:transition-colors [&>tr]:hover:bg-muted/40 [&>tr>td]:px-3 [&>tr>td]:py-2.5 [&>tr>td:first-child]:pl-4 [&>tr>td:last-child]:pr-4">
      {children}
    </tbody>
  );
}