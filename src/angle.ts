/**
 * Normalize an angle delta into the range (-PI, PI].
 * Used so the snake always turns the short way toward its target.
 */
export function normalizeAngleDiff(diff: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Clamp `value` into the symmetric range [-limit, limit].
 */
export function clampSymmetric(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
