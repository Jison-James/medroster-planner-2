import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarRange, ClipboardList, Settings as SettingsIcon,
  AlertTriangle, Repeat, CalendarCheck, CalendarPlus, Sparkles,
  Sliders, ClipboardCheck, HelpCircle, UserCog, ShieldCheck, Bell, User,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Heart,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

type Role = "manager" | "staff";

interface NavItem { label: string; to: string; icon: typeof LayoutDashboard }
interface NavGroup { label?: string; items: NavItem[] }

const managerNav: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/manager/dashboard", icon: LayoutDashboard }] },
  { label: "Workforce", items: [
    { label: "Staff Management", to: "/manager/staff", icon: Users },
    { label: "Availability & Preferences", to: "/manager/availability", icon: CalendarCheck },
  ]},
  { label: "Leave", items: [
    { label: "Leave Management", to: "/manager/leave", icon: ClipboardList },
  ]},
  { label: "Roster Management", items: [
    { label: "Shift Templates", to: "/manager/shift-templates", icon: Sparkles },
    { label: "Roster Rules", to: "/manager/rules", icon: Sliders },
    { label: "Generate Roster", to: "/manager/generate", icon: CalendarPlus },
    { label: "Roster Viewer", to: "/manager/roster", icon: CalendarRange },
    { label: "Planning Board", to: "/manager/planning", icon: ClipboardCheck },
    { label: "Shift Assignment", to: "/manager/assignment", icon: Repeat },
    { label: "Shift Swap Requests", to: "/manager/swaps", icon: Repeat },
    { label: "Conflict Center", to: "/manager/conflicts", icon: AlertTriangle },
  ]},

  { label: "Administration", items: [
    { label: "User Management", to: "/manager/users", icon: UserCog },
    { label: "Settings", to: "/manager/settings", icon: SettingsIcon },
  ]},
  { label: "Support", items: [
    { label: "Help & Support", to: "/manager/help", icon: HelpCircle },
  ]},
];

const staffNav: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "My Schedule", items: [
    { label: "My Shifts", to: "/staff/shifts", icon: CalendarRange },
    { label: "Availability Management", to: "/staff/availability", icon: CalendarCheck },
  ]},
  { label: "Leave", items: [
    { label: "Request Leave", to: "/staff/request-leave", icon: ClipboardList },
    { label: "Leave Status", to: "/staff/leave-status", icon: ShieldCheck },
  ]},
  { label: "Shift Management", items: [
    { label: "Shift Swap Requests", to: "/staff/swaps", icon: Repeat },
  ]},
  { label: "Account", items: [
    { label: "Notifications", to: "/staff/notifications", icon: Bell },
    { label: "Profile", to: "/staff/profile", icon: User },
  ]},
  { label: "Support", items: [
    { label: "Help & Support", to: "/staff/help", icon: HelpCircle },
  ]},
];

function NavList({ nav, pathname, collapsed, onNavigate }: {
  nav: NavGroup[]; pathname: string; collapsed: boolean; onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {nav.map((group, i) => (
        <div key={i} className="flex flex-col gap-1">
          {group.label && !collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 px-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Heart className="h-5 w-5" fill="currentColor" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold leading-none">MedRoster</span>
          <span className="text-[11px] text-muted-foreground">Hospital Roster System</span>
        </div>
      )}
    </Link>
  );
}

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { setRole, notifications, staff, currentUserId } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "manager" ? managerNav : staffNav;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const me = staff.find((s) => s.id === currentUserId) ?? staff[0] ?? { name: 'Loading...', role: 'Loading', avatarColor: '#6366f1' };

  const handleLogout = () => {
    setRole(null);
    navigate({ to: "/login" });
  };

  const title = (() => {
    const all = nav.flatMap((g) => g.items);
    return all.find((i) => pathname === i.to || pathname.startsWith(i.to + "/"))?.label ?? "MedRoster";
  })();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex transition-[width]",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto">
          <NavList nav={nav} pathname={pathname} collapsed={collapsed} />
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="m-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (<><ChevronLeft className="h-4 w-4" /> Collapse</>)}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
          <Brand collapsed={false} />
          <NavList nav={nav} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="font-display text-base font-semibold">{title}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Link to={role === "staff" ? "/staff/notifications" : "/manager/dashboard"}>
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 h-5 min-w-5 rounded-full bg-destructive p-0 text-[10px] text-destructive-foreground">
                    {unread}
                  </Badge>
                )}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: me.avatarColor, color: "#fff" }} className="text-xs font-semibold">
                      {me.name.split(" ").map((n) => n[0]).join("").slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{me.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{me.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{role === "manager" ? "Manager" : me.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: role === "manager" ? "/manager/settings" : "/staff/profile" })}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: role === "manager" ? "/manager/help" : "/staff/help" })}>
                  <HelpCircle className="mr-2 h-4 w-4" /> Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
