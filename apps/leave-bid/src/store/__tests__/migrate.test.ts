import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import { migrate } from "../migrate";
import { leaveStorage, STORAGE_KEY } from "../storage";

describe("migrate", () => {
  it("accepts a V3 blob from getDefaultState without loss", () => {
    const v3 = getDefaultState();
    const next = migrate(v3, 3);
    expect(next.liabilityParams).toEqual(v3.liabilityParams);
    expect(next.liabilityEmployees).toEqual(v3.liabilityEmployees);
    expect(next.bidEmployees).toEqual(v3.bidEmployees);
    expect(next.poolGrouping).toEqual(v3.poolGrouping);
    expect(next.allocConfig).toEqual(v3.allocConfig);
    expect(next.forecastsByAirport).toEqual(v3.forecastsByAirport);
    expect(next.appointmentsConfig).toEqual(v3.appointmentsConfig);
    expect(next.airportConfigs).toEqual(v3.airportConfigs);
    expect(next.knownAirportSlots).toEqual(v3.knownAirportSlots);
  });

  it("fills missing fields from defaults and keeps the provided roster", () => {
    const defaults = getDefaultState();
    const roster = defaults.liabilityEmployees.slice(0, 2).map((emp) => ({ ...emp, name: "Kept, Name" }));
    const next = migrate({ liabilityEmployees: roster, liabilityParams: { startDate: "2027-02-01" } }, 3);
    expect(next.liabilityEmployees).toEqual(roster);
    expect(next.liabilityParams.startDate).toBe("2027-02-01");
    expect(next.liabilityParams.ppCount).toBe(defaults.liabilityParams.ppCount);
    expect(next.liabilityParams.airportCat).toBe(defaults.liabilityParams.airportCat);
    expect(next.bidEmployees).toEqual(defaults.bidEmployees);
    expect(Object.keys(next.forecastsByAirport).sort()).toEqual(Object.keys(defaults.forecastsByAirport).sort());
    expect(next.allocConfig.workgroups.BUE).toEqual(defaults.allocConfig.workgroups.BUE);
    expect(next.appointmentsConfig.dayStart).toBe(defaults.appointmentsConfig.dayStart);
  });

  it("reads a raw V3 blob and writes state back without a Zustand envelope", () => {
    const v3 = getDefaultState();
    leaveStorage.setItem(STORAGE_KEY, JSON.stringify({ state: v3, version: 4 }));
    const raw = leaveStorage.getItem(STORAGE_KEY);
    if (typeof raw !== "string") throw new Error("storage getItem should be sync");
    const read = JSON.parse(raw) as { state: typeof v3; version: number };
    expect(read.version).toBe(3);
    expect(read.state.liabilityEmployees).toEqual(v3.liabilityEmployees);
    expect(read.state.liabilityParams).toEqual(v3.liabilityParams);
  });
});
