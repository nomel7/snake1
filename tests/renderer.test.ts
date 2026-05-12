import { describe, expect, it } from "vitest";
import {
  bodyColor,
  hueName,
  normalizeHue,
  visibleTrailLength,
} from "../src/renderer.ts";
import { CONFIG } from "../src/config.ts";

describe("normalizeHue", () => {
  it("leaves in-range hues alone", () => {
    expect(normalizeHue(0)).toBe(0);
    expect(normalizeHue(180)).toBe(180);
    expect(normalizeHue(359)).toBe(359);
  });

  it("wraps positive overshoot", () => {
    expect(normalizeHue(360)).toBe(0);
    expect(normalizeHue(370)).toBe(10);
    expect(normalizeHue(720 + 45)).toBe(45);
  });

  it("wraps negative hues", () => {
    expect(normalizeHue(-10)).toBe(350);
    expect(normalizeHue(-360)).toBe(0);
    expect(normalizeHue(-370)).toBe(350);
  });
});

describe("hueName", () => {
  it("names the six canonical snake hues correctly", () => {
    expect(hueName(0)).toBe("Red");
    expect(hueName(60)).toBe("Yellow");
    expect(hueName(120)).toBe("Green");
    expect(hueName(180)).toBe("Cyan");
    expect(hueName(240)).toBe("Blue");
    expect(hueName(300)).toBe("Magenta");
  });

  it("names the half-step canonical hues correctly", () => {
    expect(hueName(30)).toBe("Orange");
    expect(hueName(90)).toBe("Lime");
    expect(hueName(150)).toBe("Mint");
    expect(hueName(210)).toBe("Sky");
    expect(hueName(270)).toBe("Indigo");
    expect(hueName(330)).toBe("Pink");
  });

  it("snaps to the nearest canonical name for in-between hues", () => {
    expect(hueName(10)).toBe("Red"); // closer to 0 than 30
    expect(hueName(20)).toBe("Orange"); // closer to 30 than 0
    expect(hueName(75)).toBe("Yellow"); // closer to 60 than 90
    expect(hueName(80)).toBe("Lime"); // closer to 90 than 60
  });

  it("handles wrap-around when picking the nearest name", () => {
    // hue 350 is 10° from Red (360≡0) but 20° from Pink (330).
    expect(hueName(350)).toBe("Red");
    expect(hueName(355)).toBe("Red");
  });

  it("normalizes out-of-range hues before naming", () => {
    expect(hueName(360)).toBe("Red");
    expect(hueName(-60)).toBe("Magenta"); // -60 ≡ 300
    expect(hueName(420)).toBe("Yellow"); // 420 ≡ 60
  });
});

describe("bodyColor", () => {
  it("returns hsla strings with the given alpha", () => {
    const c = bodyColor(0, 0.5, 60);
    expect(c).toMatch(/^hsla\(/);
    expect(c).toContain("0.5"); // alpha
  });

  it("uses the hueOffset directly (no time term, no t*120 gradient)", () => {
    // Hue should be identical for any `t` at a given hueOffset.
    const head = bodyColor(0, 1, 60);
    const tail = bodyColor(1, 1, 60);
    // Both strings should contain "hsla(60," at the start.
    expect(head.startsWith("hsla(60,")).toBe(true);
    expect(tail.startsWith("hsla(60,")).toBe(true);
  });

  it("darkens the lightness toward the tail", () => {
    const head = bodyColor(0, 1, 0);
    const tail = bodyColor(1, 1, 0);
    // hsla(H,SAT%,LIT%,A) — capture the third numeric group (lightness).
    const litOf = (s: string) => {
      const m = s.match(/^hsla\(([^,]+),([^,]+)%,([^,]+)%,/);
      if (!m) throw new Error(`Unexpected hsla format: ${s}`);
      return parseFloat(m[3]);
    };
    expect(litOf(head)).toBeGreaterThan(litOf(tail));
  });

  it("normalizes negative hueOffsets", () => {
    expect(bodyColor(0, 1, -60).startsWith("hsla(300,")).toBe(true);
  });
});

describe("visibleTrailLength", () => {
  const MAX = 1800;

  it("returns the base length at score 0", () => {
    expect(visibleTrailLength(0, MAX)).toBe(CONFIG.trailBaseLength);
  });

  it("grows linearly with score", () => {
    expect(visibleTrailLength(1, MAX)).toBe(
      CONFIG.trailBaseLength + CONFIG.trailGrowthPerApple,
    );
    expect(visibleTrailLength(5, MAX)).toBe(
      CONFIG.trailBaseLength + 5 * CONFIG.trailGrowthPerApple,
    );
  });

  it("caps at maxLength once the score grows past the buffer size", () => {
    expect(visibleTrailLength(10_000, MAX)).toBe(MAX);
    // Right at the boundary — still capped.
    const exactScore = Math.ceil(
      (MAX - CONFIG.trailBaseLength) / CONFIG.trailGrowthPerApple,
    );
    expect(visibleTrailLength(exactScore, MAX)).toBe(MAX);
  });

  it("returns at least 2 for any sane maxLength", () => {
    // The cap and floor both apply; with a normal maxLength we never drop
    // below 2 segments even with weird inputs.
    expect(visibleTrailLength(-100, MAX)).toBeGreaterThanOrEqual(2);
    expect(visibleTrailLength(0, MAX)).toBeGreaterThanOrEqual(2);
  });

  it("treats negative scores like zero (defensive)", () => {
    expect(visibleTrailLength(-5, MAX)).toBe(
      visibleTrailLength(0, MAX),
    );
  });
});
