# Snake Animation

A generative canvas animation for screensavers in the browser: six long, color-shifting snakes that lazily trace Lissajous-style paths across the screen, leaving fading rainbow trails behind them. Every so often each one flicks a tiny red tongue.

Originally a single-file `snake.html` prototype, now a React + TypeScript + Vite app. The animation logic itself is framework-agnostic — React just owns the canvas lifecycle and the requestAnimationFrame loop.

To see it live on s3: https://snake-animation-kdone-2026.s3.us-east-1.amazonaws.com/index.html

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints. Resize the window — the snakes adapt.

## Scripts

| Script               | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with hot module reload.  |
| `npm run build`      | Type-check and produce a static bundle in `dist/`. |
| `npm run preview`    | Serve the built bundle locally.                    |
| `npm test`           | Run the Vitest suite once.                         |
| `npm run test:watch` | Run tests in watch mode.                           |

## Project layout

```
snake-animation/
├── index.html               # Vite entry; mounts <App /> on #root
├── src/
│   ├── main.tsx             # React bootstrap (createRoot)
│   ├── App.tsx              # Top-level component
│   ├── SnakeCanvas.tsx      # Canvas + animation loop hook
│   ├── config.ts            # Tunable constants (speed, body length, ...)
│   ├── angle.ts             # Pure helpers: angle-diff normalization, clamping
│   ├── target.ts            # Lissajous-like target the head chases
│   ├── snake.ts             # Snake class — state + per-frame update
│   ├── renderer.ts          # Canvas drawing (body, head + glow, tongue)
│   └── style.css
├── tests/
│   ├── angle.test.ts
│   ├── target.test.ts
│   └── snake.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## React structure

```tsx
<App>
  <SnakeCanvas snakes={[...optional configs]} />
</App>
```

`SnakeCanvas` is the only stateful piece. It uses a `useRef<HTMLCanvasElement>` for the canvas and a single `useEffect` that:

1. Sizes the canvas to the viewport
2. Constructs `Snake` instances from the prop configs
3. Wires up `window.resize`
4. Starts a `requestAnimationFrame` loop
5. Returns a cleanup function that cancels the RAF and removes the listener — so unmounting the component (or remounting under React's StrictMode in dev) stops the animation cleanly.

By default it renders two snakes — one tracing the original Lissajous figure in magenta/pink, the other tracing it with X/Y frequencies swapped (a rotated figure), 180° around the hue wheel into greens/cyans, and time-offset so they don't move in lockstep. Pass your own `snakes` prop to customize.

## How the animation works

The animation has no game logic — it's a damped pursuit system rendered with a fading trail.

1. **Target.** Each frame, `targetPos(time, width, height)` returns a point that orbits the canvas center along two sine waves with slightly different frequencies (a Lissajous figure). A slow phase wobble keeps the path from ever exactly repeating.
2. **Pursuit.** The snake's head computes the angle to its target, takes the *shorter* angular path toward it (`normalizeAngleDiff`), and rotates by at most `maxTurn` radians per frame (`clampSymmetric`). This produces lazy, organic curves rather than sharp corner-turns.
3. **Body.** The most recent `bodyLength` head positions are stored in a `Float32Array` ring buffer. Drawing iterates from tail to head, fading alpha and tapering thickness along the way.
4. **Color.** Body color cycles through HSL hue space over time; saturation is fixed and lightness drops along the trail. Each snake has its own `hueOffset`. The head also gets a soft radial-gradient glow.
5. **Trail fade.** The frame is not cleared — it's painted over once with a translucent black rect each frame, so previous strokes decay smoothly. This happens once *before* drawing all snakes, so multiple snakes share the same fade.
6. **Tongue.** A tiny forked tongue eases out and back along the head's heading on a fixed period.

## Tweaking the look

Most knobs live in [`src/config.ts`](src/config.ts). Try:

- `speed` — how fast the head moves
- `maxTurn` — lower = lazier, swoopier turns
- `bodyLength` — longer trail = more glow, more GPU
- `fadeAlpha` — higher = trail dies faster (cleaner image)
- `thickness` — base stroke width

The path shape is in [`src/target.ts`](src/target.ts) (`DEFAULT_TARGET_PARAMS`) — change `freqX`/`freqY` to get different Lissajous figures.

To add a third snake, edit `DEFAULT_SNAKES` in [`src/SnakeCanvas.tsx`](src/SnakeCanvas.tsx) — push another options object onto the array.

## Testing

The pure logic (angle math, target curve, snake update) is covered by Vitest. The renderer and the React component are intentionally not unit-tested — the renderer is pure canvas drawing, easier to verify visually than to mock; the component is a thin wrapper that just orchestrates already-tested pieces.

```bash
npm test
```
