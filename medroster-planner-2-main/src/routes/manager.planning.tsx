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
import { format } from "date-fns";
import type { ShiftType } from "@/types";
import { AlertCircle, Calendar, Search, X } from "lucide-react";

export const Route = createFileRoute("/manager/planning")({ component: Planning });

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  avatar_color: string;
  preferred_shift?: string;
}

interface RosterShift {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_avatar_color: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  shift_template_id: string;
}

interface StaffCardProps {
  id: string;
  name: string;
  role: string;
  color: string;
  isHighlighted?: boolean;
  preferredShift?: string;
  shiftId?: string; // If assigned to a shift
  onRemove?: (shiftId: string) => void;
}

function StaffCard({ id, name, role, color, isHighlighted, preferredShift, shiftId, onRemove }: StaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: shiftId ? `assigned-${id}` : `available-${id}`, data: { staffId: id, shiftId } });
  
  return (
    <div ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners} {...attributes}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-xl border p-2.5 active:cursor-grabbing transition-all",
        isHighlighted 
          ? "border-red-500 bg-red-50/50 shadow-sm ring-2 ring-red-500/20" 
          : "border-border bg-card hover:border-muted-foreground/30",
        isDragging && "opacity-50 shadow-warm"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback style={{ backgroundColor: color, color: "#fff" }} className="text-xs font-semibold">
          {name.split(" ").map((n) => n[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="flex gap-1 flex-wrap mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{role}</Badge>
            {preferredShift && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-blue-600 bg-blue-50 border-blue-200">
                    Prefers {preferredShift.charAt(0).toUpperCase() + preferredShift.slice(1)}
                </Badge>
            )}
        </div>
      </div>
      {shiftId && onRemove && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full hover:bg-red-100 hover:text-red-600 shrink-0 cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking remove
          onClick={(e) => {
            e.stopPropagation();
            onRemove(shiftId);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface ColumnProps {
  shift: ShiftType;
  isHighlighted?: boolean;
  count: number;
  children: React.ReactNode;
}

function Column({ shift, isHighlighted, count, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: shift });
  return (
    <div ref={setNodeRef} id={`column-${shift}`}
      className={cn("flex min-h-[400px] flex-col rounded-2xl border-2 p-4 transition-all duration-300",
        isHighlighted 
          ? "border-red-500 bg-red-50/10 ring-2 ring-red-500/10" 
          : isOver 
            ? "border-primary bg-primary/5" 
            : "border-dashed border-border bg-card/50"
      )}
    >
      <div className="mb-3 flex justify-between items-center">
        <ShiftBadge shift={shift} showTime />
        <Badge variant="secondary" className="font-normal text-[10px]">
          {count} assigned
        </Badge>
      </div>
      {isHighlighted && <Badge className="mb-3 bg-red-500 text-white font-normal text-[10px] self-start">Conflict Shift</Badge>}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Planning() {
  const { conflicts, setConflicts, activeRosterId, setActiveRosterId, rostersList } = useApp();
  
  // Parse Query Parameters
  const params = new URLSearchParams(window.location.search);
  const shiftParam = params.get("shift") as ShiftType | null;
  const conflictId = params.get("conflict");

  const activeConflict = conflictId ? conflicts.find(c => c.id === conflictId) : null;

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<Record<ShiftType, RosterShift[]>>({ morning: [], evening: [], night: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [staffRes, shiftRes] = await Promise.all([
            rosterService.getAvailableStaff(selectedDate),
            rosterService.listShifts(activeRosterId || undefined, selectedDate)
        ]);

        if (Array.isArray(staffRes)) {
            setAvailableStaff(staffRes);
        }

        if (Array.isArray(shiftRes)) {
            const grouped: Record<ShiftType, RosterShift[]> = { morning: [], evening: [], night: [] };
            shiftRes.forEach(s => {
                if (grouped[s.shift_type as ShiftType]) {
                    grouped[s.shift_type as ShiftType].push(s);
                }
            });
            setAssignments(grouped);
        }
    } catch (e) {
        toast.error("Failed to load planning data");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeRosterId]);

  // Scroll to affected shift on mount
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

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const staffId = active.data.current?.staffId;
    const targetShift = over.id as ShiftType;
    const sourceShiftId = active.data.current?.shiftId;
    
    if (!staffId || !targetShift) return;

    // Check if the staff member is already assigned to this exact shift
    if (assignments[targetShift].some(s => s.staff_id === staffId)) {
        return; // Already there
    }

    try {
      const res = await rosterService.assign({ 
          staff_id: staffId, 
          shift_date: selectedDate, 
          shift: targetShift, 
          roster_id: activeRosterId 
      });

      if (res.error) {
          toast.error(res.error, { description: res.conflicts ? res.conflicts.join(", ") : undefined });
          return; // Do not optimistically update if there's a critical conflict returned immediately
      }
      
      // Successfully assigned, refetch or optimistically update
      toast.success(`Moved to ${shiftMeta[targetShift].label} shift`);
      fetchData(); // Simplest way to sync UUIDs and accurate state
      
      // Refetch conflicts scoped to the active roster
      if (activeRosterId) {
        const updatedConflicts = await conflictService.list(activeRosterId);
        setConflicts(updatedConflicts);
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save assignment change");
      fetchData(); // Revert on failure
    }
  };

  const handleRemoveAssignment = async (shiftId: string) => {
      try {
          await rosterService.unassign(shiftId);
          toast.success("Staff member unassigned");
          fetchData(); // Resync UI
          
          if (activeRosterId) {
            const updatedConflicts = await conflictService.list(activeRosterId);
            setConflicts(updatedConflicts);
          }
      } catch (e) {
          toast.error("Failed to unassign staff member");
      }
  };

  const filteredStaff = availableStaff.filter(s => 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Planning Board" 
          description={`Planning shifts for ${format(new Date(selectedDate), "dd MMMM yyyy")}.`} 
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3 py-1 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 outline-none font-medium"
            />
          </div>
          <select
            className="flex h-9 w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 pb-4">
          
          {/* Left Panel: Shift Columns */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="grid gap-4 md:grid-cols-3">
                {(["morning", "evening", "night"] as ShiftType[]).map((shift) => {
                    const isHighlightedColumn = shiftParam === shift;
                    const shiftAssignments = assignments[shift] || [];
                    return (
                        <Column key={shift} shift={shift} isHighlighted={isHighlightedColumn} count={shiftAssignments.length}>
                            {loading ? (
                                <div className="animate-pulse space-y-2 mt-2">
                                    <div className="h-14 bg-muted rounded-xl"></div>
                                    <div className="h-14 bg-muted rounded-xl"></div>
                                </div>
                            ) : shiftAssignments.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                                    Drop staff here
                                </p>
                            ) : (
                                shiftAssignments.map((assignment) => {
                                    // Highlight card if this is the employee flagged in the conflict
                                    const isHighlightedCard = activeConflict?.employeeId === assignment.staff_id && shiftParam === shift;
                                    
                                    return (
                                        <StaffCard 
                                            key={assignment.id} 
                                            id={assignment.staff_id}
                                            shiftId={assignment.id}
                                            name={assignment.staff_name} 
                                            role={""} // The API doesn't return role in shifts currently, but it's ok for assigned cards
                                            color={assignment.staff_avatar_color} 
                                            isHighlighted={isHighlightedCard}
                                            onRemove={handleRemoveAssignment}
                                        />
                                    );
                                })
                            )}
                        </Column>
                    );
                })}
            </div>
          </div>

          {/* Right Panel: Available Staff */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] rounded-2xl border bg-card text-card-foreground shadow-sm">
              <div className="p-4 border-b space-y-3">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight">Available Staff</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">{format(new Date(selectedDate), "EEEE, MMM d")}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search staff..." 
                    className="pl-9 h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 flex-1 overflow-y-auto bg-muted/10 space-y-2">
                {loading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-14 bg-muted rounded-xl"></div>
                        <div className="h-14 bg-muted rounded-xl"></div>
                        <div className="h-14 bg-muted rounded-xl"></div>
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">No available staff for this date.</p>
                    </div>
                ) : (
                    filteredStaff.map((staff) => (
                        <StaffCard
                            key={staff.id}
                            id={staff.id}
                            name={staff.full_name}
                            role={staff.role}
                            color={staff.avatar_color}
                            preferredShift={staff.preferred_shift}
                        />
                    ))
                )}
              </div>
            </div>
          </div>

        </div>
      </DndContext>
    </div>
  );
}
