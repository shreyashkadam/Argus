"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-85",
        secondary:
          "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80",
        ghost:
          "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm rounded-md",
        sm: "h-7 px-3 py-1 text-xs rounded-md",
        lg: "h-11 px-6 py-3 text-base rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
