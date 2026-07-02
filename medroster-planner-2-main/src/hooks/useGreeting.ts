import { useApp } from "@/lib/app-context";

export function useGreeting(): string {
  const { staff, currentUserId } = useApp();
  const me = staff.find((s) => s.id === currentUserId);

  if (!me || !me.name) {
    return "Hi,  👋";
  }

  if (me.role === "Doctor") {
    return `Hi, ${me.name} 👋`;
  }

  return `Hi, ${me.name} 👋`;
}
