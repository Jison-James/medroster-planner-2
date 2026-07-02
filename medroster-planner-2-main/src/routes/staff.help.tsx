import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "./manager.help";
export const Route = createFileRoute("/staff/help")({ component: HelpPage });
