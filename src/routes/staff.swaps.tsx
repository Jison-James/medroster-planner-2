import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { ShiftBadge } from "@/components/shared/ShiftBadge";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { swapService } from "@/services";
import type { ShiftType } from "@/types";
import { format } from "date-fns";

export const Route = createFileRoute("/staff/swaps")({ component: StaffSwaps });

const schema = z.object({
  currentShift: z.enum(["morning","evening","night"]),
  requestedShift: z.enum(["morning","evening","night"]),
  date: z.string().min(1, "Pick a date"),
  reason: z.string().min(5, "Add a short reason"),
}).refine((d) => d.currentShift !== d.requestedShift, { message: "Pick a different shift to swap to", path: ["requestedShift"] });

function StaffSwaps() {
  const { swaps, setSwaps, currentUserId } = useApp();
  const mine = swaps.filter((s) => s.staffId === currentUserId);
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { currentShift: "morning", requestedShift: "evening" },
  });

  const onSubmit = handleSubmit(async (data) => {
    await swapService.submit(data);
    setSwaps((arr) => [...arr, { id: `sw${arr.length + 1}`, staffId: currentUserId, ...data, status: "Pending" }]);
    toast.success("Swap request submitted");
    reset({ currentShift: "morning", requestedShift: "evening", date: "", reason: "" });
  });

  return (
    <div>
      <PageHeader title="Shift swap requests" description="Need to switch a shift? Tell us what works." />
      <Card className="rounded-2xl mb-4 max-w-2xl"><CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Current shift</Label>
              <Select value={watch("currentShift")} onValueChange={(v) => setValue("currentShift", v as ShiftType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Requested shift</Label>
              <Select value={watch("requestedShift")} onValueChange={(v) => setValue("requestedShift", v as ShiftType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
              </Select>
              {errors.requestedShift && <p className="text-xs text-destructive">{errors.requestedShift.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...register("date")} />{errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}</div>
          <div className="space-y-1.5"><Label>Reason</Label><Textarea rows={3} {...register("reason")} />{errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}</div>
          <Button type="submit">Submit swap request</Button>
        </form>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="p-4 sm:p-5">
        <h3 className="mb-3 font-display text-base font-semibold">My swap requests</h3>
        {mine.length === 0 ? <p className="text-sm text-muted-foreground">You haven't submitted any swap requests yet.</p> :
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Swap</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {mine.map((sw) => (
                <TableRow key={sw.id}>
                  <TableCell className="font-mono-data text-xs">{format(new Date(sw.date), "MMM d")}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><ShiftBadge shift={sw.currentShift} /><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><ShiftBadge shift={sw.requestedShift} /></div></TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{sw.reason}</TableCell>
                  <TableCell><StatusBadge tone={statusToTone(sw.status)} label={sw.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        }
      </CardContent></Card>
    </div>
  );
}
