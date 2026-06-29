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

export const staffList: Staff[] = [];
export const leaveRequests: LeaveRequest[] = [];
export const swapRequests: SwapRequest[] = [];
export const roster: RosterEntry[] = [];
export const conflicts: Conflict[] = [];
export const notifications: AppNotification[] = [];
export const systemUsers: SystemUser[] = [];

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
