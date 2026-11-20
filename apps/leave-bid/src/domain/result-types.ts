import type { AirportConfigSnapshot, AppointmentsConfig, BidEmployee, LiabilityRow } from "./types";

export interface CalendarDay {
  dayIdx: number;
  weekIdx: number;
  ppLabel: string;
  wkLabel: string;
  ymd: string;
  mdy: string;
  dow: string;
  forecast: number;
  publicComment: string;
  dateObj: Date;
  excessPct?: number;
  adjForecast?: number;
  invAdj?: number;
  recDatPct?: number;
}

export interface CalendarWeek {
  weekIdx: number;
  ppLabel: string;
  wkLabel: string;
  startYmd: string;
  endYmd: string;
  startMdy: string;
  volume: number;
  pctOfTotal?: number;
  invPct?: number;
}

export interface CalendarGrid {
  days: CalendarDay[];
  weeks: CalendarWeek[];
}

export interface RankedPoolItem {
  emp: BidEmployee;
  idx: number;
  effPool: string;
  comp: LiabilityRow;
  hasUnresolvedTie: boolean;
}

export interface RankedBidEmployee {
  emp: BidEmployee;
  idx: number;
  globalIdx: number;
  rank: number;
  excelRank: number | null;
  effPool: string;
  hasUnresolvedTie: boolean;
  hasMissingRand: boolean;
  bidLines: number;
  datSlots: number;
  weeks80: number;
  days20: number;
  phase1WeeksUsed: number;
  remainingPhase2Hours: number;
  weekChoicesNeeded: number;
  dayChoicesNeeded: number;
  totalHoursEarned: number;
  avgWeekLength: number;
  avgDayLength: number;
}

export interface RankedBidResult {
  enriched: RankedBidEmployee[];
  byPool: Record<string, RankedPoolItem[]>;
}

export interface WeekSlot {
  weekIdx: number;
  base: number;
  adj: number;
  finalSlots: number;
}

export interface DaySlot {
  dayIdx: number;
  stage2: number;
  adj: number;
  finalSlots: number;
}

export interface WorkgroupAccum {
  name: string;
  count: number;
  activeCount: number;
  tiedCount: number;
  sumWeeks80All: number;
  sumDays20All: number;
  sumWeeks80Strict: number;
  sumDays20Strict: number;
  sumCapLines: number;
  sumCapDat: number;
  reqBidLines: number;
  reqDatSlots: number;
  roles: Set<string>;
}

export interface WorkgroupResult extends WorkgroupAccum {
  rolesList: string;
  weekSlots: WeekSlot[];
  daySlots: DaySlot[];
  totalOfferedLines: number;
  totalOfferedDat: number;
}

export interface WorkgroupAllocation {
  days: CalendarDay[];
  weeks: CalendarWeek[];
  wgResults: Record<string, WorkgroupResult>;
}

export interface IsolatedAirportAllocation {
  airport: string;
  snap: AirportConfigSnapshot;
  days: CalendarDay[];
  weeks: CalendarWeek[];
  wgResults: Record<string, WorkgroupResult>;
  empCount: number;
}

export interface TimeSlot {
  startMins: number;
  endMins: number;
  startStr: string;
  endStr: string;
}

export interface DailySlot extends TimeSlot {
  ymd: string;
  dow: string;
  withinWindow: boolean;
  concurrentIdx: number;
}

export interface DailyTimeSlots {
  allSlots: DailySlot[];
  slotsPerDay: number;
  windowDaysCount: number;
  windowCapacity: number;
}

export interface Appointment {
  round: number;
  role: string;
  workgroup: string;
  rank: number;
  name: string;
  scd: string;
  rand: number | string;
  bidLines: number;
  datSlots: number;
  bidDay: string;
  rawBidDay: string;
  bidStart: string;
  bidEnd: string;
  withinWindow: boolean;
}

export interface AppointmentSchedule {
  cfg: AppointmentsConfig;
  appointments: Appointment[];
  slotsPerDay: number;
  windowDaysCount: number;
  windowCapacity: number;
}

export interface LiabilityRollupGroup {
  group: string;
  count: number;
  hours: number;
  weeksLiab: number;
  daysLiab: number;
  cbaLines: number;
  cbaDat: number;
  p1Wks: number;
  remHrs: number;
  weeksLiabCeil: number;
  daysLiabCeil: number;
}

export interface LiabilityRollup {
  groups: LiabilityRollupGroup[];
  grandTotalHours: number;
  sumWeeksLiab: number;
  sumDaysLiab: number;
  totalBidLinesCeil: number;
  totalDatSlotsCeil: number;
}
