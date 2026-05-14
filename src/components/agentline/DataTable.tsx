import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard data table primitives used across every list view.
 *
 * Two usage modes:
 *
 * 1. Column-driven (preferred for new code):
 *    <DataTable
 *      columns={[{ key, label, width?, align?, render? }]}
 *      data={rows}
 *      isLoading={...}
 *      emptyState={<EmptyState ... />}
 *      onRowClick={(row) => ...}
 *      rowCount={rows.length}
 *    />
 *
 * 2. Children-driven (legacy / complex layouts):
 *    <DataTable minWidth={1080}>
 *      <DataTableHead>...</DataTableHead>
 *      <DataTableBody>...</DataTableBody>
 *    </DataTable>
 */

export interface Column<T> {
  key: string;
  label: ReactNode;
  /** Pixel width hint; rendered as a <col style="width"> */
  width?: number | string;
  align?: "left" | "right" | "center";
  /** Cell renderer. Defaults to `row[key]` when omitted. */
  render?: (row: T, index: number) => ReactNode;
  /** Header cell className override */
  headClassName?: string;
  /** Body cell className override */
  cellClassName?: string;
}

interface BaseProps {
  minWidth?: number;
  className?: string;
  tableClassName?: string;
  /** When provided (or computed from data.length), shows "Showing N results" footer. */
  rowCount?: number;
  footer?: ReactNode;
}

interface ChildrenProps extends BaseProps {
  children: ReactNode;
  columns?: never;
  data?: never;
  isLoading?: never;
  emptyState?: never;
  onRowClick?: never;
  getRowKey?: never;
  skeletonRows?: never;
}

interface ColumnsProps<T> extends BaseProps {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  /** Stable key for each row. Defaults to `row.id` when present, else index. */
  getRowKey?: (row: T, index: number) => string | number;
  /** Number of skeleton rows while loading. Defaults to 5. */
  skeletonRows?: number;
  children?: never;
}

export type DataTableProps<T> = ChildrenProps | ColumnsProps<T>;

export function DataTable<T>(props: DataTableProps<T>) {
  if ("columns" in props && props.columns) {
    return <ColumnDataTable {...props} />;
  }
  return <ChildrenDataTable {...(props as ChildrenProps)} />;
}

function ChildrenDataTable({
  children,
  minWidth = 960,
  className,
  tableClassName,
  rowCount,
  footer,
}: ChildrenProps) {
  return (
    <div className="min-w-0 max-w-full">
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
      <TableFooter rowCount={rowCount} footer={footer} />
    </div>
  );
}

function ColumnDataTable<T>({
  columns,
  data,
  isLoading,
  emptyState,
  onRowClick,
  getRowKey,
  skeletonRows = 5,
  minWidth = 960,
  className,
  tableClassName,
  rowCount,
  footer,
}: ColumnsProps<T>) {
  const showEmpty = !isLoading && data.length === 0 && emptyState;
  if (showEmpty) {
    return <>{emptyState}</>;
  }

  const resolvedRowCount = typeof rowCount === "number" ? rowCount : isLoading ? undefined : data.length;
  const totalCols = columns.length;

  return (
    <div className="min-w-0 max-w-full">
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
          {columns.some((c) => c.width) && (
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={c.width ? { width: typeof c.width === "number" ? `${c.width}px` : c.width } : undefined} />
              ))}
            </colgroup>
          )}
          <DataTableHead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(alignClass(c.align), c.headClassName)}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, rowIdx) => (
                  <tr key={`sk-${rowIdx}`} aria-hidden="true">
                    {columns.map((c) => (
                      <td key={c.key} className={cn(alignClass(c.align), c.cellClassName)}>
                        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, rowIdx) => {
                  const key = getRowKey
                    ? getRowKey(row, rowIdx)
                    : (row as { id?: string | number })?.id ?? rowIdx;
                  const clickable = Boolean(onRowClick);
                  return (
                    <tr
                      key={key}
                      onClick={clickable ? () => onRowClick!(row, rowIdx) : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? "button" : undefined}
                      onKeyDown={
                        clickable
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onRowClick!(row, rowIdx);
                              }
                            }
                          : undefined
                      }
                      className={clickable ? "cursor-pointer focus:outline-none focus-visible:bg-muted/60" : undefined}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={cn(alignClass(c.align), c.cellClassName)}>
                          {c.render ? c.render(row, rowIdx) : ((row as Record<string, ReactNode>)[c.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
            {!isLoading && data.length === 0 && !emptyState && (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[12.5px] text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </DataTableBody>
        </table>
      </div>
      <TableFooter rowCount={resolvedRowCount} footer={footer} />
    </div>
  );
}

function TableFooter({ rowCount, footer }: { rowCount?: number; footer?: ReactNode }) {
  if (!footer && typeof rowCount !== "number") return null;
  return (
    <div className="mt-2 flex items-center justify-between px-1 type-caption-12-400 text-muted-foreground">
      {footer ?? (
        <span>
          Showing {rowCount} {rowCount === 1 ? "result" : "results"}
        </span>
      )}
    </div>
  );
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
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
