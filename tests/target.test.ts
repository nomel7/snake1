import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET_PARAMS, targetPos } from "../src/target.ts";

describe("targetPos", () => {
  const W = 1000;
  const H = 800;

  it("starts at the canvas center when time = 0", () => {
    const p = targetPos(0, W, H);
    expect(p.x).toBeCloseTo(W / 2, 6);
    expect(p.y).toBeCloseTo(H / 2, 6);
  });

  it("stays within the configured amplitude box for any time", () => {
    const cx = W / 2;
    const cy = H / 2;
    const ax = W * DEFAULT_TARGET_PARAMS.ampX;
    const ay = H * DEFAULT_TARGET_PARAMS.ampY;

    for (let t = 0; t < 10000; t += 37) {
      const p = targetPos(t, W, H);
      expect(Math.abs(p.x - cx)).toBeLessThanOrEqual(ax + 1e-6);
      expect(Math.abs(p.y - cy)).toBeLessThanOrEqual(ay + 1e-6);
    }
  });

  it("is deterministic for a given (time, width, height)", () => {
    const a = targetPos(1234, W, H);
    const b = targetPos(1234, W, H);
    expect(a).toEqual(b);
  });

  it("scales with the canvas size", () => {
    const small = targetPos(500, 100, 100);
    const big = targetPos(500, 1000, 1000);
    // Offset from center scales linearly with the canvas dimensions.
    const offSmall = Math.hypot(small.x - 50, small.y - 50);
    const offBig = Math.hypot(big.x - 500, big.y - 500);
    expect(offBig / offSmall).toBeCloseTo(10, 4);
  });
});
