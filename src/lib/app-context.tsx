import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  staffList as initialStaff,
  leaveRequests as initialLeave,
  swapRequests as initialSwaps,
  roster as initialRoster,
  conflicts as initialConflicts,
  notifications as initialNotifs,
  systemUsers as initialUsers,
  defaultRules,
  shiftTemplates as initialTemplates,
} from "@/data/mock";
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
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeave);
  const [swaps, setSwaps] = useState<SwapRequest[]>(initialSwaps);
  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifs);
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [rules, setRules] = useState<RosterRules>(defaultRules);
  const [templates, setTemplates] = useState<ShiftTemplate[]>(initialTemplates);

  const setRole = (r: Role | null) => setRoleState(r);
  const setCurrentUserId = (id: string) => setCurrentUserIdState(id);


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
