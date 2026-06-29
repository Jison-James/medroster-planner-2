import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addDays, format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { ShiftType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/roster")({ component: RosterViewer });

function RosterViewer() {
  const { roster, staff, leaves } = useApp();
  const [staffFilter, setStaffFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => {
    if (roster.length > 0) {
      toast.success(`Loaded ${roster.length} active assignments from PostgreSQL database`);
      
      // Auto-center view on the earliest roster date
      try {
        const dates = roster.map(r => new Date(r.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        // Ensure it's a valid date
        if (!isNaN(minDate.getTime())) {
          setViewDate(minDate);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [roster]);
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
      <div
        key={key}
        onClick={() => setSelectedDate(date)}
        className="rounded-2xl border border-border bg-card p-3 cursor-pointer hover:shadow-soft hover:border-primary/50 transition-all"
      >
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
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-3">
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
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PostgreSQL Database Active
          </Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="weekly">
        <TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList>

        <TabsContent value="daily" className="mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {(["morning","evening","night"] as ShiftType[]).map((shift) => {
              const entries = filter(roster.filter((r) => r.date === format(viewDate, "yyyy-MM-dd") && r.shift === shift));
              return (
                <Card key={shift} className="rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <ShiftBadge shift={shift} showTime />
                    {entries.length === 0 ? <p className="text-xs text-muted-foreground">Nobody assigned</p> :
                      entries.map((e) => {
                        const s = staff.find((x) => x.id === e.staffId);
                        if (!s) return null;
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
            {Array.from({ length: 7 }).map((_, i) => renderDay(addDays(startOfWeek(viewDate, { weekStartsOn: 1 }), i)))}
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }).map((d) => renderDay(d))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedDate !== null} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
          {selectedDate && (() => {
            const key = format(selectedDate, "yyyy-MM-dd");
            const dayEntries = roster.filter((r) => r.date === key);
            const totalStaffCount = dayEntries.length;

            return (
              <>
                <DialogHeader className="border-b border-border pb-4">
                  <DialogTitle className="font-display text-xl font-bold">
                    {format(selectedDate, "EEE, MMM d")}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {totalStaffCount} staff member{totalStaffCount === 1 ? "" : "s"} on duty
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {(["morning", "evening", "night"] as ShiftType[]).map((shift) => {
                    const list = dayEntries.filter((e) => e.shift === shift);
                    const timeRange = shift === "morning" ? "07:00–15:00" : shift === "evening" ? "15:00–23:00" : "23:00–07:00";
                    
                    return (
                      <div key={shift} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                          <div className="flex items-center gap-2">
                            <ShiftBadge shift={shift} />
                            <span className="text-xs text-muted-foreground font-mono-data">({timeRange})</span>
                          </div>
                          <span className="inline-flex h-5 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                            {list.length}
                          </span>
                        </div>

                        {list.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-2">No staff scheduled</p>
                        ) : (
                          <div className="divide-y divide-border/30">
                            {list.map((e) => {
                              const s = staff.find((x) => x.id === e.staffId);
                              if (!s) return null;
                              const onLeave = leaves.some(
                                (l) =>
                                  l.staffId === s.id &&
                                  l.status === "Approved" &&
                                  key >= l.startDate &&
                                  key <= l.endDate
                              );

                              return (
                                <div key={e.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback
                                        style={{ backgroundColor: s.avatarColor, color: "#fff" }}
                                        className="text-xs font-semibold"
                                      >
                                        {s.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                                      <p className="text-xs text-muted-foreground">{s.role}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="hidden sm:inline text-xs text-muted-foreground font-mono-data mr-2">
                                      {timeRange}
                                    </span>
                                    <StatusBadge
                                      tone={onLeave ? "warning" : "success"}
                                      label={onLeave ? "On Leave" : "On Duty"}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="border-t border-border pt-4 sm:justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" className="w-full sm:w-auto">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
