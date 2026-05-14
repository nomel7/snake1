import type { Vec2 } from "./target.ts";
import { pointInRect, type Rect } from "./rect.ts";

export interface AppleOptions {
  /** A rectangle the apple should never spawn inside (e.g. a UI panel). */
  avoidRect?: Rect;
  /** Padding (px) added around the avoidRect when checking overlap. */
  avoidPadding?: number;
}

/**
 * A single apple sitting at a random spot on the canvas.
 * Snakes try to eat it; when one does, it respawns somewhere else.
 */
export class Apple {
  pos: Vec2;
  avoidRect?: Rect;
  avoidPadding: number;

  constructor(
    public width: number,
    public height: number,
    /** Apple body radius in px. */
    readonly radius: number = 10,
    /** RNG hook, primarily for tests. Defaults to Math.random. */
    private readonly rng: () => number = Math.random,
    options: AppleOptions = {avoidRect: { x: 0, y: 0, width: 550, height: 550}},
  ) {
    this.avoidRect = options.avoidRect;
    this.avoidPadding = 100;
    this.pos = this.randomPos();
  }

  /** Pick a new random position somewhere inside the canvas (with margin). */
  respawn(): void {
    this.pos = this.randomPos();
  }

  /**
   * Update or clear the rectangle this apple should avoid spawning inside.
   * Does NOT immediately move the apple; the next respawn will respect it.
   */
  setAvoidRect(rect: Rect | undefined): void {
    this.avoidRect = rect;
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
    // Rejection sampling: try a few times to land outside the avoid rect.
    // Capped so we never infinite-loop on a degenerate avoid zone.
    for (let i = 0; i < 50; i++) {
      const x = margin + this.rng() * (w - margin * 2);
      const y = margin + this.rng() * (h - margin * 2);
      if (
        !this.avoidRect ||
        !pointInRect(this.avoidRect, x, y, this.avoidPadding)
      ) {
        return { x, y };
      }
    }
    // Fallback if every sample landed in the avoid rect: place at the
    // bottom-right of the canvas, comfortably away from the typical
    // top-left scoreboard.
    return { x: w - margin, y: h - margin };
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
