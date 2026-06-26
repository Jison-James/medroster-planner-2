import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { leaveService } from "@/services";
import type { LeaveType } from "@/types";
import { format } from "date-fns";

export const Route = createFileRoute("/staff/request-leave")({ component: RequestLeave });

const schema = z.object({
  type: z.enum(["Sick", "Casual", "Vacation", "Emergency", "Maternity"]),
  startDate: z.string().min(1, "Pick a start date"),
  endDate: z.string().min(1, "Pick an end date"),
  reason: z.string().min(5, "Please add a brief reason"),
}).refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after the start date", path: ["endDate"] });

type FormData = z.infer<typeof schema>;

function RequestLeave() {
  const { setLeaves, currentUserId } = useApp();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { type: "Sick" },
  });

  const onSubmit = handleSubmit(async (data) => {
    await leaveService.submit(data);
    setLeaves((arr) => [...arr, {
      id: `l${arr.length + 1}`, staffId: currentUserId, ...data,
      status: "Pending", submittedOn: format(new Date(), "yyyy-MM-dd"),
    }]);
    toast.success("Leave request submitted");
    navigate({ to: "/staff/leave-status" });
  });

  return (
    <div>
      <PageHeader title="Request leave" description="Tell us when and why — we'll route it to your manager." />
      <Card className="rounded-2xl max-w-2xl"><CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Leave type</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as LeaveType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Sick","Casual","Vacation","Emergency","Maternity"] as LeaveType[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Start date</Label><Input type="date" {...register("startDate")} />{errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}</div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" {...register("endDate")} />{errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}</div>
          </div>
          <div className="space-y-1.5"><Label>Reason</Label><Textarea rows={4} {...register("reason")} />{errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}</div>
          <Button type="submit">Submit request</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
