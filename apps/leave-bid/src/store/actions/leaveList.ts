import { useAppStore } from "../store";

/** DOM-only in LeaveBid.html (cal5bRoleFilter). Held in UI state, not the V3 blob. */
export function setLeaveListRoleFilter(roleFilter: string): void {
  useAppStore.setState((state) => ({ ui: { ...state.ui, leaveListRoleFilter: roleFilter } }));
}
