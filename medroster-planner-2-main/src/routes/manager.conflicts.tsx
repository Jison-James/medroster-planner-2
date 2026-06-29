import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertTriangle, CalendarX, Copy, Clock, UserMinus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { conflictService } from "@/services";
import type { ConflictType } from "@/types";

export const Route = createFileRoute("/manager/conflicts")({ component: Conflicts });

const conflictMeta: Record<string, { label: string; icon: typeof CalendarX; color: string; bg: string }> = {
  "Leave_Conflict": { label: "Leave conflict", icon: CalendarX, color: "text-warning", bg: "bg-warning/10" },
  "Double_Booking": { label: "Double booking", icon: Copy, color: "text-destructive", bg: "bg-destructive/10" },
  "Overtime_Violation": { label: "Overtime", icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
  "Understaffed_Shift": { label: "Understaffed", icon: UserMinus, color: "text-warning", bg: "bg-warning/10" },
  "Insufficient_Rest": { label: "Rest violation", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  "Availability_Violation": { label: "Availability violation", icon: CalendarX, color: "text-warning", bg: "bg-warning/10" },
  "Overstaffed_Shift": { label: "Overstaffed shift", icon: Sparkles, color: "text-warning", bg: "bg-warning/10" },
  "Qualification_Mismatch": { label: "Qualification mismatch", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  "Department_Constraint_Violation": { label: "Department constraint", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
};

function Conflicts() {
  const { conflicts, setConflicts, staff } = useApp();
  const open = conflicts.filter((c) => c.status === "Open");

  const act = async (id: string, action: "Resolve" | "Reassign" | "Ignore") => {
    await conflictService.act(id, action);
    setConflicts((arr) => arr.map((c) => c.id === id ? { ...c, status: action === "Ignore" ? "Ignored" : "Resolved" } : c));
    toast.success(action === "Resolve" ? "Conflict resolved" : action === "Reassign" ? "Shift reassigned" : "Conflict ignored");
  };

  return (
    <div>
      <PageHeader title="Conflict center" description="Spot and fix issues before they hit your roster." />
      {open.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-6">
          <EmptyState icon={Sparkles} title="No conflicts right now — your roster is clean." description="We'll surface issues here as soon as they appear." />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {open.map((c) => {
            const meta = conflictMeta[c.type as ConflictType] || { label: c.type.replace("_", " "), icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" };
            const Icon = meta.icon;
            const staffName = c.staffId ? staff.find((s) => s.id === c.staffId)?.name : null;
            return (
              <Card key={c.id} className="rounded-2xl">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}><Icon className="h-5 w-5" /></div>
                    <div>
                      <div className="flex items-center gap-2"><Badge variant="outline" className={meta.color}>{meta.label}</Badge>{staffName && <span className="text-sm font-medium">{staffName}</span>}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.message}</p>
                      <p className="mt-0.5 font-mono-data text-xs text-muted-foreground">{c.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" onClick={() => act(c.id, "Resolve")}>Resolve</Button>
                    <Button size="sm" variant="outline" onClick={() => act(c.id, "Reassign")}>Reassign</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(c.id, "Ignore")}>Ignore</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
