import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import type { ShiftType } from "@/types";

export const Route = createFileRoute("/manager/planning")({ component: Planning });

function StaffCard({ id, name, role, color }: { id: string; name: string; role: string; color: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners} {...attributes}
      className={cn("flex cursor-grab items-center gap-2 rounded-xl border border-border bg-card p-2.5 active:cursor-grabbing",
        isDragging && "opacity-50 shadow-warm")}>
      <Avatar className="h-8 w-8"><AvatarFallback style={{ backgroundColor: color, color: "#fff" }} className="text-xs">{name.split(" ").map((n)=>n[0]).join("")}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <Badge variant="secondary" className="text-[10px]">{role}</Badge>
      </div>
    </div>
  );
}

function Column({ shift, children }: { shift: ShiftType; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: shift });
  return (
    <div ref={setNodeRef}
      className={cn("flex min-h-[400px] flex-col rounded-2xl border-2 p-4 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-dashed border-border bg-card/50")}>
      <div className="mb-3"><ShiftBadge shift={shift} showTime /></div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Planning() {
  const { staff, roster, setRoster } = useApp();
  const today = format(new Date(), "yyyy-MM-dd");
  const [assignments, setAssignments] = useState<Record<ShiftType, string[]>>(() => {
    const out: Record<ShiftType, string[]> = { morning: [], evening: [], night: [] };
    roster.filter((r) => r.date === today).forEach((r) => {
      if (!out[r.shift].includes(r.staffId)) out[r.shift].push(r.staffId);
    });
    return out;
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  const onDragEnd = (event: DragEndEvent) => {
    const staffId = String(event.active.id);
    const target = event.over?.id as ShiftType | undefined;
    if (!target) return;
    setAssignments((curr) => {
      const next: Record<ShiftType, string[]> = { morning: [], evening: [], night: [] };
      (["morning","evening","night"] as ShiftType[]).forEach((s) => {
        next[s] = curr[s].filter((id) => id !== staffId);
      });
      if (!next[target].includes(staffId)) next[target].push(staffId);
      return next;
    });
    toast.success(`Moved to ${shiftMeta[target].label} shift`);
  };

  return (
    <div>
      <PageHeader title="Planning board" description="Drag people between Morning, Evening, and Night to plan today's shifts." />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3 overflow-x-auto">
          {(["morning","evening","night"] as ShiftType[]).map((shift) => (
            <Column key={shift} shift={shift}>
              {assignments[shift].length === 0 && <p className="text-xs text-muted-foreground">Drop staff here</p>}
              {assignments[shift].map((id) => {
                const s = staff.find((x) => x.id === id);
                if (!s) return null;
                return <StaffCard key={id} id={id} name={s.name} role={s.role} color={s.avatarColor} />;
              })}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
