import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarRange } from "lucide-react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export const Route = createFileRoute("/staff/shifts")({ component: MyShifts });

function MyShifts() {
  const { roster, currentUserId, staff } = useApp();
  const me = staff.find((s) => s.id === currentUserId) ?? staff[0];

  if (!me) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading shifts...</div>;
  }

  const mine = roster.filter((r) => r.staffId === me.id);
  const today = new Date();
  const todayShift = mine.find((r) => r.date === format(today, "yyyy-MM-dd"));

  const dayCell = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const e = mine.find((r) => r.date === key);
    return (
      <div key={key} className="rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-semibold text-muted-foreground">{format(date, "EEE, MMM d")}</p>
        <div className="mt-2">{e ? <ShiftBadge shift={e.shift} /> : <span className="text-xs text-muted-foreground">Off</span>}</div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="My shifts" description="Your assigned shifts, day by day." />
      <Tabs defaultValue="weekly">
        <TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList>
        <TabsContent value="daily" className="mt-4">
          {todayShift ? (
            <Card className="rounded-2xl"><CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
              <ShiftBadge shift={todayShift.shift} showTime />
              <p className="text-sm">You're on duty for the {shiftMeta[todayShift.shift].label} shift.</p>
            </CardContent></Card>
          ) : <EmptyState icon={CalendarRange} title="No shift today" description="Enjoy your day off — your next shift will show here." />}
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => dayCell(addDays(startOfWeek(today, { weekStartsOn: 1 }), i)))}
          </div>
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) }).map(dayCell)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
