import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { AppShell } from "@/components/shared/AppShell";

export const Route = createFileRoute("/staff")({ component: StaffLayout });

function StaffLayout() {
  const { role } = useApp();
  if (role === null) return <Navigate to="/login" />;
  if (role !== "staff") return <Navigate to="/manager/dashboard" />;
  return <AppShell role="staff"><Outlet /></AppShell>;
}
