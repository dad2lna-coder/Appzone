/** Contract for the Leave Bid engine. Fields mirror what LeaveBid.html reads and writes. */

export interface LiabilityEmployee {
  id: number;
  name: string;
  airport: string;
  eod: string;
  scd: string;
  hoursPerPP: number;
  daysPerPP: number;
  phase1Weeks: number;
  group: string;
  /** Set by withAirportScope; not part of the seed file. */
  __globalIdx?: number;
  selectedWeeks?: unknown[];
  hoursPP?: number;
  daysPP?: number;
}

export interface BidEmployee {
  id: string;
  name: string;
  airport: string;
  eod: string;
  scd: string;
  rand: number | string;
  leaveGroup: string;
  fcfsGroup: string;
  hoursPP: number;
  daysPP: number;
  notes: string;
  useProxy: string;
  proxyWeeks: string;
  proxyDays: string;
  selectedWeeks: string[];
  selectedDays: string[];
  bidTimestamp: string;
  phase1Weeks?: number | string;
  /** Set by withAirportScope before ranking runs on the live page. */
  __globalIdx?: number;
}

/** Subset computeEmployeeLiabilityRow actually reads. */
export interface LiabilityRowInput {
  scd?: string;
  hoursPerPP?: number;
  hoursPP?: number;
  daysPerPP?: number;
  daysPP?: number;
  phase1Weeks?: number | string | null;
  selectedWeeks?: unknown[];
}

export interface PayPeriodDetail {
  pp: number;
  workHrs: number;
  divisor: number;
  unconstrained: number;
  ptAccrued: number;
  carryOver: number;
}

export interface LiabilityRow {
  ppDates: string[];
  scdRates: number[];
  ptDetails: PayPeriodDetail[];
  finalAccrued: number[];
  totalHoursEarned: number;
  avgWeekLength: number;
  avgDayLength: number;
  weeks80: number;
  days20: number;
  phase1WeeksUsed: number;
  remainingPhase2Hours: number;
  cbaBidLines: number;
  cbaDatSlots: number;
  isTwoStage: boolean;
  cat: string;
  phase: string;
}

export interface LiabilityParams {
  startDate: string;
  ppCount: number;
  airportCat: string;
  phase: string;
}

export interface WorkgroupBounds {
  minLine: number;
  maxLine: number;
  lineMethod: string;
  minDat: number;
  maxDat: number;
  datMethod: string;
}

export interface AllocConfig {
  airport: string;
  method: string;
  cat: string;
  /** Present on isolated airport snapshots; absent on the factory allocConfig. */
  phase?: string;
  cbaFloorRule: string;
  liabilityMode: string;
  deletedPools: string[];
  workgroups: Record<string, WorkgroupBounds>;
  weekAdjustments: Record<string, number>;
  dayAdjustments: Record<string, number>;
}

export interface PoolGrouping {
  mode: string;
  roleToPoolMap: Record<string, string>;
}

export interface AppointmentsConfig {
  startDate: string;
  endDate: string;
  concurrent: number;
  durationMins: number;
  poolMode: string;
  dayStart: string;
  dayEnd: string;
  setupMins: number;
  teardownMins: number;
  brk1Start: string;
  brk1End: string;
  lunchStart: string;
  lunchEnd: string;
  brk2Start: string;
  brk2End: string;
  excludeDates: string;
  skipWeekends: string;
}

export interface AirportConfigSnapshot {
  liabilityParams: LiabilityParams;
  poolGrouping: PoolGrouping;
  allocConfig: AllocConfig;
  appointmentsConfig: AppointmentsConfig;
}

export interface State {
  liabilityParams: LiabilityParams;
  liabilityEmployees: LiabilityEmployee[];
  bidEmployees: BidEmployee[];
  poolGrouping: PoolGrouping;
  allocConfig: AllocConfig;
  forecastsByAirport: Record<string, number[]>;
  appointmentsConfig: AppointmentsConfig;
  /** Created by ensureSingleAirportConfig; not in getDefaultState(). */
  airportConfigs?: Record<string, AirportConfigSnapshot>;
  /** Optional explicit airport list. getAllKnownAirports unions this with rosters and forecasts. */
  knownAirportSlots?: string[];
}

export interface CbaBidCaps {
  rate: number;
  bidLines: number;
  datSlots: number;
}


export type * from "./result-types";

