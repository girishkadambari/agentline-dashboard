import { useState } from "react";
import type { MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
  onClick,
  showLabel = false,
}: {
  value: string;
  label?: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onClick?.(event);
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
        showLabel && "h-7 w-auto gap-1.5 px-2 text-xs font-medium",
        className,
      )}
      title={copied ? "Copied" : label}
      aria-label={label}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {showLabel && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}
