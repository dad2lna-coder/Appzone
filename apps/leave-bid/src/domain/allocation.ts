import { isTwoStageCategory } from "./accrual";
import { getCalendarDaysAndWeeks } from "./dates";
import { computeRankedBidEmployees } from "./ranking";
import { getActiveDailyForecasts, normalizeAirportCode } from "./pools";
import { withAirportScope } from "./scope";
import type {
  DaySlot,
  IsolatedAirportAllocation,
  State,
  WeekSlot,
  WorkgroupAccum,
  WorkgroupAllocation,
  WorkgroupResult,
} from "./types";

export function computeWorkgroupAllocations(state: State): WorkgroupAllocation {
  const cat = state.allocConfig?.cat || state.liabilityParams?.airportCat || "I";
  const phase = state.allocConfig?.phase || state.liabilityParams?.phase || "Phase 1";
  const twoStage = isTwoStageCategory(cat);
  const res = ((): WorkgroupAllocation => {
    const { days, weeks } = getCalendarDaysAndWeeks(state.liabilityParams.startDate, getActiveDailyForecasts(state));
    const { enriched } = computeRankedBidEmployees(state);
    const enforceFloor = (state.allocConfig.cbaFloorRule || "enforce_all") === "enforce_all";
    const liabMode = state.allocConfig.liabilityMode || "80_20_all";
    const deletedSet = new Set(state.allocConfig.deletedPools || []);

    const workgroups: Record<string, WorkgroupAccum> = {};
    enriched.forEach((item) => {
      const wg = item.effPool || "TSO";
      if (deletedSet.has(wg)) return;
      if (!workgroups[wg]) {
        workgroups[wg] = {
          name: wg,
          count: 0,
          activeCount: 0,
          tiedCount: 0,
          sumWeeks80All: 0,
          sumDays20All: 0,
          sumWeeks80Strict: 0,
          sumDays20Strict: 0,
          sumCapLines: 0,
          sumCapDat: 0,
          reqBidLines: 0,
          reqDatSlots: 0,
          roles: new Set<string>(),
        };
      }
      workgroups[wg].count++;
      workgroups[wg].sumWeeks80All += item.weeks80;
      workgroups[wg].sumDays20All += item.days20;
      workgroups[wg].sumCapLines += item.bidLines;
      workgroups[wg].sumCapDat += item.datSlots;
      if (!item.hasUnresolvedTie) {
        workgroups[wg].activeCount++;
        workgroups[wg].sumWeeks80Strict += item.weeks80;
        workgroups[wg].sumDays20Strict += item.days20;
      } else {
        workgroups[wg].tiedCount++;
      }
      workgroups[wg].roles.add(item.emp.leaveGroup || "TSO");
      if (!state.allocConfig.workgroups[wg]) {
        state.allocConfig.workgroups[wg] = { minLine: 1, maxLine: 3, lineMethod: "Less", minDat: 1, maxDat: 3, datMethod: "Less" };
      }
    });

    Object.keys(workgroups).forEach((wg) => {
      const g = workgroups[wg];
      if (liabMode === "sum_caps") {
        g.reqBidLines = g.sumCapLines;
        g.reqDatSlots = g.sumCapDat;
      } else if (liabMode === "80_20_all") {
        g.reqBidLines = Math.ceil(g.sumWeeks80All - 1e-9);
        g.reqDatSlots = Math.ceil(g.sumDays20All - 1e-9);
      } else {
        g.reqBidLines = Math.ceil(g.sumWeeks80Strict - 1e-9);
        g.reqDatSlots = Math.ceil(g.sumDays20Strict - 1e-9);
      }
    });

    const totalYearVol = weeks.reduce((s, w) => s + w.volume, 0);
    const weekInvSum = weeks.reduce((s, w) => s + totalYearVol / w.volume, 0);
    weeks.forEach((w) => {
      w.pctOfTotal = w.volume / totalYearVol;
      w.invPct = totalYearVol / w.volume / weekInvSum;
    });

    weeks.forEach((w) => {
      const wkDays = days.slice(w.weekIdx * 7, w.weekIdx * 7 + 7);
      const wkMax = Math.max(...wkDays.map((d) => d.forecast));
      wkDays.forEach((d) => {
        d.excessPct = wkMax > 0 ? (wkMax - d.forecast) / wkMax : 0;
        d.adjForecast = d.forecast * (1 - d.excessPct);
        d.invAdj = d.adjForecast > 0 ? 1 / d.adjForecast : 0;
      });
    });
    const totalInvAdj = days.reduce((s, d) => s + (d.invAdj || 0), 0);
    days.forEach((d) => {
      d.recDatPct = totalInvAdj > 0 ? (d.invAdj || 0) / totalInvAdj : 1 / 364;
    });

    const wgResults: Record<string, WorkgroupResult> = {};
    Object.keys(workgroups)
      .sort()
      .forEach((wg) => {
        const cfg = state.allocConfig.workgroups[wg];
        const minLine = enforceFloor ? 1 : (cfg.minLine ?? 0);
        const minDat = enforceFloor ? 1 : (cfg.minDat ?? 0);
        const reqLines = workgroups[wg].reqBidLines;
        const reqDat = workgroups[wg].reqDatSlots;

        const weekSlots: WeekSlot[] = weeks.map((w, wIdx) => {
          const weight = state.allocConfig.method === "Even" || state.allocConfig.method === "Fixed" ? 1 / 52 : w.invPct || 0;
          let base = Math.round(reqLines * weight);
          if (base < minLine) base = minLine;
          return { weekIdx: wIdx, base, adj: 0, finalSlots: base };
        });

        let currentBaseSum = weekSlots.reduce((s, x) => s + x.base, 0);
        const targetLines = Math.max(reqLines, minLine * 52);
        if (currentBaseSum !== targetLines) {
          const weeksByWeight = weeks.map((w, idx) => ({ idx, w: w.invPct || 0 })).sort((a, b) => b.w - a.w);
          let ptr = 0;
          while (currentBaseSum < targetLines && ptr < 520) {
            weekSlots[weeksByWeight[ptr % 52].idx].base++;
            currentBaseSum++;
            ptr++;
          }
          const weeksLowWeight = [...weeksByWeight].reverse();
          ptr = 0;
          while (currentBaseSum > targetLines && ptr < 520) {
            const targetW = weekSlots[weeksLowWeight[ptr % 52].idx];
            if (targetW.base > minLine) {
              targetW.base--;
              currentBaseSum--;
            }
            ptr++;
          }
        }

        weekSlots.forEach((ws, wIdx) => {
          const adj = parseInt(String(state.allocConfig.weekAdjustments[`${wg}_${wIdx}`] || 0), 10);
          ws.adj = adj;
          ws.finalSlots = Math.max(0, ws.base + adj);
        });

        const datFloor = reqDat < 364 && !enforceFloor ? 0 : reqDat < 364 ? 0 : minDat;
        const autoDaySlots = new Array(364).fill(datFloor);
        const rawDayOrder = days
          .map((d, dIdx) => ({ dIdx, recDatPct: d.recDatPct || 0 }))
          .sort((a, b) => b.recDatPct - a.recDatPct);
        let allocatedDat = datFloor * 364;
        let dPtr = 0;
        while (allocatedDat < reqDat && dPtr < 3640) {
          autoDaySlots[rawDayOrder[dPtr % 364].dIdx] += 1;
          allocatedDat++;
          dPtr++;
        }

        const daySlots: DaySlot[] = days.map((d, dIdx) => {
          const stage2 = autoDaySlots[dIdx];
          const adj = parseInt(String(state.allocConfig.dayAdjustments[`${wg}_${dIdx}`] || 0), 10);
          return { dayIdx: dIdx, stage2, adj, finalSlots: Math.max(0, stage2 + adj) };
        });

        wgResults[wg] = {
          ...workgroups[wg],
          rolesList: [...workgroups[wg].roles].join(", "),
          weekSlots,
          daySlots,
          totalOfferedLines: weekSlots.reduce((s, x) => s + x.finalSlots, 0),
          totalOfferedDat: daySlots.reduce((s, x) => s + x.finalSlots, 0),
        };
      });

    return { days, weeks, wgResults };
  })();

  if (twoStage && phase === "Phase 1") {
    Object.keys(res.wgResults).forEach((wg) => {
      const g = res.wgResults[wg];
      g.reqDatSlots = 0;
      g.daySlots.forEach((ds, dIdx) => {
        const adj = parseInt(String(state.allocConfig.dayAdjustments[`${wg}_${dIdx}`] || 0), 10);
        ds.stage2 = 0;
        ds.finalSlots = Math.max(0, adj);
      });
      g.totalOfferedDat = g.daySlots.reduce((s, x) => s + x.finalSlots, 0);
    });
  }
  return res;
}

/** Math half of recalculateAllocation: scope to the active airport and recompute. Rendering stays in the HTML. */
export function recalculateAllocation(state: State): WorkgroupAllocation {
  const activeAir = normalizeAirportCode(state.allocConfig?.airport || "DAL");
  return withAirportScope(state, activeAir, () => computeWorkgroupAllocations(state));
}

export function computeIsolatedAirportAllocation(state: State, airportCode: string): IsolatedAirportAllocation {
  return withAirportScope(state, airportCode, (air, snap) => {
    const alloc = computeWorkgroupAllocations(state);
    return {
      airport: air,
      snap,
      days: alloc.days,
      weeks: alloc.weeks,
      wgResults: alloc.wgResults,
      empCount: state.bidEmployees.length,
    };
  });
}
