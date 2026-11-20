import { getDefaultState } from "../../data/index";
import { migrate } from "../migrate";
import { useAppStore } from "../store";
import { defaultUi } from "../ui";

export function setActiveTab(tabId: string): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, activeTab: tabId } }));
}

export function requestReset(): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, confirmReset: true } }));
}

export function cancelReset(): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, confirmReset: false } }));
}

export function resetToFactoryDefaults(): void {
  useAppStore.setState((state) => ({
    ...getDefaultState(),
    ui: { ...defaultUi, activeTab: state.ui.activeTab, confirmReset: false },
  }));
}

export function importBackup(raw: unknown): void {
  const payload =
    raw && typeof raw === "object" && "state" in raw && "version" in raw
      ? (raw as { state: unknown }).state
      : raw;
  const next = migrate(payload, 3);
  useAppStore.setState((state) => ({ ...next, ui: state.ui }));
}
