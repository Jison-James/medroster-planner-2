import { Sun, Sunset, Moon } from "lucide-react";
import type { ShiftType } from "@/types";
import { cn } from "@/lib/utils";

export const shiftMeta: Record<ShiftType, { label: string; icon: typeof Sun; tint: string; time: string }> = {
  morning: { label: "Morning", icon: Sun, tint: "shift-morning-tint", time: "6:00 AM – 2:00 PM" },
  evening: { label: "Evening", icon: Sunset, tint: "shift-evening-tint", time: "2:00 PM – 10:00 PM" },
  night: { label: "Night", icon: Moon, tint: "shift-night-tint", time: "10:00 PM – 6:00 AM" },
};

export function ShiftBadge({ shift, showTime = false, className }: { shift: ShiftType; showTime?: boolean; className?: string }) {
  const m = shiftMeta[shift];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        m.tint,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{m.label}</span>
      {showTime && <span className="font-mono-data ml-1 opacity-80">{m.time}</span>}
    </span>
  );
}
