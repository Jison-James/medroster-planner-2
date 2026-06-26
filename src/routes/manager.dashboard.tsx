import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { trendData } from "@/data/mock";
import { Users, Stethoscope, Activity, HardHat, CalendarClock, AlertTriangle, CalendarRange, UserPlus, ClipboardCheck, CalendarPlus, CheckCircle2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/manager/dashboard")({ component: ManagerDashboard });

function ManagerDashboard() {
  const { staff, leaves, conflicts, roster } = useApp();
  const today = format(new Date(), "yyyy-MM-dd");
  const todaysStaffing = roster.filter((r) => r.date === today).length;
  const docs = staff.filter((s) => s.role === "Doctor").length;
  const nurses = staff.filter((s) => s.role === "Nurse").length;
  const support = staff.filter((s) => s.role === "Support Staff").length;
  const pending = leaves.filter((l) => l.status === "Pending").length;

  return (
    <div>
      <PageHeader
        title={`Hello, Alex 👋`}
        description="Here's how your team is looking today."
        actions={
          <Button asChild><Link to="/manager/generate"><CalendarPlus className="mr-2 h-4 w-4" />Generate roster</Link></Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total staff" value={staff.length} hint="Active across all roles" tone="primary" />
        <StatCard icon={Stethoscope} label="Doctors" value={docs} tone="accent" />
        <StatCard icon={Activity} label="Nurses" value={nurses} tone="success" />
        <StatCard icon={HardHat} label="Support staff" value={support} tone="warning" />
        <StatCard icon={CalendarClock} label="Pending leave" value={pending} hint="Awaiting your approval" tone="warning" />
        <StatCard icon={AlertTriangle} label="Open conflicts" value={conflicts.length} hint="Need attention" tone="danger" />
        <StatCard icon={CheckCircle2} label="Today's staffing" value={`${todaysStaffing}/48`} hint="Slots filled" tone="success" />
        <StatCard icon={CalendarRange} label="This week" value="On track" tone="primary" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          { to: "/manager/generate", icon: CalendarPlus, label: "Generate roster", desc: "Plan the next period" },
          { to: "/manager/staff", icon: UserPlus, label: "Add staff", desc: "Onboard new team members" },
          { to: "/manager/leave", icon: ClipboardCheck, label: "Approve leave", desc: `${pending} pending requests` },
          { to: "/manager/planning", icon: CalendarRange, label: "Planning board", desc: "Drag and drop shifts" },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="group block">
              <Card className="rounded-2xl border-border transition-shadow hover:shadow-warm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">{q.label}</p>
                    <p className="text-sm text-muted-foreground">{q.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle className="font-display">Staffing overview</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.staffingOverview} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="needed" fill="var(--muted)" radius={[8,8,0,0]} name="Needed" />
                <Bar dataKey="filled" fill="var(--primary)" radius={[8,8,0,0]} name="Filled" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="font-display">Shift distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trendData.shiftDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {trendData.shiftDistribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 pt-2">
              {(["morning","evening","night"] as const).map((s) => <ShiftBadge key={s} shift={s} />)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl">
        <CardHeader><CardTitle className="font-display">Leave trends — last 8 weeks</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.leaveTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              <Legend />
              <Line type="monotone" dataKey="approved" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="pending" stroke="var(--warning)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
