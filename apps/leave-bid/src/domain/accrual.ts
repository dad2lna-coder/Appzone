import { parseDateUTC } from "./dates";
import type { CbaBidCaps } from "./types";

export function isTwoStageCategory(cat: unknown): boolean {
  const c = String(cat || "").toUpperCase().trim();
  return c === "III" || c === "IV" || c === "CAT III" || c === "CAT IV";
}

export function getScdAccrualRateOnDate(scdStr: unknown, ppDateObj: Date | null | undefined): number {
  const scd = parseDateUTC(scdStr);
  if (!scd || !ppDateObj) return 4;
  const cutoff15 = new Date(Date.UTC(ppDateObj.getUTCFullYear() - 15, ppDateObj.getUTCMonth(), ppDateObj.getUTCDate()));
  const cutoff3 = new Date(Date.UTC(ppDateObj.getUTCFullYear() - 3, ppDateObj.getUTCMonth(), ppDateObj.getUTCDate()));
  if (scd <= cutoff15) return 8;
  if (scd <= cutoff3) return 6;
  return 4;
}

export function getCbaBidLinesAndDatSlots(scdStr: unknown, refDateStr = "2027-01-10"): CbaBidCaps {
  const rate = getScdAccrualRateOnDate(scdStr, parseDateUTC(refDateStr));
  if (rate === 8) return { rate: 8, bidLines: 4, datSlots: 6 };
  if (rate === 6) return { rate: 6, bidLines: 3, datSlots: 5 };
  return { rate: 4, bidLines: 2, datSlots: 3 };
}
