/**
 * Tiny axis-aligned-rectangle utilities used for the scoreboard's
 * avoidance zone. Kept dependency-free so they're easy to test.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True iff the point (x, y) lies inside `rect`, expanded by `padding` on every side. */
export function pointInRect(
  rect: Rect,
  x: number,
  y: number,
  padding: number = 0,
): boolean {
  return (
    x >= rect.x - padding &&
    x <= rect.x + rect.width + padding &&
    y >= rect.y - padding &&
    y <= rect.y + rect.height + padding
  );
}

/** Closest point on `rect`'s boundary (or interior) to (x, y). */
export function closestPointOnRect(
  rect: Rect,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: Math.max(rect.x, Math.min(rect.x + rect.width, x)),
    y: Math.max(rect.y, Math.min(rect.y + rect.height, y)),
  };
}

/**
 * Direction (unit-ish) from the closest point on the rect outward toward (x, y),
 * along with the distance. If the point is inside the rect, the returned
 * direction points toward the nearest edge.
 */
export function rectOutwardFrom(
  rect: Rect,
  x: number,
  y: number,
): { dx: number; dy: number; dist: number } {
  const cp = closestPointOnRect(rect, x, y);
  let dx = x - cp.x;
  let dy = y - cp.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    return { dx: dx / dist, dy: dy / dist, dist };
  }

  // Point is inside the rect — push toward the nearest edge.
  const left = x - rect.x;
  const right = rect.x + rect.width - x;
  const top = y - rect.y;
  const bottom = rect.y + rect.height - y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { dx: -1, dy: 0, dist: 0 };
  if (min === right) return { dx: 1, dy: 0, dist: 0 };
  if (min === top) return { dx: 0, dy: -1, dist: 0 };
  return { dx: 0, dy: 1, dist: 0 };
}
