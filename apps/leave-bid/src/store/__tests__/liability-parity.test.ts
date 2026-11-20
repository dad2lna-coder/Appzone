import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import liabilityRows from "../../../../example-app/baseline/snapshots/liability-rows.json";
import { selectLiabilityView } from "../selectors";

describe("liability parity", () => {
  it("matches the P1 snapshot rows and KPI ceils on default state", () => {
    const state = getDefaultState();
    const view = selectLiabilityView({
      liabilityEmployees: state.liabilityEmployees,
      liabilityParams: state.liabilityParams,
      allocConfig: state.allocConfig,
      forecastsByAirport: state.forecastsByAirport,
      bidEmployees: state.bidEmployees,
      knownAirportSlots: state.knownAirportSlots,
      roleFilter: "ALL",
    });
    const snapshot = liabilityRows as {
      rows: { id: number; airport: string; group: string; row: unknown }[];
    };
    expect(view.rows.map((row) => row.comp)).toEqual(snapshot.rows.map((row) => row.row));
    expect(view.rows.map((row) => ({ id: row.emp.id, airport: row.emp.airport, group: row.emp.group }))).toEqual(
      snapshot.rows.map(({ id, airport, group }) => ({ id, airport, group })),
    );
    const hours = view.rows.reduce((sum, row) => sum + row.comp.totalHoursEarned, 0);
    const weeks = view.rows.reduce((sum, row) => sum + row.comp.weeks80, 0);
    const days = view.rows.reduce((sum, row) => sum + row.comp.days20, 0);
    expect(view.kpis.hoursLabel).toBe(hours.toLocaleString());
    expect(view.kpis.bidLines).toBe(Math.ceil(weeks - 1e-9));
    expect(view.kpis.datSlots).toBe(Math.ceil(days - 1e-9));
    expect(view.kpis.bidLines).toBe(view.rollup.totalBidLinesCeil);
    expect(view.kpis.datSlots).toBe(view.rollup.totalDatSlotsCeil);
    expect(view.rollup.groups.reduce((sum, group) => sum + group.count, 0)).toBe(view.rows.length);
  });
});
