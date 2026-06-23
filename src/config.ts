import { DrawableSnake } from "./DrawableSnake.ts";
import { DEFAULT_TARGET_PARAMS, type TargetParams } from "./target.ts";

export interface SnakeOptions {
  bodyLength?: number;
  targetParams?: TargetParams;
  hueOffset?: number;
  timeOffset?: number;
  startX?: number;
  startY?: number;
}

/**
 * Tunable constants for the snake animation.
 * Pulled out of the modules so they can be tweaked or swapped in tests.
 */
export const CONFIG = {
  /** Number of segment positions stored in the trailing body buffer. */
  bodyLength: 1800,
  /** Pixels per frame the head moves along its current heading. */
  speed: 3,
  /** Base stroke width (px) for the body. Tapers along the trail. */
  thickness: 7,
  /** Maximum radians the head can rotate per frame. Lower = lazier turns. */
  maxTurn: 0.055,
  /** How translucent the per-frame "fade" rectangle is (creates the trail glow). */
  fadeAlpha: 0.5,
  /** Tongue flick period (frames). */
  tonguePeriod: 90,
  /** How many frames within a period the tongue is visible. */
  tongueDuration: 18,
  /** How many apples are on the canvas at once. */
  appleCount: 40,
  /** Segments of trail visible when a snake's score is 0. */
  trailBaseLength: 30,
  /** Extra trail segments added per apple eaten. */
  trailGrowthPerApple: 50,
  /** How many snakes appear by default. */
  snakeCount: 12,
} as const;

export type Config = typeof CONFIG;

/** Pool of Lissajous patterns cycled through when auto-generating snakes. */
export const LISSAJOUS_PATTERNS: TargetParams[] = [
  // Default figure (1 : 1.31) — original
  DEFAULT_TARGET_PARAMS,
  // Wide horizontal figure-8 (2 : 1)
  { ...DEFAULT_TARGET_PARAMS, freqX: 2.0, freqY: 1.0, ampX: 0.5, ampY: 0.4 },
  // Three-lobe rosette (3 : 2)
  { ...DEFAULT_TARGET_PARAMS, freqX: 3.0, freqY: 2.0, ampX: 0.42, ampY: 0.42 },
  // Bowtie (1 : 2)
  { ...DEFAULT_TARGET_PARAMS, freqX: 1.0, freqY: 2.0, ampX: 0.45, ampY: 0.38 },
  // Five-petal (5 : 4)
  { ...DEFAULT_TARGET_PARAMS, freqX: 5.0, freqY: 4.0, ampX: 0.44, ampY: 0.44 },
  // Diagonal figure (3 : 4)
  { ...DEFAULT_TARGET_PARAMS, freqX: 3.0, freqY: 4.0, ampX: 0.44, ampY: 0.42 },
];

/** Generate `count` snakes evenly distributed around the hue wheel, cycling through Lissajous patterns. */
export function generateDefaultSnakesPatterns(count: number = CONFIG.snakeCount): DrawableSnake[] {
  return Array.from({ length: count }, (_, i) =>
    new DrawableSnake((360 / count) * i, i),
  );
}

export const DEFAULT_SNAKES: DrawableSnake[] = generateDefaultSnakesPatterns();
