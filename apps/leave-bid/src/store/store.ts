import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getDefaultState } from "../data/index";
import type { State } from "../domain/types";
import { migrate, type PersistedSlice } from "./migrate";
import { leaveStorage, STORAGE_KEY } from "./storage";
import { defaultUi, type UiState } from "./ui";

export interface AppState extends State {
  ui: UiState;
}

export const useAppStore = create<AppState>()(
  persist(
    () => ({
      ...getDefaultState(),
      ui: defaultUi,
    }),
    {
      name: STORAGE_KEY,
      version: 4,
      storage: createJSONStorage(() => leaveStorage),
      migrate: (persisted, version) => migrate(persisted, version) as PersistedSlice,
      partialize: (state): PersistedSlice => ({
        liabilityParams: state.liabilityParams,
        liabilityEmployees: state.liabilityEmployees,
        bidEmployees: state.bidEmployees,
        poolGrouping: state.poolGrouping,
        allocConfig: state.allocConfig,
        forecastsByAirport: state.forecastsByAirport,
        appointmentsConfig: state.appointmentsConfig,
        airportConfigs: state.airportConfigs,
        knownAirportSlots: state.knownAirportSlots,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as PersistedSlice),
        ui: current.ui,
      }),
    },
  ),
);
