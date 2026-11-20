import type {
  AppointmentsConfig,
  BidEmployee,
  LiabilityEmployee,
  State,
} from "../domain/types";
import rolesJson from "./roles.json";
import dailyForecastsJson from "./daily-forecasts.json";
import holidaysJson from "./holidays.json";
import liabilityEmployeesJson from "./liability-employees.json";
import bidEmployeesJson from "./bid-employees.json";
import defaultStateJson from "./default-state.json";

export const STANDARD_ROLES: string[] = [...rolesJson];
export const DEFAULT_DAILY_FORECASTS: number[] = [...dailyForecastsJson];
export const HOLIDAY_COMMENTS: Record<string, string> = { ...holidaysJson };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Same object shape LeaveBid.html getDefaultState() returns. Fresh clone every call. */
export function getDefaultState(): State {
  const rest = clone(defaultStateJson) as Omit<State, "liabilityEmployees" | "bidEmployees">;
  return {
    liabilityParams: rest.liabilityParams,
    liabilityEmployees: clone(liabilityEmployeesJson) as LiabilityEmployee[],
    bidEmployees: clone(bidEmployeesJson) as BidEmployee[],
    poolGrouping: rest.poolGrouping,
    allocConfig: rest.allocConfig,
    forecastsByAirport: rest.forecastsByAirport,
    appointmentsConfig: rest.appointmentsConfig as AppointmentsConfig,
  };
}
