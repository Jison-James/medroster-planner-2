import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Check, X, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { leaveService } from "@/services";
import { format } from "date-fns";

export const Route = createFileRoute("/manager/leave")({ component: LeaveMgmt });

function LeaveMgmt() {
  const { leaves, setLeaves, staff } = useApp();
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");

  const counts = {
    Pending: leaves.filter((l) => l.status === "Pending").length,
    Approved: leaves.filter((l) => l.status === "Approved").length,
    Rejected: leaves.filter((l) => l.status === "Rejected").length,
  };
  const filtered = leaves.filter((l) => filter === "all" || l.status === filter);
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? "Unknown";

  const setStatus = async (id: string, status: "Approved" | "Rejected") => {
    try {
      if (status === "Approved") await leaveService.approve(id); else await leaveService.reject(id);
      setLeaves((arr) => arr.map((l) => l.id === id ? { ...l, status } : l));
      toast.success(status === "Approved" ? "Leave approved" : "Leave rejected");
    } catch (e: any) {
      toast.error(e.message || "Failed to update leave status.");
    }
  };

  return (
    <div>
      <PageHeader title="Leave management" description="Review and respond to your team's time-off requests." />

      <div className="grid gap-3 sm:grid-cols-3">
        {(["Pending","Approved","Rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
            className={cn("rounded-2xl border bg-card p-5 text-left transition-all hover:shadow-soft",
              filter === s ? "border-primary ring-2 ring-primary/20" : "border-border")}>
            <p className="text-sm text-muted-foreground">{s}</p>
            <p className="mt-1 font-display text-3xl font-bold">{counts[s]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{filter === s ? "Showing these" : "Click to filter"}</p>
          </button>
        ))}
      </div>

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No leave requests here" description="When team members request time off, they'll show up." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Staff</TableHead><TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead><TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{nameOf(l.staffId)}</TableCell>
                      <TableCell>{l.type}</TableCell>
                      <TableCell className="font-mono-data text-xs">{format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d")}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{l.reason}</TableCell>
                      <TableCell><StatusBadge tone={statusToTone(l.status)} label={l.status} /></TableCell>
                      <TableCell className="text-right">
                        {l.status === "Pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "Approved")} className="text-success hover:bg-success/10"><Check className="mr-1 h-4 w-4" />Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "Rejected")} className="text-destructive hover:bg-destructive/10"><X className="mr-1 h-4 w-4" />Reject</Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
