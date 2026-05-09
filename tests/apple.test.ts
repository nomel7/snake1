import { describe, expect, it } from "vitest";
import { Apple, nearestApple, pickRandomApple } from "../src/apple.ts";

/** Tiny seeded RNG so spawn positions are deterministic in tests. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("Apple", () => {
  const W = 800;
  const H = 600;

  describe("constructor + randomPos", () => {
    it("spawns at a deterministic position when given a seeded RNG", () => {
      const a = new Apple(W, H, 10, seqRng([0.25, 0.5]));
      // margin = radius * 4 = 40; pos = margin + rand * (W|H - 2*margin)
      // x = 40 + 0.25 * (800 - 80) = 40 + 180 = 220
      // y = 40 + 0.5  * (600 - 80) = 40 + 260 = 300
      expect(a.pos.x).toBeCloseTo(220, 6);
      expect(a.pos.y).toBeCloseTo(300, 6);
    });

    it("never spawns past the margin even at RNG extremes", () => {
      const margin = 10 * 4;
      const tiny = new Apple(W, H, 10, seqRng([0, 0]));
      expect(tiny.pos.x).toBeCloseTo(margin, 6);
      expect(tiny.pos.y).toBeCloseTo(margin, 6);

      // RNG returns 1 → upper edge of the inner box, which is W - margin.
      const huge = new Apple(W, H, 10, seqRng([1, 1]));
      expect(huge.pos.x).toBeCloseTo(W - margin, 6);
      expect(huge.pos.y).toBeCloseTo(H - margin, 6);
    });

    it("always lands inside the canvas across many random spawns", () => {
      const radius = 12;
      const margin = radius * 4;
      for (let i = 0; i < 200; i++) {
        const a = new Apple(W, H, radius);
        expect(a.pos.x).toBeGreaterThanOrEqual(margin);
        expect(a.pos.x).toBeLessThanOrEqual(W - margin);
        expect(a.pos.y).toBeGreaterThanOrEqual(margin);
        expect(a.pos.y).toBeLessThanOrEqual(H - margin);
      }
    });

    it("uses a default radius of 10 when none is supplied", () => {
      const a = new Apple(W, H);
      expect(a.radius).toBe(10);
    });
  });

  describe("respawn", () => {
    it("moves the apple to the next RNG-driven position", () => {
      const a = new Apple(W, H, 10, seqRng([0.1, 0.2, 0.9, 0.8]));
      const before = { ...a.pos };
      a.respawn();
      // x = 40 + 0.9 * 720 = 688; y = 40 + 0.8 * 520 = 456
      expect(a.pos.x).toBeCloseTo(688, 6);
      expect(a.pos.y).toBeCloseTo(456, 6);
      expect(a.pos).not.toEqual(before);
    });

    it("keeps the apple inside the canvas after many respawns", () => {
      const a = new Apple(W, H, 10);
      const margin = 40;
      for (let i = 0; i < 100; i++) {
        a.respawn();
        expect(a.pos.x).toBeGreaterThanOrEqual(margin);
        expect(a.pos.x).toBeLessThanOrEqual(W - margin);
        expect(a.pos.y).toBeGreaterThanOrEqual(margin);
        expect(a.pos.y).toBeLessThanOrEqual(H - margin);
      }
    });
  });

  describe("isEatenBy", () => {
    // Pin the apple at (220, 300) for predictable collision math.
    const makeApple = () => new Apple(W, H, 10, seqRng([0.25, 0.5]));

    it("returns true when the head sits exactly on the apple", () => {
      const a = makeApple();
      expect(a.isEatenBy(a.pos.x, a.pos.y, 5)).toBe(true);
    });

    it("returns true when the circles just barely overlap", () => {
      const a = makeApple();
      const headRadius = 5;
      // distance = (radius + headRadius) - 0.01 → inside
      const d = a.radius + headRadius - 0.01;
      expect(a.isEatenBy(a.pos.x + d, a.pos.y, headRadius)).toBe(true);
    });

    it("returns true at the exact contact distance (boundary)", () => {
      const a = makeApple();
      const headRadius = 5;
      const d = a.radius + headRadius;
      expect(a.isEatenBy(a.pos.x + d, a.pos.y, headRadius)).toBe(true);
    });

    it("returns false when the head is just outside the apple", () => {
      const a = makeApple();
      const headRadius = 5;
      const d = a.radius + headRadius + 0.01;
      expect(a.isEatenBy(a.pos.x + d, a.pos.y, headRadius)).toBe(false);
    });

    it("returns false for a head far away", () => {
      const a = makeApple();
      expect(a.isEatenBy(a.pos.x + 500, a.pos.y, 5)).toBe(false);
    });

    it("works symmetrically in any direction", () => {
      const a = makeApple();
      const r = a.radius + 5 - 0.5;
      for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 1.3]) {
        const hx = a.pos.x + Math.cos(angle) * r;
        const hy = a.pos.y + Math.sin(angle) * r;
        expect(a.isEatenBy(hx, hy, 5)).toBe(true);
      }
    });
  });

  describe("setSize", () => {
    it("updates width and height", () => {
      const a = new Apple(W, H, 10);
      a.setSize(200, 150);
      expect(a.width).toBe(200);
      expect(a.height).toBe(150);
    });

    it("clamps the position back into bounds when the canvas shrinks", () => {
      // Spawn near the bottom-right corner of a big canvas...
      const a = new Apple(2000, 2000, 10, seqRng([0.99, 0.99]));
      expect(a.pos.x).toBeGreaterThan(1900);
      expect(a.pos.y).toBeGreaterThan(1900);

      // ...then shrink. Position must end up inside the new canvas (margin 2*r = 20).
      a.setSize(400, 300);
      expect(a.pos.x).toBeLessThanOrEqual(400 - 20);
      expect(a.pos.y).toBeLessThanOrEqual(300 - 20);
      expect(a.pos.x).toBeGreaterThanOrEqual(20);
      expect(a.pos.y).toBeGreaterThanOrEqual(20);
    });

    it("leaves the position alone when the new canvas still contains it", () => {
      const a = new Apple(W, H, 10, seqRng([0.5, 0.5]));
      const before = { ...a.pos };
      a.setSize(W + 100, H + 100); // strictly larger
      expect(a.pos).toEqual(before);
    });
  });
});

/** Build an apple pinned at a specific position (for nearestApple tests). */
function appleAt(x: number, y: number, radius = 10): Apple {
  const a = new Apple(2000, 2000, radius, () => 0);
  a.pos = { x, y };
  return a;
}

describe("nearestApple", () => {
  it("returns undefined for an empty list", () => {
    expect(nearestApple([], 100, 100)).toBeUndefined();
  });

  it("returns the only apple when the list has one", () => {
    const a = appleAt(50, 50);
    expect(nearestApple([a], 999, 999)).toBe(a);
  });

  it("picks the closest apple by Euclidean distance", () => {
    const a = appleAt(0, 0);
    const b = appleAt(100, 0);
    const c = appleAt(50, 200);
    expect(nearestApple([a, b, c], 90, 5)).toBe(b);
    expect(nearestApple([a, b, c], 10, 0)).toBe(a);
    expect(nearestApple([a, b, c], 50, 150)).toBe(c);
  });

  it("breaks ties by array order (first match wins)", () => {
    const a = appleAt(10, 0);
    const b = appleAt(-10, 0); // same distance from origin as a
    expect(nearestApple([a, b], 0, 0)).toBe(a);
    expect(nearestApple([b, a], 0, 0)).toBe(b);
  });

  it("works correctly when the query point sits on an apple", () => {
    const a = appleAt(100, 100);
    const b = appleAt(200, 200);
    expect(nearestApple([a, b], 100, 100)).toBe(a);
    expect(nearestApple([a, b], 200, 200)).toBe(b);
  });
});

describe("pickRandomApple", () => {
  it("returns undefined for an empty list", () => {
    expect(pickRandomApple([])).toBeUndefined();
  });

  it("returns the only apple when the list has one", () => {
    const a = appleAt(0, 0);
    expect(pickRandomApple([a], () => 0.999)).toBe(a);
  });

  it("uses the RNG to select an index (rng() * length, floored)", () => {
    const a = appleAt(0, 0);
    const b = appleAt(100, 0);
    const c = appleAt(200, 0);
    // 0.0 → index 0, 0.5 → index 1, 0.99 → index 2 in a 3-apple list.
    expect(pickRandomApple([a, b, c], () => 0.0)).toBe(a);
    expect(pickRandomApple([a, b, c], () => 0.5)).toBe(b);
    expect(pickRandomApple([a, b, c], () => 0.99)).toBe(c);
  });

  it("clamps to the last apple if rng() returns exactly 1", () => {
    const a = appleAt(0, 0);
    const b = appleAt(100, 0);
    expect(pickRandomApple([a, b], () => 1)).toBe(b);
  });

  it("only ever returns apples from the input list (over many calls)", () => {
    const apples = [appleAt(0, 0), appleAt(100, 0), appleAt(200, 0)];
    const seen = new Set<Apple>();
    for (let i = 0; i < 200; i++) {
      const picked = pickRandomApple(apples);
      expect(picked).toBeDefined();
      expect(apples).toContain(picked!);
      seen.add(picked!);
    }
    // With 200 draws over 3 apples, we should have seen all of them.
    expect(seen.size).toBe(3);
  });
});
