import { describe, expect, it } from "vitest";
import { CONFIG } from "../src/config.ts";
import { Snake } from "../src/snake.ts";

describe("Snake", () => {
  it("initializes with all body segments at the canvas center", () => {
    const s = new Snake(800, 600, { bodyLength: 100 });
    expect(s.hx).toBe(400);
    expect(s.hy).toBe(300);
    for (let i = 0; i < 100; i++) {
      expect(s.segX[i]).toBe(400);
      expect(s.segY[i]).toBe(300);
    }
  });

  it("advances head exactly speed pixels per frame along current heading", () => {
    const s = new Snake(800, 600, { bodyLength: 50 });
    const before = { x: s.hx, y: s.hy };
    s.update();
    const dist = Math.hypot(s.hx - before.x, s.hy - before.y);
    expect(dist).toBeCloseTo(CONFIG.speed, 5);
  });

  it("never turns more than maxTurn radians in one frame", () => {
    const s = new Snake(800, 600, { bodyLength: 50 });
    let prev = s.angle;
    for (let i = 0; i < 200; i++) {
      s.update();
      const delta = Math.abs(s.angle - prev);
      const wrapped = Math.min(delta, Math.abs(delta - Math.PI * 2));
      expect(wrapped).toBeLessThanOrEqual(CONFIG.maxTurn + 1e-9);
      prev = s.angle;
    }
  });

  it("writes the new head into the ring buffer at index head", () => {
    const s = new Snake(800, 600, { bodyLength: 10 });
    s.update();
    expect(s.segX[s.head]).toBeCloseTo(s.hx, 4);
    expect(s.segY[s.head]).toBeCloseTo(s.hy, 4);
  });

  it("walks the head index backward through the ring buffer", () => {
    const s = new Snake(800, 600, { bodyLength: 10 });
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) {
      s.update();
      seen.add(s.head);
    }
    expect(seen.size).toBe(10);
  });

  it("setSize updates dimensions without resetting the trail", () => {
    const s = new Snake(800, 600, { bodyLength: 50 });
    for (let i = 0; i < 30; i++) s.update();
    const headX = s.hx;
    s.setSize(1024, 768);
    expect(s.width).toBe(1024);
    expect(s.height).toBe(768);
    expect(s.hx).toBe(headX);
  });

  it("two snakes with different timeOffsets diverge after a few frames", () => {
    const a = new Snake(800, 600, { bodyLength: 20, timeOffset: 0 });
    const b = new Snake(800, 600, { bodyLength: 20, timeOffset: 500 });
    for (let i = 0; i < 50; i++) {
      a.update();
      b.update();
    }
    const apart = Math.hypot(a.hx - b.hx, a.hy - b.hy);
    expect(apart).toBeGreaterThan(0);
  });

  it("respects custom startX/startY", () => {
    const s = new Snake(800, 600, { bodyLength: 5, startX: 123, startY: 456 });
    expect(s.hx).toBe(123);
    expect(s.hy).toBe(456);
    expect(s.segX[0]).toBe(123);
    expect(s.segY[0]).toBe(456);
  });
});
