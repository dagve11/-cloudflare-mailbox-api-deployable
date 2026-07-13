import { describe, expect, it } from "vitest";
import { normalizeToChinaISO, toChinaISOString } from "../src/time";

describe("toChinaISOString", () => {
  it("formats a known UTC instant as +08:00 wall clock", () => {
    // 2026-07-12T12:00:00.000Z → 东八区 20:00:00.000
    const value = toChinaISOString(new Date("2026-07-12T12:00:00.000Z"));
    expect(value).toBe("2026-07-12T20:00:00.000+08:00");
  });
});

describe("normalizeToChinaISO", () => {
  it("normalizes Z, +00:00 and bare offsets to the same China ISO", () => {
    const expected = "2026-07-12T20:00:00.000+08:00";
    expect(normalizeToChinaISO("2026-07-12T12:00:00.000Z")).toBe(expected);
    expect(normalizeToChinaISO("2026-07-12T12:00:00+00:00")).toBe(expected);
    expect(normalizeToChinaISO("2026-07-12T20:00:00+08:00")).toBe(expected);
  });

  it("returns null for invalid input", () => {
    expect(normalizeToChinaISO("not-a-date")).toBeNull();
    expect(normalizeToChinaISO("")).toBeNull();
  });
});
