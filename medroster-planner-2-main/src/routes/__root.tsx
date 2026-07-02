import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, HeadContent, Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/app-context";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MedRoster — Hospital Roster System" },
      { name: "description", content: "Calm, friendly hospital roster system for hospital teams." },
      { property: "og:title", content: "MedRoster — Hospital Roster System" },
      { name: "twitter:title", content: "MedRoster — Hospital Roster System" },
      { property: "og:description", content: "Calm, friendly hospital roster system for hospital teams." },
      { name: "twitter:description", content: "Calm, friendly hospital roster system for hospital teams." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/767fa680-7c71-4917-b298-614f00d290d5/id-preview-10974e76--2104c50d-1ea4-4882-af56-8c818facdc3f.lovable.app-1782389580923.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/767fa680-7c71-4917-b298-614f00d290d5/id-preview-10974e76--2104c50d-1ea4-4882-af56-8c818facdc3f.lovable.app-1782389580923.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AppProvider>
    </QueryClientProvider>
  );
}
