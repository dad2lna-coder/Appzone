import { getDefaultState } from "../data/index";
import type { State } from "../domain/types";

/** Fields written to localStorage. UI preferences stay out of the V3 key. */
export type PersistedSlice = State;

export function mergeLeaveState(defaults: State, incoming: Partial<State> | null | undefined): State {
  const src = incoming ?? {};
  const allocIn = src.allocConfig;
  const forecasts = { ...defaults.forecastsByAirport };
  if (src.forecastsByAirport) {
    for (const [code, series] of Object.entries(src.forecastsByAirport)) {
      if (series && series.length) forecasts[code] = series;
    }
  }
  return {
    liabilityParams: { ...defaults.liabilityParams, ...(src.liabilityParams ?? {}) },
    liabilityEmployees: src.liabilityEmployees ?? defaults.liabilityEmployees,
    bidEmployees: src.bidEmployees ?? defaults.bidEmployees,
    poolGrouping: src.poolGrouping ?? defaults.poolGrouping,
    allocConfig: {
      ...defaults.allocConfig,
      ...(allocIn ?? {}),
      deletedPools: allocIn?.deletedPools ?? defaults.allocConfig.deletedPools,
      workgroups: allocIn?.workgroups ?? defaults.allocConfig.workgroups,
      weekAdjustments: allocIn?.weekAdjustments ?? defaults.allocConfig.weekAdjustments,
      dayAdjustments: allocIn?.dayAdjustments ?? defaults.allocConfig.dayAdjustments,
    },
    forecastsByAirport: forecasts,
    appointmentsConfig: { ...defaults.appointmentsConfig, ...(src.appointmentsConfig ?? {}) },
    airportConfigs: src.airportConfigs ?? defaults.airportConfigs,
    knownAirportSlots: src.knownAirportSlots ?? defaults.knownAirportSlots,
  };
}

/** Accepts a raw V3 state (or a later slice) and fills anything missing from defaults. */
export function migrate(persisted: unknown, _version: number): PersistedSlice {
  const incoming =
    persisted && typeof persisted === "object" ? (persisted as Partial<State>) : undefined;
  return mergeLeaveState(getDefaultState(), incoming);
}

export function isRawLeaveState(value: unknown): value is Partial<State> {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return "liabilityEmployees" in rec || "liabilityParams" in rec || "bidEmployees" in rec;
}
