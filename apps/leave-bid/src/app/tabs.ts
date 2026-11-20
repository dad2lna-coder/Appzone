import { lazy, type ComponentType } from "react";

const LiabilityTab = lazy(() => import("../features/liability/LiabilityTab").then((mod) => ({ default: mod.LiabilityTab })));
const ResultsTab = lazy(() => import("../features/results/ResultsTab").then((mod) => ({ default: mod.ResultsTab })));
const LeaveListTab = lazy(() => import("../features/leave-list/LeaveListTab").then((mod) => ({ default: mod.LeaveListTab })));
const PlaceholderTab = lazy(() => import("./PlaceholderTab").then((mod) => ({ default: mod.PlaceholderTab })));

export interface TabDef {
  id: string;
  label: string;
  Component: ComponentType;
}

export const TABS: TabDef[] = [
  { id: "tab-liability", label: "0. CBA Leave Liability (2027)", Component: LiabilityTab },
  { id: "tab-employees", label: "1. Setup Employees & Pools", Component: PlaceholderTab },
  { id: "tab-allocation", label: "2. Leave Allocation (Clean Visual)", Component: PlaceholderTab },
  { id: "tab-smart-export", label: "2B. SMART Export", Component: PlaceholderTab },
  { id: "tab-appointments", label: "3. Setup Appointments", Component: PlaceholderTab },
  { id: "tab-live-bid", label: "4. Live Leave Bid & Receipts", Component: PlaceholderTab },
  { id: "tab-smart-import", label: "4B/4C. SMART Report Import", Component: PlaceholderTab },
  { id: "tab-results", label: "5. Results & FCFS Liability", Component: ResultsTab },
  { id: "tab-calendar", label: "5B. 364-Day Leave List", Component: LeaveListTab },
  { id: "tab-interactive-calendar", label: "6. Interactive Visual Calendar (Used/Avail/Total)", Component: PlaceholderTab },
];
