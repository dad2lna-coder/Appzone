import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import { computeWorkgroupAllocations } from "../allocation";
import { computeRankedBidEmployees } from "../ranking";
import { computeResultsFcfsSummary, computeResultsGroupSummary, computeResultsParticipantRows, computeResultsUsage } from "../results";
import { selectResultsView } from "../../store/selectors";
import groupSnapshot from "./reference/results-group.json";
import fcfsSnapshot from "./reference/results-fcfs.json";
import participantSnapshot from "./reference/results-participants.json";

function groupCells(rows: ReturnType<typeof computeResultsGroupSummary>): string[][] {
  return rows.map((row) => [row.pool, String(row.count), String(row.earned), String(row.used), String(row.rem), String(row.fcfs), String(row.totalCalSlots)]);
}

function fcfsCells(rows: ReturnType<typeof computeResultsFcfsSummary>): string[][] {
  return rows.map((row) => [row.group, String(row.count), String(row.rem), String(row.fcfs)]);
}

function participantCells(rows: ReturnType<typeof computeResultsParticipantRows>): string[][] {
  return rows.map((row) => [
    `#${row.rank}`,
    row.name,
    row.leaveGroup,
    row.effPool,
    row.fcfsGroup,
    row.weeksLabel,
    row.daysLabel,
    String(row.earned),
    String(row.hrsUsed),
    String(row.remHrs),
    String(row.fcfs),
  ]);
}

describe("results tab", () => {
  it("matches the rendered Results tables on getDefaultState()", () => {
    const state = getDefaultState();
    const { enriched } = computeRankedBidEmployees(state);
    const { wgResults } = computeWorkgroupAllocations(state);
    const airport = state.allocConfig.airport;
    expect(groupCells(computeResultsGroupSummary(enriched, wgResults))).toEqual(groupSnapshot);
    expect(fcfsCells(computeResultsFcfsSummary(enriched))).toEqual(fcfsSnapshot);
    expect(participantCells(computeResultsParticipantRows(enriched, airport))).toEqual(participantSnapshot);
  });

  it("selectResultsView matches the same default-state tables", () => {
    const view = selectResultsView(getDefaultState());
    expect(groupCells(view.groups)).toEqual(groupSnapshot);
    expect(fcfsCells(view.fcfs)).toEqual(fcfsSnapshot);
    expect(participantCells(view.participants)).toEqual(participantSnapshot);
  });

  it("counts a chosen week and day against earned hours", () => {
    const state = getDefaultState();
    state.bidEmployees[0].selectedWeeks = ["Week 01"];
    state.bidEmployees[0].selectedDays = ["2027-01-10"];
    const { enriched } = computeRankedBidEmployees(state);
    const usage = computeResultsUsage(enriched[0]);
    const expectedUsed = enriched[0].avgWeekLength + enriched[0].avgDayLength;
    expect(usage.hrsUsed).toBe(expectedUsed);
    expect(usage.remHrs).toBe(Math.max(0, enriched[0].totalHoursEarned - expectedUsed));
    expect(usage.fcfs).toBe(Math.round(usage.remHrs / enriched[0].avgDayLength));
    const row = computeResultsParticipantRows(enriched, state.allocConfig.airport)[0];
    expect(row.weeksLabel).toBe("Week 01");
    expect(row.daysLabel).toBe("2027-01-10");
  });
});
