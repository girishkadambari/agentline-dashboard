import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] text-primary-foreground shadow-[0_8px_20px_-8px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_12px_28px_-8px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-[1.04] active:translate-y-[0.5px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-surface text-foreground hover:bg-[var(--surface-hover)] hover:border-[var(--primary-border)] hover:text-[var(--primary-strong)] active:translate-y-[0.5px]",
        secondary:
          "bg-[var(--primary-soft)] text-[var(--primary-strong)] border border-[var(--primary-border)]/70 hover:bg-gradient-to-b hover:from-[var(--primary-soft)] hover:to-[color-mix(in_oklab,var(--primary)_14%,white)] hover:border-[var(--primary-border)] active:translate-y-[0.5px]",
        ghost:
          "text-foreground hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]",
        link:
          "text-[var(--primary-strong)] underline-offset-4 hover:underline decoration-[var(--primary-border)] hover:decoration-[var(--primary)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[10px] px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
