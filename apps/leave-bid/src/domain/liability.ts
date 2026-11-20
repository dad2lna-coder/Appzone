import { addDaysUTC, formatDateYMD, parseDateUTC } from "./dates";
import { isTwoStageCategory, getScdAccrualRateOnDate } from "./accrual";
import { normalizeAirportCode } from "./pools";
import type {
  AllocConfig,
  BidEmployee,
  LiabilityEmployee,
  LiabilityParams,
  LiabilityRollup,
  LiabilityRollupGroup,
  LiabilityRow,
  LiabilityRowInput,
} from "./types";

export function computeEmployeeLiabilityRow(
  emp: LiabilityRowInput,
  startDateStr?: string,
  ppCount?: number | string,
  airportCat?: string,
  phaseOpt?: string,
  fallback?: { liabilityParams?: LiabilityParams; allocConfig?: AllocConfig },
): LiabilityRow {
  const startObj = parseDateUTC(startDateStr || fallback?.liabilityParams?.startDate || "2027-01-10");
  const count = parseInt(String(ppCount ?? ""), 10) || 26;
  const cat = String(airportCat || fallback?.allocConfig?.cat || fallback?.liabilityParams?.airportCat || "I").toUpperCase().trim();
  const phase = String(phaseOpt || fallback?.allocConfig?.phase || fallback?.liabilityParams?.phase || "Phase 1").trim();
  if (!startObj) {
    throw new Error("computeEmployeeLiabilityRow: start date did not parse");
  }

  const ppDates: string[] = [];
  const scdRates: number[] = [];
  const ptDetails: LiabilityRow["ptDetails"] = [];
  const finalAccrued: number[] = [];
  let carryOver = 0;
  const hrsPP = Number(emp.hoursPerPP ?? emp.hoursPP ?? 80);
  const daysPP = Number(emp.daysPerPP ?? (emp.daysPP || 5) * 2);
  const isPartTime = hrsPP < 80;

  for (let p = 0; p < count; p++) {
    const ppDate = addDaysUTC(startObj, p * 14);
    ppDates.push(formatDateYMD(ppDate));
    const rate = getScdAccrualRateOnDate(emp.scd, ppDate);
    scdRates.push(rate);

    const divisor = rate === 8 ? 10 : rate === 6 ? 13 : 20;
    const workHrs = hrsPP + carryOver;
    const unconstrained = workHrs / divisor;
    const ptAccrued = Math.floor(unconstrained + 1e-9);
    carryOver = workHrs - ptAccrued * divisor;

    ptDetails.push({ pp: p + 1, workHrs, divisor, unconstrained, ptAccrued, carryOver });
    if (isPartTime) finalAccrued.push(ptAccrued);
    else finalAccrued.push(rate === 6 && p === 24 ? 10 : rate);
  }

  const totalHoursEarned = finalAccrued.reduce((a, b) => a + b, 0);
  const avgWeekLength = hrsPP / 2;
  const avgDayLength = daysPP > 0 ? hrsPP / daysPP : 8;
  const maxRate = Math.max(...scdRates);

  const phase1WeeksUsed =
    Number(
      emp.phase1Weeks !== undefined && emp.phase1Weeks !== null && emp.phase1Weeks !== ""
        ? emp.phase1Weeks
        : Array.isArray(emp.selectedWeeks)
          ? emp.selectedWeeks.length
          : 0,
    ) || 0;

  let weeksLiability = 0;
  let daysLiability = 0;
  let cbaBidLines = maxRate === 8 ? 4 : maxRate === 6 ? 3 : 2;
  let cbaDatSlots = maxRate === 8 ? 6 : maxRate === 6 ? 5 : 3;
  let remainingPhase2Hours = totalHoursEarned;

  if (isTwoStageCategory(cat)) {
    const fullWeeks100 = avgWeekLength > 0 ? totalHoursEarned / avgWeekLength : 0;
    const hoursUsedInPhase1 = phase1WeeksUsed * avgWeekLength;
    remainingPhase2Hours = Math.max(0, totalHoursEarned - hoursUsedInPhase1);
    const phase2Dat100 = avgDayLength > 0 ? remainingPhase2Hours / avgDayLength : 0;
    const phase1MaxWeeksCap =
      avgWeekLength > 0 ? Math.floor((totalHoursEarned + 1e-9) / avgWeekLength) : maxRate === 8 ? 5 : maxRate === 6 ? 4 : 2;
    const phase2MaxDatCap = avgDayLength > 0 ? Math.floor((remainingPhase2Hours + 1e-9) / avgDayLength) : 0;

    if (phase === "Phase 1") {
      weeksLiability = fullWeeks100;
      daysLiability = 0;
      cbaBidLines = phase1MaxWeeksCap;
      cbaDatSlots = 0;
    } else {
      weeksLiability = fullWeeks100;
      daysLiability = phase2Dat100;
      cbaBidLines = phase1MaxWeeksCap;
      cbaDatSlots = phase2MaxDatCap;
    }
  } else {
    weeksLiability = avgWeekLength > 0 ? (totalHoursEarned * 0.8) / avgWeekLength : 0;
    daysLiability = avgDayLength > 0 ? (totalHoursEarned * 0.2) / avgDayLength : 0;
  }

  return {
    ppDates,
    scdRates,
    ptDetails,
    finalAccrued,
    totalHoursEarned,
    avgWeekLength,
    avgDayLength,
    weeks80: weeksLiability,
    days20: daysLiability,
    phase1WeeksUsed,
    remainingPhase2Hours,
    cbaBidLines,
    cbaDatSlots,
    isTwoStage: isTwoStageCategory(cat),
    cat,
    phase,
  };
}

/** Group rollup previously inlined in renderLiabilityTab. No DOM. */
export function computeLiabilityRollup(
  employees: LiabilityEmployee[],
  startDate: string,
  ppCount: number,
  airportCat: string,
  phase: string,
  activeAirport: string,
  roleFilter = "ALL",
): LiabilityRollup {
  const allComputed = employees
    .map((emp, origIdx) => ({ emp, origIdx }))
    .filter(({ emp }) => normalizeAirportCode(emp.airport) === normalizeAirportCode(activeAirport))
    .map(({ emp, origIdx }) => ({
      emp,
      origIdx,
      comp: computeEmployeeLiabilityRow(emp, startDate, ppCount, airportCat, phase),
    }));

  const byGrp: Record<string, Omit<LiabilityRollupGroup, "group" | "weeksLiabCeil" | "daysLiabCeil">> = {};
  for (const { emp, comp } of allComputed) {
    const g = (emp.group || "TSO").toUpperCase();
    if (!byGrp[g]) byGrp[g] = { count: 0, hours: 0, weeksLiab: 0, daysLiab: 0, cbaLines: 0, cbaDat: 0, p1Wks: 0, remHrs: 0 };
    byGrp[g].count++;
    byGrp[g].hours += comp.totalHoursEarned;
    byGrp[g].weeksLiab += comp.weeks80;
    byGrp[g].daysLiab += comp.days20;
    byGrp[g].cbaLines += comp.cbaBidLines;
    byGrp[g].cbaDat += comp.cbaDatSlots;
    byGrp[g].p1Wks += comp.phase1WeeksUsed;
    byGrp[g].remHrs += comp.remainingPhase2Hours;
  }

  const groups: LiabilityRollupGroup[] = Object.keys(byGrp)
    .sort()
    .map((group) => {
      const d = byGrp[group];
      return {
        group,
        ...d,
        weeksLiabCeil: Math.ceil(d.weeksLiab - 1e-9),
        daysLiabCeil: Math.ceil(d.daysLiab - 1e-9),
      };
    });

  const filtered = allComputed.filter((item) => roleFilter === "ALL" || (item.emp.group || "TSO") === roleFilter);
  let grandTotalHours = 0;
  let sumWeeksLiab = 0;
  let sumDaysLiab = 0;
  for (const { comp } of filtered) {
    grandTotalHours += comp.totalHoursEarned;
    sumWeeksLiab += comp.weeks80;
    sumDaysLiab += comp.days20;
  }

  return {
    groups,
    grandTotalHours,
    sumWeeksLiab,
    sumDaysLiab,
    totalBidLinesCeil: Math.ceil(sumWeeksLiab - 1e-9),
    totalDatSlotsCeil: Math.ceil(sumDaysLiab - 1e-9),
  };
}

/** Maps the liability roster onto bid employees the way syncLiabilityToBidTool does. */
export function syncLiabilityEmployeesToBid(
  employees: LiabilityEmployee[],
  airportFallback: string,
  rand: () => number = () => Math.floor(100000 + Math.random() * 900000),
): BidEmployee[] {
  return employees.map((e, idx) => ({
    id: `Employee ${String(idx + 1).padStart(4, "0")}`,
    name: e.name,
    airport: e.airport || airportFallback || "CRP",
    eod: e.eod,
    scd: e.scd,
    rand: rand(),
    leaveGroup: e.group || "TSO",
    fcfsGroup: "Shift A",
    hoursPP: e.hoursPerPP,
    daysPP: e.daysPerPP >= 8 ? Math.round(e.daysPerPP / 2) : e.daysPerPP,
    notes: "",
    useProxy: "No",
    proxyWeeks: "1, 2, 3",
    proxyDays: "2027-01-16",
    selectedWeeks: [],
    selectedDays: [],
    bidTimestamp: "",
  }));
}

