import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
