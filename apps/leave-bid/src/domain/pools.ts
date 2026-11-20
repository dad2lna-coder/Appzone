import { DEFAULT_DAILY_FORECASTS, STANDARD_ROLES } from "../data/index";
import type { PoolGrouping, State } from "./types";

export function normalizeAirportCode(code: unknown): string {
  const c = String(code || "").toUpperCase().trim();
  return c || "DAL";
}

export function getAllKnownAirports(state: State): string[] {
  const fromSlots = state.knownAirportSlots || [];
  const fromForecasts = Object.keys(state.forecastsByAirport || {});
  const fromBid = (state.bidEmployees || []).map((e) => normalizeAirportCode(e.airport)).filter(Boolean);
  const fromLiab = (state.liabilityEmployees || []).map((e) => normalizeAirportCode(e.airport)).filter(Boolean);
  const cur = normalizeAirportCode(state.allocConfig?.airport || "DAL");
  return [...new Set([cur, ...fromSlots, ...fromBid, ...fromLiab, ...fromForecasts].filter(Boolean))].sort();
}

export function getAirportEmployeeCount(state: State, airportCode: string): number {
  const air = normalizeAirportCode(airportCode);
  return (state.bidEmployees || []).filter((e) => normalizeAirportCode(e.airport) === air && e.name && e.name.trim()).length;
}

export function getAllKnownRoles(state: State): string[] {
  const fromLiab = state.liabilityEmployees.map((e) => (e.group || "TSO").trim());
  const fromBid = state.bidEmployees.map((e) => (e.leaveGroup || "TSO").trim());
  return [...new Set([...STANDARD_ROLES, ...fromLiab, ...fromBid].filter(Boolean))];
}

export function getEffectivePoolForRole(roleName: string | undefined, poolGrouping: PoolGrouping | undefined): string {
  const role = (roleName || "TSO").trim();
  const pg = poolGrouping || { mode: "individual", roleToPoolMap: {} };
  if (pg.mode === "individual") return role;
  if (pg.mode === "combine_sti") return role === "ESTI" || role === "MSTI" ? "STI" : role;
  if (pg.mode === "combine_tso_ltso") return role === "TSO" || role === "LTSO" ? "TSO/LTSO" : role;
  if (pg.mode === "combine_all_bue") return ["BUE", "TSO", "LTSO", "ESTI", "MSTI"].includes(role) ? "BUE" : role;
  return pg.roleToPoolMap && pg.roleToPoolMap[role] ? pg.roleToPoolMap[role] : role;
}

export function getActiveDailyForecasts(state: State): number[] {
  const code = state.allocConfig.airport || "CRP";
  return state.forecastsByAirport[code] || state.forecastsByAirport["CRP"] || DEFAULT_DAILY_FORECASTS;
}
