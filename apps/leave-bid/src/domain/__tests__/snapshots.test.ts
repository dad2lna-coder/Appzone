import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import { computeWorkgroupAllocations, recalculateAllocation } from "../allocation";
import { generateAppointmentSchedule } from "../appointments";
import { computeEmployeeLiabilityRow, computeLiabilityRollup } from "../liability";
import { getAllKnownAirports } from "../pools";
import { computeRankedBidEmployees } from "../ranking";
import { withAirportScope } from "../scope";
import type { State } from "../types";
import defaultStateSnapshot from "../../../../example-app/baseline/snapshots/default-state.json";
import liabilityRowsSnapshot from "../../../../example-app/baseline/snapshots/liability-rows.json";
import rankedSnapshot from "../../../../example-app/baseline/snapshots/ranked-bid-employees.json";
import allocationsSnapshot from "../../../../example-app/baseline/snapshots/allocations.json";
import appointmentSnapshot from "../../../../example-app/baseline/snapshots/appointment-schedule.json";

const SNAPSHOTS: Record<string, unknown> = {
  "default-state": defaultStateSnapshot,
  "liability-rows": liabilityRowsSnapshot,
  "ranked-bid-employees": rankedSnapshot,
  allocations: allocationsSnapshot,
  "appointment-schedule": appointmentSnapshot,
};

/** Same canonicalizer as apps/example-app/baseline/capture.mjs (Dates -> {}, Sets/Maps tagged). */
function canonicalize(value: unknown): unknown {
  const tag = Object.prototype.toString.call(value);
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return { __type: "Number", value: String(value) };
    }
    return value;
  }
  if (tag === "[object Set]") {
    const values = Array.from(value as Set<unknown>).map(canonicalize);
    values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { __type: "Set", values };
  }
  if (tag === "[object Map]") {
    const entries = Array.from(value as Map<unknown, unknown>).map(([k, v]) => [canonicalize(k), canonicalize(v)]);
    entries.sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
    return { __type: "Map", entries };
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as object).sort()) {
    out[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return out;
}

function firstDiff(actual: unknown, expected: unknown, pathName = "$"): string | null {
  if (actual === expected) return null;
  if (typeof actual !== typeof expected) return `${pathName}: type ${typeof actual} !== ${typeof expected}`;
  if (actual === null || expected === null || typeof actual !== "object") {
    return `${pathName}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return `${pathName}: array mismatch`;
    if (actual.length !== expected.length) return `${pathName}: length ${actual.length} !== ${expected.length}`;
    for (let i = 0; i < actual.length; i++) {
      const diff = firstDiff(actual[i], expected[i], `${pathName}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }
  const a = actual as Record<string, unknown>;
  const e = expected as Record<string, unknown>;
  const aKeys = Object.keys(a).sort();
  const eKeys = Object.keys(e).sort();
  if (aKeys.join("|") !== eKeys.join("|")) {
    const missing = eKeys.filter((k) => !aKeys.includes(k));
    const extra = aKeys.filter((k) => !eKeys.includes(k));
    return `${pathName}: keys extra=[${extra.join(",")}] missing=[${missing.join(",")}]`;
  }
  for (const key of aKeys) {
    const diff = firstDiff(a[key], e[key], `${pathName}.${key}`);
    if (diff) return diff;
  }
  return null;
}

function expectSnapshot(actual: unknown, name: string): void {
  const got = canonicalize(actual);
  const expected = SNAPSHOTS[name];
  const diff = firstDiff(got, expected);
  if (diff) throw new Error(`${name}: ${diff}`);
  expect(got).toEqual(expected);
}

describe("LeaveBid engine snapshot parity", () => {
  it("getDefaultState matches default-state.json", () => {
    expectSnapshot(getDefaultState(), "default-state");
  });

  it("computeEmployeeLiabilityRow matches liability-rows.json", () => {
    const state = getDefaultState();
    const params = state.liabilityParams;
    const rows = state.liabilityEmployees.map((emp) => ({
      id: emp.id,
      airport: emp.airport,
      group: emp.group,
      row: computeEmployeeLiabilityRow(emp, params.startDate, params.ppCount, params.airportCat, params.phase),
    }));
    expectSnapshot(
      {
        params: {
          startDate: params.startDate,
          ppCount: params.ppCount,
          airportCat: params.airportCat,
          phase: params.phase,
        },
        rows,
      },
      "liability-rows",
    );
  });

  it("computeRankedBidEmployees matches ranked-bid-employees.json", () => {
    const state = getDefaultState();
    // Page init calls recalculateAllocation, which tags emp.__globalIdx before ranking is snapshotted.
    recalculateAllocation(state);
    expectSnapshot(computeRankedBidEmployees(state), "ranked-bid-employees");
  });

  it("generateAppointmentSchedule matches appointment-schedule.json", () => {
    const state = getDefaultState();
    recalculateAllocation(state);
    expectSnapshot(generateAppointmentSchedule(state), "appointment-schedule");
  });

  it("per-airport allocation matches allocations.json", () => {
    const state = getDefaultState();
    const airports = getAllKnownAirports(state);
    const allocations: Record<string, unknown> = {};
    for (const airport of airports) {
      allocations[airport] = withAirportScope(state, airport, () => {
        const workgroupAllocations = computeWorkgroupAllocations(state);
        recalculateAllocation(state);
        return {
          workgroupAllocations,
          allocConfig: state.allocConfig,
          liabilityParams: state.liabilityParams,
        };
      });
    }
    expectSnapshot({ airports: allocations }, "allocations");
  }, 120000);

  it("computeLiabilityRollup ceils the DAL group totals", () => {
    const state: State = getDefaultState();
    const p = state.liabilityParams;
    const rollup = computeLiabilityRollup(
      state.liabilityEmployees,
      p.startDate,
      p.ppCount,
      p.airportCat,
      p.phase,
      state.allocConfig.airport,
    );
    const officers = rollup.groups.reduce((s, g) => s + g.count, 0);
    expect(officers).toBe(state.liabilityEmployees.length);
    expect(rollup.groups.map((g) => g.group)).toEqual(["BUE", "STSO"]);
    expect(rollup.totalBidLinesCeil).toBe(Math.ceil(rollup.sumWeeksLiab - 1e-9));
    expect(rollup.totalDatSlotsCeil).toBe(Math.ceil(rollup.sumDaysLiab - 1e-9));
  });
});
