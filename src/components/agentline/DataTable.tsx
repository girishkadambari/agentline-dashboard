import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard data table primitives used across every list view.
 *
 * Two modes:
 *
 * 1. Column-driven (preferred):
 *    <DataTable
 *      columns={[{ key, label, width?, align?, render?, sortable?, sortAccessor? }]}
 *      data={rows}
 *      isLoading={...}
 *      emptyState={<EmptyState ... />}
 *      onRowClick={(row) => ...}
 *      pageSize={20}              // enables client pagination
 *      defaultSort={{ key, dir }} // enables client sorting
 *      stickyHeader               // header sticks while body scrolls
 *      maxBodyHeight={520}        // required when stickyHeader for the body to scroll
 *    />
 *
 * 2. Children-driven (legacy / complex):
 *    <DataTable minWidth={1080} stickyHeader>
 *      <DataTableHead>...</DataTableHead>
 *      <DataTableBody>...</DataTableBody>
 *    </DataTable>
 *
 * Keyboard nav (column mode with onRowClick):
 *  - Tab moves focus to the first row, ArrowDown / ArrowUp move row focus,
 *    Home / End jump to first/last row, Enter or Space activates the row.
 */

export type SortDir = "asc" | "desc";

export interface Column<T> {
  key: string;
  label: ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => ReactNode;
  headClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
  /** Value used for sorting. Defaults to row[key]. */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
}

interface BaseProps {
  minWidth?: number;
  className?: string;
  tableClassName?: string;
  rowCount?: number;
  footer?: ReactNode;
  stickyHeader?: boolean;
  /** When stickyHeader is set, constrain the scroll area height (px or CSS). */
  maxBodyHeight?: number | string;
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
  defaultSort?: never;
  pageSize?: never;
}

interface ColumnsProps<T> extends BaseProps {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  getRowKey?: (row: T, index: number) => string | number;
  skeletonRows?: number;
  defaultSort?: { key: string; dir: SortDir };
  /** Enable client-side pagination with N rows per page. */
  pageSize?: number;
  children?: never;
}

export type DataTableProps<T> = ChildrenProps | ColumnsProps<T>;

export function DataTable<T>(props: DataTableProps<T>) {
  if ("columns" in props && props.columns) {
    return <ColumnDataTable {...props} />;
  }
  return <ChildrenDataTable {...(props as ChildrenProps)} />;
}

function Shell({
  minWidth,
  stickyHeader,
  maxBodyHeight,
  className,
  tableClassName,
  children,
}: {
  minWidth: number;
  stickyHeader?: boolean;
  maxBodyHeight?: number | string;
  className?: string;
  tableClassName?: string;
  children: ReactNode;
}) {
  const heightStyle =
    stickyHeader && maxBodyHeight
      ? { maxHeight: typeof maxBodyHeight === "number" ? `${maxBodyHeight}px` : maxBodyHeight }
      : undefined;
  return (
    <div
      style={heightStyle}
      className={cn(
        "data-table-scroll min-w-0 max-w-full rounded-xl border border-border/80 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.02)] scrollbar-thin",
        stickyHeader && "overflow-auto",
        className,
      )}
    >
      <table
        style={{ minWidth: `${minWidth}px` }}
        className={cn(
          "w-full border-separate border-spacing-0 text-[13px] leading-5 [&_th]:font-medium",
          tableClassName,
        )}
      >
        {children}
      </table>
    </div>
  );
}

function ChildrenDataTable({
  children,
  minWidth = 960,
  className,
  tableClassName,
  rowCount,
  footer,
  stickyHeader,
  maxBodyHeight,
}: ChildrenProps) {
  return (
    <div className="min-w-0 max-w-full">
      <StickyContext.Provider value={Boolean(stickyHeader)}>
        <Shell
          minWidth={minWidth}
          stickyHeader={stickyHeader}
          maxBodyHeight={maxBodyHeight}
          className={className}
          tableClassName={tableClassName}
        >
          {children}
        </Shell>
      </StickyContext.Provider>
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
  stickyHeader,
  maxBodyHeight,
  defaultSort,
  pageSize,
}: ColumnsProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // --- Sort
  const sortedData = useMemo(() => {
    if (!sort) return data as ReadonlyArray<T>;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const accessor =
      col.sortAccessor ??
      ((row: T) => (row as Record<string, unknown>)[sort.key] as string | number | Date | null | undefined);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [data, sort, columns]);

  // --- Page
  const totalPages = pageSize ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const pagedData = pageSize ? sortedData.slice(safePage * pageSize, (safePage + 1) * pageSize) : sortedData;

  const showEmpty = !isLoading && data.length === 0 && emptyState;
  if (showEmpty) return <>{emptyState}</>;

  const resolvedRowCount = typeof rowCount === "number" ? rowCount : isLoading ? undefined : sortedData.length;
  const totalCols = columns.length;

  // --- Keyboard nav
  function handleBodyKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (!onRowClick) return;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const rows = Array.from(tbodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row]") ?? []);
    if (rows.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = rows.findIndex((r) => r === current);
    let next = idx;
    if (event.key === "ArrowDown") next = idx < 0 ? 0 : Math.min(idx + 1, rows.length - 1);
    else if (event.key === "ArrowUp") next = idx < 0 ? 0 : Math.max(idx - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = rows.length - 1;
    if (next !== idx) {
      event.preventDefault();
      rows[next]?.focus();
    }
  }

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
    setPage(0);
  }

  return (
    <div className="min-w-0 max-w-full">
      <StickyContext.Provider value={Boolean(stickyHeader)}>
        <Shell
          minWidth={minWidth}
          stickyHeader={stickyHeader}
          maxBodyHeight={maxBodyHeight}
          className={className}
          tableClassName={tableClassName}
        >
          {columns.some((c) => c.width) && (
            <colgroup>
              {columns.map((c) => (
                <col
                  key={c.key}
                  style={c.width ? { width: typeof c.width === "number" ? `${c.width}px` : c.width } : undefined}
                />
              ))}
            </colgroup>
          )}
          <DataTableHead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const dir = active ? sort?.dir : undefined;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined}
                    className={cn(alignClass(c.align), c.headClassName)}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground",
                          c.align === "right" && "ml-auto",
                          c.align === "center" && "mx-auto",
                        )}
                      >
                        <span>{c.label}</span>
                        <span className="inline-flex flex-col leading-none text-muted-foreground/60">
                          <ChevronUp aria-hidden="true" className={cn("h-2.5 w-2.5", active && dir === "asc" && "text-foreground")} />
                          <ChevronDown aria-hidden="true" className={cn("-mt-0.5 h-2.5 w-2.5", active && dir === "desc" && "text-foreground")} />
                        </span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </DataTableHead>
          <DataTableBody refProp={tbodyRef} onKeyDown={handleBodyKeyDown}>
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
              : pagedData.map((row, rowIdx) => {
                  const key = getRowKey
                    ? getRowKey(row, rowIdx)
                    : (row as { id?: string | number })?.id ?? rowIdx;
                  const clickable = Boolean(onRowClick);
                  return (
                    <tr
                      key={key}
                      data-row=""
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
            {!isLoading && pagedData.length === 0 && !emptyState && (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[12.5px] text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </DataTableBody>
        </Shell>
      </StickyContext.Provider>
      <TableFooter
        rowCount={resolvedRowCount}
        footer={footer}
        pagination={
          pageSize && totalPages > 1
            ? {
                page: safePage,
                pageSize,
                totalPages,
                totalRows: sortedData.length,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}

function TableFooter({
  rowCount,
  footer,
  pagination,
}: {
  rowCount?: number;
  footer?: ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
    onPageChange: (next: number) => void;
  };
}) {
  if (!footer && typeof rowCount !== "number" && !pagination) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 type-caption-12-400 text-muted-foreground">
      <div>
        {footer ??
          (pagination
            ? `Showing ${pagination.page * pagination.pageSize + 1}–${Math.min(
                (pagination.page + 1) * pagination.pageSize,
                pagination.totalRows,
              )} of ${pagination.totalRows}`
            : typeof rowCount === "number"
              ? `Showing ${rowCount} ${rowCount === 1 ? "result" : "results"}`
              : null)}
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  const labelId = useId();
  const btn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-surface text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-labelledby={labelId} className="flex items-center gap-1">
      <span id={labelId} className="sr-only">Table pagination</span>
      <button type="button" className={btn} disabled={page === 0} onClick={() => onPageChange(0)} aria-label="First page">
        <ChevronsLeft className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} disabled={page === 0} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="px-2 tabular-nums">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        className={btn}
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(totalPages - 1)}
        aria-label="Last page"
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

// --- Sticky-header context so head/body know to apply sticky styles
import { createContext, useContext, type RefObject } from "react";
const StickyContext = createContext(false);

/** Standard <thead> styling. Inside a stickyHeader DataTable it sticks to the top. */
export function DataTableHead({ children }: { children: ReactNode }) {
  const sticky = useContext(StickyContext);
  return (
    <thead
      className={cn(
        "bg-muted/40 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        "[&_th]:h-9 [&_th]:border-b [&_th]:border-border/70 [&_th]:bg-muted/40 [&_th]:px-3 [&_th]:text-left [&_th:first-child]:pl-4 [&_th:last-child]:pr-4",
        sticky && "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]",
      )}
    >
      {children}
    </thead>
  );
}

/** Standard <tbody> styling — softer dividers, subtle hover, comfortable row height. */
export function DataTableBody({
  children,
  refProp,
  onKeyDown,
}: {
  children: ReactNode;
  refProp?: RefObject<HTMLTableSectionElement>;
  onKeyDown?: (event: KeyboardEvent<HTMLTableSectionElement>) => void;
}) {
  return (
    <tbody
      ref={refProp}
      onKeyDown={onKeyDown}
      className="[&>tr>td]:border-b [&>tr>td]:border-border/60 [&>tr:last-child>td]:border-b-0 [&>tr]:transition-colors [&>tr]:hover:bg-muted/40 [&>tr>td]:px-3 [&>tr>td]:py-2.5 [&>tr>td:first-child]:pl-4 [&>tr>td:last-child]:pr-4"
    >
      {children}
    </tbody>
  );
}
