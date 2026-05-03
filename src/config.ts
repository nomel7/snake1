/**
 * Tunable constants for the snake animation.
 * Pulled out of the modules so they can be tweaked or swapped in tests.
 */
export const CONFIG = {
  /** Number of segment positions stored in the trailing body buffer. */
  bodyLength: 1800,
  /** Pixels per frame the head moves along its current heading. */
  speed: 2.2,
  /** Base stroke width (px) for the body. Tapers along the trail. */
  thickness: 7,
  /** Maximum radians the head can rotate per frame. Lower = lazier turns. */
  maxTurn: 0.055,
  /** How translucent the per-frame "fade" rectangle is (creates the trail glow). */
  fadeAlpha: 0.25,
  /** Tongue flick period (frames). */
  tonguePeriod: 90,
  /** How many frames within a period the tongue is visible. */
  tongueDuration: 18,
} as const;

export type Config = typeof CONFIG;
