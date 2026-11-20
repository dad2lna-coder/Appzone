import { DEFAULT_DAILY_FORECASTS, HOLIDAY_COMMENTS } from "../data/index";
import type { CalendarDay, CalendarGrid, CalendarWeek } from "./types";

export const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function parseDateUTC(dateStr: unknown): Date | null {
  if (!dateStr && dateStr !== 0) return null;
  if (typeof dateStr === "number" && dateStr > 15000 && dateStr < 80000) {
    return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  }
  const s = String(dateStr).trim();
  if (!s) return null;
  const parts = s.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  }
  const slash = s.split(" ")[0].split("/");
  if (slash.length === 3) {
    let m = parseInt(slash[0], 10);
    let d = parseInt(slash[1], 10);
    let y = parseInt(slash[2], 10);
    if (slash[0].length === 4) {
      y = parseInt(slash[0], 10);
      m = parseInt(slash[1], 10);
      d = parseInt(slash[2], 10);
    } else if (y < 100) y += y >= 50 ? 1900 : 2000;
    return new Date(Date.UTC(y, m - 1, d));
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
}

export function formatDateYMD(dateObj: Date | null | undefined): string {
  if (!dateObj || isNaN(dateObj.getTime())) return "";
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateMDYShort(dateObj: Date): string {
  const y = String(dateObj.getUTCFullYear()).slice(-2);
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${m}/${d}/${y}`;
}

export function addDaysUTC(dateObj: Date, days: number): Date {
  const d = new Date(dateObj.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function normalizeDateString(s: string, fallback: string): string {
  const d = parseDateUTC(s);
  return d ? formatDateYMD(d) : fallback;
}

export function parseTimeToMins(tStr: string | undefined | null, fallbackMins = 480): number {
  if (!tStr || typeof tStr !== "string" || !tStr.includes(":")) return fallbackMins;
  const [h, m] = tStr.split(":").map((n) => parseInt(n, 10));
  if (isNaN(h) || isNaN(m)) return fallbackMins;
  return h * 60 + m;
}

export function formatMinsToTime(mins: number): string {
  const mTotal = Math.max(0, Math.round(mins));
  const h = Math.floor(mTotal / 60) % 24;
  const m = mTotal % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getCalendarDaysAndWeeks(
  startDateStr = "2027-01-10",
  forecastArr: number[] = DEFAULT_DAILY_FORECASTS,
  holidays: Record<string, string> = HOLIDAY_COMMENTS,
  fallbackForecasts: number[] = DEFAULT_DAILY_FORECASTS,
): CalendarGrid {
  const start = parseDateUTC(startDateStr);
  if (!start) return { days: [], weeks: [] };
  const days: CalendarDay[] = [];
  const weeks: CalendarWeek[] = [];

  for (let w = 0; w < 52; w++) {
    const ppNum = Math.floor(w / 2) + 1;
    const ppLabel = `PP ${String(ppNum).padStart(2, "0")}`;
    const wkLabel = `Week ${String(w + 1).padStart(2, "0")}`;
    const wkStartObj = addDaysUTC(start, w * 7);
    const wkEndObj = addDaysUTC(wkStartObj, 6);
    let wkVolume = 0;
    for (let d = 0; d < 7; d++) {
      const dayIdx = w * 7 + d;
      const dObj = addDaysUTC(start, dayIdx);
      const ymd = formatDateYMD(dObj);
      const vol = forecastArr[dayIdx] ?? fallbackForecasts[dayIdx] ?? 1000;
      wkVolume += vol;
      days.push({
        dayIdx,
        weekIdx: w,
        ppLabel,
        wkLabel,
        ymd,
        mdy: formatDateMDYShort(dObj),
        dow: DOW_NAMES[dObj.getUTCDay()],
        forecast: vol,
        publicComment: holidays[ymd] || "",
        dateObj: dObj,
      });
    }
    weeks.push({
      weekIdx: w,
      ppLabel,
      wkLabel,
      startYmd: formatDateYMD(wkStartObj),
      endYmd: formatDateYMD(wkEndObj),
      startMdy: formatDateMDYShort(wkStartObj),
      volume: wkVolume,
    });
  }
  return { days, weeks };
}
