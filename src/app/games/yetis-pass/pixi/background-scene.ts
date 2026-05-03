import { Application, Container, FillGradient, Graphics, Ticker } from 'pixi.js';

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  drift: number;
  phase: number;
}

/**
 * Procedural Himalayan-night background.
 * Layers (back → front):
 *   - sky gradient (deep cyan → indigo → near-black)
 *   - stars
 *   - distant ridge silhouette
 *   - mid mountain peaks with snow caps
 *   - aurora-like blue glow band
 *   - foreground snowy slope
 *   - drifting snowflakes (animated)
 */
export class YetiBackgroundScene {
  readonly root: Container;
  private readonly sky: Graphics;
  private readonly stars: Graphics;
  private readonly auroraGlow: Graphics;
  private readonly farPeaks: Graphics;
  private readonly midPeaks: Graphics;
  private readonly foreSlope: Graphics;
  private readonly snowLayer: Graphics;
  private readonly snowflakes: Snowflake[] = [];
  private appW = 0;
  private appH = 0;
  private starSeed: number[] = [];

  constructor(private readonly app: Application) {
    this.root = new Container();
    this.sky = new Graphics();
    this.stars = new Graphics();
    this.auroraGlow = new Graphics();
    this.farPeaks = new Graphics();
    this.midPeaks = new Graphics();
    this.foreSlope = new Graphics();
    this.snowLayer = new Graphics();

    this.root.addChild(
      this.sky,
      this.stars,
      this.auroraGlow,
      this.farPeaks,
      this.midPeaks,
      this.foreSlope,
      this.snowLayer,
    );
    app.stage.addChild(this.root);

    this.layout(app.screen.width, app.screen.height);
    app.ticker.add(this.update, this);
  }

  relayout(w: number, h: number): void { this.layout(w, h); }

  destroy(): void {
    this.app.ticker.remove(this.update, this);
    this.root.destroy({ children: true });
  }

  private layout(w: number, h: number): void {
    this.appW = w; this.appH = h;
    this.drawSky(w, h);
    this.drawStars(w, h);
    this.drawAuroraGlow(w, h);
    this.drawFarPeaks(w, h);
    this.drawMidPeaks(w, h);
    this.drawForeSlope(w, h);
    this.spawnSnow(w, h);
  }

  private drawSky(w: number, h: number): void {
    this.sky.clear();
    const g = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end:   { x: 0, y: h },
      colorStops: [
        { offset: 0.00, color: 0x081420 },
        { offset: 0.40, color: 0x0c2030 },
        { offset: 0.70, color: 0x0a1820 },
        { offset: 1.00, color: 0x040810 },
      ],
    });
    this.sky.rect(0, 0, w, h).fill(g);
    // Vignette at the corners
    for (let i = 0; i < 5; i++) {
      const inset = -60 - i * 40;
      this.sky.roundRect(inset, inset, w - inset * 2, h - inset * 2, 240)
        .stroke({ color: 0x000000, width: 100, alpha: 0.07 });
    }
  }

  private drawStars(w: number, h: number): void {
    this.stars.clear();
    if (this.starSeed.length === 0) {
      for (let i = 0; i < 160; i++) {
        this.starSeed.push(Math.random(), Math.random(), Math.random(), Math.random());
      }
    }
    for (let i = 0; i < this.starSeed.length; i += 4) {
      const sx = this.starSeed[i] * w;
      const sy = this.starSeed[i + 1] * h * 0.55;
      const bright = this.starSeed[i + 2];
      const tint = this.starSeed[i + 3];
      const size = 0.4 + bright * 1.6;
      const alpha = 0.30 + bright * 0.55;
      const color = tint < 0.10 ? 0x9ad6e8 : 0xffffff;
      this.stars.circle(sx, sy, size).fill({ color, alpha });
      if (bright > 0.85) {
        this.stars.circle(sx, sy, size * 3.5).fill({ color, alpha: alpha * 0.18 });
      }
    }
  }

  /** Soft cyan/aurora glow band at mid-horizon. */
  private drawAuroraGlow(w: number, h: number): void {
    this.auroraGlow.clear();
    const cy = h * 0.45;
    for (let i = 0; i < 5; i++) {
      this.auroraGlow.ellipse(w * 0.5, cy + i * 8, w * 0.85, 32 + i * 12)
        .fill({ color: 0x4a8aa8, alpha: 0.06 });
    }
    // Hint of green
    this.auroraGlow.ellipse(w * 0.40, cy - 12, w * 0.40, 50)
      .fill({ color: 0x4abf8a, alpha: 0.04 });
  }

  /** Distant snow-tipped peaks — 3 staggered rows for depth. */
  private drawFarPeaks(w: number, h: number): void {
    this.farPeaks.clear();
    const baseY = h * 0.66;
    this.farPeaks.moveTo(0, baseY);
    let x = 0; let phase = 0.5;
    while (x < w + 80) {
      const peakX = x + 110 + Math.sin(phase) * 30;
      const peakY = baseY - 60 - Math.abs(Math.sin(phase * 1.4)) * 70;
      this.farPeaks.lineTo(peakX - 60, peakY);
      x = peakX + 50;
      phase += 0.9;
    }
    this.farPeaks.lineTo(w, h).lineTo(0, h).closePath();
    this.farPeaks.fill({ color: 0x1a2a36, alpha: 0.85 });
  }

  /** Mid-distance taller snow-peaked mountains, with white snow caps. */
  private drawMidPeaks(w: number, h: number): void {
    this.midPeaks.clear();
    const baseY = h * 0.78;
    const peaks: Array<[x: number, peakY: number]> = [];
    let x = -50; let phase = 1.7;
    this.midPeaks.moveTo(0, baseY);
    while (x < w + 60) {
      const peakY = baseY - 100 - Math.abs(Math.sin(phase * 1.3)) * 110;
      const peakX = x + 130 + Math.sin(phase) * 30;
      peaks.push([peakX, peakY]);
      this.midPeaks.lineTo(peakX, peakY);
      x = peakX + 70;
      phase += 0.85;
    }
    this.midPeaks.lineTo(w, h).lineTo(0, h).closePath();
    this.midPeaks.fill({ color: 0x0c1820, alpha: 0.95 });
    // Snow caps on each peak
    for (const [px, py] of peaks) {
      this.midPeaks.poly([
        px, py,
        px - 28, py + 20,
        px - 18, py + 26,
        px, py + 8,
        px + 18, py + 26,
        px + 28, py + 20,
      ]).fill({ color: 0xeaf3f8, alpha: 0.85 });
    }
  }

  /** Foreground snowy slope. */
  private drawForeSlope(w: number, h: number): void {
    this.foreSlope.clear();
    const baseY = h - 4;
    this.foreSlope.moveTo(0, h * 0.92)
      .quadraticCurveTo(w * 0.30, h * 0.84, w * 0.55, h * 0.90)
      .quadraticCurveTo(w * 0.80, h * 0.96, w, h * 0.88)
      .lineTo(w, h)
      .lineTo(0, h)
      .closePath()
      .fill({ color: 0xeaf3f8, alpha: 0.92 });
    // Subtle blue shadow
    this.foreSlope.moveTo(0, h * 0.92)
      .quadraticCurveTo(w * 0.30, h * 0.84, w * 0.55, h * 0.90)
      .quadraticCurveTo(w * 0.80, h * 0.96, w, h * 0.88)
      .stroke({ color: 0x9ad6e8, width: 2, alpha: 0.4 });
    // Few dark rocks poking through
    for (const [cx, cy, r] of [
      [w * 0.10, h * 0.93, 12],
      [w * 0.65, h * 0.94, 10],
      [w * 0.85, h * 0.91, 14],
    ] as const) {
      this.foreSlope.ellipse(cx, cy, r, r * 0.5).fill({ color: 0x14202c });
    }
    // suppress unused warning
    void baseY;
  }

  private spawnSnow(w: number, h: number): void {
    this.snowflakes.length = 0;
    const count = Math.max(40, Math.floor(w / 30));
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0.2 + Math.random() * 0.6,
        size: 0.6 + Math.random() * 2.4,
        alpha: 0.5 + Math.random() * 0.5,
        drift: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private update(t: Ticker): void {
    const dt = t.deltaMS;
    const w = this.appW, h = this.appH;
    if (!w || !h) return;
    this.snowLayer.clear();
    for (const f of this.snowflakes) {
      f.phase += 0.04 * (dt / 16);
      f.x += Math.sin(f.phase) * f.drift * (dt / 16) * 0.6;
      f.y += f.vy * (dt / 16);
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
      if (f.x < -4) f.x = w + 4;
      if (f.x > w + 4) f.x = -4;
      this.snowLayer.circle(f.x, f.y, f.size).fill({ color: 0xeaf3f8, alpha: f.alpha });
    }
  }
}
