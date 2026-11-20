import type { StateStorage } from "zustand/middleware";
import { isRawLeaveState } from "./migrate";

export const STORAGE_KEY = "CBA_LEAVE_SUITE_2027_STATE_V3";

const memory = new Map<string, string>();

function bucket(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  if (typeof localStorage === "undefined") {
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    };
  }
  return localStorage;
}

/**
 * LeaveBid.html writes the raw state object under STORAGE_KEY.
 * Zustand persist hands us { state, version }. Store the raw state so the
 * HTML app can still Object.assign it, and present raw blobs to Zustand as version 3.
 */
export const leaveStorage: StateStorage = {
  getItem: (name) => {
    const raw = bucket().getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && "state" in parsed && "version" in parsed) return raw;
      if (isRawLeaveState(parsed)) return JSON.stringify({ state: parsed, version: 3 });
    } catch {
      return null;
    }
    return raw;
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && "state" in parsed && "version" in parsed) {
        bucket().setItem(name, JSON.stringify((parsed as { state: unknown }).state));
        return;
      }
    } catch {
      /* store the original string */
    }
    bucket().setItem(name, value);
  },
  removeItem: (name) => {
    bucket().removeItem(name);
  },
};
