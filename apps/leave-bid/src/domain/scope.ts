import type { AirportConfigSnapshot, State } from "./types";
import { normalizeAirportCode } from "./pools";

/** JSON clone. Drops undefined and turns Dates into strings, matching LeaveBid.html cloneDeep. */
export function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const DEFAULT_WORKGROUPS = {
  BUE: { minLine: 1, maxLine: 202, lineMethod: "Less", minDat: 1, maxDat: 202, datMethod: "More" },
  TSO: { minLine: 1, maxLine: 3, lineMethod: "Less", minDat: 1, maxDat: 3, datMethod: "Less" },
  LTSO: { minLine: 1, maxLine: 1, lineMethod: "Less", minDat: 1, maxDat: 1, datMethod: "More" },
  ESTI: { minLine: 1, maxLine: 1, lineMethod: "Less", minDat: 1, maxDat: 1, datMethod: "More" },
  MSTI: { minLine: 1, maxLine: 1, lineMethod: "Less", minDat: 1, maxDat: 1, datMethod: "More" },
  STSO: { minLine: 1, maxLine: 22, lineMethod: "Less", minDat: 1, maxDat: 22, datMethod: "More" },
};

const DEFAULT_ROLE_MAP = { BUE: "BUE", TSO: "TSO", LTSO: "LTSO", ESTI: "ESTI", MSTI: "MSTI", STSO: "STSO" };

export function ensureSingleAirportConfig(state: State, airportCode: string): AirportConfigSnapshot {
  const air = normalizeAirportCode(airportCode);
  if (!state.airportConfigs) state.airportConfigs = {};
  if (!state.airportConfigs[air]) {
    const initCat = state.allocConfig?.cat || state.liabilityParams?.airportCat || "I";
    const initPhase = state.liabilityParams?.phase || "Phase 1";
    state.airportConfigs[air] = {
      liabilityParams: {
        startDate: state.liabilityParams?.startDate || "2027-01-10",
        ppCount: state.liabilityParams?.ppCount || 26,
        airportCat: initCat,
        phase: initPhase,
      },
      poolGrouping: cloneDeep(
        state.poolGrouping || { mode: "individual", roleToPoolMap: { ...DEFAULT_ROLE_MAP } },
      ),
      allocConfig: {
        airport: air,
        method: state.allocConfig?.method || "Fixed",
        cat: initCat,
        phase: initPhase,
        cbaFloorRule: state.allocConfig?.cbaFloorRule || "enforce_all",
        liabilityMode: state.allocConfig?.liabilityMode || "80_20_all",
        deletedPools: [],
        workgroups: cloneDeep(DEFAULT_WORKGROUPS),
        weekAdjustments: {},
        dayAdjustments: {},
      },
      appointmentsConfig: cloneDeep(
        state.appointmentsConfig || {
          startDate: "2025-11-01",
          endDate: "2025-11-10",
          concurrent: 1,
          durationMins: 15,
          poolMode: "parallel",
          dayStart: "08:00",
          dayEnd: "16:30",
          setupMins: 15,
          teardownMins: 15,
          brk1Start: "10:30",
          brk1End: "10:45",
          lunchStart: "12:00",
          lunchEnd: "12:30",
          brk2Start: "14:00",
          brk2End: "14:15",
          excludeDates: "",
          skipWeekends: "no",
        },
      ),
    };
    if (air === normalizeAirportCode(state.allocConfig?.airport)) {
      state.airportConfigs[air].allocConfig.weekAdjustments = cloneDeep(state.allocConfig?.weekAdjustments || {});
      state.airportConfigs[air].allocConfig.dayAdjustments = cloneDeep(state.allocConfig?.dayAdjustments || {});
      state.airportConfigs[air].allocConfig.deletedPools = cloneDeep(state.allocConfig?.deletedPools || []);
    }
  }
  return state.airportConfigs[air];
}

export function saveActiveAirportConfigSnapshot(state: State): void {
  const curAir = normalizeAirportCode(state.allocConfig?.airport || "DAL");
  ensureSingleAirportConfig(state, curAir);
  if (state.allocConfig.cat && state.liabilityParams) {
    state.liabilityParams.airportCat = state.allocConfig.cat;
  }
  if (state.allocConfig.phase && state.liabilityParams) {
    state.liabilityParams.phase = state.allocConfig.phase;
  }
  const snap = state.airportConfigs![curAir];
  snap.liabilityParams = cloneDeep(state.liabilityParams);
  snap.poolGrouping = cloneDeep(state.poolGrouping);
  snap.allocConfig = cloneDeep(state.allocConfig);
  snap.allocConfig.airport = curAir;
  snap.appointmentsConfig = cloneDeep(state.appointmentsConfig);
}

/**
 * Swap the active airport slice, run fn, then restore the previous pointers.
 * Mutates employee.__globalIdx on the roster (same as LeaveBid.html). No DOM.
 */
export function withAirportScope<T>(state: State, airportCode: string, fn: (air: string, snap: AirportConfigSnapshot) => T): T {
  saveActiveAirportConfigSnapshot(state);
  const targetAir = normalizeAirportCode(airportCode);
  const snap = ensureSingleAirportConfig(state, targetAir);

  const backupBid = state.bidEmployees;
  const backupLiab = state.liabilityEmployees;
  const backupAlloc = state.allocConfig;
  const backupLiabParams = state.liabilityParams;
  const backupPoolGrouping = state.poolGrouping;
  const backupAppCfg = state.appointmentsConfig;

  try {
    state.bidEmployees = backupBid
      .map((emp, gIdx) => ({ emp, gIdx }))
      .filter((item) => normalizeAirportCode(item.emp.airport) === targetAir)
      .map((item) => {
        item.emp.__globalIdx = item.gIdx;
        return item.emp;
      });

    state.liabilityEmployees = backupLiab
      .map((emp, gIdx) => ({ emp, gIdx }))
      .filter((item) => normalizeAirportCode(item.emp.airport) === targetAir)
      .map((item) => {
        item.emp.__globalIdx = item.gIdx;
        return item.emp;
      });

    state.allocConfig = snap.allocConfig;
    state.allocConfig.airport = targetAir;
    state.liabilityParams = snap.liabilityParams;
    state.poolGrouping = snap.poolGrouping;
    state.appointmentsConfig = snap.appointmentsConfig;

    return fn(targetAir, snap);
  } finally {
    state.bidEmployees = backupBid;
    state.liabilityEmployees = backupLiab;
    state.allocConfig = backupAlloc;
    state.liabilityParams = backupLiabParams;
    state.poolGrouping = backupPoolGrouping;
    state.appointmentsConfig = backupAppCfg;
  }
}
