import { describe, expect, it } from "vitest";
import {
  closestPointOnRect,
  pointInRect,
  rectOutwardFrom,
  type Rect,
} from "../src/rect.ts";

const R: Rect = { x: 100, y: 50, width: 200, height: 80 };
// → x in [100, 300], y in [50, 130]

describe("pointInRect", () => {
  it("includes interior points", () => {
    expect(pointInRect(R, 150, 80)).toBe(true);
  });

  it("includes boundary points (closed rectangle)", () => {
    expect(pointInRect(R, 100, 50)).toBe(true);
    expect(pointInRect(R, 300, 130)).toBe(true);
  });

  it("excludes points clearly outside", () => {
    expect(pointInRect(R, 99, 80)).toBe(false);
    expect(pointInRect(R, 150, 49)).toBe(false);
    expect(pointInRect(R, 301, 80)).toBe(false);
    expect(pointInRect(R, 150, 131)).toBe(false);
  });

  it("expands the test region by the padding amount", () => {
    expect(pointInRect(R, 95, 80, 10)).toBe(true); // 5 left of edge, padding 10
    expect(pointInRect(R, 88, 80, 10)).toBe(false); // 12 left of edge, padding 10
    expect(pointInRect(R, 310, 130, 10)).toBe(true);
  });
});

describe("closestPointOnRect", () => {
  it("returns the point itself when inside the rect", () => {
    const p = closestPointOnRect(R, 150, 80);
    expect(p).toEqual({ x: 150, y: 80 });
  });

  it("clamps to the nearest edge for outside points", () => {
    expect(closestPointOnRect(R, 0, 80)).toEqual({ x: 100, y: 80 }); // left
    expect(closestPointOnRect(R, 500, 80)).toEqual({ x: 300, y: 80 }); // right
    expect(closestPointOnRect(R, 150, 0)).toEqual({ x: 150, y: 50 }); // top
    expect(closestPointOnRect(R, 150, 500)).toEqual({ x: 150, y: 130 }); // bottom
  });

  it("clamps to the nearest corner for diagonal outside points", () => {
    expect(closestPointOnRect(R, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(closestPointOnRect(R, 500, 500)).toEqual({ x: 300, y: 130 });
  });
});

describe("rectOutwardFrom", () => {
  it("points away from the rect for outside points, with correct distance", () => {
    const out = rectOutwardFrom(R, 50, 80); // 50 to the left of the left edge
    expect(out.dx).toBeCloseTo(-1, 6);
    expect(out.dy).toBeCloseTo(0, 6);
    expect(out.dist).toBeCloseTo(50, 6);
  });

  it("returns a unit vector (length 1) for outside points", () => {
    const out = rectOutwardFrom(R, 350, 200);
    expect(Math.hypot(out.dx, out.dy)).toBeCloseTo(1, 6);
    expect(out.dist).toBeGreaterThan(0);
  });

  it("pushes toward the nearest edge when the point is inside the rect", () => {
    // Center of rect is (200, 90). Closest edge is the top (40 away vs sides 100).
    const out = rectOutwardFrom(R, 200, 90);
    expect(out.dx).toBe(0);
    expect(out.dy).toBe(-1);
    expect(out.dist).toBe(0);
  });

  it("picks left edge when point is closer to left than top/bottom/right", () => {
    // Inside the rect, near the left edge.
    const out = rectOutwardFrom(R, 105, 90);
    expect(out.dx).toBe(-1);
    expect(out.dy).toBe(0);
  });
});
