import { describe, expect, it } from "vitest";
import {
  addDaysUTC,
  formatDateMDYShort,
  formatDateYMD,
  formatMinsToTime,
  normalizeDateString,
  parseDateUTC,
  parseTimeToMins,
} from "../dates";

describe("dates", () => {
  it("crosses a year boundary in UTC", () => {
    const nye = parseDateUTC("2026-12-31");
    expect(nye).not.toBeNull();
    expect(formatDateYMD(addDaysUTC(nye!, 1))).toBe("2027-01-01");
    expect(formatDateYMD(addDaysUTC(parseDateUTC("2027-01-01")!, -1))).toBe("2026-12-31");
    expect(formatDateMDYShort(parseDateUTC("2027-01-01")!)).toBe("01/01/27");
  });

  it("keeps leap day and the day after on the UTC calendar", () => {
    const leap = parseDateUTC("2028-02-29");
    expect(formatDateYMD(leap)).toBe("2028-02-29");
    expect(formatDateYMD(addDaysUTC(leap!, 1))).toBe("2028-03-01");
    expect(leap!.getUTCDate()).toBe(29);
  });

  it("adds whole UTC days across a DST weekend (no local offset)", () => {
    const before = parseDateUTC("2027-03-13");
    const after = addDaysUTC(before!, 1);
    expect(after.getTime() - before!.getTime()).toBe(86_400_000);
    expect(formatDateYMD(after)).toBe("2027-03-14");
  });

  it("parses slash dates, two-digit years, and ISO timestamps", () => {
    expect(formatDateYMD(parseDateUTC("01/10/2027"))).toBe("2027-01-10");
    expect(formatDateYMD(parseDateUTC("1/10/27"))).toBe("2027-01-10");
    expect(formatDateYMD(parseDateUTC("01/10/75"))).toBe("1975-01-10");
    expect(formatDateYMD(parseDateUTC("2027-01-10T15:00:00"))).toBe("2027-01-10");
    expect(normalizeDateString("01/10/2027", "nope")).toBe("2027-01-10");
    expect(normalizeDateString("not-a-date", "nope")).toBe("nope");
  });

  it("parses an Excel serial as a UTC midnight instant", () => {
    const serial = parseDateUTC(44927);
    expect(serial).not.toBeNull();
    expect(formatDateYMD(serial)).toBe(formatDateYMD(new Date(Math.round((44927 - 25569) * 86400 * 1000))));
    expect(serial!.getUTCHours()).toBe(0);
  });

  it("rounds clock minutes without depending on local DST", () => {
    expect(parseTimeToMins("08:15")).toBe(8 * 60 + 15);
    expect(parseTimeToMins("nope", 480)).toBe(480);
    expect(formatMinsToTime(8 * 60 + 15)).toBe("08:15");
    expect(formatMinsToTime(24 * 60 + 5)).toBe("00:05");
  });
});
