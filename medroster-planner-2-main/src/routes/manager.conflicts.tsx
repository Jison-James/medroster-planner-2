import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, CalendarX, Copy, Clock, UserMinus, Sparkles, 
  ChevronDown, ChevronUp, Eye, ShieldAlert, CheckCircle, HelpCircle, FileText
} from "lucide-react";
import { toast } from "sonner";
import { conflictService } from "@/services";
import type { ConflictType } from "@/types";

export const Route = createFileRoute("/manager/conflicts")({ component: Conflicts });

const conflictMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  "LEAVE_VIOLATION": { label: "Leave violation", icon: CalendarX, color: "text-red-500", bg: "bg-red-50" },
  "DOUBLE_BOOKING": { label: "Double booking", icon: Copy, color: "text-red-600", bg: "bg-red-50" },
  "SHIFT_OVERLAP": { label: "Shift overlap", icon: Copy, color: "text-red-500", bg: "bg-red-50" },
  "REST_RULE_VIOLATION": { label: "Rest violation", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
  "OVERTIME_LIMIT_EXCEEDED": { label: "Overtime limit", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  "AVAILABILITY_VIOLATION": { label: "Availability violation", icon: CalendarX, color: "text-yellow-600", bg: "bg-yellow-50" },
  "UNDERSTAFFED_SHIFT": { label: "Understaffed", icon: UserMinus, color: "text-orange-600", bg: "bg-orange-50" },
  "OVERSTAFFED_SHIFT": { label: "Overstaffed", icon: Sparkles, color: "text-yellow-600", bg: "bg-yellow-50" },
  "MAX_CONSECUTIVE_DAYS_EXCEEDED": { label: "Max consecutive days", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  "MAX_NIGHT_SHIFT_LIMIT_EXCEEDED": { label: "Max night shifts", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
};

function Conflicts() {
  const { conflicts, setConflicts, staff, rostersList, activeRosterId, setActiveRosterId } = useApp();
  const navigate = useNavigate();

  // Filter States
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [dateFilter, setDateFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Expand / Dialog States
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [ignoreConflict, setIgnoreConflict] = useState<any>(null);
  const [ignoreNote, setIgnoreNote] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleIgnore = async () => {
    if (!ignoreConflict) return;
    try {
      await conflictService.act(ignoreConflict.id, "Ignore", { note: ignoreNote });
      setConflicts((arr) =>
        arr.map((c) =>
          c.id === ignoreConflict.id
            ? { ...c, status: "Ignored", optionalNote: ignoreNote }
            : c
        )
      );
      toast.success("Conflict marked as Ignored");
      setIgnoreConflict(null);
      setIgnoreNote("");
    } catch (e) {
      toast.error("Failed to ignore conflict");
    }
  };

  const handleReassign = (c: any) => {
    // Navigate to planning board passing date, shift and conflict parameters
    const redirectUrl = `/manager/planning?date=${c.date}&shift=${c.shift || "morning"}&conflict=${c.id}`;
    window.location.href = redirectUrl;
  };

  // Compute Statistics
  const totalCount = conflicts.length;
  const criticalCount = conflicts.filter((c) => c.severity === "Critical").length;
  const highCount = conflicts.filter((c) => c.severity === "High").length;
  const mediumCount = conflicts.filter((c) => c.severity === "Medium").length;
  const resolvedCount = conflicts.filter((c) => c.status === "Resolved").length;
  const ignoredCount = conflicts.filter((c) => c.status === "Ignored").length;

  // Filter Logic
  const filtered = conflicts.filter((c) => {
    // Search Filter
    const employeeName = c.staffId ? staff.find((s) => s.id === c.staffId)?.name || "" : "";
    const matchesSearch =
      c.message.toLowerCase().includes(search.toLowerCase()) ||
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      (c.title && c.title.toLowerCase().includes(search.toLowerCase()));

    // Status Filter
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    // Severity Filter
    const matchesSeverity = severityFilter === "all" || c.severity === severityFilter;

    // Conflict Type Filter
    const matchesType = typeFilter === "all" || c.type === typeFilter;

    // Date Filter
    const matchesDate = !dateFilter || c.date === dateFilter;

    // Shift Filter
    const matchesShift = shiftFilter === "all" || c.shift === shiftFilter;

    // Employee Filter
    const matchesEmployee = employeeFilter === "all" || c.staffId === employeeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSeverity &&
      matchesType &&
      matchesDate &&
      matchesShift &&
      matchesEmployee
    );
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
    }
    if (sortBy === "severity") {
      const severityWeight = { Critical: 3, High: 2, Medium: 1 };
      const weightA = severityWeight[a.severity as "Critical" | "High" | "Medium"] || 0;
      const weightB = severityWeight[b.severity as "Critical" | "High" | "Medium"] || 0;
      return weightB - weightA;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getSeverityBadge = (sev: string) => {
    if (sev === "Critical") return <Badge className="bg-red-600 hover:bg-red-700 text-white border-0">Critical</Badge>;
    if (sev === "High") return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0">High</Badge>;
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-0">Medium</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "Resolved") return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Resolved</Badge>;
    if (status === "Ignored") return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">Ignored</Badge>;
    return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Open</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader title="Roster Audit Module" description="Spot, review and reassign clinical shifts to solve schedule violations." />
        <div className="pt-2">
          <select
            className="flex h-9 w-56 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={activeRosterId || ""}
            onChange={(e) => setActiveRosterId(e.target.value)}
          >
            <option value="" disabled>Select roster</option>
            {rostersList.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Audited</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-red-600 uppercase">Critical</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-orange-500 uppercase">High</p>
            <p className="text-2xl font-bold mt-1 text-orange-500">{highCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-yellow-600 uppercase">Medium</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{mediumCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-green-600 uppercase">Resolved</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{resolvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase">Ignored</p>
            <p className="text-2xl font-bold mt-1 text-gray-500">{ignoredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Search</label>
              <Input
                placeholder="Search staff, code, keyword..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Severity</label>
              <Select value={severityFilter} onValueChange={(val) => { setSeverityFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conflicts</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="severity">Highest Severity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-xl h-[38px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Shift</label>
              <Select value={shiftFilter} onValueChange={(val) => { setShiftFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning Shift</SelectItem>
                  <SelectItem value="evening">Evening Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Employee</label>
              <Select value={employeeFilter} onValueChange={(val) => { setEmployeeFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setSeverityFilter("all");
                  setStatusFilter("Open");
                  setDateFilter("");
                  setShiftFilter("all");
                  setEmployeeFilter("all");
                  setSortBy("newest");
                  setCurrentPage(1);
                }}
                className="text-xs h-[38px] hover:bg-muted"
              >
                Clear all filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Table */}
      {paginated.length === 0 ? (
        <Card className="rounded-2xl border border-border/85 shadow-sm">
          <CardContent className="p-8">
            <EmptyState 
              icon={CheckCircle} 
              title="Congratulations!" 
              description="No scheduling conflicts were detected for the current filters." 
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] pl-4 font-semibold text-xs uppercase">Severity</TableHead>
                  <TableHead className="font-semibold text-xs uppercase">Conflict Code / Type</TableHead>
                  <TableHead className="font-semibold text-xs uppercase">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase">Shift Slot</TableHead>
                  <TableHead className="font-semibold text-xs uppercase">Employee</TableHead>
                  <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
                  <TableHead className="pr-4 text-right font-semibold text-xs uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => {
                  const isExpanded = !!expandedRows[c.id];
                  const meta = conflictMeta[c.type] || { label: c.type.replace("_", " "), icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" };
                  const Icon = meta.icon;
                  const employeeName = c.staffId ? staff.find((s) => s.id === c.staffId)?.name : "—";

                  return (
                    <React.Fragment key={c.id}>
                      <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleRow(c.id)}>
                        <TableCell className="pl-4 py-3">{getSeverityBadge(c.severity)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{c.title || meta.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground font-mono-data">{c.date}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {c.shift || "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm font-medium">{employeeName}</TableCell>
                        <TableCell className="py-3 text-center">{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="pr-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <Button size="xs" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => toggleRow(c.id)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Content Row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={7} className="px-6 py-4 border-t border-b border-border/40">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-left">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detailed Audit</p>
                                <p className="text-foreground text-sm leading-relaxed">{c.description || c.message}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2"><span className="font-semibold">Reason:</span> {c.reason || "Automatic schedule rule violation."}</p>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameters</p>
                                <div className="space-y-1.5">
                                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Rule Limit / Expected:</span> {c.expectedValue || "Rule limits exceeded"}</p>
                                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Current / Actual:</span> {c.actualValue || "Violation state"}</p>
                                </div>
                              </div>

                              <div className="space-y-2 border-l border-border/50 pl-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution Suggestion</p>
                                <p className="text-sm font-medium text-amber-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/50">
                                  {c.suggestedResolution || "Open the Planning Board to reallocate shifts manually."}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-muted-foreground">
                Showing Page {currentPage} of {totalPages} ({filtered.length} total conflicts)
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                  className="rounded-lg h-8"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                  className="rounded-lg h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Details Modal */}
      {selectedConflict && (
        <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
          <DialogContent className="sm:max-w-[550px] rounded-3xl p-6 border border-border/80">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Audit Report: {selectedConflict.title || "Roster Conflict"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Conflict UUID: {selectedConflict.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-sm text-left">
              <div className="grid grid-cols-2 gap-4 border-b border-border/50 pb-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Severity</span>
                  <div className="mt-1">{getSeverityBadge(selectedConflict.severity)}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedConflict.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border/50 pb-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Date</span>
                  <p className="mt-0.5 font-medium">{selectedConflict.date}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Shift Slot</span>
                  <p className="mt-0.5 font-medium capitalize">{selectedConflict.shift || "Custom"}</p>
                </div>
              </div>

              {selectedConflict.staffId && (
                <div className="border-b border-border/50 pb-3">
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Audited Employee</span>
                  <p className="mt-0.5 font-medium">
                    {staff.find((s) => s.id === selectedConflict.staffId)?.name || "—"}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Violation Explanation</span>
                <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-2xl border border-border/30">
                  {selectedConflict.description || selectedConflict.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Expected / Limit</span>
                  <p className="mt-0.5 font-mono-data text-xs">{selectedConflict.expectedValue || "Rule threshold"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Actual Value</span>
                  <p className="mt-0.5 font-mono-data text-xs text-red-600 font-semibold">{selectedConflict.actualValue || "Violation state"}</p>
                </div>
              </div>

              <div className="space-y-1 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Reason for Conflict</span>
                <p className="text-xs text-muted-foreground">{selectedConflict.reason || "Configuration restriction."}</p>
              </div>

              {selectedConflict.suggestedResolution && (
                <div className="space-y-1 bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl">
                  <span className="text-xs text-amber-700 uppercase font-bold block">Suggested Action</span>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">{selectedConflict.suggestedResolution}</p>
                </div>
              )}

              {selectedConflict.status === "Ignored" && (
                <div className="space-y-1 bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Ignored By:</span> {selectedConflict.ignoredBy || "Manager"}</p>
                  {selectedConflict.optionalNote && <p className="mt-0.5"><span className="font-semibold text-foreground">Note:</span> {selectedConflict.optionalNote}</p>}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setSelectedConflict(null)}>
                Close Report
              </Button>
              {selectedConflict.status === "Open" && (
                <Button className="rounded-xl" onClick={() => { handleReassign(selectedConflict); setSelectedConflict(null); }}>
                  Go to Planning Board
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ignore Reason Modal */}
      {ignoreConflict && (
        <Dialog open={!!ignoreConflict} onOpenChange={() => setIgnoreConflict(null)}>
          <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border border-border/80">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Ignore Conflict Note
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide an optional log note explaining why this conflict is being bypassed.
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 space-y-2 text-left">
              <label className="text-xs font-semibold text-muted-foreground">Optional Manager Note</label>
              <Input
                placeholder="e.g. Approved temporary extension for emergency shortage"
                value={ignoreNote}
                onChange={(e) => setIgnoreNote(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-1.5">
              <Button variant="outline" className="rounded-xl" onClick={() => { setIgnoreConflict(null); setIgnoreNote(""); }}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-gray-900 hover:bg-gray-800" onClick={handleIgnore}>
                Ignore Conflict
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
