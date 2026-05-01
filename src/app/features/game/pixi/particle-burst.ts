import { Container, Graphics, Ticker } from 'pixi.js';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: number;
  rot: number;
  vrot: number;
  shape: 'spark' | 'coin' | 'star' | 'shock';
  drag?: number;
}

/**
 * Lightweight ticker-driven particle layer. `burst(x, y, accent)` spawns sparks
 * and coins for a single cell win; `flourish(x, y, accent)` adds a shockwave
 * ring and a screen-wide spray for big wins.
 */
export class ParticleBurst {
  readonly root: Container;
  private readonly g: Graphics;
  private readonly particles: Particle[] = [];

  constructor(private readonly ticker: Ticker) {
    this.root = new Container();
    this.g = new Graphics();
    this.root.addChild(this.g);
    this.ticker.add(this.update, this);
  }

  destroy(): void {
    this.ticker.remove(this.update, this);
    this.root.destroy({ children: true });
  }

  /** Per-cell win: sparks fanning out + a few tossed coins + a small star pop. */
  burst(x: number, y: number, accent = 0xffe066): void {
    const sparkCount = 28;
    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.5;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0,
        maxLife: 35 + Math.random() * 30,
        size: 1.6 + Math.random() * 2.8,
        color: Math.random() < 0.45 ? 0xffffff : (Math.random() < 0.5 ? accent : 0xffd97a),
        rot: 0, vrot: 0,
        shape: 'spark',
        drag: 0.96,
      });
    }
    const coinCount = 8;
    for (let i = 0; i < coinCount; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.85;
      const speed = 3.5 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 30,
        size: 5 + Math.random() * 2.5,
        color: 0xffd97a,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        shape: 'coin',
      });
    }
    // 5-pointed gold star pop in the middle
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0, maxLife: 22,
      size: 12,
      color: 0xffe066,
      rot: 0, vrot: 0.04,
      shape: 'star',
    });
    // Quick shockwave ring at the cell.
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0, maxLife: 26,
      size: 6,
      color: 0xffd97a,
      rot: 0, vrot: 0,
      shape: 'shock',
    });
  }

  /**
   * Big-win flourish: a large shockwave ring and a wide spray of sparks/coins.
   * Used when total step win exceeds threshold.
   */
  flourish(x: number, y: number, accent = 0xffd97a): void {
    // Big shockwave
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0, maxLife: 50,
      size: 10,
      color: accent,
      rot: 0, vrot: 0,
      shape: 'shock',
    });
    // Wide spray of sparks
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 7;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 50,
        size: 1.8 + Math.random() * 3.2,
        color: Math.random() < 0.4 ? 0xffffff : 0xffe066,
        rot: 0, vrot: 0,
        shape: 'spark',
        drag: 0.965,
      });
    }
    // Coin shower
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.0;
      const speed = 5 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0,
        maxLife: 90 + Math.random() * 40,
        size: 5.5 + Math.random() * 3,
        color: 0xffd97a,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        shape: 'coin',
      });
    }
  }

  private update(t: Ticker): void {
    const dt = t.deltaTime;
    const gravity = 0.20;
    this.g.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      const k = p.life / p.maxLife;
      if (k >= 1) {
        this.particles.splice(i, 1);
        continue;
      }
      const alpha = 1 - k;

      switch (p.shape) {
        case 'spark': {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += gravity * dt * 0.6;
          if (p.drag) {
            p.vx *= Math.pow(p.drag, dt);
            p.vy *= Math.pow(p.drag, dt);
          }
          this.g.circle(p.x, p.y, p.size * (1 - k * 0.3)).fill({ color: p.color, alpha });
          // Trail
          this.g.circle(p.x - p.vx * 1.4, p.y - p.vy * 1.4, p.size * 0.55)
                .fill({ color: p.color, alpha: alpha * 0.45 });
          // Glow halo
          this.g.circle(p.x, p.y, p.size * 2.2).fill({ color: p.color, alpha: alpha * 0.18 });
          break;
        }
        case 'coin': {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += gravity * dt;
          p.rot += p.vrot * dt;
          const sx = Math.abs(Math.cos(p.rot));
          this.g.ellipse(p.x, p.y, p.size * sx + 0.5, p.size).fill({ color: p.color, alpha });
          this.g.ellipse(p.x, p.y, p.size * sx * 0.5, p.size * 0.55).fill({ color: 0xffffff, alpha: alpha * 0.65 });
          // Edge highlight
          this.g.ellipse(p.x, p.y, p.size * sx + 0.5, p.size).stroke({ color: 0x8c6420, width: 0.6, alpha });
          break;
        }
        case 'star': {
          p.rot += p.vrot * dt;
          const sz = p.size * (1 + k * 1.4);
          drawStar(this.g, p.x, p.y, sz, sz * 0.45, 5, p.rot, p.color, alpha);
          // Soft glow
          this.g.circle(p.x, p.y, sz * 1.6).fill({ color: p.color, alpha: alpha * 0.18 });
          break;
        }
        case 'shock': {
          // Expanding ring with thinning stroke
          const radius = p.size + k * 60;
          const stroke = 4 * (1 - k);
          this.g.circle(p.x, p.y, radius).stroke({ color: p.color, width: stroke, alpha });
          this.g.circle(p.x, p.y, radius - 4).stroke({ color: 0xffffff, width: stroke * 0.5, alpha: alpha * 0.6 });
          break;
        }
      }
    }
  }
}

function drawStar(
  g: Graphics,
  cx: number, cy: number,
  outer: number, inner: number,
  points: number, rot: number,
  color: number, alpha: number,
): void {
  const step = Math.PI / points;
  let started = false;
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + i * step - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (!started) { g.moveTo(x, y); started = true; }
    else g.lineTo(x, y);
  }
  g.closePath().fill({ color, alpha });
}
