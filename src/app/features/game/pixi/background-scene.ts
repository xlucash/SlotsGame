import { Application, Container, FillGradient, Graphics, Ticker } from 'pixi.js';

interface Firefly {
  x: number;
  y: number;
  baseY: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  size: number;
  brightness: number;
}

/**
 * Procedural night-forest background, layered back→front:
 *   - sky gradient + aurora wash
 *   - star field
 *   - moon + halo + horizon glow
 *   - distant ridge silhouette
 *   - mid mountain ridge
 *   - atmospheric mist over the ridges
 *   - mid-distance trees
 *   - ground fog band
 *   - foreground trees
 *   - moonlight beams overlay
 *   - drifting fireflies
 */
export class BackgroundScene {
  readonly root: Container;
  private readonly sky: Graphics;
  private readonly aurora: Graphics;
  private readonly stars: Graphics;
  private readonly moon: Graphics;
  private readonly horizonGlow: Graphics;
  private readonly farMountains: Graphics;
  private readonly midMountains: Graphics;
  private readonly atmoHaze: Graphics;
  private readonly midTrees: Graphics;
  private readonly fog: Graphics;
  private readonly foreTrees: Graphics;
  private readonly beams: Graphics;
  private readonly fireflyLayer: Graphics;
  private readonly fireflies: Firefly[] = [];
  private appW = 0;
  private appH = 0;
  private starSeed: number[] = [];

  constructor(private readonly app: Application) {
    this.root = new Container();
    this.sky = new Graphics();
    this.aurora = new Graphics();
    this.stars = new Graphics();
    this.horizonGlow = new Graphics();
    this.moon = new Graphics();
    this.farMountains = new Graphics();
    this.midMountains = new Graphics();
    this.atmoHaze = new Graphics();
    this.midTrees = new Graphics();
    this.fog = new Graphics();
    this.foreTrees = new Graphics();
    this.beams = new Graphics();
    this.fireflyLayer = new Graphics();

    this.root.addChild(
      this.sky,
      this.aurora,
      this.stars,
      this.horizonGlow,
      this.moon,
      this.farMountains,
      this.midMountains,
      this.atmoHaze,
      this.midTrees,
      this.fog,
      this.foreTrees,
      this.beams,
      this.fireflyLayer,
    );
    app.stage.addChild(this.root);

    this.layout(app.screen.width, app.screen.height);
    app.ticker.add(this.update, this);
  }

  /** Called by the host whenever the canvas resizes. */
  relayout(w: number, h: number): void { this.layout(w, h); }

  destroy(): void {
    this.app.ticker.remove(this.update, this);
    this.root.destroy({ children: true });
  }

  private layout(w: number, h: number): void {
    this.appW = w;
    this.appH = h;

    this.drawSky(w, h);
    this.drawAurora(w, h);
    this.drawStars(w, h);
    this.drawHorizonGlow(w, h);
    this.drawMoon(w, h);
    this.drawRidge(this.farMountains, w, h, {
      baseY: h * 0.62, color: 0x14242a, alpha: 0.85,
      step: 110, amp: 80, jitter: 35, seed: 1.2,
    });
    this.drawRidge(this.midMountains, w, h, {
      baseY: h * 0.72, color: 0x0a1418, alpha: 0.92,
      step: 90,  amp: 64, jitter: 28, seed: 3.7,
    });
    this.drawAtmoHaze(w, h);
    this.drawTrees(this.midTrees,  w, h, 0.78, 0x07100c, 70, 18);
    this.drawFog(w, h);
    this.drawTrees(this.foreTrees, w, h, 1.05, 0x030608, 116, 12);
    this.drawMoonBeams(w, h);
    this.spawnFireflies(w, h);
  }

  /* ---------------------------- Layers ---------------------------- */

  private drawSky(w: number, h: number): void {
    this.sky.clear();
    const sky = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end:   { x: 0, y: h },
      colorStops: [
        { offset: 0.00, color: 0x06121a }, // deep zenith
        { offset: 0.30, color: 0x0a1820 },
        { offset: 0.55, color: 0x0c1c1f }, // hint of teal toward horizon
        { offset: 0.80, color: 0x081218 },
        { offset: 1.00, color: 0x040608 }, // floor
      ],
    });
    this.sky.rect(0, 0, w, h).fill(sky);

    // Vignette — heavier at the corners.
    for (let i = 0; i < 6; i++) {
      const inset = -80 - i * 50;
      this.sky.roundRect(inset, inset, w - inset * 2, h - inset * 2, 280)
        .stroke({ color: 0x000000, width: 110, alpha: 0.07 - i * 0.010 });
    }
  }

  /**
   * Soft auroral wash near horizon — gives the sky a subtle color-shift band
   * without dominating the scene.
   */
  private drawAurora(w: number, h: number): void {
    this.aurora.clear();
    const baseY = h * 0.45;
    const bandH = h * 0.22;
    // Three faint horizontal slabs of slightly different hues.
    this.aurora.rect(0, baseY,             w, bandH * 0.6).fill({ color: 0x1a3a3c, alpha: 0.10 });
    this.aurora.rect(0, baseY + bandH*0.4, w, bandH * 0.5).fill({ color: 0x14282e, alpha: 0.12 });
    this.aurora.rect(0, baseY + bandH*0.7, w, bandH * 0.4).fill({ color: 0x18242c, alpha: 0.14 });
  }

  private drawStars(w: number, h: number): void {
    this.stars.clear();
    if (this.starSeed.length === 0) {
      for (let i = 0; i < 180; i++) {
        this.starSeed.push(Math.random(), Math.random(), Math.random(), Math.random());
      }
    }
    for (let i = 0; i < this.starSeed.length; i += 4) {
      const sx = this.starSeed[i] * w;
      const sy = this.starSeed[i + 1] * h * 0.50;
      const bright = this.starSeed[i + 2];
      const tint = this.starSeed[i + 3];
      const size = 0.4 + bright * 1.8;
      const alpha = 0.25 + bright * 0.65;
      // Most stars are white; ~15% pick up a faint warm/cool tint.
      const color = tint < 0.07 ? 0xffd97a : tint < 0.15 ? 0xb8d4ff : 0xffffff;
      this.stars.circle(sx, sy, size).fill({ color, alpha });
      // Brighter stars get a tiny halo.
      if (bright > 0.85) {
        this.stars.circle(sx, sy, size * 3.5).fill({ color, alpha: alpha * 0.18 });
        // Cross-shaped diffraction spike for the few brightest.
        this.stars.moveTo(sx - size * 4, sy).lineTo(sx + size * 4, sy)
          .stroke({ color, width: 0.4, alpha: alpha * 0.3 });
        this.stars.moveTo(sx, sy - size * 4).lineTo(sx, sy + size * 4)
          .stroke({ color, width: 0.4, alpha: alpha * 0.3 });
      }
    }
  }

  /** Soft warm rim where the sky meets the mountains. */
  private drawHorizonGlow(w: number, h: number): void {
    this.horizonGlow.clear();
    const cy = h * 0.62;
    // Stack a few wide ellipses with decreasing alpha to fake a vertical glow falloff.
    for (let i = 0; i < 5; i++) {
      const dy = i * 12;
      const a = 0.10 - i * 0.018;
      this.horizonGlow.ellipse(w * 0.5, cy + dy, w * 0.7, 28 + i * 10)
        .fill({ color: 0xffd97a, alpha: a });
    }
  }

  private drawMoon(w: number, h: number): void {
    this.moon.clear();
    const cx = w * 0.78;
    const cy = h * 0.22;
    const r = Math.min(w, h) * 0.075;
    // Halo (multiple soft rings)
    for (let i = 12; i >= 1; i--) {
      const ringR = r + i * 9;
      const a = 0.018 + (12 - i) * 0.003;
      this.moon.circle(cx, cy, ringR).fill({ color: 0xffe9b5, alpha: Math.min(0.06, a) });
    }
    // Moon disc
    this.moon.circle(cx, cy, r).fill({ color: 0xfaf0d4 });
    // Inner shading on lower-right
    this.moon.circle(cx + r * 0.10, cy + r * 0.10, r * 0.92)
      .fill({ color: 0xe6d4ad, alpha: 0.35 });
    // Crescent rim highlight on upper-left
    this.moon.circle(cx - r * 0.18, cy - r * 0.16, r * 0.85)
      .fill({ color: 0xfff7e0, alpha: 0.45 });
    // Craters
    this.moon.circle(cx - r * 0.30, cy - r * 0.20, r * 0.20).fill({ color: 0xc7b48a, alpha: 0.5 });
    this.moon.circle(cx + r * 0.42, cy + r * 0.05, r * 0.11).fill({ color: 0xb8a47a, alpha: 0.6 });
    this.moon.circle(cx - r * 0.05, cy + r * 0.42, r * 0.07).fill({ color: 0xb8a47a, alpha: 0.5 });
    this.moon.circle(cx + r * 0.10, cy - r * 0.40, r * 0.05).fill({ color: 0xb8a47a, alpha: 0.4 });
  }

  /**
   * Draw a layered ridge of mountain peaks. Random-ish but seed-stable
   * (driven by the deterministic `seed` and trig sine sums).
   */
  private drawRidge(g: Graphics, w: number, h: number,
                    o: { baseY: number; color: number; alpha: number; step: number; amp: number; jitter: number; seed: number }): void {
    g.clear();
    g.moveTo(0, o.baseY);
    let x = 0;
    let phase = o.seed;
    while (x < w + 60) {
      const peakX = x + o.step + Math.sin(phase) * o.jitter;
      const peakY = o.baseY - (o.amp * 0.4 + Math.abs(Math.sin(phase * 1.3) * o.amp * 0.6) + Math.sin(phase * 0.4) * o.amp * 0.4);
      g.lineTo(peakX - o.step * 0.2, peakY);
      x = peakX + o.step * 0.4;
      phase += 0.85;
    }
    g.lineTo(w, h).lineTo(0, h).closePath();
    g.fill({ color: o.color, alpha: o.alpha });
  }

  /** Soft horizontal mist over the horizon between far ridge and trees. */
  private drawAtmoHaze(w: number, h: number): void {
    this.atmoHaze.clear();
    const startY = h * 0.55;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = startY + t * h * 0.20;
      const a = 0.06 + t * 0.07;
      this.atmoHaze.rect(0, y, w, h * 0.22 / 9 + 1).fill({ color: 0x1a2a32, alpha: a });
    }
  }

  /**
   * A row of pine silhouettes. Each tree is a column of overlapping triangle
   * tiers plus a small trunk. Slight horizontal jitter per index.
   */
  private drawTrees(g: Graphics, w: number, h: number, scale: number, color: number, baseDepth: number, count: number): void {
    g.clear();
    const baseY = h - 4;
    const treeW = (w / count) * scale;
    for (let i = -1; i < count + 1; i++) {
      const seedJit = Math.sin(i * 1.31 + scale * 7) * 0.5 + 0.5;
      const cx = i * (w / count) + seedJit * treeW * 0.5;
      const treeH = baseDepth * (0.85 + Math.sin(i * 2.7) * 0.25) * scale;
      const halfW = treeW * 0.34;
      // Trunk (slightly tapered using trapezoid)
      g.poly([
        cx - halfW * 0.16, baseY - treeH * 0.10,
        cx + halfW * 0.16, baseY - treeH * 0.10,
        cx + halfW * 0.20, baseY,
        cx - halfW * 0.20, baseY,
      ]).fill({ color: 0x000000 });
      // Stacked triangle tiers
      const tiers = 4;
      for (let t = tiers - 1; t >= 0; t--) {
        const tierBaseY = baseY - treeH * 0.10 - t * treeH * 0.20;
        const tierTopY = tierBaseY - treeH * (0.45 - t * 0.06);
        const tierHalfW = halfW * (1.0 - t * 0.16);
        g.moveTo(cx - tierHalfW, tierBaseY)
          .lineTo(cx, tierTopY)
          .lineTo(cx + tierHalfW, tierBaseY)
          .closePath()
          .fill({ color });
      }
    }
    // Ground fill below trees
    g.rect(0, baseY, w, h - baseY + 4).fill({ color });
  }

  private drawFog(w: number, h: number): void {
    this.fog.clear();
    const startY = h * 0.58;
    const bands = 16;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const y = startY + t * (h - startY);
      const a = 0.04 + t * 0.10;
      this.fog.rect(0, y, w, (h - startY) / bands + 2).fill({ color: 0x4a5a52, alpha: a });
    }
    // Wisps — irregular ellipses for mist pockets.
    for (let i = 0; i < 6; i++) {
      const cx = (i + 0.5) * (w / 6) + Math.sin(i * 3.1) * 60;
      const cy = h * (0.78 + Math.sin(i * 0.8) * 0.06);
      this.fog.ellipse(cx, cy, w * 0.18, 30 + Math.cos(i) * 8)
        .fill({ color: 0x4a6058, alpha: 0.13 });
    }
  }

  /** Soft beams of moonlight slanting down from the moon area. */
  private drawMoonBeams(w: number, h: number): void {
    this.beams.clear();
    const mx = w * 0.78;
    const my = h * 0.22;
    for (let i = 0; i < 5; i++) {
      const a = 0.04 - i * 0.005;
      const angle = Math.PI * (0.62 + i * 0.04);
      const len = h * 1.1;
      const dx = Math.cos(angle) * len;
      const dy = Math.sin(angle) * len;
      const wid = 70 + i * 35;
      this.beams.poly([
        mx - wid * 0.4, my,
        mx + wid * 0.4, my,
        mx + dx + wid * 0.7, my + dy,
        mx + dx - wid * 0.7, my + dy,
      ]).fill({ color: 0xffe9b5, alpha: a });
    }
  }

  private spawnFireflies(w: number, h: number): void {
    this.fireflies.length = 0;
    const count = Math.max(22, Math.floor(w / 70));
    for (let i = 0; i < count; i++) {
      this.fireflies.push({
        x: Math.random() * w,
        y: h * 0.45 + Math.random() * h * 0.45,
        baseY: 0,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        size: 1.4 + Math.random() * 2.6,
        brightness: 0.4 + Math.random() * 0.6,
      });
      this.fireflies[this.fireflies.length - 1].baseY =
        this.fireflies[this.fireflies.length - 1].y;
    }
  }

  private update(ticker: Ticker): void {
    const dt = ticker.deltaMS;
    const w = this.appW;
    const h = this.appH;
    if (!w || !h) return;
    this.fireflyLayer.clear();
    for (const f of this.fireflies) {
      f.phase += f.speed * (dt / 16);
      f.x += f.vx * (dt / 16);
      f.y = f.baseY + Math.sin(f.phase) * 14 + Math.cos(f.phase * 0.7) * 6;
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;
      const flicker = 0.6 + 0.4 * Math.sin(f.phase * 3);
      const a = f.brightness * flicker;
      this.fireflyLayer.circle(f.x, f.y, f.size * 3).fill({ color: 0xfff2a8, alpha: a * 0.10 });
      this.fireflyLayer.circle(f.x, f.y, f.size * 1.8).fill({ color: 0xffe066, alpha: a * 0.30 });
      this.fireflyLayer.circle(f.x, f.y, f.size).fill({ color: 0xffffff, alpha: a });
    }
  }
}
