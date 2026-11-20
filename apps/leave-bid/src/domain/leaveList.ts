import { getCalendarDaysAndWeeks } from "./dates";
import type { BidEmployee } from "./types";

export interface LeaveListInput {
  startDate: string;
  forecast: number[];
  bidEmployees: BidEmployee[];
  roleFilter: string;
}

export interface LeaveListRow {
  ppLabel: string;
  wkLabel: string;
  date: string;
  dow: string;
  holiday: string;
  volumeLabel: string;
  total: number;
  weekOfficers: string;
  dayOfficers: string;
}

function officerList(employees: BidEmployee[]): string {
  return employees.map((emp) => `${emp.name} (${emp.leaveGroup})`).join(", ") || "-";
}

/**
 * 364 day rows for tab-calendar. Officers match on week label (weekly line)
 * or ymd (daily DAT). Role "ALL" keeps every leave group.
 */
export function computeLeaveList364(input: LeaveListInput): LeaveListRow[] {
  const { days } = getCalendarDaysAndWeeks(input.startDate, input.forecast);
  const role = input.roleFilter || "ALL";
  const employees = input.bidEmployees.filter((emp) => role === "ALL" || emp.leaveGroup === role);
  return days.map((day) => {
    const weekOff = employees.filter((emp) => (emp.selectedWeeks || []).includes(day.wkLabel));
    const dayOff = employees.filter((emp) => (emp.selectedDays || []).includes(day.ymd));
    return {
      ppLabel: day.ppLabel,
      wkLabel: day.wkLabel,
      date: day.mdy,
      dow: day.dow,
      holiday: day.publicComment,
      volumeLabel: Math.round(day.forecast).toLocaleString(),
      total: weekOff.length + dayOff.length,
      weekOfficers: officerList(weekOff),
      dayOfficers: officerList(dayOff),
    };
  });
}
