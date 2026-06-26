import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { rosterService } from "@/services";
import type { ShiftType } from "@/types";
import { format } from "date-fns";

export const Route = createFileRoute("/manager/assignment")({ component: Assignment });

function Assignment() {
  const { staff, roster, setRoster } = useApp();
  const today = format(new Date(), "yyyy-MM-dd");
  const todays = roster.filter((r) => r.date === today);
  const [picks, setPicks] = useState<Record<string, ShiftType>>({});

  const setPick = (id: string, shift: ShiftType) => setPicks((p) => ({ ...p, [id]: shift }));
  const apply = async (entryId: string, action: "Assign" | "Replace" | "Swap") => {
    const pick = picks[entryId];
    if (!pick) { toast.error("Pick a new shift first"); return; }
    await rosterService.assign({ entryId, pick });
    setRoster((arr) => arr.map((r) => r.id === entryId ? { ...r, shift: pick } : r));
    toast.success(`${action} done — moved to ${shiftMeta[pick].label}`);
  };

  return (
    <div>
      <PageHeader title="Shift assignment" description="Quickly assign, replace, or swap today's shifts." />
      <Card className="rounded-2xl">
        <CardContent className="p-4 sm:p-5 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Current shift</TableHead><TableHead>New shift</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {todays.slice(0, 12).map((e) => {
                const s = staff.find((x) => x.id === e.staffId);
                if (!s) return null;
                return (
                  <TableRow key={e.id}>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }}>{s.name.split(" ").map((n)=>n[0]).join("")}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.role}</p></div></div></TableCell>
                    <TableCell><ShiftBadge shift={e.shift} /></TableCell>
                    <TableCell>
                      <Select value={picks[e.id]} onValueChange={(v) => setPick(e.id, v as ShiftType)}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Pick shift" /></SelectTrigger>
                        <SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => apply(e.id, "Assign")}>Assign</Button>
                        <Button size="sm" variant="ghost" onClick={() => apply(e.id, "Replace")}>Replace</Button>
                        <Button size="sm" variant="ghost" onClick={() => apply(e.id, "Swap")}>Swap</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
