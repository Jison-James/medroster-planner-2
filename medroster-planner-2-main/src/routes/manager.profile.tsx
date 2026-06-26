import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileTabs } from "@/components/shared/ProfileTabs";

export const Route = createFileRoute("/manager/profile")({ component: () => (
  <div><PageHeader title="Profile" description="Your account details and preferences." /><ProfileTabs scope="manager" /></div>
)});
