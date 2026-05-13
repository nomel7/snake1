import { CONFIG } from "./config.ts";
import type { Snake } from "./snake.ts";
import type { Apple } from "./apple.ts";
import type { Chomp } from "./chomp.ts";
import type { Rect } from "./rect.ts";

/** Compute the scoreboard rectangle given a snake count. */
export function scoreboardRect(snakeCount: number): Rect {
  const padding = 14;
  const titleBlock = 28;
  const rowHeight = 26;
  return {
    x: 16,
    y: 16,
    width: 200,
    height: padding * 2 + titleBlock + snakeCount * rowHeight,
  };
}

/**
 * HSL color for a body segment at trail-fraction `t` (0 = head, 1 = tail).
 * Each snake stays a single fixed hue (set by `hueOffset`); only the
 * lightness tapers from head to tail to give the body depth.
 */
export function bodyColor(t: number, alpha: number, hueOffset = 0): string {
  const hue = normalizeHue(hueOffset);
  const sat = 70;
  const lit = 55 - t * 20;
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
}

/** Normalize any hue value into the [0, 360) range. */
export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/**
 * How many trail segments to draw for a snake with the given score. Grows
 * linearly with score (CONFIG.trailBaseLength + score * trailGrowthPerApple),
 * capped at `maxLength` (typically the ring-buffer size) and floored at 2 so
 * there's always at least one segment to draw.
 */
export function visibleTrailLength(score: number, maxLength: number): number {
  const target =
    CONFIG.trailBaseLength + Math.max(0, score) * CONFIG.trailGrowthPerApple;
  return Math.min(maxLength, Math.max(2, target));
}

/** Canonical names paired with their canonical hue (in 30° increments). */
const HUE_NAMES: ReadonlyArray<readonly [number, string]> = [
  [0, "Red"],
  [30, "Orange"],
  [60, "Yellow"],
  [90, "Lime"],
  [120, "Green"],
  [150, "Mint"],
  [180, "Cyan"],
  [210, "Sky"],
  [240, "Blue"],
  [270, "Indigo"],
  [300, "Magenta"],
  [330, "Pink"],
];

/**
 * Map any HSL hue to the nearest canonical color name.
 * Distance is measured around the color wheel, so hue 350 → "Red", not "Pink"
 * (10° away vs. 20° away).
 */
export function hueName(hue: number): string {
  const h = normalizeHue(hue);
  let best = HUE_NAMES[0][1];
  let bestD = Infinity;
  for (const [canonical, name] of HUE_NAMES) {
    const raw = Math.abs(canonical - h);
    const d = Math.min(raw, 360 - raw); // wrap-around shortest path
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

export class Renderer {
  constructor(readonly ctx: CanvasRenderingContext2D) {}

  /** Translucent black overlay — call ONCE per frame, before drawing snakes. */
  fade(width: number, height: number): void {
    this.ctx.fillStyle = `rgba(10,10,10,${CONFIG.fadeAlpha})`;
    this.ctx.fillRect(0, 0, width, height);
  }

  /** Draw a single snake (body + head + tongue). Doesn't fade. */
  drawSnake(snake: Snake): void {
    this.drawBody(snake);
    this.drawHead(snake);
    this.drawTongue(snake);
  }

  /** Convenience: fade + draw one snake in a single call. */
  draw(snake: Snake): void {
    this.fade(snake.width, snake.height);
    this.drawSnake(snake);
  }

  /**
   * Draw the score panel — translucent rounded card listing each snake's
   * apple count, with a live-color swatch matching the snake's head hue.
   */
  drawScoreboard(snakes: readonly Snake[], rect: Rect): void {
    const { ctx } = this;
    const { x, y, width, height } = rect;

    ctx.save();

    // Drop a soft cool glow behind the panel.
    ctx.shadowColor = "rgba(120,140,255,0.25)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(20,22,32,0.78)";
    this.roundRectPath(x, y, width, height, 14);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hairline border.
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    this.roundRectPath(x, y, width, height, 14);
    ctx.stroke();

    // Inner top highlight to give it a subtle "lit from above" feel.
    const topHi = ctx.createLinearGradient(x, y, x, y + 22);
    topHi.addColorStop(0, "rgba(255,255,255,0.08)");
    topHi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topHi;
    this.roundRectPath(x + 1, y + 1, width - 2, 22, 13);
    ctx.fill();

    // Title.
    ctx.fillStyle = "rgba(245,245,255,0.92)";
    ctx.font =
      "600 12px ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // Letter-spacing-ish: tracking via small caps style.
    ctx.fillText("APPLES EATEN", x + 16, y + 26);

    // Divider under title.
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 36);
    ctx.lineTo(x + width - 16, y + 36);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rows.
    const rowH = 26;
    const rowsTop = y + 14 + 28; // padding + titleBlock; matches scoreboardRect()

    for (let i = 0; i < snakes.length; i++) {
      const s = snakes[i];
      const rowY = rowsTop + i * rowH;
      const cy = rowY + rowH / 2;

      const hue = normalizeHue(s.hueOffset);
      const swatchX = x + 24;
      const swatchR = 6.5;

      // Swatch glow halo.
      const halo = ctx.createRadialGradient(
        swatchX,
        cy,
        0,
        swatchX,
        cy,
        swatchR * 2.6,
      );
      halo.addColorStop(0, `hsla(${hue},80%,70%,0.55)`);
      halo.addColorStop(1, `hsla(${hue},80%,70%,0)`);
      ctx.beginPath();
      ctx.arc(swatchX, cy, swatchR * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Swatch dot.
      ctx.beginPath();
      ctx.arc(swatchX, cy, swatchR, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue},80%,70%)`;
      ctx.fill();

      // Label.
      ctx.fillStyle = "rgba(225,228,240,0.85)";
      ctx.font =
        "500 13px ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(hueName(hue), swatchX + swatchR + 10, cy + 0.5);

      // Score, right-aligned, in a slightly heavier weight.
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font =
        "600 14px ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(s.score), x + width - 16, cy + 0.5);
    }

    ctx.restore();
  }

  private roundRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const ctx = this.ctx;
    ctx.beginPath();
    // Use the native roundRect when available; otherwise fall back to arcs.
    const rr = (
      ctx as CanvasRenderingContext2D & {
        roundRect?: (
          x: number,
          y: number,
          w: number,
          h: number,
          r: number,
        ) => void;
      }
    ).roundRect;
    if (typeof rr === "function") {
      rr.call(ctx, x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Draw a chomp effect — fang ring snapping shut, apple shards flying out,
   * shockwave, and bright center flash.
   */
  drawChomp(chomp: Chomp): void {
    const { ctx } = this;
    const { x, y, hue, shards, age, maxAge } = chomp;
    const t = Math.min(1, age / maxAge); // 0..1

    // --- Apple shards (drawn first; the fangs/flash sit on top) -----------
    for (const sh of shards) {
      const dist = sh.speed * age;
      const gravity = 0.08 * age * age; // mild downward arc over time
      const sx = x + Math.cos(sh.angle) * dist;
      const sy = y + Math.sin(sh.angle) * dist + gravity;
      const rot = sh.rot + sh.rotSpeed * age;
      const alpha = Math.max(0, 1 - t);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      // Use the apple's red palette so it reads as "fruit exploding".
      ctx.fillStyle = `rgba(220,40,55,${alpha})`;
      ctx.fillRect(-sh.size / 2, -sh.size / 2, sh.size, sh.size);
      // Light edge highlight gives the shards a glossy feel.
      ctx.fillStyle = `rgba(255,180,180,${alpha * 0.6})`;
      ctx.fillRect(-sh.size / 2, -sh.size / 2, sh.size, sh.size * 0.3);
      ctx.restore();
    }

    // --- Expanding shockwave ring ----------------------------------------
    if (t < 0.85) {
      const wT = t / 0.85;
      const wRadius = 6 + wT * 70;
      const wAlpha = (1 - wT) * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, wRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue},85%,75%,${wAlpha})`;
      ctx.lineWidth = (1 - wT) * 3 + 1;
      ctx.stroke();
    }

    // --- Fang ring (the "scary chomp") -----------------------------------
    // The fangs start far out and SNAP inward over the first ~45% of the
    // animation, then linger briefly and fade.
    const SNAP = 0.45;
    const snapT = Math.min(1, t / SNAP); // 0..1 during the snap
    const fadeT = Math.max(0, (t - SNAP) / (1 - SNAP)); // 0..1 after the snap

    // Easing — quick start, gentle finish — so it really snaps.
    const eased = 1 - Math.pow(1 - snapT, 3);
    const fangOuter = 42 - eased * 26; // 42 → 16
    const fangInner = fangOuter - 16;
    const fangAlpha = (1 - fadeT) * (0.9 - 0.2 * snapT);

    const NUM_FANGS = 10;
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < NUM_FANGS; i++) {
      const a = (i / NUM_FANGS) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Inward-pointing triangle: tip at fangInner, base at fangOuter ± spread.
      const spread = 0.18;
      const tipX = ca * fangInner;
      const tipY = sa * fangInner;
      const b1X = Math.cos(a - spread) * fangOuter;
      const b1Y = Math.sin(a - spread) * fangOuter;
      const b2X = Math.cos(a + spread) * fangOuter;
      const b2Y = Math.sin(a + spread) * fangOuter;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(b1X, b1Y);
      ctx.lineTo(b2X, b2Y);
      ctx.closePath();
      // Bone-white fangs tinted by the snake's hue, with a thin colored outline.
      ctx.fillStyle = `hsla(${hue},40%,96%,${fangAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue},70%,55%,${fangAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();

    // --- Bright center flash (only during the snap) ----------------------
    if (snapT < 1) {
      const fAlpha = (1 - snapT) * 0.85;
      const fR = 22 + snapT * 10;
      const flash = ctx.createRadialGradient(x, y, 0, x, y, fR);
      flash.addColorStop(0, `hsla(${hue},90%,92%,${fAlpha})`);
      flash.addColorStop(0.4, `hsla(${hue},90%,75%,${fAlpha * 0.5})`);
      flash.addColorStop(1, `hsla(${hue},90%,75%,0)`);
      ctx.beginPath();
      ctx.arc(x, y, fR, 0, Math.PI * 2);
      ctx.fillStyle = flash;
      ctx.fill();
    }
  }

  /** Draw an apple — red body, brown stem, green leaf, soft glow. */
  drawApple(apple: Apple): void {
    const { ctx } = this;
    const { x, y } = apple.pos;
    const r = apple.radius;

    // Soft red glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, "rgba(255,80,90,0.35)");
    glow.addColorStop(1, "rgba(255,80,90,0)");
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Apple body (radial gradient for a hint of shading)
    const body = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      r * 0.1,
      x,
      y,
      r,
    );
    body.addColorStop(0, "#ff7a85");
    body.addColorStop(1, "#c8202e");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    // Stem
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.9);
    ctx.lineTo(x + r * 0.15, y - r * 1.4);
    ctx.strokeStyle = "#5b3a1e";
    ctx.lineWidth = Math.max(1.5, r * 0.18);
    ctx.lineCap = "round";
    ctx.stroke();

    // Leaf
    ctx.beginPath();
    ctx.ellipse(
      x + r * 0.55,
      y - r * 1.15,
      r * 0.55,
      r * 0.28,
      -Math.PI / 4,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#3fae54";
    ctx.fill();

    // Highlight on the body
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y - r * 0.4, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
  }

  private drawBody(snake: Snake): void {
    const { ctx } = this;
    const { segX, segY, head, bodyLength, hueOffset, score } = snake;
    // How much of the ring buffer is actually rendered. Grows with the snake's
    // score so eating apples visibly lengthens its tail.
    const visible = visibleTrailLength(score, bodyLength);

    for (let i = visible - 1; i >= 1; i--) {
      // `t` is now relative to the visible length, so the head→tail taper
      // compresses into the rendered body regardless of how long it is.
      const t = i / visible;
      const idx0 = (head + i) % bodyLength;
      const idx1 = (head + i - 1) % bodyLength;

      const alpha = (1 - t) * 0.92 + 0.05;
      const thick = CONFIG.thickness * (0.3 + 0.7 * (1 - t));

      ctx.beginPath();
      ctx.moveTo(segX[idx0], segY[idx0]);
      ctx.lineTo(segX[idx1], segY[idx1]);
      ctx.strokeStyle = bodyColor(t, alpha, hueOffset);
      ctx.lineWidth = thick;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  private drawHead(snake: Snake): void {
    const { ctx } = this;
    const { hx, hy, hueOffset } = snake;
    const hue = normalizeHue(hueOffset);

    // Solid head
    ctx.beginPath();
    ctx.arc(hx, hy, CONFIG.thickness * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue},80%,70%)`;
    ctx.fill();

    // Soft glow
    const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, CONFIG.thickness * 4);
    grd.addColorStop(0, `hsla(${hue},80%,70%,0.25)`);
    grd.addColorStop(1, `hsla(${hue},80%,70%,0)`);
    ctx.beginPath();
    ctx.arc(hx, hy, CONFIG.thickness * 4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  private drawTongue(snake: Snake): void {
    const { ctx } = this;
    const { hx, hy, angle, tongueTimer } = snake;

    const tp = tongueTimer % CONFIG.tonguePeriod;
    if (tp >= CONFIG.tongueDuration) return;

    const half = CONFIG.tongueDuration / 2;
    const ext = tp < half ? tp / half : (CONFIG.tongueDuration - tp) / half;
    const tLen = 14 * ext;
    const spread = 0.32;
    const bx = hx + Math.cos(angle) * CONFIG.thickness * 0.6;
    const by = hy + Math.sin(angle) * CONFIG.thickness * 0.6;
    const tx = bx + Math.cos(angle) * tLen;
    const ty = by + Math.sin(angle) * tLen;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(
      tx + Math.cos(angle + spread) * 6 * ext,
      ty + Math.sin(angle + spread) * 6 * ext,
    );
    ctx.moveTo(bx, by);
    ctx.lineTo(
      tx + Math.cos(angle - spread) * 6 * ext,
      ty + Math.sin(angle - spread) * 6 * ext,
    );
    ctx.strokeStyle = `rgba(255,60,60,${0.9 * ext})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}
