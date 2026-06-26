import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShiftBadge } from "@/components/shared/ShiftBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Sunset, Moon, CalendarOff } from "lucide-react";

export const Route = createFileRoute("/manager/availability")({ component: Availability });

function Availability() {
  const { staff } = useApp();
  const [period, setPeriod] = useState("this-week");
  const morning = staff.filter((s) => s.preferredShift === "morning").length;
  const evening = staff.filter((s) => s.preferredShift === "evening").length;
  const night = staff.filter((s) => s.preferredShift === "night").length;
  const weekendOff = staff.filter((s) => s.preferredDaysOff.includes("Sat") && s.preferredDaysOff.includes("Sun")).length;

  return (
    <div>
      <PageHeader title="Availability & preferences"
        description="See when your team is available and what shifts they prefer."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="next-week">Next week</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="next-month">Next month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Sun} label="Morning preference" value={morning} tone="warning" />
        <StatCard icon={Sunset} label="Evening preference" value={evening} tone="accent" />
        <StatCard icon={Moon} label="Night preference" value={night} tone="primary" />
        <StatCard icon={CalendarOff} label="Weekend-off requests" value={weekendOff} tone="success" />
      </div>

      <Tabs defaultValue="list" className="mt-6">
        <TabsList><TabsTrigger value="list">List view</TabsTrigger><TabsTrigger value="calendar">Calendar view</TabsTrigger></TabsList>
        <TabsContent value="list" className="mt-4">
          <Card className="rounded-2xl">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {staff.map((s) => (
                  <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }}>{s.name.split(" ").map((n)=>n[0]).join("")}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.role} · {s.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {s.availableDays.map((d) => <span key={d} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{d}</span>)}
                      </div>
                      {s.preferredShift !== "none" && <ShiftBadge shift={s.preferredShift} />}
                      {s.preferredDaysOff.length > 0 && <span className="text-xs text-muted-foreground">Off: {s.preferredDaysOff.join(", ")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="font-display">Weekly preference calendar</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr><th className="p-2 text-left text-xs text-muted-foreground">Staff</th>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <th key={d} className="p-2 text-center text-xs text-muted-foreground">{d}</th>)}
                  </tr></thead>
                  <tbody>
                    {staff.slice(0, 10).map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-2 font-medium">{s.name}</td>
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                          <td key={d} className="p-2 text-center">
                            {s.availableDays.includes(d)
                              ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" aria-label="Available" />
                              : <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" aria-label="Off" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
