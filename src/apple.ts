import type { Vec2 } from "./target.ts";

/**
 * A single apple sitting at a random spot on the canvas.
 * Snakes try to eat it; when one does, it respawns somewhere else.
 */
export class Apple {
  pos: Vec2;

  constructor(
    public width: number,
    public height: number,
    /** Apple body radius in px. */
    readonly radius: number = 10,
    /** RNG hook, primarily for tests. Defaults to Math.random. */
    private readonly rng: () => number = Math.random,
  ) {
    this.pos = this.randomPos();
  }

  /** Pick a new random position somewhere inside the canvas (with margin). */
  respawn(): void {
    this.pos = this.randomPos();
  }

  /** Update canvas dimensions; clamps the apple back inside the new bounds. */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const margin = this.radius * 2;
    this.pos.x = Math.max(margin, Math.min(width - margin, this.pos.x));
    this.pos.y = Math.max(margin, Math.min(height - margin, this.pos.y));
  }

  /**
   * True iff a snake head at (hx, hy) with the given head radius is touching
   * the apple. Uses squared-distance to avoid the sqrt.
   */
  isEatenBy(hx: number, hy: number, headRadius: number): boolean {
    const dx = hx - this.pos.x;
    const dy = hy - this.pos.y;
    const r = this.radius + headRadius;
    return dx * dx + dy * dy <= r * r;
  }

  private randomPos(): Vec2 {
    const margin = this.radius * 4;
    const w = Math.max(margin * 2 + 1, this.width);
    const h = Math.max(margin * 2 + 1, this.height);
    return {
      x: margin + this.rng() * (w - margin * 2),
      y: margin + this.rng() * (h - margin * 2),
    };
  }
}

/**
 * Return whichever apple is closest to (x, y), measured by squared distance.
 * Ties are broken by array order (first match wins). Returns undefined for an
 * empty list.
 */
export function nearestApple(
  apples: readonly Apple[],
  x: number,
  y: number,
): Apple | undefined {
  let best: Apple | undefined;
  let bestD2 = Infinity;
  for (const a of apples) {
    const dx = x - a.pos.x;
    const dy = y - a.pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = a;
    }
  }
  return best;
}

/**
 * Pick a uniformly-random apple from the list. Returns undefined for an empty
 * list. The RNG hook is exposed primarily for tests.
 */
export function pickRandomApple(
  apples: readonly Apple[],
  rng: () => number = Math.random,
): Apple | undefined {
  if (apples.length === 0) return undefined;
  // Math.floor + clamp guards against rng() returning exactly 1.
  const i = Math.min(apples.length - 1, Math.floor(rng() * apples.length));
  return apples[i];
}
