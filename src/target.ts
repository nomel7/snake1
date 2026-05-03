/**
 * Lissajous-like target the snake's head chases.
 * Returns a point in canvas coords given the current frame `time` and viewport size.
 *
 * The phase term (a slow sine) gently warps the trajectory so the path never
 * settles into a perfect repeating loop.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface TargetParams {
  /** Horizontal amplitude as a fraction of width. */
  ampX: number;
  /** Vertical amplitude as a fraction of height. */
  ampY: number;
  /** Frequency multiplier on the X sine. */
  freqX: number;
  /** Frequency multiplier on the Y sine. */
  freqY: number;
  /** Time scale applied to both sines. */
  timeScale: number;
  /** Time scale for the slow phase wobble. */
  phaseScale: number;
}

export const DEFAULT_TARGET_PARAMS: TargetParams = {
  ampX: 0.46,
  ampY: 0.44,
  freqX: 1.0,
  freqY: 1.31,
  timeScale: 0.0018,
  phaseScale: 0.00018,
};

export function targetPos(
  time: number,
  width: number,
  height: number,
  params: TargetParams = DEFAULT_TARGET_PARAMS,
): Vec2 {
  const cx = width / 2;
  const cy = height / 2;
  const ax = width * params.ampX;
  const ay = height * params.ampY;
  const phase = Math.sin(time * params.phaseScale) * Math.PI;
  const x = cx + ax * Math.sin(params.freqX * time * params.timeScale + phase);
  const y = cy + ay * Math.sin(params.freqY * time * params.timeScale);
  return { x, y };
}
