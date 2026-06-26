import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { role } = useApp();
  if (!role) return <Navigate to="/login" />;
  return <Navigate to={role === "manager" ? "/manager/dashboard" : "/staff/dashboard"} />;
}
