import gsap from 'gsap';
import { Application, Container, Graphics } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { COLS, ROWS, type Grid, type SpinResult, type TumbleStep, type WildMultGrid } from '../../../core/math/types';
import { CELL_GAP, CELL_SIZE, SymbolSprite } from './symbol-sprite';
import { paletteFor } from './symbol-art';
import { ParticleBurst } from './particle-burst';

const GRID_W = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
const GRID_H = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP;

export interface GridCallbacks {
  onStepWin?: (amount: number, multiplier: number) => void;
}

/**
 * Owns the grid container, frame, particle layer, and spin animations.
 * The frame is a wood-and-brass plaque around the grid; particles overlay symbols.
 */
export class GridRenderer {
  private readonly root: Container;
  private readonly cellsLayer: Container;
  private readonly framePlaque: Graphics;
  private readonly gridLines: Graphics;
  private readonly frameBrass: Graphics;
  private readonly innerShadow: Graphics;
  private readonly particles: ParticleBurst;
  private sprites: SymbolSprite[][] = [];
  private callbacks: GridCallbacks = {};
  private readonly winFilter: GlowFilter;
  private readonly active = new Set<gsap.core.Tween | gsap.core.Timeline>();
  private fastForwardRequested = false;
  private readonly scatterFilter: GlowFilter;

  constructor(private readonly app: Application) {
    this.root = new Container();
    this.framePlaque = new Graphics();
    this.gridLines = new Graphics();
    this.frameBrass = new Graphics();
    this.innerShadow = new Graphics();
    this.cellsLayer = new Container();
    this.particles = new ParticleBurst(app.ticker);

    // Order: plaque (deep) → gridlines (over plaque, behind sprites) →
    // sprites → particles → frame brass + shadow on top of everything.
    this.root.addChild(
      this.framePlaque,
      this.gridLines,
      this.cellsLayer,
      this.particles.root,
      this.frameBrass,
      this.innerShadow,
    );
    app.stage.addChild(this.root);

    this.winFilter = new GlowFilter({
      distance: 18,
      outerStrength: 3,
      innerStrength: 0,
      color: 0xffd97a,
      quality: 0.4,
    });

    // Distinct ruby-orange glow for scatter trigger/retrigger so players
    // can tell at a glance what's special about these cells (vs. cluster wins).
    this.scatterFilter = new GlowFilter({
      distance: 28,
      outerStrength: 4.2,
      innerStrength: 0.8,
      color: 0xff7a3a,
      quality: 0.5,
    });

    this.layoutFrame();
    this.layoutRoot(app.screen.width, app.screen.height);
  }

  /** Called by host whenever the canvas resizes. Re-centers and rescales. */
  relayout(w: number, h: number): void { this.layoutRoot(w, h); }

  /**
   * Bounding box of the visible **frame** (brass plaque) in CSS px inside the
   * canvas. Side panels anchor on this so they sit outside the brass border,
   * not flush against it.
   */
  getGridRect(): { left: number; right: number; top: number; bottom: number } {
    const scale = this.root.scale.x;
    // layoutFrame() draws the outermost plaque at -34 to GRID + 34 in grid-local
    // coords (pad 22 + 12 outer offset). Plus a 4px brass rim outside that.
    const FRAME_OUTSET = 38;
    const left = this.root.position.x - FRAME_OUTSET * scale;
    const top  = this.root.position.y - FRAME_OUTSET * scale;
    const right  = this.root.position.x + (GRID_W + FRAME_OUTSET) * scale;
    const bottom = this.root.position.y + (GRID_H + FRAME_OUTSET) * scale;
    return { left, right, top, bottom };
  }

  setCallbacks(cb: GridCallbacks): void { this.callbacks = cb; }

  showGrid(grid: Grid, wilds?: WildMultGrid): void {
    this.cellsLayer.removeChildren();
    this.sprites = [];
    for (let c = 0; c < COLS; c++) {
      const col: SymbolSprite[] = [];
      for (let r = 0; r < ROWS; r++) {
        const mult = wilds?.[c]?.[r] ?? 0;
        const sprite = new SymbolSprite(grid[c][r], mult);
        sprite.position.set(this.cellX(c), this.cellY(r));
        this.cellsLayer.addChild(sprite);
        col.push(sprite);
      }
      this.sprites.push(col);
    }
  }

  /** True while a spin animation is in progress. */
  get isAnimating(): boolean { return this.active.size > 0 || this.fastForwardRequested; }

  /**
   * Skip all currently-running tween animations to their final frame, and
   * cause subsequent steps within this spin to render instantly.
   */
  fastForward(): void {
    this.fastForwardRequested = true;
    // Snapshot — calling progress(1) fires onComplete, which mutates the set.
    const snap = Array.from(this.active);
    for (const t of snap) t.progress(1);
    this.active.clear();
  }

  async playSpin(result: SpinResult): Promise<void> {
    this.fastForwardRequested = false;
    if (this.fastForwardRequested) this.applyGridInstant(result.initialGrid, result.initialWilds);
    else await this.animateInitialDrop(result.initialGrid, result.initialWilds);

    for (const step of result.steps) {
      if (this.fastForwardRequested) this.applyStepInstant(step);
      else await this.animateStep(step);
    }
    if (!this.fastForwardRequested) await wait(120);
    this.fastForwardRequested = false;
  }

  /**
   * Highlight every SCATTER tile currently on the board with a ruby glow,
   * pulse them, and burst particles at each. Used when a spin triggers
   * (4+ scatters) or retriggers (3+ in FS) free spins.
   */
  async glowScatters(): Promise<void> {
    const scatters: { sprite: SymbolSprite; cx: number; cy: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c]?.[r];
        if (sprite && sprite.symbol === 'SCATTER') {
          scatters.push({
            sprite,
            cx: this.cellX(c) + CELL_SIZE / 2,
            cy: this.cellY(r) + CELL_SIZE / 2,
          });
        }
      }
    }
    if (scatters.length === 0) return;

    // Apply glow filter + bursts.
    this.particles.root.position.set(this.cellsLayer.x, this.cellsLayer.y);
    for (const { sprite, cx, cy } of scatters) {
      sprite.filters = [this.scatterFilter];
      this.particles.burst(cx, cy, 0xff7a3a);
    }
    // Trigger a screen-wide flourish at the centroid for impact.
    const cx = scatters.reduce((s, p) => s + p.cx, 0) / scatters.length;
    const cy = scatters.reduce((s, p) => s + p.cy, 0) / scatters.length;
    this.particles.flourish(cx, cy, 0xff7a3a);

    // Pulse the scatter sprites three times.
    const pulses = scatters.map(({ sprite }) =>
      this.tween(sprite.scale, {
        x: 1.18, y: 1.18,
        duration: 0.30,
        yoyo: true,
        repeat: 3,
        ease: 'sine.inOut',
      }),
    );
    void this.shake(8, 0.45);
    await Promise.all(pulses);

    // Hold the glow a beat longer, then clear.
    await wait(this.fastForwardRequested ? 0 : 250);
    for (const { sprite } of scatters) sprite.filters = [];
  }

  /** Quick screen shake for big wins. */
  shake(intensity = 8, duration = 0.35): Promise<void> {
    return new Promise((resolve) => {
      const root = this.app.stage;
      const start = { x: root.x, y: root.y };
      const tl = gsap.timeline({
        onComplete: () => { root.position.set(start.x, start.y); this.active.delete(tl); resolve(); },
      });
      this.active.add(tl);
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const dx = (Math.random() - 0.5) * intensity * (1 - i / steps);
        const dy = (Math.random() - 0.5) * intensity * (1 - i / steps);
        tl.to(root, { x: start.x + dx, y: start.y + dy, duration: duration / steps });
      }
      tl.to(root, { x: start.x, y: start.y, duration: duration / steps });
    });
  }

  /** Wraps gsap.to so we can fast-forward in-flight tweens. */
  private tween(target: gsap.TweenTarget, vars: gsap.TweenVars): Promise<void> {
    return new Promise<void>((resolve) => {
      const tw = gsap.to(target, {
        ...vars,
        onComplete: () => {
          this.active.delete(tw);
          vars.onComplete?.();
          resolve();
        },
      });
      this.active.add(tw);
    });
  }

  private async animateInitialDrop(grid: Grid, wilds: WildMultGrid): Promise<void> {
    if (this.sprites.length !== COLS) this.showGrid(grid, wilds);
    const tweens: Promise<unknown>[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c][r];
        sprite.setSymbol(grid[c][r], wilds[c][r] || 0);
        sprite.setHighlighted(false);
        sprite.filters = [];
        const targetY = this.cellY(r);
        sprite.position.set(this.cellX(c), targetY - (ROWS + r + 2) * (CELL_SIZE + CELL_GAP));
        sprite.alpha = 1;
        sprite.scale.set(1);
        tweens.push(this.tween(sprite, {
          y: targetY,
          duration: 0.55,
          ease: 'back.out(1.4)',
          delay: c * 0.05 + r * 0.02,
          onComplete: () => {
            // After the initial drop, kick a pulse on every freshly-landed
            // wild so its golden ×N badge announces itself before any
            // potential cluster forms around it.
            if (sprite.symbol === 'WILD' && sprite.wildMultiplier > 0) {
              sprite.pulseWildOverlay();
            }
          },
        }));
      }
    }
    await Promise.all(tweens);
  }

  private async animateStep(step: TumbleStep): Promise<void> {
    if (step.clusters.length === 0) return;

    const winning = new Set<string>();
    for (const cl of step.clusters) {
      for (const [c, r] of cl.cells) winning.add(`${c},${r}`);
    }

    // Apply highlight + glow filter to winning sprites. Any wild that lands
    // inside a winning cluster gets its overlay pulsed so the player sees
    // the multiplier value flare just before the cluster collapses.
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c][r];
        const hit = winning.has(`${c},${r}`);
        sprite.setHighlighted(hit);
        sprite.filters = hit ? [this.winFilter] : [];
        if (hit && sprite.symbol === 'WILD' && sprite.wildMultiplier > 0) {
          sprite.pulseWildOverlay();
        }
      }
    }

    this.callbacks.onStepWin?.(step.stepWin, step.multiplier);

    // Big-win nudge: shake + screen-wide flourish for big payouts.
    if (step.stepWin > 0 && step.stepWin >= 25 * (step.multiplier || 1)) {
      void this.shake(6 + Math.min(10, Math.log10(step.stepWin)), 0.35);
      // Centroid of winning cells, in cellsLayer-local coords.
      let cx = 0, cy = 0, n = 0;
      for (const k of winning) {
        const [c, r] = k.split(',').map(Number);
        cx += this.cellX(c) + CELL_SIZE / 2;
        cy += this.cellY(r) + CELL_SIZE / 2;
        n++;
      }
      if (n > 0) {
        this.particles.root.position.set(this.cellsLayer.x, this.cellsLayer.y);
        this.particles.flourish(cx / n, cy / n);
      }
    }

    // Pulse winning sprites (slight scale up/down).
    const pulses: Promise<unknown>[] = [];
    for (const k of winning) {
      const [c, r] = k.split(',').map(Number);
      const sprite = this.sprites[c][r];
      pulses.push(this.tween(sprite.scale, {
        x: 1.10, y: 1.10, duration: 0.20, yoyo: true, repeat: 1, ease: 'sine.inOut',
      }));
    }
    await Promise.all(pulses);
    if (this.fastForwardRequested) {
      this.applyStepInstantTail(step, winning);
      return;
    }

    // Burst particles + pop sprites.
    const pops: Promise<unknown>[] = [];
    for (const k of winning) {
      const [c, r] = k.split(',').map(Number);
      const sprite = this.sprites[c][r];
      const px = sprite.x + CELL_SIZE / 2;
      const py = sprite.y + CELL_SIZE / 2;
      const pal = paletteFor(sprite.symbol);
      this.particles.root.position.set(this.cellsLayer.x, this.cellsLayer.y);
      this.particles.burst(px, py, pal.accent);
      pops.push(this.tween(sprite, { alpha: 0, duration: 0.22 }));
      pops.push(this.tween(sprite.scale, { x: 0.55, y: 0.55, duration: 0.22, ease: 'power2.in' }));
    }
    await Promise.all(pops);

    if (this.fastForwardRequested) {
      this.applyStepInstantTail(step, winning);
      return;
    }
    await this.applyTumble(step.gridAfter, step.wildsAfter, winning);

    // Clear filters/highlights for next step.
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c][r];
        sprite.setHighlighted(false);
        sprite.filters = [];
      }
    }
  }

  private async applyTumble(
    nextGrid: Grid,
    nextWilds: WildMultGrid,
    removed: Set<string>,
  ): Promise<void> {
    const tweens: Promise<unknown>[] = [];
    const newWildSprites: SymbolSprite[] = [];
    for (let c = 0; c < COLS; c++) {
      const survivorSprites: SymbolSprite[] = [];
      const newSprites: SymbolSprite[] = [];
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c][r];
        if (removed.has(`${c},${r}`)) newSprites.push(sprite);
        else survivorSprites.push(sprite);
      }

      const newColumn: SymbolSprite[] = [];
      const newCount = ROWS - survivorSprites.length;
      for (let r = 0; r < newCount; r++) {
        const sprite = newSprites[r];
        sprite.setSymbol(nextGrid[c][r], nextWilds[c][r] || 0);
        // Recycled winning sprites must shed their highlight before re-use,
        // otherwise the halo flashes on a fresh drop-in.
        sprite.setHighlighted(false);
        sprite.alpha = 1;
        sprite.scale.set(1);
        sprite.filters = [];
        sprite.position.set(this.cellX(c), -CELL_SIZE - (newCount - r + 1) * (CELL_SIZE + CELL_GAP));
        newColumn.push(sprite);
        if (sprite.symbol === 'WILD' && sprite.wildMultiplier > 0) {
          newWildSprites.push(sprite);
        }
      }
      for (let r = newCount; r < ROWS; r++) {
        const sprite = survivorSprites[r - newCount];
        sprite.setSymbol(nextGrid[c][r], nextWilds[c][r] || 0);
        newColumn.push(sprite);
      }

      this.sprites[c] = newColumn;

      for (let r = 0; r < ROWS; r++) {
        const sprite = newColumn[r];
        const targetY = this.cellY(r);
        tweens.push(this.tween(sprite, {
          y: targetY,
          duration: 0.46,
          ease: 'bounce.out',
          delay: r * 0.025,
        }));
      }
    }
    await Promise.all(tweens);
    for (const w of newWildSprites) w.pulseWildOverlay();
  }

  /** Snap the grid to a state with no animation. Used during fast-forward. */
  private applyGridInstant(grid: Grid, wilds?: WildMultGrid): void {
    if (this.sprites.length !== COLS) this.showGrid(grid, wilds);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = this.sprites[c][r];
        sprite.setSymbol(grid[c][r], wilds?.[c]?.[r] ?? 0);
        sprite.setHighlighted(false);
        sprite.filters = [];
        sprite.alpha = 1;
        sprite.scale.set(1);
        sprite.position.set(this.cellX(c), this.cellY(r));
      }
    }
  }

  /** Resolve a step's tail-half (pop + tumble) instantly. */
  private applyStepInstantTail(step: TumbleStep, _winning: Set<string>): void {
    this.applyGridInstant(step.gridAfter, step.wildsAfter);
  }

  /** Resolve a step in full instantly: emit win, snap to gridAfter. */
  private applyStepInstant(step: TumbleStep): void {
    if (step.clusters.length === 0) return;
    this.callbacks.onStepWin?.(step.stepWin, step.multiplier);
    this.applyGridInstant(step.gridAfter, step.wildsAfter);
  }

  private cellX(c: number): number { return c * (CELL_SIZE + CELL_GAP); }
  private cellY(r: number): number { return r * (CELL_SIZE + CELL_GAP); }

  private layoutFrame(): void {
    const pad = 22;
    const W = GRID_W + pad * 2;
    const H = GRID_H + pad * 2;
    const x = -pad;
    const y = -pad;

    // Outer wood plaque
    this.framePlaque.clear();
    this.framePlaque
      .roundRect(x - 12, y - 12, W + 24, H + 24, 28)
      .fill({ color: 0x2a1f12 })
      .stroke({ color: 0x14110d, width: 2 });
    for (let i = 0; i < 18; i++) {
      const ly = y - 10 + i * (H / 16);
      this.framePlaque.rect(x - 10, ly, W + 20, 1).fill({ color: 0x000000, alpha: 0.10 });
    }
    this.framePlaque
      .roundRect(x, y, W, H, 22)
      .fill({ color: 0x070906 })
      .stroke({ color: 0x000, width: 2 });

    // Brass rim with rivet circles in corners
    this.frameBrass.clear();
    this.frameBrass
      .roundRect(x - 4, y - 4, W + 8, H + 8, 24)
      .stroke({ color: 0xd4a548, width: 3, alpha: 1 })
      .roundRect(x - 4, y - 4, W + 8, H + 8, 24)
      .stroke({ color: 0xffd97a, width: 1, alpha: 0.6 });
    const rivetPositions: Array<[number, number]> = [
      [x + 14, y + 14], [x + W - 14, y + 14],
      [x + 14, y + H - 14], [x + W - 14, y + H - 14],
      [x + W / 2, y + 6], [x + W / 2, y + H - 6],
      [x + 6, y + H / 2], [x + W - 6, y + H / 2],
    ];
    for (const [rx, ry] of rivetPositions) {
      this.frameBrass.circle(rx, ry, 4).fill({ color: 0xd4a548 }).stroke({ color: 0x6a4818, width: 0.8 });
      this.frameBrass.circle(rx - 1, ry - 1, 1.4).fill({ color: 0xffe066, alpha: 0.7 });
    }

    // Inner shadow / vignette ring against the recessed area
    this.innerShadow.clear();
    for (let i = 0; i < 6; i++) {
      this.innerShadow
        .roundRect(x + 2 + i, y + 2 + i, W - 4 - i * 2, H - 4 - i * 2, 22 - i)
        .stroke({ color: 0x000000, width: 1, alpha: 0.18 - i * 0.025 });
    }

    // Subtle gridlines between cells. Drawn over the playfield, behind sprites.
    this.gridLines.clear();
    const lineColor = 0xa6803a;
    for (let c = 1; c < COLS; c++) {
      const lx = c * CELL_SIZE + (c - 0.5) * CELL_GAP;
      this.gridLines
        .moveTo(lx, -2)
        .lineTo(lx, GRID_H + 2)
        .stroke({ color: lineColor, width: 1, alpha: 0.18 });
    }
    for (let r = 1; r < ROWS; r++) {
      const ly = r * CELL_SIZE + (r - 0.5) * CELL_GAP;
      this.gridLines
        .moveTo(-2, ly)
        .lineTo(GRID_W + 2, ly)
        .stroke({ color: lineColor, width: 1, alpha: 0.14 });
    }
  }

  private layoutRoot(screenW: number, screenH: number): void {
    if (screenW <= 0 || screenH <= 0) return;

    const FRAME_OUTSET = 36;
    // Side margins reserve room for the BB button + FS info panel on desktop.
    // On narrow viewports those panels reposition into corner badges instead
    // (see *.component.ts media queries), so we shrink the reserve so the
    // grid can use the full available width.
    const marginX =
      screenW < 480 ? 10 :
      screenW < 700 ? 36 :
      screenW < 900 ? 130 :
                      220;
    const marginTop = screenH < 600 ? 8 : 16;
    const marginBottom = screenH < 600 ? 70 : 120;
    const availW = Math.max(120, screenW - marginX * 2);
    const availH = Math.max(120, screenH - marginTop - marginBottom);
    const wrapperW = GRID_W + FRAME_OUTSET * 2;
    const wrapperH = GRID_H + FRAME_OUTSET * 2;

    const fitScale = Math.min(availW / wrapperW, availH / wrapperH);
    const scale = Math.max(0.45, Math.min(2.2, fitScale));

    this.root.scale.set(scale);
    const scaledW = GRID_W * scale;
    const scaledH = GRID_H * scale;
    this.root.position.set(
      Math.round((screenW - scaledW) / 2),
      Math.round(marginTop + (availH - scaledH) / 2),
    );
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
