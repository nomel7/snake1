/**
 * A "big scary chomp" — visual effect spawned at the moment a snake eats an
 * apple. Carries everything the renderer needs to animate the bite: position,
 * the snake's color at the moment of the bite, a list of apple-shard
 * particles, and an age counter that drives the animation forward.
 *
 * The animation lasts CHOMP_FRAMES frames (~half a second at 60fps).
 */

export const CHOMP_FRAMES = 32;
export const CHOMP_SHARDS = 9;

export interface Shard {
  /** Initial outward direction (radians). */
  angle: number;
  /** Px/frame outward speed. */
  speed: number;
  /** Initial rotation in radians. */
  rot: number;
  /** Rotation rate in radians/frame. */
  rotSpeed: number;
  /** Side length of the shard square in px. */
  size: number;
}

export class Chomp {
  age = 0;
  readonly maxAge = CHOMP_FRAMES;
  readonly shards: Shard[];

  constructor(
    public x: number,
    public y: number,
    /** Snake hue (0-360) captured at the moment of the bite. */
    public hue: number,
    rng: () => number = Math.random,
  ) {
    this.shards = [];
    for (let i = 0; i < CHOMP_SHARDS; i++) {
      // Spread shards roughly evenly around the circle, with a touch of jitter
      // so they don't look like a perfect compass rose.
      const base = (i / CHOMP_SHARDS) * Math.PI * 2;
      this.shards.push({
        angle: base + (rng() - 0.5) * 0.4,
        speed: 2.5 + rng() * 3,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.5,
        size: 4 + rng() * 3,
      });
    }
  }

  /** Advance the animation by one frame. */
  update(): void {
    this.age++;
  }

  /** True once the effect has run its full course and can be removed. */
  get done(): boolean {
    return this.age >= this.maxAge;
  }

  /** Normalized time, 0 at spawn, 1 at end. */
  get t(): number {
    return Math.min(1, this.age / this.maxAge);
  }
}
