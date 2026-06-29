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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import type { ShiftType } from "@/types";
import { AlertCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/manager/planning")({ component: Planning });

interface StaffCardProps {
  id: string;
  name: string;
  role: string;
  color: string;
  isHighlighted?: boolean;
}

function StaffCard({ id, name, role, color, isHighlighted }: StaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
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
        <Badge variant="secondary" className="text-[10px]">{role}</Badge>
      </div>
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
        {isHighlighted && <Badge className="bg-red-500 text-white font-normal text-[10px]">Conflict Shift</Badge>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Planning() {
  const { conflicts, setConflicts, staff, roster, setRoster } = useApp();
  
  // Parse Query Parameters
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  const shiftParam = params.get("shift") as ShiftType | null;
  const conflictId = params.get("conflict");

  const targetDate = dateParam || format(new Date(), "yyyy-MM-dd");
  const activeConflict = conflictId ? conflicts.find(c => c.id === conflictId) : null;

  const [assignments, setAssignments] = useState<Record<ShiftType, string[]>>(() => {
    const out: Record<ShiftType, string[]> = { morning: [], evening: [], night: [] };
    roster.filter((r) => r.date === targetDate).forEach((r) => {
      if (!out[r.shift].includes(r.staffId)) out[r.shift].push(r.staffId);
    });
    return out;
  });

  // Re-initialize assignments if roster or targetDate updates
  useEffect(() => {
    const out: Record<ShiftType, string[]> = { morning: [], evening: [], night: [] };
    roster.filter((r) => r.date === targetDate).forEach((r) => {
      if (!out[r.shift].includes(r.staffId)) out[r.shift].push(r.staffId);
    });
    setAssignments(out);
  }, [roster, targetDate]);

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
    const staffId = String(event.active.id);
    const target = event.over?.id as ShiftType | undefined;
    if (!target) return;

    // Optimistically update the UI assignments columns
    setAssignments((curr) => {
      const next: Record<ShiftType, string[]> = { morning: [], evening: [], night: [] };
      (["morning", "evening", "night"] as ShiftType[]).forEach((s) => {
        next[s] = curr[s].filter((id) => id !== staffId);
      });
      if (!next[target].includes(staffId)) next[target].push(staffId);
      return next;
    });

    try {
      const res = await rosterService.assign({ staffId, date: targetDate, shift: target });
      
      setRoster((prevRoster) => {
        const cleaned = prevRoster.filter(r => !(r.date === targetDate && r.staffId === staffId));
        return [...cleaned, res];
      });

      // Refetch conflicts to update warnings in real-time
      const updatedConflicts = await conflictService.list();
      setConflicts(updatedConflicts);

      toast.success(`Moved to ${shiftMeta[target].label} shift`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save assignment change");
      // Reload to resync UI with database state
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader 
        title="Planning Board" 
        description={`Plan and assign shifts for ${format(new Date(targetDate), "dd MMMM yyyy")}.`} 
      />

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

      {/* Date indicator card */}
      <Card className="border border-border/80 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Audited Date</p>
              <p className="text-sm font-bold text-foreground">{format(new Date(targetDate), "EEEE, dd MMMM yyyy")}</p>
            </div>
          </div>
          {dateParam && (
            <Button variant="outline" size="sm" className="rounded-xl border-border" onClick={() => window.location.href = '/manager/planning'}>
              Reset to Today
            </Button>
          )}
        </CardContent>
      </Card>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3 overflow-x-auto pb-4">
          {(["morning", "evening", "night"] as ShiftType[]).map((shift) => {
            const isHighlightedColumn = shiftParam === shift;
            return (
              <Column key={shift} shift={shift} isHighlighted={isHighlightedColumn}>
                {assignments[shift].length === 0 && (
                  <p className="text-xs text-muted-foreground py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                    Drop staff here
                  </p>
                )}
                {assignments[shift].map((id) => {
                  const s = staff.find((x) => x.id === id);
                  if (!s) return null;
                  
                  // Highlight card if this is the employee flagged in the conflict
                  const isHighlightedCard = activeConflict?.staffId === id && shiftParam === shift;
                  
                  return (
                    <StaffCard 
                      key={id} 
                      id={id} 
                      name={s.name} 
                      role={s.role} 
                      color={s.avatarColor} 
                      isHighlighted={isHighlightedCard} 
                    />
                  );
                })}
              </Column>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
