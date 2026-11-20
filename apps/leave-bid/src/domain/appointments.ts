import { addDaysUTC, DOW_NAMES, formatDateYMD, formatMinsToTime, normalizeDateString, parseDateUTC, parseTimeToMins } from "./dates";
import { computeRankedBidEmployees } from "./ranking";
import type { AppointmentsConfig, AppointmentSchedule, DailySlot, DailyTimeSlots, RankedBidEmployee, State } from "./types";

export function buildDailyTimeSlots(cfg: AppointmentsConfig): DailyTimeSlots {
  const startObj = parseDateUTC(cfg.startDate || "2025-11-01") || parseDateUTC("2025-11-01");
  const endParsed = parseDateUTC(cfg.endDate || "2025-11-10");
  const endObj = endParsed || (startObj ? addDaysUTC(startObj, 14) : null);
  if (!startObj || !endObj) {
    return { allSlots: [], slotsPerDay: 0, windowDaysCount: 0, windowCapacity: 0 };
  }

  const exclSet = new Set(
    (cfg.excludeDates || "")
      .split(",")
      .map((s) => normalizeDateString(s.trim(), ""))
      .filter(Boolean),
  );

  const dayStartMins = parseTimeToMins(cfg.dayStart, 8 * 60) + (Number(cfg.setupMins) || 0);
  const dayEndMins = parseTimeToMins(cfg.dayEnd, 16 * 60 + 30) - (Number(cfg.teardownMins) || 0);
  const dur = Math.max(1, Number(cfg.durationMins) || 15);
  const concurrent = Math.max(1, Number(cfg.concurrent) || 1);

  const breaks = [
    { s: parseTimeToMins(cfg.brk1Start, -1), e: parseTimeToMins(cfg.brk1End, -1) },
    { s: parseTimeToMins(cfg.lunchStart, -1), e: parseTimeToMins(cfg.lunchEnd, -1) },
    { s: parseTimeToMins(cfg.brk2Start, -1), e: parseTimeToMins(cfg.brk2End, -1) },
  ]
    .filter((b) => b.s >= 0 && b.e > b.s)
    .sort((a, b) => a.s - b.s);

  const validDays: { ymd: string; dow: string; withinWindow: boolean }[] = [];
  let dCursor = new Date(startObj.getTime());
  let windowDaysCount = 0;
  for (let step = 0; step < 120; step++) {
    const ymd = formatDateYMD(dCursor);
    const dow = dCursor.getUTCDay();
    const withinWindow = dCursor <= endObj;
    const isWeekend = dow === 0 || dow === 6;
    const skipWknd = cfg.skipWeekends === "yes" && isWeekend;
    if (!exclSet.has(ymd) && !skipWknd) {
      validDays.push({ ymd, dow: DOW_NAMES[dow].slice(0, 3), withinWindow });
      if (withinWindow) windowDaysCount++;
    }
    dCursor = addDaysUTC(dCursor, 1);
  }

  const dailySlotsTemplate: { startMins: number; endMins: number; startStr: string; endStr: string }[] = [];
  let t = dayStartMins;
  let guard = 0;
  while (t + dur <= dayEndMins && guard < 500) {
    guard++;
    const hitBreak = breaks.find((b) => t < b.e && t + dur > b.s);
    if (hitBreak) {
      t = hitBreak.e;
      continue;
    }
    dailySlotsTemplate.push({
      startMins: t,
      endMins: t + dur,
      startStr: formatMinsToTime(t),
      endStr: formatMinsToTime(t + dur),
    });
    t += dur;
  }

  if (dailySlotsTemplate.length === 0) {
    dailySlotsTemplate.push({
      startMins: dayStartMins,
      endMins: dayStartMins + dur,
      startStr: formatMinsToTime(dayStartMins),
      endStr: formatMinsToTime(dayStartMins + dur),
    });
  }

  const allSlots: DailySlot[] = [];
  validDays.forEach((dInfo) => {
    dailySlotsTemplate.forEach((st) => {
      for (let c = 0; c < concurrent; c++) {
        allSlots.push({
          ymd: dInfo.ymd,
          dow: dInfo.dow,
          withinWindow: dInfo.withinWindow,
          startStr: st.startStr,
          endStr: st.endStr,
          startMins: st.startMins,
          endMins: st.endMins,
          concurrentIdx: c + 1,
        });
      }
    });
  });

  return {
    allSlots,
    slotsPerDay: dailySlotsTemplate.length * concurrent,
    windowDaysCount,
    windowCapacity: windowDaysCount * dailySlotsTemplate.length * concurrent,
  };
}

function pushAppointment(
  appointments: AppointmentSchedule["appointments"],
  item: RankedBidEmployee,
  idx: number,
  slot: DailySlot | undefined,
  cfg: AppointmentsConfig,
): void {
  const fallback = slot || {
    ymd: cfg.startDate,
    dow: "",
    startStr: "08:15",
    endStr: "08:30",
    withinWindow: false,
    startMins: 0,
    endMins: 0,
    concurrentIdx: 1,
  };
  appointments.push({
    round: idx + 1,
    role: item.emp.leaveGroup,
    workgroup: item.effPool,
    rank: item.rank,
    name: item.emp.name,
    scd: item.emp.scd,
    rand: item.emp.rand,
    bidLines: item.bidLines,
    datSlots: item.datSlots,
    bidDay: `${fallback.ymd}${fallback.dow ? " (" + fallback.dow + ")" : ""}`,
    rawBidDay: fallback.ymd,
    bidStart: fallback.startStr,
    bidEnd: fallback.endStr,
    withinWindow: fallback.withinWindow,
  });
}

export function generateAppointmentSchedule(state: State): AppointmentSchedule {
  const cfg = state.appointmentsConfig || ({} as AppointmentsConfig);
  const { enriched } = computeRankedBidEmployees(state);
  const deletedSet = new Set(state.allocConfig.deletedPools || []);
  const activeOfficers = enriched.filter((item) => !deletedSet.has(item.effPool));
  const { allSlots, slotsPerDay, windowDaysCount, windowCapacity } = buildDailyTimeSlots(cfg);
  const poolMode = cfg.poolMode || "parallel";
  const appointments: AppointmentSchedule["appointments"] = [];

  if (poolMode === "parallel") {
    const byPool: Record<string, RankedBidEmployee[]> = {};
    activeOfficers.forEach((item) => {
      if (!byPool[item.effPool]) byPool[item.effPool] = [];
      byPool[item.effPool].push(item);
    });
    Object.keys(byPool)
      .sort()
      .forEach((pool) => {
        const list = byPool[pool].sort((a, b) => a.rank - b.rank);
        list.forEach((item, idx) => {
          const slot = allSlots[idx] || allSlots[allSlots.length - 1];
          pushAppointment(appointments, item, idx, slot, cfg);
        });
      });
  } else {
    const ordered = [...activeOfficers].sort((a, b) => {
      if (poolMode === "interleaved") {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return (a.effPool || "").localeCompare(b.effPool || "");
      }
      if (a.effPool !== b.effPool) return (a.effPool || "").localeCompare(b.effPool || "");
      return a.rank - b.rank;
    });
    ordered.forEach((item, idx) => {
      const slot = allSlots[idx] || allSlots[allSlots.length - 1];
      pushAppointment(appointments, item, idx, slot, cfg);
    });
  }

  return { cfg, appointments, slotsPerDay, windowDaysCount, windowCapacity };
}
