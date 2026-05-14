import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  agents: "Agents",
  numbers: "Numbers",
  webhooks: "Webhooks",
  playground: "Playground",
  inbox: "Inbox",
  calls: "Calls",
  contacts: "Contacts",
  usage: "Usage",
  billing: "Billing",
  "api-keys": "API Keys",
  "service-health": "Service Health",
  settings: "Settings",
  overview: "Overview",
};

function labelFor(segment: string) {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const matches = useMatches();
  // Pull the deepest matched pathname (e.g. /agents/agt_123)
  const last = matches[matches.length - 1];
  const pathname = (last?.pathname ?? "/").replace(/^\/+|\/+$/g, "");
  const segments = pathname ? pathname.split("/").filter(Boolean) : [];

  if (segments.length === 0) {
    return <span className="type-link text-foreground">Overview</span>;
  }

  let acc = "";
  const crumbs = segments.map((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;
    // Detail IDs (anything matching common id prefixes or long alphanum) — render as plain text
    const isId = /^(agt|usr|wbk|num|msg|cal|cnv|prj|wks|ses|tok)_/i.test(seg) || seg.length > 24;
    const label = isId ? seg : labelFor(seg);
    if (isLast) {
      return (
        <span key={acc} className="type-link truncate text-foreground" title={label}>
          {label}
        </span>
      );
    }
    return (
      <Link
        key={acc}
        to={acc as any}
        className="type-link text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
      </Link>
    );
  });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <Link
        to="/"
        className="type-link text-muted-foreground transition-colors hover:text-foreground"
      >
        Dashboard
      </Link>
      {crumbs.map((node, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {node}
        </span>
      ))}
    </nav>
  );
}