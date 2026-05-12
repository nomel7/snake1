import { describe, expect, it } from "vitest";
import { CHOMP_FRAMES, CHOMP_SHARDS, Chomp } from "../src/chomp.ts";

/** Tiny deterministic RNG that walks a fixed list of values. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("Chomp", () => {
  it("starts at age 0 and is not done", () => {
    const c = new Chomp(100, 200, 30);
    expect(c.age).toBe(0);
    expect(c.done).toBe(false);
    expect(c.t).toBe(0);
  });

  it("captures position and hue", () => {
    const c = new Chomp(123, 456, 270);
    expect(c.x).toBe(123);
    expect(c.y).toBe(456);
    expect(c.hue).toBe(270);
  });

  it("generates CHOMP_SHARDS shards with sensible properties", () => {
    const c = new Chomp(0, 0, 0);
    expect(c.shards).toHaveLength(CHOMP_SHARDS);
    for (const sh of c.shards) {
      expect(sh.speed).toBeGreaterThan(0);
      expect(sh.size).toBeGreaterThan(0);
      expect(Number.isFinite(sh.angle)).toBe(true);
      expect(Number.isFinite(sh.rot)).toBe(true);
      expect(Number.isFinite(sh.rotSpeed)).toBe(true);
    }
  });

  it("shards cover the full circle (no all-bunched-on-one-side)", () => {
    const c = new Chomp(0, 0, 0);
    // Each shard is ~ (i/N) * 2π plus a small jitter. The min/max angles
    // should span most of the circle.
    const angles = c.shards.map((s) => s.angle).sort((a, b) => a - b);
    const spread = angles[angles.length - 1] - angles[0];
    expect(spread).toBeGreaterThan(Math.PI); // at least a half-circle of coverage
  });

  it("produces deterministic shards with a seeded RNG", () => {
    const a = new Chomp(0, 0, 0, seqRng([0.1, 0.2, 0.3, 0.4, 0.5]));
    const b = new Chomp(0, 0, 0, seqRng([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(a.shards).toEqual(b.shards);
  });

  it("update advances age by 1", () => {
    const c = new Chomp(0, 0, 0);
    c.update();
    expect(c.age).toBe(1);
    c.update();
    c.update();
    expect(c.age).toBe(3);
  });

  it("t reports normalized progress 0..1", () => {
    const c = new Chomp(0, 0, 0);
    expect(c.t).toBeCloseTo(0, 6);
    for (let i = 0; i < CHOMP_FRAMES / 2; i++) c.update();
    expect(c.t).toBeCloseTo(0.5, 1);
    for (let i = 0; i < CHOMP_FRAMES; i++) c.update();
    // After overshooting, t clamps at 1.
    expect(c.t).toBe(1);
  });

  it("becomes done exactly at maxAge", () => {
    const c = new Chomp(0, 0, 0);
    for (let i = 0; i < CHOMP_FRAMES - 1; i++) c.update();
    expect(c.done).toBe(false);
    c.update();
    expect(c.done).toBe(true);
  });
});
