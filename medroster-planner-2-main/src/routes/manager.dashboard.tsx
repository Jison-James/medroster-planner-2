import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Stethoscope, Activity, HardHat, CalendarClock, AlertTriangle, CalendarRange, UserPlus, ClipboardCheck, CalendarPlus, CheckCircle2 } from "lucide-react";

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
        description="Here's how your hospital is looking today."
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


    </div>
  );
}
