import { activateAirport } from "../../domain/airports";
import { useAppStore } from "../store";

export function setActiveAirport(code: string): void {
  const clean = code.trim();
  if (!clean) return;
  useAppStore.setState((state) => ({ ...activateAirport(state, clean), ui: state.ui }));
}
