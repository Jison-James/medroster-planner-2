import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShiftBadge } from "@/components/shared/ShiftBadge";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Repeat, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { swapService } from "@/services";
import { format } from "date-fns";

export const Route = createFileRoute("/manager/swaps")({ component: Swaps });

function Swaps() {
  const { swaps, setSwaps, staff } = useApp();
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? "Unknown";

  const setStatus = async (id: string, status: "Approved" | "Rejected") => {
    if (status === "Approved") await swapService.approve(id); else await swapService.reject(id);
    setSwaps((arr) => arr.map((s) => s.id === id ? { ...s, status } : s));
    toast.success(status === "Approved" ? "Swap approved" : "Swap rejected");
  };

  return (
    <div>
      <PageHeader title="Shift swap requests" description="Approve or decline shift swap requests from your team." />
      <Card className="rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          {swaps.length === 0 ? (
            <EmptyState icon={Repeat} title="No swap requests right now" description="When your team requests swaps, they'll appear here." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Requester</TableHead><TableHead>Date</TableHead><TableHead>Swap</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {swaps.map((sw) => (
                    <TableRow key={sw.id}>
                      <TableCell className="font-medium">{nameOf(sw.staffId)}</TableCell>
                      <TableCell className="font-mono-data text-xs">{format(new Date(sw.date), "MMM d")}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><ShiftBadge shift={sw.currentShift} /><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><ShiftBadge shift={sw.requestedShift} /></div></TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{sw.reason}</TableCell>
                      <TableCell><StatusBadge tone={statusToTone(sw.status)} label={sw.status} /></TableCell>
                      <TableCell className="text-right">
                        {sw.status === "Pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setStatus(sw.id, "Approved")} className="text-success hover:bg-success/10"><Check className="mr-1 h-4 w-4" />Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(sw.id, "Rejected")} className="text-destructive hover:bg-destructive/10"><X className="mr-1 h-4 w-4" />Reject</Button>
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
