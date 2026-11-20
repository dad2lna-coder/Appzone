import { describe, expect, it } from "vitest";
import { parseDelimitedTextToGrid } from "../parse";

describe("parseDelimitedTextToGrid", () => {
  it("splits commas and tabs and keeps quoted commas", () => {
    expect(parseDelimitedTextToGrid("")).toEqual([]);
    expect(parseDelimitedTextToGrid("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseDelimitedTextToGrid('name,note\n"Doe, John",ok')).toEqual([
      ["name", "note"],
      ["Doe, John", "ok"],
    ]);
    expect(parseDelimitedTextToGrid("a\tb\n")).toEqual([["a", "b"]]);
  });
});
