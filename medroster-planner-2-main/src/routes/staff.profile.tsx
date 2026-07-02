import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileTabs } from "@/components/shared/ProfileTabs";

export const Route = createFileRoute("/staff/profile")({ component: () => (
  <div><PageHeader title="My profile" description="Manage your account and preferences." /><ProfileTabs scope="staff" /></div>
)});
