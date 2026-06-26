import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon, label, value, hint, tone = "primary", className,
}: {
  icon: LucideIcon; label: string; value: string | number; hint?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "danger"; className?: string;
}) {
  const tintMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-[oklch(0.45_0.1_60)]",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className={cn("rounded-2xl border-border shadow-soft", className)}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tintMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
