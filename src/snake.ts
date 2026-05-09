import { CONFIG } from "./config.ts";
import { clampSymmetric, normalizeAngleDiff } from "./angle.ts";
import { DEFAULT_TARGET_PARAMS, targetPos, type TargetParams, type Vec2 } from "./target.ts";
import { rectOutwardFrom, type Rect } from "./rect.ts";

export interface SnakeOptions {
  /** Length of the trailing-segment ring buffer. */
  bodyLength?: number;
  /** Lissajous parameters for this snake's pursuit target. */
  targetParams?: TargetParams;
  /** Degrees of hue offset added to this snake's color cycle. */
  hueOffset?: number;
  /** Phase offset (in frames) added to time when computing the target. */
  timeOffset?: number;
  /** Initial head position. Defaults to canvas center. */
  startX?: number;
  startY?: number;
}

/**
 * Snake state. The body is a ring buffer of (x, y) positions, with `head`
 * pointing at the most recently inserted segment.
 */
export class Snake {
  readonly segX: Float32Array;
  readonly segY: Float32Array;
  readonly bodyLength: number;
  readonly targetParams: TargetParams;
  readonly hueOffset: number;
  readonly timeOffset: number;
  head = 0;
  hx: number;
  hy: number;
  angle = 0;
  time = 0;
  tongueTimer = 0;
  /** How many apples this snake has eaten — incremented externally on collision. */
  score = 0;

  constructor(public width: number, public height: number, options: SnakeOptions = {}) {
    this.bodyLength = options.bodyLength ?? CONFIG.bodyLength;
    this.targetParams = options.targetParams ?? DEFAULT_TARGET_PARAMS;
    this.hueOffset = options.hueOffset ?? 0;
    this.timeOffset = options.timeOffset ?? 0;

    this.segX = new Float32Array(this.bodyLength);
    this.segY = new Float32Array(this.bodyLength);
    this.hx = options.startX ?? width / 2;
    this.hy = options.startY ?? height / 2;
    this.segX.fill(this.hx);
    this.segY.fill(this.hy);
  }

  /** Resize handler — does not reset the trail, just updates dimensions. */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Advance the simulation by one frame.
   * If `targetOverride` is supplied (e.g. an apple position), the head steers
   * toward that point instead of its Lissajous trajectory. Otherwise it falls
   * back to the snake's configured Lissajous target.
   *
   * If `avoidRect` is supplied, the snake gets a soft repulsion away from
   * that rectangle whenever its head is close to or inside it — so it curves
   * around rather than barreling through (e.g. the scoreboard panel).
   *
   * Returns the new head position for convenience.
   */
  update(targetOverride?: Vec2, avoidRect?: Rect): Vec2 {
    this.time++;
    this.tongueTimer++;

    const target =
      targetOverride ??
      targetPos(
        this.time + this.timeOffset,
        this.width,
        this.height,
        this.targetParams,
      );
    let dx = target.x - this.hx;
    let dy = target.y - this.hy;

    if (avoidRect) {
      const rep = rectOutwardFrom(avoidRect, this.hx, this.hy);
      // Repulsion ramp: full strength at/inside the rect, falling to 0 at AVOID_RANGE.
      const AVOID_RANGE = 80;
      const REPEL_WEIGHT = 4; // multiplier vs. the (already-normalized) target dir
      if (rep.dist < AVOID_RANGE) {
        const strength = 1 - rep.dist / AVOID_RANGE;
        // Normalize the target direction so the repulsion isn't drowned out
        // by an apple that happens to be far away.
        const tlen = Math.hypot(dx, dy) || 1;
        dx = dx / tlen + rep.dx * strength * REPEL_WEIGHT;
        dy = dy / tlen + rep.dy * strength * REPEL_WEIGHT;
      }
    }

    const desired = Math.atan2(dy, dx);

    const diff = normalizeAngleDiff(desired - this.angle);
    this.angle += clampSymmetric(diff, CONFIG.maxTurn);

    this.hx += Math.cos(this.angle) * CONFIG.speed;
    this.hy += Math.sin(this.angle) * CONFIG.speed;

    this.head = (this.head + this.bodyLength - 1) % this.bodyLength;
    this.segX[this.head] = this.hx;
    this.segY[this.head] = this.hy;

    return { x: this.hx, y: this.hy };
  }
}
