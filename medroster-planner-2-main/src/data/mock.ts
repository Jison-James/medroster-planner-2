import type {
  Staff,
  LeaveRequest,
  SwapRequest,
  RosterEntry,
  Conflict,
  AppNotification,
  SystemUser,
  RosterRules,
  ShiftTemplate,
  ShiftType,
} from "@/types";
import { addDays, format, subDays } from "date-fns";

const today = new Date();
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const colors = ["#4F86C6", "#8E83D6", "#4FAE82", "#E8A458", "#DD7373", "#6BA8D6", "#A293E0", "#7BC4A0"];
const c = (i: number) => colors[i % colors.length];

const firstNames = ["Aarav", "Sara", "Liam", "Maya", "Noah", "Zara", "Ethan", "Priya", "Owen", "Ava", "Ravi", "Mia", "Jacob", "Lina", "Omar"];
const lastNames = ["Patel", "Khan", "Brown", "Singh", "Wilson", "Garcia", "Lee", "Sharma", "Davis", "Cohen", "Rao", "Müller", "Nguyen", "Silva", "Hassan"];
const depts = ["Cardiology", "Emergency", "Pediatrics", "General Ward", "ICU"];

export const staffList: Staff[] = Array.from({ length: 15 }).map((_, i) => {
  const role = (i < 5 ? "Doctor" : i < 10 ? "Nurse" : "Support Staff") as Staff["role"];
  const shifts: (ShiftType | "none")[] = ["morning", "evening", "night", "morning", "none"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const avail = days.filter((_, j) => (i + j) % 7 < 5);
  return {
    id: `s${i + 1}`,
    employeeId: `EMP-${String(1000 + i)}`,
    name: `${firstNames[i]} ${lastNames[i]}`,
    email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase().replace(/[^a-z]/g, "")}@medroster.health`,
    phone: `+1 555 0${100 + i}`,
    role,
    department: depts[i % depts.length],
    status: i === 3 ? "On Leave" : i === 12 ? "Inactive" : "Active",
    joinedOn: fmt(subDays(today, 300 + i * 20)),
    employmentType: i % 4 === 0 ? "Part-time" : "Full-time",
    availableDays: avail,
    preferredShift: shifts[i % shifts.length],
    preferredDaysOff: i % 2 === 0 ? ["Sat", "Sun"] : ["Sun"],
    avatarColor: c(i),
  };
});

export const leaveRequests: LeaveRequest[] = [
  { id: "l1", staffId: "s4", type: "Sick", startDate: fmt(subDays(today, 1)), endDate: fmt(addDays(today, 2)), reason: "Flu — doctor advised rest.", status: "Approved", submittedOn: fmt(subDays(today, 3)) },
  { id: "l2", staffId: "s7", type: "Vacation", startDate: fmt(addDays(today, 10)), endDate: fmt(addDays(today, 17)), reason: "Family trip planned months ago.", status: "Pending", submittedOn: fmt(subDays(today, 1)) },
  { id: "l3", staffId: "s2", type: "Casual", startDate: fmt(addDays(today, 4)), endDate: fmt(addDays(today, 4)), reason: "Personal errands.", status: "Pending", submittedOn: fmt(today) },
  { id: "l4", staffId: "s11", type: "Emergency", startDate: fmt(subDays(today, 5)), endDate: fmt(subDays(today, 4)), reason: "Family emergency.", status: "Approved", submittedOn: fmt(subDays(today, 6)) },
  { id: "l5", staffId: "s9", type: "Vacation", startDate: fmt(addDays(today, 20)), endDate: fmt(addDays(today, 25)), reason: "Wedding attendance.", status: "Rejected", submittedOn: fmt(subDays(today, 2)) },
  { id: "l6", staffId: "s6", type: "Sick", startDate: fmt(today), endDate: fmt(addDays(today, 1)), reason: "Migraine.", status: "Pending", submittedOn: fmt(today) },
];

export const swapRequests: SwapRequest[] = [
  { id: "sw1", staffId: "s5", currentShift: "night", requestedShift: "morning", date: fmt(addDays(today, 3)), reason: "Childcare conflict.", status: "Pending" },
  { id: "sw2", staffId: "s8", currentShift: "evening", requestedShift: "morning", date: fmt(addDays(today, 5)), reason: "Doctor appointment.", status: "Approved" },
  { id: "sw3", staffId: "s12", currentShift: "morning", requestedShift: "evening", date: fmt(addDays(today, 2)), reason: "Class in morning.", status: "Pending" },
  { id: "sw4", staffId: "s1", currentShift: "night", requestedShift: "evening", date: fmt(addDays(today, 7)), reason: "Family event.", status: "Rejected" },
];

// Build a populated roster for the next 14 days
export const roster: RosterEntry[] = (() => {
  const r: RosterEntry[] = [];
  const shifts: ShiftType[] = ["morning", "evening", "night"];
  for (let d = -2; d < 14; d++) {
    const date = fmt(addDays(today, d));
    shifts.forEach((shift, si) => {
      // 4-5 staff per shift
      for (let k = 0; k < 4 + (si % 2); k++) {
        const staffIdx = ((d * 3 + si * 4 + k) % staffList.length + staffList.length) % staffList.length;
        r.push({
          id: `r-${d}-${shift}-${k}`,
          date,
          shift,
          staffId: staffList[staffIdx].id,
        });
      }
    });
  }
  return r;
})();

export const conflicts: Conflict[] = [
  { id: "c1", type: "Leave Conflict", message: "Maya Singh is on approved leave but scheduled for Morning.", date: fmt(addDays(today, 1)), staffId: "s4", shift: "morning", status: "Open" },
  { id: "c2", type: "Double Booking", message: "Liam Brown is assigned to both Morning and Evening.", date: fmt(addDays(today, 2)), staffId: "s3", status: "Open" },
  { id: "c3", type: "Overtime Violation", message: "Priya Sharma exceeds 48h this week.", date: fmt(addDays(today, 3)), staffId: "s8", status: "Open" },
  { id: "c4", type: "Understaffed Shift", message: "Night shift in ICU has only 2 nurses (min 3).", date: fmt(addDays(today, 4)), shift: "night", status: "Open" },
  { id: "c5", type: "Understaffed Shift", message: "Morning shift in Emergency missing 1 doctor.", date: fmt(addDays(today, 5)), shift: "morning", status: "Open" },
];

export const notifications: AppNotification[] = [
  { id: "n1", type: "Leave Approved", message: "Your sick leave request for tomorrow was approved.", timestamp: fmt(today), read: false },
  { id: "n2", type: "Roster Published", message: "The roster for next week is now published.", timestamp: fmt(subDays(today, 1)), read: false },
  { id: "n3", type: "Shift Changed", message: "Your Thursday shift was changed to Evening.", timestamp: fmt(subDays(today, 2)), read: false },
  { id: "n4", type: "Swap Approved", message: "Your swap request with Sara Khan was approved.", timestamp: fmt(subDays(today, 3)), read: true },
  { id: "n5", type: "Leave Rejected", message: "Your vacation request was declined — please retry.", timestamp: fmt(subDays(today, 5)), read: true },
  { id: "n6", type: "Roster Published", message: "Updated roster published with 2 changes.", timestamp: fmt(subDays(today, 7)), read: true },
  { id: "n7", type: "Shift Changed", message: "Your Saturday Morning shift was confirmed.", timestamp: fmt(subDays(today, 9)), read: true },
];

export const systemUsers: SystemUser[] = [
  { id: "u1", name: "Alex Manager", email: "manager@medroster.health", role: "manager", accountStatus: "Active" },
  { id: "u2", name: "Aarav Patel", email: "aarav.patel@medroster.health", role: "staff", accountStatus: "Active" },
  { id: "u3", name: "Sara Khan", email: "sara.khan@medroster.health", role: "staff", accountStatus: "Active" },
  { id: "u4", name: "Jamie Lee", email: "jamie.lee@medroster.health", role: "staff", accountStatus: "Invited" },
  { id: "u5", name: "Robin Cole", email: "robin.cole@medroster.health", role: "staff", accountStatus: "Disabled" },
];

export const defaultRules: RosterRules = {
  maxHoursPerDay: 8,
  maxHoursPerWeek: 40,
  maxHoursPerMonth: 160,
  maxConsecutiveDays: 5,
  minRestHours: 8,
  maxNightsPerWeek: 3,
  maxNightsPerMonth: 12,
  equalShiftDistribution: true,
  equalWeekendDistribution: true,
  equalNightDistribution: true,
  balanceWorkload: true,
};

export const shiftTemplates: ShiftTemplate[] = [
  { id: "st1", name: "Morning", start: "06:00", end: "14:00", type: "morning", color: "#E8A458" },
  { id: "st2", name: "Evening", start: "14:00", end: "22:00", type: "evening", color: "#8E83D6" },
  { id: "st3", name: "Night", start: "22:00", end: "06:00", type: "night", color: "#4F86C6" },
];

// Realistic-shaped trend data for charts
export const trendData = {
  staffingOverview: [
    { day: "Mon", filled: 42, needed: 48 },
    { day: "Tue", filled: 45, needed: 48 },
    { day: "Wed", filled: 47, needed: 48 },
    { day: "Thu", filled: 44, needed: 48 },
    { day: "Fri", filled: 46, needed: 48 },
    { day: "Sat", filled: 38, needed: 42 },
    { day: "Sun", filled: 36, needed: 42 },
  ],
  shiftDistribution: [
    { name: "Morning", value: 38, fill: "var(--shift-morning)" },
    { name: "Evening", value: 32, fill: "var(--shift-evening)" },
    { name: "Night", value: 22, fill: "var(--shift-night)" },
  ],
  leaveTrends: [
    { week: "W1", approved: 4, pending: 2 },
    { week: "W2", approved: 6, pending: 3 },
    { week: "W3", approved: 5, pending: 4 },
    { week: "W4", approved: 8, pending: 5 },
    { week: "W5", approved: 11, pending: 6 },
    { week: "W6", approved: 14, pending: 4 },
    { week: "W7", approved: 9, pending: 3 },
    { week: "W8", approved: 7, pending: 2 },
  ],
  utilization: [
    { name: "Doctors", value: 86 },
    { name: "Nurses", value: 92 },
    { name: "Support", value: 78 },
  ],
  attendance: [
    { week: "W1", attendance: 94 },
    { week: "W2", attendance: 96 },
    { week: "W3", attendance: 93 },
    { week: "W4", attendance: 97 },
    { week: "W5", attendance: 95 },
    { week: "W6", attendance: 98 },
  ],
};

export const faqs = [
  { q: "How do I request leave?", a: "Go to Request Leave in the sidebar, fill in your dates and reason, then submit. You'll see the status update in Leave Status." },
  { q: "How do shift swaps work?", a: "Submit a swap from Shift Swap Requests. Your manager reviews and approves — you'll be notified." },
  { q: "Can I change my availability?", a: "Yes. Open Availability Management and update your preferred shifts and days off any time." },
  { q: "What if my roster has a conflict?", a: "Your manager sees conflicts in real time in the Conflict Center and will reach out if you need to switch." },
  { q: "How do I update my profile?", a: "Open Profile from the sidebar to edit your contact details and notification preferences." },
];

export const guides = [
  { title: "Getting started with MedRoster", duration: "4 min read" },
  { title: "Submitting your first leave request", duration: "2 min read" },
  { title: "Understanding the Planning Board", duration: "5 min read" },
  { title: "Setting your shift preferences", duration: "3 min read" },
  { title: "Resolving roster conflicts", duration: "6 min read" },
];
