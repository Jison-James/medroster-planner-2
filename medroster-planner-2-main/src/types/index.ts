export type Role = "manager" | "staff";

export type StaffRole = "Doctor" | "Nurse" | "Support Staff";

export type ShiftType = "morning" | "evening" | "night";

export type Status = "Active" | "On Leave" | "Inactive";

export interface Staff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: string;
  status: Status;
  joinedOn: string;
  employmentType: "Full-time" | "Part-time";
  availableDays: string[];
  preferredShift: ShiftType | "none";
  preferredDaysOff: string[];
  avatarColor: string;
}

export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type LeaveType = "Sick" | "Casual" | "Vacation" | "Emergency" | "Maternity";

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  submittedOn: string;
}

export interface SwapRequest {
  id: string;
  staffId: string;
  currentShift: ShiftType;
  requestedShift: ShiftType;
  date: string;
  reason: string;
  status: LeaveStatus;
}

export interface RosterEntry {
  id: string;
  date: string; // yyyy-MM-dd
  shift: ShiftType;
  staffId: string;
}

export type ConflictType =
  | "Leave Conflict"
  | "Double Booking"
  | "Overtime Violation"
  | "Understaffed Shift";

export type ConflictStatus = "Open" | "Resolved" | "Ignored";

export interface Conflict {
  id: string;
  type: ConflictType; // Maps to conflict_type maybe, wait, let's keep it as is, or use conflict_type? Let's check manager.conflicts.tsx
  conflictType?: ConflictType;
  title?: string;
  description?: string;
  message: string;
  date: string;
  staffId?: string;
  employeeId?: string;
  shift?: ShiftType;
  status: ConflictStatus;
  severity?: "Critical" | "Warning" | "Info";
  createdAt?: string;
  reason?: string;
  expectedValue?: string;
  actualValue?: string;
  suggestedResolution?: string;
  planningBoardRedirect?: string;
}

export type NotificationType =
  | "Leave_Approved"
  | "Leave_Rejected"
  | "Shift_Changed"
  | "Roster_Published"
  | "Swap_Approved"
  | "Swap_Rejected"
  | "Conflict_Detected";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountStatus: "Active" | "Invited" | "Disabled";
}

export interface RosterRules {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  maxHoursPerMonth: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  maxNightsPerWeek: number;
  maxNightsPerMonth: number;
  equalShiftDistribution: boolean;
  equalWeekendDistribution: boolean;
  equalNightDistribution: boolean;
  balanceWorkload: boolean;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  start: string;
  end: string;
  type: ShiftType | "custom";
  color: string;
}
