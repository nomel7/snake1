import { CONFIG } from "./config.ts";
import type { Snake } from "./snake.ts";
import type { Apple } from "./apple.ts";

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
