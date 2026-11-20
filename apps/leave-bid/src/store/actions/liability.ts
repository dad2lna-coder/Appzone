import { syncLiabilityEmployeesToBid } from "../../domain/liability";
import { normalizeAirportCode } from "../../domain/pools";
import type { LiabilityEmployee, LiabilityParams } from "../../domain/types";
import { useAppStore } from "../store";

export function setLiabilityParams(patch: Partial<LiabilityParams>): void {
  useAppStore.setState((state) => {
    const liabilityParams = { ...state.liabilityParams, ...patch };
    return {
      liabilityParams,
      allocConfig: { ...state.allocConfig, cat: liabilityParams.airportCat, phase: liabilityParams.phase },
    };
  });
}

export function setLiabilityRoleFilter(roleFilter: string): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, liabilityRoleFilter: roleFilter } }));
}

export function setLiabilityViewMode(mode: "summary" | "scd" | "pt"): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, liabilityViewMode: mode } }));
}

export function setLiabilityPtEmp(id: number | null): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, liabilityPtEmpId: id } }));
}

export function updateLiabilityEmployee(index: number, field: keyof LiabilityEmployee, value: string | number): void {
  useAppStore.setState((state) => ({
    liabilityEmployees: state.liabilityEmployees.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp)),
  }));
}

export function setPhase1Weeks(index: number, weeks: number): void {
  useAppStore.setState((state) => {
    const emp = state.liabilityEmployees[index];
    if (!emp) return state;
    const air = normalizeAirportCode(emp.airport);
    return {
      liabilityEmployees: state.liabilityEmployees.map((row, i) => (i === index ? { ...row, phase1Weeks: weeks } : row)),
      bidEmployees: state.bidEmployees.map((bid) =>
        normalizeAirportCode(bid.airport) === air && bid.name.toLowerCase() === emp.name.toLowerCase()
          ? { ...bid, phase1Weeks: weeks }
          : bid,
      ),
    };
  });
}

export function addLiabilityEmployee(): void {
  useAppStore.setState((state) => ({
    liabilityEmployees: [
      ...state.liabilityEmployees,
      {
        id: Date.now(),
        name: `Employee ${state.liabilityEmployees.length + 1}`,
        airport: state.allocConfig.airport || "CRP",
        eod: "2020-01-15",
        scd: "2020-01-15",
        hoursPerPP: 80,
        daysPerPP: 10,
        phase1Weeks: 0,
        group: "TSO",
      },
    ],
  }));
}

export function removeLiabilityEmployee(index: number): void {
  useAppStore.setState((state) => ({
    liabilityEmployees: state.liabilityEmployees.filter((_, i) => i !== index),
  }));
}

export function syncLiabilityToBidTool(): void {
  useAppStore.setState((state) => ({
    bidEmployees: syncLiabilityEmployeesToBid(state.liabilityEmployees, state.allocConfig.airport || "CRP"),
    ui: { ...state.ui, activeTab: "tab-employees" },
  }));
}
