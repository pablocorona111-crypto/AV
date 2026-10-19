import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-bg-secondary text-text-primary",
        accent: "bg-accent/20 text-text-primary",
        success: "bg-green-100 text-green-800",
        warning: "bg-amber-100 text-amber-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
        outline: "border border-border text-text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
