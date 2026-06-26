import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trendData } from "@/data/mock";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { Activity, Users, Clock, CalendarCheck, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { reportService } from "@/services";

export const Route = createFileRoute("/manager/reports")({ component: Reports });

function Reports() {
  const exportAs = async (kind: "pdf" | "excel" | "csv") => {
    toast.loading(`Preparing ${kind.toUpperCase()} export…`, { id: "export" });
    await reportService.export(kind);
    toast.success("Export ready", { id: "export", description: `Your ${kind.toUpperCase()} report is ready to download.` });
  };

  return (
    <div>
      <PageHeader title="Reports & analytics" description="Track utilization, attendance, and trends over time." actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportAs("pdf")}><FileText className="mr-1 h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={() => exportAs("excel")}><FileSpreadsheet className="mr-1 h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => exportAs("csv")}><FileDown className="mr-1 h-4 w-4" />CSV</Button>
        </div>
      } />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard icon={Users} label="Staff utilization" value="86%" tone="primary" />
        <StatCard icon={Clock} label="Overtime" value="12 hrs" tone="warning" />
        <StatCard icon={CalendarCheck} label="Attendance" value="95.5%" tone="success" />
        <StatCard icon={Activity} label="Leave taken" value="48 days" tone="accent" />

      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl"><CardHeader><CardTitle className="font-display text-base">Staff utilization by role</CardTitle></CardHeader>
          <CardContent className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData.utilization}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} /></BarChart>
          </ResponsiveContainer></CardContent>
        </Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="font-display text-base">Shift distribution</CardTitle></CardHeader>
          <CardContent className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={trendData.shiftDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>{trendData.shiftDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer></CardContent>
        </Card>
        <Card className="rounded-2xl lg:col-span-2"><CardHeader><CardTitle className="font-display text-base">Attendance over time</CardTitle></CardHeader>
          <CardContent className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.attendance}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="week" /><YAxis domain={[80, 100]} /><Tooltip /><Line type="monotone" dataKey="attendance" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
          </ResponsiveContainer></CardContent>
        </Card>
        <Card className="rounded-2xl lg:col-span-2"><CardHeader><CardTitle className="font-display text-base">Leave trends (last 8 weeks)</CardTitle></CardHeader>
          <CardContent className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData.leaveTrends}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="week" /><YAxis /><Tooltip /><Legend /><Bar dataKey="approved" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} /><Bar dataKey="pending" stackId="a" fill="var(--warning)" radius={[8, 8, 0, 0]} /></BarChart>
          </ResponsiveContainer></CardContent>
        </Card>
      </div>
    </div>
  );
}
