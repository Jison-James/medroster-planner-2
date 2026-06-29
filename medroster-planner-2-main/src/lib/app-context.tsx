import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { 
  staffService, leaveService, rosterService, swapService, 
  settingsService, conflictService, notificationService, shiftTemplateService 
} from "@/services";
import type {
  Role,
  Staff,
  LeaveRequest,
  SwapRequest,
  RosterEntry,
  Conflict,
  AppNotification,
  SystemUser,
  RosterRules,
  ShiftTemplate,
} from "@/types";

interface AppState {
  role: Role | null;
  currentUserId: string;
  setRole: (r: Role | null) => void;
  setCurrentUserId: (id: string) => void;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  leaves: LeaveRequest[];
  setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  swaps: SwapRequest[];
  setSwaps: React.Dispatch<React.SetStateAction<SwapRequest[]>>;
  roster: RosterEntry[];
  setRoster: React.Dispatch<React.SetStateAction<RosterEntry[]>>;
  conflicts: Conflict[];
  setConflicts: React.Dispatch<React.SetStateAction<Conflict[]>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  rules: RosterRules;
  setRules: React.Dispatch<React.SetStateAction<RosterRules>>;
  templates: ShiftTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ShiftTemplate[]>>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Role and user identity are kept in memory only. Persisting them to
  // localStorage would let any visitor grant themselves manager access by
  // editing browser storage in DevTools, bypassing the login screen.
  const [role, setRoleState] = useState<Role | null>(null);
  const [currentUserId, setCurrentUserIdState] = useState<string>("s1");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [rules, setRules] = useState<RosterRules>({} as RosterRules);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  const setRole = (r: Role | null) => setRoleState(r);
  const setCurrentUserId = (id: string) => setCurrentUserIdState(id);

  useEffect(() => {
    if (role) {
      staffService.list().then(data => { if (data?.length) setStaff(data); });
      leaveService.list().then(data => { if (data?.length) setLeaves(data); });
      swapService.list().then(data => { if (data?.length) setSwaps(data); });
      rosterService.listShifts().then(data => { if (data?.length) setRoster(data); });
      conflictService.list().then(data => { if (data?.length) setConflicts(data); });
      notificationService.list().then(data => { if (data?.length) setNotifications(data); });
      shiftTemplateService.list().then(data => { if (data?.length) setTemplates(data); });
      settingsService.getRules().then(data => { if (data) setRules(data); });
    }
  }, [role]);


  const value = useMemo<AppState>(
    () => ({
      role, currentUserId, setRole, setCurrentUserId,
      staff, setStaff, leaves, setLeaves, swaps, setSwaps,
      roster, setRoster, conflicts, setConflicts,
      notifications, setNotifications, users, setUsers,
      rules, setRules, templates, setTemplates,
    }),
    [role, currentUserId, staff, leaves, swaps, roster, conflicts, notifications, users, rules, templates],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
