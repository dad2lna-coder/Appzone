import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import { computeLeaveList364 } from "../leaveList";
import { getActiveDailyForecasts, getAllKnownRoles } from "../pools";
import { selectLeaveListView } from "../../store/selectors";
import leaveListSnapshot from "./reference/leave-list.json";

function cells(rows: ReturnType<typeof computeLeaveList364>): string[][] {
  return rows.map((row) => [
    row.ppLabel,
    row.wkLabel,
    row.date,
    row.dow,
    row.holiday,
    row.volumeLabel,
    String(row.total),
    row.weekOfficers,
    row.dayOfficers,
  ]);
}

describe("364-day leave list", () => {
  it("matches the rendered 5B table on getDefaultState()", () => {
    const state = getDefaultState();
    const rows = computeLeaveList364({
      startDate: state.liabilityParams.startDate,
      forecast: getActiveDailyForecasts(state),
      bidEmployees: state.bidEmployees,
      roleFilter: "ALL",
    });
    expect(cells(rows)).toEqual(leaveListSnapshot.rows);
    expect(["ALL", ...getAllKnownRoles(state)]).toEqual(leaveListSnapshot.roles);
    expect(rows).toHaveLength(364);
  });

  it("selectLeaveListView matches the same default-state table", () => {
    const view = selectLeaveListView(getDefaultState(), "ALL");
    expect(cells(view.rows)).toEqual(leaveListSnapshot.rows);
    expect(["ALL", ...view.roles]).toEqual(leaveListSnapshot.roles);
  });

  it("places a weekly line on that week's days and a DAT on the chosen ymd", () => {
    const state = getDefaultState();
    const officer = state.bidEmployees[0];
    officer.selectedWeeks = ["Week 01"];
    officer.selectedDays = ["2027-01-12"];
    const rows = computeLeaveList364({
      startDate: state.liabilityParams.startDate,
      forecast: getActiveDailyForecasts(state),
      bidEmployees: state.bidEmployees,
      roleFilter: "ALL",
    });
    const label = `${officer.name} (${officer.leaveGroup})`;
    const week = rows.filter((row) => row.wkLabel === "Week 01");
    expect(week).toHaveLength(7);
    expect(week.every((row) => row.weekOfficers === label)).toBe(true);
    expect(week.every((row) => row.total >= 1)).toBe(true);
    const dat = rows.find((row) => row.dayOfficers === label);
    expect(dat?.date).toBe("01/12/27");
    expect(rows.filter((row) => row.wkLabel !== "Week 01").every((row) => row.weekOfficers === "-")).toBe(true);
  });

  it("drops other roles when the filter is STSO", () => {
    const state = getDefaultState();
    const bue = state.bidEmployees.find((emp) => emp.leaveGroup === "BUE");
    const stso = state.bidEmployees.find((emp) => emp.leaveGroup === "STSO");
    if (!bue || !stso) throw new Error("roster is missing BUE or STSO");
    bue.selectedWeeks = ["Week 02"];
    stso.selectedWeeks = ["Week 02"];
    const rows = computeLeaveList364({
      startDate: state.liabilityParams.startDate,
      forecast: getActiveDailyForecasts(state),
      bidEmployees: state.bidEmployees,
      roleFilter: "STSO",
    });
    const hit = rows.find((row) => row.wkLabel === "Week 02");
    expect(hit?.weekOfficers).toBe(`${stso.name} (STSO)`);
    expect(hit?.weekOfficers.includes(bue.name)).toBe(false);
  });
});
