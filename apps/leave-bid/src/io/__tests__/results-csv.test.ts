import { describe, expect, it } from "vitest";
import { getDefaultState } from "../../data/index";
import { toCsv } from "../csv";
import { exportResultsCsv } from "../exports/results";
import csvSnapshot from "../../domain/__tests__/reference/results-csv.json";

describe("results csv", () => {
  it("matches exportResultsCSV byte-for-byte on the default state", () => {
    const file = exportResultsCsv(getDefaultState());
    expect(file.name).toBe(csvSnapshot.filename);
    expect(file.mime).toBe(csvSnapshot.mime);
    expect(file.text).toBe(csvSnapshot.text);
    expect(file.text.endsWith("\n")).toBe(false);
  });

  it("joins columns and rows without adding quotes of its own", () => {
    expect(toCsv([[1, `"Ada"`, "DAL"]], ["Rank", "Name", "Airport"])).toBe('Rank,Name,Airport\n1,"Ada",DAL');
  });
});
