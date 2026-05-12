import { useEffect, useRef } from "react";
import { Renderer, scoreboardRect } from "./renderer.ts";
import { Snake, type SnakeOptions } from "./snake.ts";
import { DEFAULT_TARGET_PARAMS } from "./target.ts";
import { Apple, pickRandomApple } from "./apple.ts";
import { Chomp } from "./chomp.ts";
import { CONFIG } from "./config.ts";
import { toggleFullscreen } from "./fullscreen.ts";

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
      freqX: DEFAULT_TARGET_PARAMS.freqX,
      freqY: DEFAULT_TARGET_PARAMS.freqY,
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
    const sbRect = scoreboardRect(snakes.length);
    const apples = Array.from(
      { length: CONFIG.appleCount },
      () =>
        new Apple(canvas.width, canvas.height, 10, Math.random, {
          avoidRect: sbRect,
          avoidPadding: 16,
        }),
    );
    const headRadius = CONFIG.thickness * 0.75;

    // Each snake commits to one randomly-chosen apple until it eats it; then
    // it rolls again. Stored in a parallel array indexed alongside `snakes`.
    const targets: (Apple | undefined)[] = snakes.map(() =>
      pickRandomApple(apples),
    );

    // Active chomp animations. Pushed on bite, filtered out on completion.
    const chomps: Chomp[] = [];

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      for (const s of snakes) s.setSize(canvas.width, canvas.height);
      for (const a of apples) a.setSize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      // Each snake steers toward its currently-assigned random apple, while
      // also being repelled by the scoreboard panel so it curves around.
      for (let i = 0; i < snakes.length; i++) {
        snakes[i].update(targets[i]?.pos, sbRect);
      }

      // Eat detection — each snake can eat at most one apple per frame. The
      // eaten apple respawns; the snake that ate it picks a new random target,
      // its score ticks up by one, and a chomp animation spawns at the bite.
      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        for (const a of apples) {
          if (a.isEatenBy(s.hx, s.hy, headRadius)) {
            const hue = (s.time * 0.04 + s.hueOffset) % 360;
            chomps.push(new Chomp(a.pos.x, a.pos.y, hue));
            a.respawn();
            s.score += 1;
            targets[i] = pickRandomApple(apples);
            break;
          }
        }
      }

      // Advance chomps and drop the finished ones.
      for (const c of chomps) c.update();
      for (let i = chomps.length - 1; i >= 0; i--) {
        if (chomps[i].done) chomps.splice(i, 1);
      }

      renderer.fade(canvas.width, canvas.height);
      for (const a of apples) renderer.drawApple(a);
      for (const s of snakes) renderer.drawSnake(s);
      // Chomps on top of snakes so the fangs read clearly.
      for (const c of chomps) renderer.drawChomp(c);
      // Scoreboard last so it sits on top of everything.
      renderer.drawScoreboard(snakes, sbRect);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [snakeConfigs]);

  return (
    <>
      <canvas ref={canvasRef} />
      <button
        type="button"
        className="fullscreen-btn"
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen"
        onClick={() => toggleFullscreen()}
      >
        {/* Simple corner-arrows fullscreen glyph */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9V4h5" />
          <path d="M20 9V4h-5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </svg>
      </button>
    </>
  );
}
