import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const toneClass: Record<Tone, string> = {
  success: "status-success-tint",
  warning: "status-warning-tint",
  danger: "status-danger-tint",
  info: "status-info-tint",
  muted: "bg-muted text-muted-foreground",
};

const defaultIcons: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: Clock,
  danger: XCircle,
  info: CheckCircle2,
  muted: Clock,
};

export function StatusBadge({
  tone,
  label,
  icon,
  className,
}: {
  tone: Tone;
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const Icon = icon ?? defaultIcons[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function statusToTone(s: string): Tone {
  if (["Approved", "Active", "Published", "On-track"].includes(s)) return "success";
  if (["Pending", "Invited", "On Leave"].includes(s)) return "warning";
  if (["Rejected", "Disabled", "Inactive"].includes(s)) return "danger";
  return "muted";
}
