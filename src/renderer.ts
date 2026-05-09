import { CONFIG } from "./config.ts";
import type { Snake } from "./snake.ts";
import type { Apple } from "./apple.ts";
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

/** HSL color for a body segment at trail-fraction `t` (0 = head, 1 = tail). */
export function bodyColor(time: number, t: number, alpha: number, hueOffset = 0): string {
  const hue = (time * 0.04 + t * 120 + hueOffset) % 360;
  const sat = 70;
  const lit = 55 - t * 20;
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
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

      const hue = (s.time * 0.04 + s.hueOffset) % 360;
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
      ctx.fillText(`Snake ${i + 1}`, swatchX + swatchR + 10, cy + 0.5);

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
    const { segX, segY, head, bodyLength, time, hueOffset } = snake;

    for (let i = bodyLength - 1; i >= 1; i--) {
      const t = i / bodyLength;
      const idx0 = (head + i) % bodyLength;
      const idx1 = (head + i - 1) % bodyLength;

      const alpha = (1 - t) * 0.92 + 0.05;
      const thick = CONFIG.thickness * (0.3 + 0.7 * (1 - t));

      ctx.beginPath();
      ctx.moveTo(segX[idx0], segY[idx0]);
      ctx.lineTo(segX[idx1], segY[idx1]);
      ctx.strokeStyle = bodyColor(time, t, alpha, hueOffset);
      ctx.lineWidth = thick;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  private drawHead(snake: Snake): void {
    const { ctx } = this;
    const { hx, hy, time, hueOffset } = snake;
    const hue = (time * 0.04 + hueOffset) % 360;

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
