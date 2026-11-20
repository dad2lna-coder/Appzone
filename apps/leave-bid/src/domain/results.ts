import type { RankedBidEmployee, WorkgroupResult } from "./types";

export interface ResultsUsage {
  weeks: string[];
  days: string[];
  hrsUsed: number;
  remHrs: number;
  fcfs: number;
}

export interface ResultsGroupRow {
  pool: string;
  count: number;
  earned: number;
  used: number;
  rem: number;
  fcfs: number;
  totalCalSlots: number;
}

export interface ResultsFcfsRow {
  group: string;
  count: number;
  rem: number;
  fcfs: number;
}

export interface ResultsParticipantRow {
  rank: number;
  name: string;
  airport: string;
  leaveGroup: string;
  effPool: string;
  fcfsGroup: string;
  weeksLabel: string;
  daysLabel: string;
  earned: number;
  hrsUsed: number;
  remHrs: number;
  fcfs: number;
}

type SlotSource = Pick<WorkgroupResult, "totalOfferedLines" | "totalOfferedDat">;

/** Hours used, remaining, and FCFS day-slots for one ranked officer. Same math as renderResultsTab. */
export function computeResultsUsage(item: RankedBidEmployee): ResultsUsage {
  const weeks = item.emp.selectedWeeks || [];
  const days = item.emp.selectedDays || [];
  const hrsUsed = weeks.length * item.avgWeekLength + days.length * item.avgDayLength;
  const remHrs = Math.max(0, item.totalHoursEarned - hrsUsed);
  const fcfs = item.avgDayLength > 0 ? Math.round(remHrs / item.avgDayLength) : 0;
  return { weeks, days, hrsUsed, remHrs, fcfs };
}

/** Post-bid summary keyed by effective pool, in first-seen order. */
export function computeResultsGroupSummary(
  enriched: RankedBidEmployee[],
  wgResults: Record<string, SlotSource>,
): ResultsGroupRow[] {
  const byPool: Record<string, ResultsGroupRow> = {};
  enriched.forEach((item) => {
    const pool = item.effPool;
    const usage = computeResultsUsage(item);
    if (!byPool[pool]) byPool[pool] = { pool, count: 0, earned: 0, used: 0, rem: 0, fcfs: 0, totalCalSlots: 0 };
    const row = byPool[pool];
    row.count += 1;
    row.earned += item.totalHoursEarned;
    row.used += usage.hrsUsed;
    row.rem += usage.remHrs;
    row.fcfs += usage.fcfs;
  });
  return Object.keys(byPool).map((pool) => {
    const alloc = wgResults[pool];
    const totalCalSlots = alloc ? alloc.totalOfferedLines * 5 + alloc.totalOfferedDat : 0;
    return { ...byPool[pool], totalCalSlots };
  });
}

/** Post-bid summary keyed by FCFS group. A blank group is "Shift A", matching the reference. */
export function computeResultsFcfsSummary(enriched: RankedBidEmployee[]): ResultsFcfsRow[] {
  const byFcfs: Record<string, ResultsFcfsRow> = {};
  enriched.forEach((item) => {
    const group = item.emp.fcfsGroup || "Shift A";
    const usage = computeResultsUsage(item);
    if (!byFcfs[group]) byFcfs[group] = { group, count: 0, rem: 0, fcfs: 0 };
    const row = byFcfs[group];
    row.count += 1;
    row.rem += usage.remHrs;
    row.fcfs += usage.fcfs;
  });
  return Object.keys(byFcfs).map((group) => byFcfs[group]);
}

/** One row per ranked officer, in roster order, with the labels the results table prints. */
export function computeResultsParticipantRows(enriched: RankedBidEmployee[], fallbackAirport: string): ResultsParticipantRow[] {
  return enriched.map((item) => {
    const usage = computeResultsUsage(item);
    const weeksLabel = usage.weeks.join(", ") || "None";
    const daysLabel = usage.days.join(", ") || "None";
    return {
      rank: item.rank,
      name: item.emp.name,
      airport: item.emp.airport || fallbackAirport,
      leaveGroup: item.emp.leaveGroup,
      effPool: item.effPool,
      fcfsGroup: item.emp.fcfsGroup,
      weeksLabel,
      daysLabel,
      earned: item.totalHoursEarned,
      hrsUsed: usage.hrsUsed,
      remHrs: usage.remHrs,
      fcfs: usage.fcfs,
    };
  });
}
