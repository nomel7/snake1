import { useEffect, useRef } from "react";
import { Renderer } from "./renderer.ts";
import { Snake, type SnakeOptions } from "./snake.ts";
import { DEFAULT_TARGET_PARAMS } from "./target.ts";

export interface SnakeCanvasProps {
  /**
   * Per-snake configurations. Defaults to six snakes evenly spread
   * around the hue wheel, each tracing a different Lissajous figure
   * with a staggered time offset so they never sync up.
   */
  snakes?: SnakeOptions[];
}

const DEFAULT_SNAKES: SnakeOptions[] = [
  // 1. Red / pink — original Lissajous
  {
    targetParams: DEFAULT_TARGET_PARAMS,
    hueOffset: 0,
    timeOffset: 0,
  },
  // 2. Yellow — rotated Lissajous (X/Y swapped)
  {
    targetParams: {
      ...DEFAULT_TARGET_PARAMS,
      freqX: DEFAULT_TARGET_PARAMS.freqY,
      freqY: DEFAULT_TARGET_PARAMS.freqX,
    },
    hueOffset: 60,
    timeOffset: 600,
  },
  // 3. Green — wide horizontal figure-8 (2:1)
  {
    targetParams: {
      ...DEFAULT_TARGET_PARAMS,
      freqX: 2.0,
      freqY: 1.0,
      ampX: 0.5,
      ampY: 0.4,
    },
    hueOffset: 120,
    timeOffset: 1200,
  },
  // 4. Cyan — tall vertical figure-8 (1:2)
  {
    targetParams: {
      ...DEFAULT_TARGET_PARAMS,
      freqX: 1.0,
      freqY: 2.0,
      ampX: 0.4,
      ampY: 0.5,
    },
    hueOffset: 180,
    timeOffset: 1800,
  },
  // 5. Blue — three-lobe rosette (3:2)
  {
    targetParams: {
      ...DEFAULT_TARGET_PARAMS,
      freqX: 3.0,
      freqY: 2.0,
      ampX: 0.42,
      ampY: 0.42,
    },
    hueOffset: 240,
    timeOffset: 2400,
  },
  // 6. Magenta — different rosette (2:3)
  {
    targetParams: {
      ...DEFAULT_TARGET_PARAMS,
      freqX: 2.0,
      freqY: 3.0,
      ampX: 0.42,
      ampY: 0.42,
    },
    hueOffset: 300,
    timeOffset: 3000,
  },
];

export function SnakeCanvas({ snakes: snakeConfigs = DEFAULT_SNAKES }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const snakes = snakeConfigs.map(
      (opts, i) =>
        new Snake(canvas.width, canvas.height, {
          // Spread initial heads across the canvas so they don't overlap on frame 1.
          startX:
            opts.startX ??
            canvas.width * ((i + 1) / (snakeConfigs.length + 1)),
          startY: opts.startY ?? canvas.height * 0.5,
          ...opts,
        }),
    );
    const renderer = new Renderer(ctx);

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      for (const s of snakes) s.setSize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      for (const s of snakes) s.update();
      renderer.fade(canvas.width, canvas.height);
      for (const s of snakes) renderer.drawSnake(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [snakeConfigs]);

  return <canvas ref={canvasRef} />;
}
