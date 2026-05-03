import { describe, expect, it } from "vitest";
import { clampSymmetric, normalizeAngleDiff } from "../src/angle.ts";

describe("normalizeAngleDiff", () => {
  it("leaves values already in (-PI, PI] unchanged", () => {
    expect(normalizeAngleDiff(0)).toBe(0);
    expect(normalizeAngleDiff(1)).toBeCloseTo(1);
    expect(normalizeAngleDiff(-1)).toBeCloseTo(-1);
  });

  it("wraps a value just past +PI back near -PI", () => {
    const out = normalizeAngleDiff(Math.PI + 0.1);
    expect(out).toBeCloseTo(-Math.PI + 0.1, 6);
  });

  it("wraps a value just past -PI back near +PI", () => {
    const out = normalizeAngleDiff(-Math.PI - 0.1);
    expect(out).toBeCloseTo(Math.PI - 0.1, 6);
  });

  it("wraps multiple full revolutions correctly", () => {
    expect(normalizeAngleDiff(Math.PI * 4 + 0.5)).toBeCloseTo(0.5, 6);
    expect(normalizeAngleDiff(-Math.PI * 4 - 0.5)).toBeCloseTo(-0.5, 6);
  });

  it("always picks the short way around the circle", () => {
    // 3*PI/2 going CCW is the same as -PI/2 going CW (shorter).
    expect(normalizeAngleDiff((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 6);
  });
});

describe("clampSymmetric", () => {
  it("returns the value when within range", () => {
    expect(clampSymmetric(0.3, 1)).toBe(0.3);
    expect(clampSymmetric(-0.7, 1)).toBe(-0.7);
  });

  it("clamps to +limit when above", () => {
    expect(clampSymmetric(5, 1)).toBe(1);
  });

  it("clamps to -limit when below", () => {
    expect(clampSymmetric(-5, 1)).toBe(-1);
  });
});
