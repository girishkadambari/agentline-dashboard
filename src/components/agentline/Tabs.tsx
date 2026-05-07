import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InlineTabs({
  tabs,
  initial,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  initial?: string;
  active?: string;
  onChange?: (id: string) => void;
}) {
  const [internalActive, setInternalActive] = useState(initial ?? tabs[0]?.id);
  const activeId = active ?? internalActive;
  const current = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function selectTab(id: string) {
    setInternalActive(id);
    onChange?.(id);
  }

  return (
    <div>
      <div className="border-b">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeId === t.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">{current?.content}</div>
    </div>
  );
}
