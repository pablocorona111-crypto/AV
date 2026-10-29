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
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10", iconBg)}>
          <Icon className="h-4 w-4 text-text-primary sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold leading-tight">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
