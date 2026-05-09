import { CONFIG } from "./config.ts";
import { clampSymmetric, normalizeAngleDiff } from "./angle.ts";
import { DEFAULT_TARGET_PARAMS, targetPos, type TargetParams, type Vec2 } from "./target.ts";

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
   * Returns the new head position for convenience.
   */
  update(targetOverride?: Vec2): Vec2 {
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
    const dx = target.x - this.hx;
    const dy = target.y - this.hy;
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
