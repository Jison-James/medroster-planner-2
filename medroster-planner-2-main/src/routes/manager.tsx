import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { AppShell } from "@/components/shared/AppShell";

export const Route = createFileRoute("/manager")({ component: ManagerLayout });

function ManagerLayout() {
  const { role } = useApp();
  if (role === null) return <Navigate to="/login" />;
  if (role !== "manager") return <Navigate to="/staff/dashboard" />;
  return <AppShell role="manager"><Outlet /></AppShell>;
}
