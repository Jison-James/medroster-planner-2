import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarPlus } from "lucide-react";

export const Route = createFileRoute("/staff/leave-status")({ component: LeaveStatus });

function LeaveStatus() {
  const { leaves, currentUserId } = useApp();
  const mine = leaves.filter((l) => l.staffId === currentUserId);

  return (
    <div>
      <PageHeader title="Leave status" description="Track your leave requests at a glance." actions={
        <Button asChild><Link to="/staff/request-leave"><CalendarPlus className="mr-1 h-4 w-4" />New request</Link></Button>
      } />
      <Card className="rounded-2xl"><CardContent className="p-4 sm:p-5">
        {mine.length === 0 ? (
          <EmptyState icon={CalendarPlus} title="No leave requests yet" description="When you submit a request, it'll appear here." actionLabel="Request leave" onAction={() => { window.location.href = "/staff/request-leave"; }} />
        ) : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {mine.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.type}</TableCell>
                  <TableCell className="font-mono-data text-xs">{l.startDate}</TableCell>
                  <TableCell className="font-mono-data text-xs">{l.endDate}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{l.reason}</TableCell>
                  <TableCell><StatusBadge tone={statusToTone(l.status)} label={l.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </CardContent></Card>
    </div>
  );
}
