import { SnakeOptions, LISSAJOUS_PATTERNS } from "./config";
import type { TargetParams } from "./target";

/** A configured snake ready to be rendered. Implements SnakeOptions so it can be passed directly to the Snake constructor. */

export class DrawableSnake implements SnakeOptions {
  readonly targetParams: TargetParams;
  readonly hueOffset: number;
  readonly timeOffset: number;
  readonly startX?: number;
  readonly startY?: number;

  constructor(hueOffset: number, patternIndex = 0, timeOffset = hueOffset * (1200 / 360)) {
    this.targetParams = LISSAJOUS_PATTERNS[patternIndex % LISSAJOUS_PATTERNS.length];
    this.hueOffset = hueOffset;
    this.timeOffset = timeOffset;
  }
}
