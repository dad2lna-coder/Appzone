import { DEFAULT_DAILY_FORECASTS } from "../data/index";
import { normalizeAirportCode } from "./pools";
import { cloneDeep, ensureSingleAirportConfig, saveActiveAirportConfigSnapshot } from "./scope";
import type { State } from "./types";

/** Copy of ensureAirportForecastExists. New helper; does not change existing signatures. */
export function ensureAirportForecast(state: State, code: string): string {
  const clean = (code || "CRP").toUpperCase().trim() || "CRP";
  if (!state.forecastsByAirport[clean]) {
    const base = state.forecastsByAirport[state.allocConfig.airport] || DEFAULT_DAILY_FORECASTS;
    state.forecastsByAirport[clean] = [...base];
  }
  return clean;
}

/**
 * setGlobalAirport without DOM renders. Saves the active snapshot, ensures a
 * forecast, then loads that airport's isolated config into the working state.
 */
export function activateAirport(state: State, code: string): State {
  const next = cloneDeep(state);
  saveActiveAirportConfigSnapshot(next);
  const clean = ensureAirportForecast(next, normalizeAirportCode(code));
  if (!next.knownAirportSlots) next.knownAirportSlots = [];
  if (!next.knownAirportSlots.includes(clean)) next.knownAirportSlots.push(clean);
  const snap = ensureSingleAirportConfig(next, clean);
  next.liabilityParams = cloneDeep(snap.liabilityParams);
  next.poolGrouping = cloneDeep(snap.poolGrouping);
  next.allocConfig = cloneDeep(snap.allocConfig);
  next.allocConfig.airport = clean;
  if (!next.allocConfig.phase) next.allocConfig.phase = next.liabilityParams.phase || "Phase 1";
  next.appointmentsConfig = cloneDeep(snap.appointmentsConfig);
  return next;
}
