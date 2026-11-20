export type LiabilityViewMode = "summary" | "scd" | "pt";

export interface UiState {
  activeTab: string;
  liabilityRoleFilter: string;
  liabilityViewMode: LiabilityViewMode;
  liabilityPtEmpId: number | null;
  leaveListRoleFilter: string;
  confirmReset: boolean;
}

export const defaultUi: UiState = {
  activeTab: "tab-liability",
  liabilityRoleFilter: "ALL",
  liabilityViewMode: "summary",
  liabilityPtEmpId: null,
  leaveListRoleFilter: "ALL",
  confirmReset: false,
};
