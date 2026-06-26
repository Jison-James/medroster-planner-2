import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { CalendarPlus, CalendarCheck, Repeat, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/staff/dashboard")({ component: StaffDashboard });

function StaffDashboard() {
  const { roster, leaves, currentUserId, staff } = useApp();
  const me = staff.find((s) => s.id === currentUserId) ?? staff[0];
  const today = format(new Date(), "yyyy-MM-dd");
  const mine = roster.filter((r) => r.staffId === me.id).sort((a, b) => a.date.localeCompare(b.date));
  const todayShift = mine.find((r) => r.date === today);
  const upcoming = mine.filter((r) => r.date > today).slice(0, 4);
  const latestLeave = leaves.filter((l) => l.staffId === me.id).slice(-1)[0];

  return (
    <div>
      <PageHeader title={`Welcome back, ${me.name.split(" ")[0]}`} description="Here's what's happening with your schedule." />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="rounded-2xl"><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">My shift today</p>
          {todayShift ? (
            <div className="mt-3 space-y-2"><ShiftBadge shift={todayShift.shift} showTime /><p className="text-xs text-muted-foreground">You're on duty.</p></div>
          ) : <p className="mt-3 font-display text-lg font-semibold">No shift today — enjoy your day off.</p>}
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Upcoming shifts</p>
          <p className="mt-2 font-display text-2xl font-bold">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">In the next few days</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Latest leave</p>
          {latestLeave ? <div className="mt-2"><StatusBadge tone={statusToTone(latestLeave.status)} label={latestLeave.status} /><p className="mt-1 text-xs text-muted-foreground">{latestLeave.type} · {latestLeave.startDate}</p></div> : <p className="mt-2 text-sm">No requests yet</p>}
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Availability</p>
          <div className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm font-medium">Up to date</span></div>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="rounded-2xl lg:col-span-2"><CardContent className="p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Upcoming shifts</h3>
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled — check back later.</p> :
            <ul className="space-y-2">{upcoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div><p className="font-mono-data text-xs text-muted-foreground">{format(new Date(r.date), "EEE, MMM d")}</p><p className="text-sm">{shiftMeta[r.shift].time}</p></div>
                <ShiftBadge shift={r.shift} />
              </li>
            ))}</ul>}
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-6 space-y-2">
          <h3 className="mb-2 font-display text-base font-semibold">Quick actions</h3>
          <Button asChild className="w-full justify-start" variant="outline"><Link to="/staff/request-leave"><CalendarPlus className="mr-2 h-4 w-4" />Request leave</Link></Button>
          <Button asChild className="w-full justify-start" variant="outline"><Link to="/staff/availability"><CalendarCheck className="mr-2 h-4 w-4" />Update availability</Link></Button>
          <Button asChild className="w-full justify-start" variant="outline"><Link to="/staff/swaps"><Repeat className="mr-2 h-4 w-4" />Request shift swap</Link></Button>
        </CardContent></Card>
      </div>
    </div>
  );
}
