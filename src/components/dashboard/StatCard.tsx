import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  iconBg = "bg-[#C1EB1F]/30",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: string; positive: boolean };
  iconBg?: string;
}) {
  return (
    <Card className="rounded-xl transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
            iconBg
          )}
        >
          <Icon className="h-5 w-5 text-text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold leading-tight tracking-tight">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.positive ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
          {hint && <p className="mt-1.5 text-[11px] text-muted-foreground/80">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
