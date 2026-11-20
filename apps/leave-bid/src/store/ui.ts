export type LiabilityViewMode = "summary" | "scd" | "pt";

export interface UiState {
  activeTab: string;
  liabilityRoleFilter: string;
  liabilityViewMode: LiabilityViewMode;
  liabilityPtEmpId: number | null;
  confirmReset: boolean;
}

export const defaultUi: UiState = {
  activeTab: "tab-liability",
  liabilityRoleFilter: "ALL",
  liabilityViewMode: "summary",
  liabilityPtEmpId: null,
  confirmReset: false,
};
