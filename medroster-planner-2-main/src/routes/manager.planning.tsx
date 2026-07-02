import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { rosterService, conflictService } from "@/services";
import { Card, CardContent } from "@/components/ui/card";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { format, addDays, parseISO } from "date-fns";
import type { ShiftType, RosterEntry, Staff } from "@/types";
import { 
  AlertCircle, Calendar, Search, MoreVertical, Trash2, 
  ArrowLeftRight, UserCheck, Plus, RefreshCw, Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/manager/planning")({ component: Planning });

interface StaffCardProps {
  id: string;
  name: string;
  role: string;
  color: string;
  isHighlighted?: boolean;
  assignment?: RosterEntry;
  onMoveShift?: (assignment: RosterEntry, newShift: ShiftType) => void;
  onMarkVacant?: (assignmentId: string) => void;
  onOpenReassign?: (assignment: RosterEntry) => void;
  onOpenSwap?: (assignment: RosterEntry) => void;
}

function StaffCard({ 
  id, name, role, color, isHighlighted, assignment,
  onMoveShift, onMarkVacant, onOpenReassign, onOpenSwap 
}: StaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  return (
    <div ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex items-center gap-2 rounded-xl border p-2.5 bg-card hover:border-muted-foreground/30 transition-all shadow-sm",
        isHighlighted 
          ? "border-red-500 bg-red-50/50 shadow-sm ring-2 ring-red-500/20" 
          : "border-border",
        isDragging && "opacity-50 shadow-warm"
      )}
    >
      {/* Drag handle area */}
      <div {...listeners} {...attributes} className="flex cursor-grab items-center gap-2 active:cursor-grabbing flex-1 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback style={{ backgroundColor: color, color: "#fff" }} className="text-xs font-semibold">
            {name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{role}</Badge>
        </div>
      </div>

      {/* Card actions menu */}
      {assignment && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold px-2 py-1">Move Shift</DropdownMenuLabel>
            {(["morning", "evening", "night"] as ShiftType[]).map((s) => (
              <DropdownMenuItem 
                key={s} 
                disabled={assignment.shift === s}
                onClick={() => onMoveShift?.(assignment, s)}
                className="capitalize text-xs"
              >
                To {shiftMeta[s].label}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onOpenReassign?.(assignment)} className="text-xs">
              <UserCheck className="mr-2 h-3.5 w-3.5" /> Reassign Employee
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onOpenSwap?.(assignment)} className="text-xs">
              <ArrowLeftRight className="mr-2 h-3.5 w-3.5" /> Swap Assignments
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => onMarkVacant?.(assignment.id)} 
              className="text-red-600 focus:text-red-600 text-xs font-medium"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Mark Vacant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface SidebarStaffCardProps {
  staff: Staff;
  assignedShift?: ShiftType;
  isOnLeave: boolean;
  onAssign: (staffId: string, shift: ShiftType) => void;
}

function SidebarStaffCard({ staff, assignedShift, isOnLeave, onAssign }: SidebarStaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id: staff.id 
  });

  return (
    <div 
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex items-center justify-between border border-border/80 bg-card/65 p-2.5 rounded-xl transition-all shadow-sm hover:border-border-strong",
        isDragging && "opacity-50 shadow-warm",
        isOnLeave && "opacity-60 bg-muted/30"
      )}
    >
      <div {...listeners} {...attributes} className="flex cursor-grab items-center gap-2 active:cursor-grabbing flex-1 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback style={{ backgroundColor: staff.avatarColor, color: "#fff" }} className="text-xs font-semibold">
            {staff.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{staff.name}</p>
          <div className="flex gap-1.5 mt-0.5 items-center">
            <span className="text-[9px] text-muted-foreground">{staff.role}</span>
            {isOnLeave ? (
              <Badge variant="destructive" className="text-[8px] py-0 px-1 font-normal bg-red-500/10 text-red-600 border-none">On Leave</Badge>
            ) : assignedShift ? (
              <Badge variant="outline" className="text-[8px] py-0 px-1 font-normal bg-blue-500/10 text-blue-600 border-none capitalize">{assignedShift}</Badge>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Available" />
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-[9px] text-muted-foreground uppercase font-bold px-2 py-1">Assign to Shift</DropdownMenuLabel>
          {(["morning", "evening", "night"] as ShiftType[]).map((s) => (
            <DropdownMenuItem 
              key={s} 
              onClick={() => onAssign(staff.id, s)}
              className="capitalize text-xs"
            >
              {shiftMeta[s].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ColumnProps {
  shift: ShiftType;
  isHighlighted?: boolean;
  children: React.ReactNode;
}

function Column({ shift, isHighlighted, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: shift });
  return (
    <div ref={setNodeRef} id={`column-${shift}`}
      className={cn("flex min-h-[420px] flex-col rounded-2xl border-2 p-4 transition-all duration-300",
        isHighlighted 
          ? "border-red-500 bg-red-50/10 ring-2 ring-red-500/10" 
          : isOver 
            ? "border-primary bg-primary/5" 
            : "border-dashed border-border bg-card/40"
      )}
    >
      <div className="mb-3 flex justify-between items-center">
        <ShiftBadge shift={shift} showTime />
        {isHighlighted && <Badge className="bg-red-500 text-white font-normal text-[10px]">Conflict Shift</Badge>}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

// Simple local helper to compute dates range string array
const getDatesInRange = (startStr: string, endStr: string) => {
  const dates = [];
  try {
    let current = parseISO(startStr);
    const end = parseISO(endStr);
    while (current <= end) {
      dates.push(format(current, "yyyy-MM-dd"));
      current = addDays(current, 1);
    }
  } catch (e) {
    console.error("Error parsing range: ", e);
  }
  return dates;
};

function Planning() {
  const { 
    conflicts, setConflicts, staff, roster, setRoster, 
    rostersList, activeRosterId, setActiveRosterId, refreshRosterData 
  } = useApp();
  
  // Parse Query Parameters
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  const shiftParam = params.get("shift") as ShiftType | null;
  const conflictId = params.get("conflict");

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return dateParam || format(new Date(), "yyyy-MM-dd");
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isMutating, setIsMutating] = useState(false);
  
  // Reassign Dialog State
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedAssignmentForReassign, setSelectedAssignmentForReassign] = useState<RosterEntry | null>(null);
  
  // Swap Dialog State
  const [swapOpen, setSwapOpen] = useState(false);
  const [selectedAssignmentForSwap, setSelectedAssignmentForSwap] = useState<RosterEntry | null>(null);

  const activeRoster = rostersList.find(r => r.id === activeRosterId);
  const datesInRange = activeRoster ? getDatesInRange(activeRoster.startDate, activeRoster.endDate) : [];

  // Align selectedDate to Roster dates range if outside
  useEffect(() => {
    if (datesInRange.length > 0 && !datesInRange.includes(selectedDate)) {
      setSelectedDate(datesInRange[0]);
    }
  }, [activeRosterId, datesInRange]);

  const activeConflict = conflictId ? conflicts.find(c => c.id === conflictId) : null;

  // Filter staff pool
  const filteredStaff = staff.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Scroll to affected shift on mount if query param is set
  useEffect(() => {
    if (shiftParam) {
      const element = document.getElementById(`column-${shiftParam}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    }
  }, [shiftParam]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), 
    useSensor(KeyboardSensor)
  );

  // Drag and Drop End handler
  const onDragEnd = async (event: DragEndEvent) => {
    const staffId = String(event.active.id);
    const target = event.over?.id as ShiftType | undefined;
    if (!target || !activeRosterId) return;

    setIsMutating(true);
    try {
      await rosterService.assign({ staffId, date: selectedDate, shift: target, rosterId: activeRosterId });
      toast.success(`Assigned to ${shiftMeta[target].label} shift`);
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save assignment change");
    } finally {
      setIsMutating(false);
    }
  };

  // Quick Action: Change Shift
  const handleMoveShift = async (assignment: RosterEntry, newShift: ShiftType) => {
    if (assignment.shift === newShift || !activeRosterId) return;
    setIsMutating(true);
    try {
      await rosterService.assign({
        staffId: assignment.staffId,
        date: selectedDate,
        shift: newShift,
        rosterId: activeRosterId
      });
      toast.success(`Moved to ${shiftMeta[newShift].label} shift`);
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to move assignment");
    } finally {
      setIsMutating(false);
    }
  };

  // Quick Action: Mark Vacant (Delete Assignment)
  const handleMarkVacant = async (assignmentId: string) => {
    setIsMutating(true);
    try {
      await rosterService.deleteShift(assignmentId);
      toast.success("Shift marked vacant");
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark shift vacant");
    } finally {
      setIsMutating(false);
    }
  };

  // Quick Action: Add/Assign Staff directly from Sidebar button
  const handleAssignDirectly = async (staffId: string, shift: ShiftType) => {
    if (!activeRosterId) return;
    setIsMutating(true);
    try {
      await rosterService.assign({
        staffId,
        date: selectedDate,
        shift,
        rosterId: activeRosterId
      });
      toast.success(`Assigned to ${shiftMeta[shift].label} shift`);
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add assignment");
    } finally {
      setIsMutating(false);
    }
  };

  // Quick Action: Reassign Employee (changes staffId of a shift assignment)
  const handleReassign = async (newStaffId: string) => {
    if (!selectedAssignmentForReassign || !activeRosterId) return;
    setIsMutating(true);
    try {
      await rosterService.updateShift(selectedAssignmentForReassign.id, {
        staffId: newStaffId,
        rosterId: activeRosterId,
        date: selectedDate
      });
      toast.success("Employee reassigned successfully");
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reassign employee");
    } finally {
      setIsMutating(false);
      setReassignOpen(false);
      setSelectedAssignmentForReassign(null);
    }
  };

  // Quick Action: Swap Employee assignments
  const handleSwap = async (targetAssignment: RosterEntry) => {
    if (!selectedAssignmentForSwap || !activeRosterId) return;
    setIsMutating(true);
    try {
      const a1 = selectedAssignmentForSwap;
      const a2 = targetAssignment;
      
      // Swap staffIds
      await rosterService.updateShift(a1.id, {
        staffId: a2.staffId,
        rosterId: activeRosterId,
        date: selectedDate
      });
      await rosterService.updateShift(a2.id, {
        staffId: a1.staffId,
        rosterId: activeRosterId,
        date: selectedDate
      });
      
      toast.success("Assignments swapped successfully");
      refreshRosterData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to swap assignments");
    } finally {
      setIsMutating(false);
      setSwapOpen(false);
      setSelectedAssignmentForSwap(null);
    }
  };

  // Roster unselected fallback state
  if (!activeRosterId) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <PageHeader title="Planning Board" description="Plan and assign shifts." />
        <Card className="border-yellow-200 bg-yellow-50/50 rounded-2xl p-10 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-yellow-900 mb-2">No Active Roster Selected</h3>
          <p className="text-sm text-yellow-800 mb-6 max-w-md mx-auto">
            Please select a roster to view, edit, and plan daily assignments. You can also generate a new roster.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <select
              className="flex h-10 w-64 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={activeRosterId || ""}
              onChange={(e) => setActiveRosterId(e.target.value)}
            >
              <option value="" disabled>Select roster...</option>
              {rostersList.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
            <Button onClick={() => window.location.href = '/manager/generate'} className="rounded-xl">
              Generate Roster
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active shifts filtered to selectedDate
  const dayAssignments = roster.filter((r) => r.date === selectedDate);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <PageHeader 
          title="Planning Board" 
          description={`Plan and assign shifts for ${format(new Date(selectedDate), "dd MMMM yyyy")}.`} 
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Roster:</span>
          <select
            className="flex h-9 w-52 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={activeRosterId || ""}
            onChange={(e) => setActiveRosterId(e.target.value)}
          >
            {rostersList.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.status})
              </option>
            ))}
          </select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshRosterData} 
            disabled={isMutating} 
            title="Reload Roster"
            className="rounded-xl shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", isMutating && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Warning Banner for Conflict */}
      {activeConflict && (
        <Card className="border-red-200 bg-red-50/60 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <h4 className="text-sm font-bold text-red-900">Active Audit Warning: {activeConflict.title || activeConflict.type}</h4>
              <p className="text-xs text-red-800 leading-relaxed">{activeConflict.description || activeConflict.message}</p>
              <p className="text-[10px] text-red-700/80 font-medium pt-1">
                Suggested Action: {activeConflict.suggestedResolution || "Please drag staff or adjust shift allocations below to fix this violation."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster date selector */}
      {datesInRange.length > 0 && (
        <div className="bg-card border border-border p-3 rounded-2xl">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Dates in {activeRoster?.name}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
            {datesInRange.map((dateStr) => {
              const dateObj = new Date(dateStr);
              const isSelected = dateStr === selectedDate;
              const hasConflicts = conflicts.some(c => c.date === dateStr);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[72px] p-2.5 rounded-xl border text-center transition-all relative",
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background hover:bg-muted/40 border-border text-foreground"
                  )}
                >
                  <span className="text-[9px] uppercase font-bold opacity-80">{format(dateObj, "EEE")}</span>
                  <span className="text-base font-bold my-0.5">{format(dateObj, "d")}</span>
                  <span className="text-[9px] opacity-70">{format(dateObj, "MMM")}</span>
                  {hasConflicts && (
                    <span className={cn(
                      "absolute top-1 right-1 h-2 w-2 rounded-full",
                      isSelected ? "bg-white" : "bg-red-500"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop workspace */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Staff Pool Panel */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 border border-border bg-card/40 p-4 rounded-2xl lg:h-[calc(100vh-280px)] min-h-[500px] overflow-hidden">
            <div>
              <h3 className="font-semibold text-sm mb-1 text-foreground">Staff Pool</h3>
              <p className="text-xs text-muted-foreground">Drag to a shift or use the (+) button to assign.</p>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-8 rounded-xl border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="Doctor">Doctors</option>
                <option value="Nurse">Nurses</option>
                <option value="Support Staff">Support</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredStaff.map((s) => {
                const assigned = dayAssignments.find(a => a.staffId === s.id);
                const isOnLeave = false; // We can check real leave requests in context
                
                return (
                  <SidebarStaffCard
                    key={s.id}
                    staff={s}
                    assignedShift={assigned?.shift}
                    isOnLeave={isOnLeave}
                    onAssign={handleAssignDirectly}
                  />
                );
              })}
              {filteredStaff.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No staff matches filter.</p>
              )}
            </div>
          </div>

          {/* Right Columns Grid */}
          <div className="flex-1 grid gap-4 md:grid-cols-3">
            {(["morning", "evening", "night"] as ShiftType[]).map((shift) => {
              const isHighlightedColumn = shiftParam === shift;
              const shiftEntries = dayAssignments.filter((a) => a.shift === shift);
              
              return (
                <Column key={shift} shift={shift} isHighlighted={isHighlightedColumn}>
                  {shiftEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                      Drop staff here
                    </p>
                  )}
                  {shiftEntries.map((entry) => {
                    const s = staff.find((x) => x.id === entry.staffId);
                    if (!s) return null;
                    
                    const isHighlightedCard = activeConflict?.staffId === entry.staffId && shiftParam === shift;
                    
                    return (
                      <StaffCard 
                        key={entry.id} 
                        id={entry.staffId} 
                        name={s.name} 
                        role={s.role} 
                        color={s.avatarColor} 
                        isHighlighted={isHighlightedCard} 
                        assignment={entry}
                        onMoveShift={handleMoveShift}
                        onMarkVacant={handleMarkVacant}
                        onOpenReassign={(a) => {
                          setSelectedAssignmentForReassign(a);
                          setReassignOpen(true);
                        }}
                        onOpenSwap={(a) => {
                          setSelectedAssignmentForSwap(a);
                          setSwapOpen(true);
                        }}
                      />
                    );
                  })}
                </Column>
              );
            })}
          </div>

        </div>
      </DndContext>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={(open) => { if (!open) setReassignOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reassign Employee</DialogTitle>
            <DialogDescription>
              Select another staff member to assign to this shift instead.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 py-2 scrollbar-thin">
            {staff
              .filter(s => s.id !== selectedAssignmentForReassign?.staffId)
              .map(s => {
                const isAlreadyScheduled = dayAssignments.some(a => a.staffId === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleReassign(s.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-left text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }} className="text-[10px]">
                          {s.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-[9px] text-muted-foreground">{s.role}</p>
                      </div>
                    </div>
                    {isAlreadyScheduled && (
                      <Badge variant="outline" className="text-[8px] bg-yellow-500/10 text-yellow-600 border-none font-normal">
                        Scheduled Today
                      </Badge>
                    )}
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="rounded-xl text-xs">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Dialog */}
      <Dialog open={swapOpen} onOpenChange={(open) => { if (!open) setSwapOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Swap Assignments</DialogTitle>
            <DialogDescription>
              Choose another shift assignment scheduled today to swap employees.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 py-2 scrollbar-thin">
            {dayAssignments
              .filter(a => a.id !== selectedAssignmentForSwap?.id)
              .map(a => {
                const s = staff.find(x => x.id === a.staffId);
                if (!s) return null;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSwap(a)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-left text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }} className="text-[10px]">
                          {s.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-[9px] text-muted-foreground">{s.role} ({shiftMeta[a.shift].label})</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            {dayAssignments.filter(a => a.id !== selectedAssignmentForSwap?.id).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No other assignments scheduled today to swap with.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="rounded-xl text-xs">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
