import { computeWorkgroupAllocations } from "../domain/allocation";
import { isTwoStageCategory } from "../domain/accrual";
import { computeEmployeeLiabilityRow, computeLiabilityRollup } from "../domain/liability";
import { computeLeaveList364, type LeaveListRow } from "../domain/leaveList";
import { getActiveDailyForecasts, getAllKnownAirports, getAllKnownRoles, normalizeAirportCode } from "../domain/pools";
import { computeRankedBidEmployees } from "../domain/ranking";
import {
  computeResultsFcfsSummary,
  computeResultsGroupSummary,
  computeResultsParticipantRows,
  type ResultsFcfsRow,
  type ResultsGroupRow,
  type ResultsParticipantRow,
} from "../domain/results";
import { cloneDeep, withAirportScope } from "../domain/scope";
import type { AllocConfig, LiabilityEmployee, LiabilityParams, LiabilityRollup, LiabilityRow, State } from "../domain/types";

export interface LiabilityTableRow {
  emp: LiabilityEmployee;
  origIdx: number;
  comp: LiabilityRow;
}

export interface LiabilityKpis {
  hoursLabel: string;
  bidLines: number;
  datSlots: number;
  linesSub: string;
  datSub: string;
  twoStage: boolean;
}

export interface LiabilityView {
  activeAirport: string;
  airports: string[];
  rows: LiabilityTableRow[];
  rollup: LiabilityRollup;
  kpis: LiabilityKpis;
  ppCount: number;
}

export interface LiabilitySelectorInput {
  liabilityEmployees: LiabilityEmployee[];
  liabilityParams: LiabilityParams;
  allocConfig: AllocConfig;
  forecastsByAirport: State["forecastsByAirport"];
  bidEmployees: State["bidEmployees"];
  knownAirportSlots?: string[];
  roleFilter: string;
}

const airportCache = new Map<string, string[]>();
const cache = new Map<string, LiabilityView>();
const resultsCache = new Map<string, ResultsView>();
const leaveListCache = new Map<string, LeaveListView>();

/** Stable airport list for useSyncExternalStore. A fresh array each call loops React. */
export function selectKnownAirports(state: State): string[] {
  const key = [
    refId(state.allocConfig),
    refId(state.knownAirportSlots),
    refId(state.forecastsByAirport),
    refId(state.bidEmployees),
    refId(state.liabilityEmployees),
  ].join("|");
  const hit = airportCache.get(key);
  if (hit) return hit;
  const next = getAllKnownAirports(state);
  airportCache.set(key, next);
  return next;
}

function refId(value: object | undefined): string {
  if (!value) return "0";
  const id = ids.get(value);
  if (id) return id;
  const next = String(++seq);
  ids.set(value, next);
  return next;
}

const ids = new WeakMap<object, string>();
let seq = 0;

export function selectLiabilityView(input: LiabilitySelectorInput): LiabilityView {
  const key = [
    refId(input.liabilityEmployees),
    refId(input.liabilityParams),
    refId(input.allocConfig),
    refId(input.forecastsByAirport),
    refId(input.bidEmployees),
    refId(input.knownAirportSlots),
    input.roleFilter,
  ].join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  const activeAirport = normalizeAirportCode(input.allocConfig?.airport || "DAL");
  const params = input.liabilityParams;
  const cat = params.airportCat;
  const phase = params.phase;
  const roleFilter = input.roleFilter || "ALL";
  const rows: LiabilityTableRow[] = [];
  input.liabilityEmployees.forEach((emp, origIdx) => {
    if (normalizeAirportCode(emp.airport) !== activeAirport) return;
    if (roleFilter !== "ALL" && (emp.group || "TSO") !== roleFilter) return;
    rows.push({
      emp,
      origIdx,
      comp: computeEmployeeLiabilityRow(emp, params.startDate, params.ppCount, cat, phase),
    });
  });

  const rollup = computeLiabilityRollup(
    input.liabilityEmployees,
    params.startDate,
    params.ppCount,
    cat,
    phase,
    activeAirport,
    roleFilter,
  );
  const twoStage = isTwoStageCategory(cat);
  const hours = rows.reduce((sum, row) => sum + row.comp.totalHoursEarned, 0);
  const weeks = rows.reduce((sum, row) => sum + row.comp.weeks80, 0);
  const days = rows.reduce((sum, row) => sum + row.comp.days20, 0);
  const view: LiabilityView = {
    activeAirport,
    airports: getAllKnownAirports({
      ...input,
      poolGrouping: { mode: "individual", roleToPoolMap: {} },
      appointmentsConfig: {} as State["appointmentsConfig"],
    }),
    rows,
    rollup,
    ppCount: params.ppCount,
    kpis: {
      hoursLabel: hours.toLocaleString(),
      bidLines: Math.ceil(weeks - 1e-9),
      datSlots: Math.ceil(days - 1e-9),
      twoStage,
      linesSub: twoStage ? `CAT ${cat} (100% Accrued Weeks)` : `CAT ${cat} ceil(sum of 80% weeks)`,
      datSub: twoStage
        ? phase === "Phase 1"
          ? `CAT ${cat} Phase 1 (0 DAT Slots in Ph 1)`
          : `CAT ${cat} Phase 2 ceil(100% Rem. Hrs / Day)`
        : `CAT ${cat} ceil(sum of 20% days)`,
    },
  };
  cache.set(key, view);
  return view;
}

export interface ResultsView {
  airport: string;
  groups: ResultsGroupRow[];
  fcfs: ResultsFcfsRow[];
  participants: ResultsParticipantRow[];
}

export interface LeaveListView {
  roleFilter: string;
  roles: string[];
  rows: LeaveListRow[];
}

function scopeActive<T>(state: State, fn: (scoped: State) => T): T {
  const working = cloneDeep(state);
  const air = normalizeAirportCode(working.allocConfig?.airport || "DAL");
  return withAirportScope(working, air, () => fn(working));
}

function stateKey(state: State): string {
  return [
    refId(state.liabilityParams),
    refId(state.liabilityEmployees),
    refId(state.bidEmployees),
    refId(state.poolGrouping),
    refId(state.allocConfig),
    refId(state.forecastsByAirport),
    refId(state.appointmentsConfig),
    refId(state.airportConfigs),
    refId(state.knownAirportSlots),
  ].join("|");
}

/** renderResultsTab, single airport. Side-by-side comparison is not included. */
export function selectResultsView(state: State): ResultsView {
  const key = stateKey(state);
  const hit = resultsCache.get(key);
  if (hit) return hit;
  const view = scopeActive(state, (scoped) => {
    const { enriched } = computeRankedBidEmployees(scoped);
    const { wgResults } = computeWorkgroupAllocations(scoped);
    const airport = scoped.allocConfig.airport;
    return {
      airport,
      groups: computeResultsGroupSummary(enriched, wgResults),
      fcfs: computeResultsFcfsSummary(enriched),
      participants: computeResultsParticipantRows(enriched, airport),
    };
  });
  resultsCache.set(key, view);
  return view;
}

/** renderCalendar5BTab. roleFilter matches #cal5bRoleFilter and is not persisted. */
export function selectLeaveListView(state: State, roleFilter: string): LeaveListView {
  const role = roleFilter || "ALL";
  const key = `${stateKey(state)}|${role}`;
  const hit = leaveListCache.get(key);
  if (hit) return hit;
  const view = scopeActive(state, (scoped) => ({
    roleFilter: role,
    roles: getAllKnownRoles(scoped),
    rows: computeLeaveList364({
      startDate: scoped.liabilityParams.startDate,
      forecast: getActiveDailyForecasts(scoped),
      bidEmployees: scoped.bidEmployees,
      roleFilter: role,
    }),
  }));
  leaveListCache.set(key, view);
  return view;
}
