import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bell, CalendarCheck, CalendarX, Repeat, RefreshCw, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notificationService } from "@/services";
import { formatDistanceToNow } from "date-fns";
import type { NotificationType } from "@/types";

export const Route = createFileRoute("/staff/notifications")({ component: Notifications });

const icons: Record<NotificationType, typeof Bell> = {
  "Leave Approved": CalendarCheck,
  "Leave Rejected": CalendarX,
  "Shift Changed": RefreshCw,
  "Roster Published": FileCheck2,
  "Swap Approved": Repeat,
};

function Notifications() {
  const { notifications, setNotifications } = useApp();
  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((arr) => arr.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAll = async () => {
    await notificationService.markAllRead();
    setNotifications((arr) => arr.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Stay on top of changes to your schedule." actions={
        <Button variant="outline" onClick={markAll}>Mark all as read</Button>
      } />
      {notifications.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-6"><EmptyState icon={Bell} title="You're all caught up" description="New notifications will show up here." /></CardContent></Card>
      ) : (
        <Card className="rounded-2xl"><CardContent className="p-2">
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const Icon = icons[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <button onClick={() => markRead(n.id)}
                    className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted",
                      !n.read && "bg-primary/5")}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="font-medium">{n.type}</p>{!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}</div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
