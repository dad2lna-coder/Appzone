import { computeResultsUsage } from "../../domain/results";
import { computeRankedBidEmployees } from "../../domain/ranking";
import type { State } from "../../domain/types";
import { toCsv } from "../csv";

const COLUMNS = [
  "Rank",
  "Name",
  "Airport",
  "Role",
  "Pool",
  "FCFS Group",
  "Weeks",
  "Days",
  "Earned Hrs",
  "Used Hrs",
  "Rem Hrs",
  "FCFS Slots",
];

export interface ResultsCsvFile {
  name: string;
  text: string;
  mime: string;
}

/** exportResultsCSV: unscoped ranked roster, quoted name/weeks/days, no trailing newline. */
export function exportResultsCsv(state: State): ResultsCsvFile {
  const { enriched } = computeRankedBidEmployees(state);
  const airport = state.allocConfig.airport;
  const rows = enriched.map((item) => {
    const usage = computeResultsUsage(item);
    return [
      item.rank,
      `"${item.emp.name}"`,
      item.emp.airport || airport,
      item.emp.leaveGroup,
      item.effPool,
      item.emp.fcfsGroup,
      `"${(item.emp.selectedWeeks || []).join(";")}"`,
      `"${(item.emp.selectedDays || []).join(";")}"`,
      item.totalHoursEarned,
      usage.hrsUsed,
      usage.remHrs,
      usage.fcfs,
    ];
  });
  return {
    name: `5_Results_FCFS_Liability_${airport}_2027.csv`,
    text: toCsv(rows, COLUMNS),
    mime: "text/csv",
  };
}
