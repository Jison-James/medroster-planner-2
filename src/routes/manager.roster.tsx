import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addDays, format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { ShiftType } from "@/types";

export const Route = createFileRoute("/manager/roster")({ component: RosterViewer });

function RosterViewer() {
  const { roster, staff } = useApp();
  const [staffFilter, setStaffFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");

  const today = new Date();
  const filter = (entries: typeof roster) => entries.filter((r) => {
    const s = staff.find((x) => x.id === r.staffId);
    if (!s) return false;
    return (staffFilter === "all" || s.id === staffFilter) &&
      (roleFilter === "all" || s.role === roleFilter) &&
      (shiftFilter === "all" || r.shift === shiftFilter);
  });

  const renderDay = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const entries = filter(roster.filter((r) => r.date === key));
    return (
      <div key={key} className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{format(date, "EEE, MMM d")}</p>
        <div className="space-y-2">
          {(["morning","evening","night"] as ShiftType[]).map((shift) => {
            const list = entries.filter((e) => e.shift === shift);
            return (
              <div key={shift} className="space-y-1">
                <ShiftBadge shift={shift} />
                <div className="flex flex-wrap gap-1">
                  {list.slice(0, 4).map((e) => {
                    const s = staff.find((x) => x.id === e.staffId);
                    if (!s) return null;
                    return (
                      <Avatar key={e.id} className="h-6 w-6" title={s.name}>
                        <AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }} className="text-[10px]">
                          {s.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {list.length > 4 && <span className="text-xs text-muted-foreground">+{list.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Roster viewer" description="See who's on duty across days, weeks, and months." />
      <Card className="mb-4 rounded-2xl">
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All staff" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All staff</SelectItem>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="Doctor">Doctors</SelectItem><SelectItem value="Nurse">Nurses</SelectItem><SelectItem value="Support Staff">Support</SelectItem></SelectContent>
          </Select>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All shifts" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All shifts</SelectItem><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="weekly">
        <TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList>

        <TabsContent value="daily" className="mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {(["morning","evening","night"] as ShiftType[]).map((shift) => {
              const entries = filter(roster.filter((r) => r.date === format(today, "yyyy-MM-dd") && r.shift === shift));
              return (
                <Card key={shift} className="rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <ShiftBadge shift={shift} showTime />
                    {entries.length === 0 ? <p className="text-xs text-muted-foreground">Nobody assigned</p> :
                      entries.map((e) => {
                        const s = staff.find((x) => x.id === e.staffId)!;
                        return <div key={e.id} className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }} className="text-xs">{s.name.split(" ").map((n)=>n[0]).join("")}</AvatarFallback></Avatar>
                          <div className="min-w-0"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.role}</p></div>
                        </div>;
                      })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => renderDay(addDays(startOfWeek(today, { weekStartsOn: 1 }), i)))}
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) }).map((d) => renderDay(d))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
