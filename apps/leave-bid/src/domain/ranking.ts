import { parseDateUTC } from "./dates";
import { computeEmployeeLiabilityRow } from "./liability";
import { getEffectivePoolForRole, normalizeAirportCode } from "./pools";
import { withAirportScope } from "./scope";
import type { BidEmployee, RankedBidEmployee, RankedBidResult, RankedPoolItem, State } from "./types";

function runCore(state: State): RankedBidResult {
  const startDate = state.liabilityParams.startDate || "2027-01-10";
  const ppCount = state.liabilityParams.ppCount || 26;
  const cat = state.allocConfig.cat || state.liabilityParams.airportCat || "I";
  const phase = state.allocConfig.phase || state.liabilityParams.phase || "Phase 1";

  const seenTieKeys = new Set<string>();
  const hasUnresolvedTieMap: Record<number, boolean> = {};
  state.bidEmployees.forEach((emp, idx) => {
    const randVal =
      emp.rand !== undefined && emp.rand !== null && String(emp.rand).trim() !== "" && Number(emp.rand) !== 0
        ? String(emp.rand).trim()
        : "__BLANK__";
    const tieKey = `${emp.eod || ""}|${emp.scd || ""}|${randVal}`;
    if (seenTieKeys.has(tieKey)) hasUnresolvedTieMap[idx] = true;
    else {
      seenTieKeys.add(tieKey);
      hasUnresolvedTieMap[idx] = false;
    }
  });

  const byPool: Record<string, RankedPoolItem[]> = {};
  const compByIdx: Record<number, ReturnType<typeof computeEmployeeLiabilityRow>> = {};
  state.bidEmployees.forEach((emp, idx) => {
    if (!emp.name || !emp.name.trim()) return;
    const effPool = getEffectivePoolForRole(emp.leaveGroup || "TSO", state.poolGrouping);
    const p1Wks =
      emp.phase1Weeks !== undefined && emp.phase1Weeks !== ""
        ? Number(emp.phase1Weeks)
        : Array.isArray(emp.selectedWeeks)
          ? emp.selectedWeeks.length
          : 0;
    const comp = computeEmployeeLiabilityRow(
      { scd: emp.scd, hoursPerPP: emp.hoursPP || 80, daysPerPP: (emp.daysPP || 5) * 2, phase1Weeks: p1Wks },
      startDate,
      ppCount,
      cat,
      phase,
    );
    compByIdx[idx] = comp;
    if (!byPool[effPool]) byPool[effPool] = [];
    byPool[effPool].push({ emp, idx, effPool, comp, hasUnresolvedTie: hasUnresolvedTieMap[idx] });
  });

  const ranks: Record<number, number> = {};
  const excelRanks: Record<number, number | null> = {};
  const cumWeeks: Record<number, number> = {};
  const cumDays: Record<number, number> = {};
  Object.keys(byPool).forEach((pool) => {
    byPool[pool].sort((a, b) => {
      const eodA = parseDateUTC(a.emp.eod)?.getTime() || 0;
      const eodB = parseDateUTC(b.emp.eod)?.getTime() || 0;
      if (eodA !== eodB) return eodA - eodB;
      const scdA = parseDateUTC(a.emp.scd)?.getTime() || 0;
      const scdB = parseDateUTC(b.emp.scd)?.getTime() || 0;
      if (scdA !== scdB) return scdA - scdB;
      const rA = Number(a.emp.rand) || 9999999;
      const rB = Number(b.emp.rand) || 9999999;
      if (rA !== rB) return rA - rB;
      return a.idx - b.idx;
    });

    let runningWk = 0;
    let runningDy = 0;
    let exRankCounter = 0;
    byPool[pool].forEach((item, rIdx) => {
      ranks[item.idx] = rIdx + 1;
      runningWk += item.comp.cbaBidLines;
      runningDy += item.comp.cbaDatSlots;
      cumWeeks[item.idx] = runningWk;
      cumDays[item.idx] = runningDy;
      if (!item.hasUnresolvedTie) {
        exRankCounter++;
        excelRanks[item.idx] = exRankCounter;
      } else {
        excelRanks[item.idx] = null;
      }
    });
  });

  const enriched: RankedBidEmployee[] = state.bidEmployees.map((emp, idx) => {
    const effPool = getEffectivePoolForRole(emp.leaveGroup || "TSO", state.poolGrouping);
    const rank = ranks[idx] || 1;
    const excelRank = excelRanks[idx] ?? null;
    const comp =
      compByIdx[idx] ||
      computeEmployeeLiabilityRow(
        { scd: emp.scd, hoursPerPP: emp.hoursPP || 80, daysPerPP: (emp.daysPP || 5) * 2, phase1Weeks: emp.phase1Weeks || 0 },
        startDate,
        ppCount,
        cat,
        phase,
      );
    const hasMissingRand = emp.rand === undefined || emp.rand === null || String(emp.rand).trim() === "" || Number(emp.rand) === 0;
    const gIdx = emp.__globalIdx !== undefined ? emp.__globalIdx : idx;
    return {
      emp,
      idx: gIdx,
      globalIdx: gIdx,
      rank,
      excelRank,
      effPool,
      hasUnresolvedTie: !!hasUnresolvedTieMap[idx],
      hasMissingRand,
      bidLines: comp.cbaBidLines,
      datSlots: comp.cbaDatSlots,
      weeks80: comp.weeks80,
      days20: comp.days20,
      phase1WeeksUsed: comp.phase1WeeksUsed,
      remainingPhase2Hours: comp.remainingPhase2Hours,
      weekChoicesNeeded: cumWeeks[idx] || rank * comp.cbaBidLines,
      dayChoicesNeeded: cumDays[idx] || rank * comp.cbaDatSlots,
      totalHoursEarned: comp.totalHoursEarned,
      avgWeekLength: (emp.hoursPP || 80) / 2,
      avgDayLength: (emp.daysPP || 5) > 0 ? (emp.hoursPP || 80) / (emp.daysPP || 5) : 8,
    };
  });

  return { enriched, byPool };
}

export function computeRankedBidEmployees(state: State): RankedBidResult {
  const activeAir = normalizeAirportCode(state.allocConfig?.airport || "DAL");
  const fullBid: BidEmployee[] = state.bidEmployees;
  const allSameAir = fullBid.every((e) => normalizeAirportCode(e.airport) === activeAir);
  if (allSameAir) return runCore(state);
  return withAirportScope(state, activeAir, () => runCore(state));
}
