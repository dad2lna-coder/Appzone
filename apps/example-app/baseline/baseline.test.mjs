import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SNAPSHOT_DIR, SNAPSHOT_FILES, captureSnapshots } from "./capture.mjs";

describe("LeaveBid golden baseline", () => {
  it("matches committed snapshots", () => {
    const live = captureSnapshots();
    for (const name of Object.keys(SNAPSHOT_FILES)) {
      const file = path.join(SNAPSHOT_DIR, `${name}.json`);
      expect(fs.existsSync(file), name).toBe(true);
      const expected = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(live[name], name).toEqual(expected);
    }
  }, 180000);
});
