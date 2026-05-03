import gsap from 'gsap';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { COLS, PAYLINES, ROWS } from '../core/math/paylines';
import type { Grid, LineWin, NewlyExpandedWild, PersistentWild, SpinResult } from '../core/math/types';
import { pickSymbol, type SymbolId } from '../core/math/symbols';
import { MathRng } from '../../../shared/math/rng';
import { CELL_GAP, CELL_SIZE, ExpandedYetiSprite, YetiSymbolSprite } from './symbol-sprite';

const GRID_W = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
const GRID_H = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP;
/** Number of throwaway symbols streamed past the visible area during a spin. */
const REEL_FILLER = 12;

export interface GridCallbacks {
  onLineWin?: (win: LineWin) => void;
}

/**
 * Per-column structure: a clipped viewport (the visible 1×5 reel area) with
 * a strip container inside that holds a tall vertical run of sprites and
 * slides downward during the spin animation.
 */
interface ReelColumn {
  viewport: Container;
  mask: Graphics;
  strip: Container;          // moves vertically; holds the spinning sprites
  cellSprites: YetiSymbolSprite[]; // 5 sprites (rows) — rebuilt after each spin
  expandedSprite: ExpandedYetiSprite | null; // present when this column is wild-expanded
}

export class YetiGridRenderer {
  private readonly root: Container;
  private readonly framePlaque: Graphics;
  private readonly gridLines: Graphics;
  private readonly cellsLayer: Container;
  private readonly winLayer: Graphics;
  private readonly persistentBg: Graphics;
  private readonly badgesLayer: Container;
  private columns: ReelColumn[] = [];
  private callbacks: GridCallbacks = {};
  private readonly winFilter: GlowFilter;
  private readonly wildLandFilter: GlowFilter;
  private readonly scatterFilter: GlowFilter;
  /** Flipped by the host when the player clicks to skip the per-line reveal.
   *  The win-highlight loop checks it between iterations and bails out
   *  cleanly (clears any in-flight visuals and resolves). */
  private skipHighlights = false;

  constructor(private readonly app: Application) {
    this.root = new Container();
    this.framePlaque = new Graphics();
    this.gridLines = new Graphics();
    this.persistentBg = new Graphics();
    this.cellsLayer = new Container();
    this.winLayer = new Graphics();
    this.badgesLayer = new Container();

    this.root.addChild(
      this.framePlaque,
      this.persistentBg,
      this.gridLines,
      this.cellsLayer,
      this.winLayer,
      this.badgesLayer,
    );
    app.stage.addChild(this.root);

    // Build column viewports up front; each one is a Container with its own
    // rectangular mask. The mask sits at column-local (0,0)..(CELL_SIZE,GRID_H)
    // so the strip can scroll past it without leaking outside the cell area.
    for (let c = 0; c < COLS; c++) {
      const viewport = new Container();
      viewport.position.set(this.cellX(c), 0);
      const mask = new Graphics();
      mask.rect(0, 0, CELL_SIZE, GRID_H).fill(0xffffff);
      const strip = new Container();
      viewport.addChild(mask, strip);
      viewport.mask = mask;
      this.cellsLayer.addChild(viewport);
      this.columns.push({ viewport, mask, strip, cellSprites: [], expandedSprite: null });
    }

    this.winFilter = new GlowFilter({
      distance: 16,
      outerStrength: 3,
      innerStrength: 0,
      color: 0xffd97a,
      quality: 0.4,
    });
    this.wildLandFilter = new GlowFilter({
      distance: 22,
      outerStrength: 3.5,
      innerStrength: 0.6,
      color: 0x9ad6e8,
      quality: 0.5,
    });
    // Distinct ruby-orange glow for the scatter celebration so the player
    // can tell at a glance that "this is the bonus trigger" before the
    // cinematic intro plays.
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

  relayout(w: number, h: number): void { this.layoutRoot(w, h); }
  setCallbacks(cb: GridCallbacks): void { this.callbacks = cb; }

  /** Currently mid-spin? Used by the host to know whether a click should skip. */
  get isHighlightingWins(): boolean { return this._highlighting; }
  private _highlighting = false;

  /** Short-circuit the per-line win reveal. Safe to call any time. */
  skipWinHighlights(): void { this.skipHighlights = true; }

  /** Bounding box of the visible grid (CSS px) — passed up to the host so
   *  HTML side-panels can anchor themselves to the grid edges. */
  getGridRect(): { left: number; right: number; top: number; bottom: number } {
    const scale = this.root.scale.x;
    const FRAME_OUTSET = 38;
    const left = this.root.position.x - FRAME_OUTSET * scale;
    const top  = this.root.position.y - FRAME_OUTSET * scale;
    const right  = this.root.position.x + (GRID_W + FRAME_OUTSET) * scale;
    const bottom = this.root.position.y + (GRID_H + FRAME_OUTSET) * scale;
    return { left, right, top, bottom };
  }

  /** Snap-render the grid (no animation), used for the initial idle state. */
  showGrid(grid: Grid): void {
    for (const col of this.columns) {
      col.strip.removeChildren();
      col.cellSprites = [];
      col.expandedSprite = null;
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sprite = new YetiSymbolSprite(grid[c][r]);
        sprite.position.set(0, this.cellY(r));
        this.columns[c].strip.addChild(sprite);
        this.columns[c].cellSprites.push(sprite);
      }
    }
  }

  /**
   * Play a full spin: reel scroll → snap to final → wild-landing pulse →
   * expand any newly-triggered wilds → highlight payline wins.
   */
  async playSpin(result: SpinResult): Promise<void> {
    this.clearWinHighlights();

    // Persistent-wild columns from the carry-in are *visually* already expanded
    // (rendered before this spin). They must skip the reel-spin animation:
    // the sprite stays in place while the other columns spin past it.
    const carryInWildCols = new Set(result.persistentWilds.map((p) => p.col));

    // Wipe stale multiplier badges left over from a previous round. The
    // carry-in loop below re-adds badges for columns that survived into this
    // spin; newly-expanded columns add their own later. Without this, badges
    // from the prior FS round linger above the grid after the round ends.
    this.clearAllBadges();
    // Reset stale expansions on columns that are NOT carry-ins. The reel-spin
    // tear-down inside animateReelSpin handles the strip side, but the
    // expandedSprite reference and persistent background need an explicit
    // wipe here so a finished FS round doesn't leak its glow into the next
    // base spin.
    for (let c = 0; c < COLS; c++) {
      if (!carryInWildCols.has(c)) this.removeExpansion(c);
    }
    this.persistentBg.clear();

    await this.animateReelSpin(result.initialGrid, carryInWildCols);

    // After spin, we have all 5 columns rebuilt with fresh cell sprites.
    // Restore expanded-yeti sprites for any persistent reels (they got blown
    // away during animateReelSpin's strip rebuild).
    for (const pw of result.persistentWilds) {
      this.applyExpansion(pw.col, pw.multiplier, /*animate*/ false);
    }
    this.renderPersistentBackgrounds(result.persistentWilds);

    // Wild-landed pulse on every YETI cell that landed this spin in a NON-
    // expanded column. Even if it doesn't trigger expansion (no winning line
    // through it), we briefly highlight it so the player sees the symbol and
    // doesn't think the game missed an event.
    await this.animateWildLandings(result.initialGrid, new Set([
      ...carryInWildCols,
      ...result.newlyExpanded.map((n) => n.col),
    ]));

    // Expand newly-triggered wilds: replaces the column's 5 cell sprites with
    // one big yeti graphic, fades it in with a small pop, adds badge.
    for (const ne of result.newlyExpanded) {
      await this.expandWild(ne);
    }

    if (result.lineWins.length > 0) {
      await this.highlightWins(result.lineWins);
    }
    await wait(180);
  }

  /**
   * Highlight every SUMMIT (scatter) tile currently on the board with a
   * ruby-orange glow, scale-pulse them three times, then hold the glow a
   * beat before clearing. Called by the host the moment scatters trigger
   * free spins so the player sees the bonus condition land on the board
   * before any cinematic intro takes over the screen.
   *
   * Skips columns that are currently expanded (the tall yeti covers any
   * cell sprite underneath, so there's nothing to filter there).
   */
  async glowScatters(): Promise<void> {
    const targets: { sprite: YetiSymbolSprite; cx: number; cy: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      const col = this.columns[c];
      if (col.expandedSprite) continue;
      for (let r = 0; r < ROWS; r++) {
        const sprite = col.cellSprites[r];
        if (!sprite) continue;
        if (sprite.symbol !== 'SUMMIT') continue;
        targets.push({
          sprite,
          cx: this.cellX(c) + CELL_SIZE / 2,
          cy: this.cellY(r) + CELL_SIZE / 2,
        });
      }
    }
    if (targets.length === 0) return;

    for (const { sprite } of targets) sprite.filters = [this.scatterFilter];

    const pulses = targets.map(({ sprite }) =>
      this.tween(sprite.scale, {
        x: 1.22, y: 1.22,
        duration: 0.30,
        yoyo: true,
        repeat: 3,
        ease: 'sine.inOut',
      }),
    );
    await Promise.all(pulses);
    await wait(280);
    for (const { sprite } of targets) sprite.filters = [];
  }

  /** Render the dimmed background highlight that marks a persistent wild reel. */
  renderPersistentReels(persistent: ReadonlyArray<PersistentWild>): void {
    this.clearAllBadges();
    for (let c = 0; c < COLS; c++) {
      if (!persistent.some((p) => p.col === c)) {
        this.removeExpansion(c);
        // Persistent columns have empty cellSprites (the tall yeti covered
        // them). When we tear down that expansion mid-round (e.g., the FS
        // round just ended) the strip would otherwise read as a blank
        // column until the next reel-spin animation runs. Drop a fresh set
        // of preview symbols in so the grid never shows empty reels.
        this.fillEmptyColumn(c);
      }
    }
    for (const pw of persistent) {
      this.applyExpansion(pw.col, pw.multiplier, /*animate*/ false);
    }
    this.renderPersistentBackgrounds(persistent);
  }

  /**
   * Repopulate a column whose strip is empty (no cellSprites, no expansion)
   * with random preview symbols. Used after tearing down a persistent wild
   * reel outside the spin animation flow.
   */
  private fillEmptyColumn(c: number): void {
    const col = this.columns[c];
    if (col.expandedSprite) return;
    if (col.cellSprites.length > 0) return;
    const rng = new MathRng();
    col.strip.removeChildren();
    col.strip.position.y = 0;
    for (let r = 0; r < ROWS; r++) {
      const sprite = new YetiSymbolSprite(pickSymbol(rng));
      sprite.position.set(0, this.cellY(r));
      col.strip.addChild(sprite);
      col.cellSprites.push(sprite);
    }
  }

  private renderPersistentBackgrounds(persistent: ReadonlyArray<PersistentWild>): void {
    this.persistentBg.clear();
    for (const pw of persistent) {
      const x = this.cellX(pw.col) - 6;
      this.persistentBg
        .roundRect(x, -8, CELL_SIZE + 12, GRID_H + 16, 14)
        .fill({ color: 0x9ad6e8, alpha: 0.10 })
        .roundRect(x, -8, CELL_SIZE + 12, GRID_H + 16, 14)
        .stroke({ color: 0x9ad6e8, width: 2, alpha: 0.6 });
    }
  }

  /* --------------------------- Animations --------------------------- */

  /**
   * Slot-reel scroll for each column.
   *
   * Strip layout (top → bottom):
   *   final[0..4] (final symbols destined for visible rows 0..4)
   *   throwaway[0..N-1] (random spinning symbols below)
   *
   * Container starts at y = -filler*h (so the throwaway sprites are visible
   * in the cell area at the start) and slides down to y = 0 (where the
   * finals occupy rows 0..4). Each column has a slight delay so they stop in
   * left-to-right sequence.
   */
  private async animateReelSpin(grid: Grid, skipColumns: Set<number>): Promise<void> {
    const rng = new MathRng();
    const tweens: Promise<unknown>[] = [];
    const cellH = CELL_SIZE + CELL_GAP;

    for (let c = 0; c < COLS; c++) {
      const col = this.columns[c];

      if (skipColumns.has(c)) {
        // Persistent wild column — don't spin. Keep its expanded graphic;
        // the cell sprites (if any) are already replaced.
        // Reset cellSprites array so downstream code doesn't reference stale
        // sprites destroyed by previous spins.
        col.cellSprites = [];
        continue;
      }

      // Tear down anything the previous spin/expansion left behind.
      col.strip.removeChildren();
      col.cellSprites = [];
      col.expandedSprite = null;

      // Build the strip: 5 finals on top, then `REEL_FILLER` throwaway sprites.
      const finalSprites: YetiSymbolSprite[] = [];
      for (let r = 0; r < ROWS; r++) {
        const sprite = new YetiSymbolSprite(grid[c][r]);
        sprite.position.set(0, r * cellH);
        col.strip.addChild(sprite);
        finalSprites.push(sprite);
      }
      for (let i = 0; i < REEL_FILLER; i++) {
        const sym = pickSymbol(rng);
        const sprite = new YetiSymbolSprite(sym);
        sprite.position.set(0, (ROWS + i) * cellH);
        col.strip.addChild(sprite);
      }

      // Strip starts above the visible area: shift by -REEL_FILLER cells.
      // As it slides down to y=0, throwaways stream into view from above
      // and the finals settle into rows 0..4 at the end.
      const startY = -REEL_FILLER * cellH;
      col.strip.position.y = startY;

      const duration = 0.55 + c * 0.10;
      const t = gsap.to(col.strip.position, {
        y: 0,
        duration,
        ease: 'power3.out',
        onComplete: () => {
          // Remove throwaway sprites — only the 5 final sprites remain.
          while (col.strip.children.length > ROWS) {
            const last = col.strip.children[col.strip.children.length - 1];
            col.strip.removeChild(last);
            last.destroy();
          }
          col.cellSprites = finalSprites;
        },
      });
      tweens.push(t.then());
    }

    await Promise.all(tweens);
  }

  /**
   * Brief glow-pulse on every YETI cell that landed this spin (excluding
   * persistent and newly-expanded columns, whose own animations cover them).
   */
  private async animateWildLandings(grid: Grid, expandedCols: Set<number>): Promise<void> {
    const pulses: Promise<unknown>[] = [];
    for (let c = 0; c < COLS; c++) {
      if (expandedCols.has(c)) continue;
      const col = this.columns[c];
      for (let r = 0; r < ROWS; r++) {
        if (grid[c][r] !== 'YETI') continue;
        const sprite = col.cellSprites[r];
        if (!sprite) continue;
        sprite.filters = [this.wildLandFilter];
        pulses.push(this.tween(sprite.scale, {
          x: 1.20, y: 1.20, duration: 0.20, yoyo: true, repeat: 1, ease: 'sine.inOut',
          onComplete: () => { sprite.filters = []; },
        }));
      }
    }
    await Promise.all(pulses);
  }

  /** Expand a freshly-landed wild — pulse the cell, fade in the tall yeti. */
  private async expandWild(ne: NewlyExpandedWild): Promise<void> {
    const col = this.columns[ne.col];
    const triggerSprite = col.cellSprites[ne.triggerCell[1]];
    if (triggerSprite) {
      triggerSprite.filters = [this.wildLandFilter];
      await this.tween(triggerSprite.scale, {
        x: 1.30, y: 1.30, duration: 0.22, yoyo: true, repeat: 1, ease: 'sine.inOut',
      });
      triggerSprite.filters = [];
    }

    this.applyExpansion(ne.col, ne.multiplier, /*animate*/ true);
    // Add the persistent background so the column is visually distinct.
    const x = this.cellX(ne.col) - 6;
    this.persistentBg
      .roundRect(x, -8, CELL_SIZE + 12, GRID_H + 16, 14)
      .fill({ color: 0xffd97a, alpha: 0.10 })
      .roundRect(x, -8, CELL_SIZE + 12, GRID_H + 16, 14)
      .stroke({ color: 0xffd97a, width: 2, alpha: 0.7 });
  }

  /**
   * Replace the 5 cell sprites in a column with one tall ExpandedYetiSprite
   * + multiplier badge above the column. If `animate`, fades+scales the new
   * sprite in for a quick reveal; otherwise snaps it in place.
   */
  private applyExpansion(col: number, multiplier: number, animate: boolean): void {
    const reel = this.columns[col];
    // Remove cell sprites
    for (const s of reel.cellSprites) {
      reel.strip.removeChild(s);
      s.destroy();
    }
    reel.cellSprites = [];
    // Remove any existing expanded sprite (if upgrading multiplier).
    if (reel.expandedSprite) {
      reel.strip.removeChild(reel.expandedSprite);
      reel.expandedSprite.destroy({ children: true });
      reel.expandedSprite = null;
    }
    // Insert the new tall yeti
    const sprite = new ExpandedYetiSprite(CELL_SIZE, GRID_H);
    sprite.position.set(0, 0);
    reel.strip.addChild(sprite);
    reel.expandedSprite = sprite;

    if (animate) {
      // Alpha-only fade so the sprite is at its final size from the very
      // first frame. A subtle scale yoyo-pop adds weight without ever
      // showing a shrunk state. Earlier we started at scale 0.8 with an
      // offset position to fake center-pivot growth; that left the sprite
      // visibly shrunken when GSAP didn't progress to the final tween value
      // before the next frame paint.
      sprite.alpha = 0;
      gsap.to(sprite, { alpha: 1, duration: 0.28, ease: 'power2.out' });
      sprite.scale.set(1.08, 1.08);
      gsap.to(sprite.scale, {
        x: 1, y: 1, duration: 0.30, ease: 'sine.inOut',
      });
    }

    this.addOrUpdateBadge(col, multiplier);
  }

  private removeExpansion(col: number): void {
    const reel = this.columns[col];
    if (reel.expandedSprite) {
      reel.strip.removeChild(reel.expandedSprite);
      reel.expandedSprite.destroy({ children: true });
      reel.expandedSprite = null;
    }
    // Cell sprites are rebuilt by the next spin animation; no need to recreate here.
  }

  private clearAllBadges(): void {
    for (let i = this.badgesLayer.children.length - 1; i >= 0; i--) {
      const child = this.badgesLayer.children[i];
      this.badgesLayer.removeChildAt(i);
      child.destroy({ children: true });
    }
  }

  private addOrUpdateBadge(col: number, multiplier: number): void {
    // Remove old badge for this column
    for (let i = this.badgesLayer.children.length - 1; i >= 0; i--) {
      const child = this.badgesLayer.children[i];
      if ((child as Container & { __col?: number }).__col === col) {
        this.badgesLayer.removeChildAt(i);
        child.destroy({ children: true });
      }
    }
    const badge = new Container() as Container & { __col?: number };
    badge.__col = col;
    const bg = new Graphics();
    bg.roundRect(-32, -16, 64, 28, 10)
      .fill({ color: 0x14202c })
      .stroke({ color: 0xffd97a, width: 2 });
    badge.addChild(bg);
    const text = new Text({
      text: `×${multiplier}`,
      style: {
        fontFamily: 'Cinzel, Times New Roman, serif',
        fontSize: 18,
        fontWeight: '900',
        fill: multiplier >= 100 ? 0xff7a3a : 0xffd97a,
      },
    });
    text.anchor.set(0.5);
    text.position.set(0, -2);
    badge.addChild(text);
    badge.position.set(this.cellX(col) + CELL_SIZE / 2, -28);
    this.badgesLayer.addChild(badge);
  }

  private async highlightWins(wins: ReadonlyArray<LineWin>): Promise<void> {
    this.skipHighlights = false;
    this._highlighting = true;
    try {
      for (const w of wins) {
        if (this.skipHighlights) break;
        this.callbacks.onLineWin?.(w);
        // Glow each cell on the line. Skip cells in expanded columns since the
        // tall yeti doesn't have a per-cell sprite to filter — instead glow the
        // expanded sprite itself.
        const reels = this.columns;
        const filtered: Array<{ filtersTarget: Container; prev: ReturnType<typeof unfilterSnapshot> }> = [];
        for (const [c, r] of w.cells) {
          const reel = reels[c];
          let target: Container | null = null;
          if (reel.expandedSprite) target = reel.expandedSprite;
          else target = reel.cellSprites[r] ?? null;
          if (!target) continue;
          filtered.push({ filtersTarget: target, prev: unfilterSnapshot(target) });
          target.filters = [this.winFilter];
          this.tween(target.scale, {
            x: 1.10, y: 1.10, duration: 0.22, yoyo: true, repeat: 1, ease: 'sine.inOut',
          });
        }
        // Draw the polyline through the run.
        this.winLayer.clear();
        const line = PAYLINES[w.lineIndex];
        const cx0 = this.cellX(0) + CELL_SIZE / 2;
        const cy0 = this.cellY(line[0]) + CELL_SIZE / 2;
        this.winLayer.moveTo(cx0, cy0);
        for (let c = 1; c < w.count; c++) {
          const cx = this.cellX(c) + CELL_SIZE / 2;
          const cy = this.cellY(line[c]) + CELL_SIZE / 2;
          this.winLayer.lineTo(cx, cy);
        }
        this.winLayer.stroke({ color: 0xffd97a, width: 4, alpha: 0.85 });

        // Per-line payout label — sits above the cell that ends the run so it
        // doesn't compete with the line stroke. Includes the multiplier
        // suffix when an expanded wild boosted the line.
        const labelCx = this.cellX(w.count - 1) + CELL_SIZE / 2;
        const labelCy = this.cellY(line[w.count - 1]) + CELL_SIZE * 0.10;
        const multTag = w.multiplierApplied > 1 ? ` ×${w.multiplierApplied}` : '';
        const payoutText = new Text({
          text: `+${formatPayout(w.payout)} PLN${multTag}`,
          style: {
            fontFamily: 'Cinzel, Times New Roman, serif',
            fontSize: 22,
            fontWeight: '900',
            fill: 0xffd97a,
            stroke: { color: 0x14202c, width: 4 },
            align: 'center',
          },
        });
        payoutText.anchor.set(0.5);
        payoutText.position.set(labelCx, labelCy);
        this.root.addChild(payoutText);

        await wait(this.skipHighlights ? 0 : 520);

        this.root.removeChild(payoutText);
        payoutText.destroy();
        for (const f of filtered) restoreFilters(f.filtersTarget, f.prev);
      }
    } finally {
      this.winLayer.clear();
      this._highlighting = false;
      this.skipHighlights = false;
    }
  }

  private clearWinHighlights(): void {
    this.winLayer.clear();
    for (const reel of this.columns) {
      if (reel.expandedSprite) reel.expandedSprite.filters = [];
      for (const s of reel.cellSprites) if (s) s.filters = [];
    }
  }

  private tween(target: gsap.TweenTarget, vars: gsap.TweenVars): Promise<void> {
    return new Promise<void>((resolve) => {
      gsap.to(target, { ...vars, onComplete: () => { vars.onComplete?.(); resolve(); } });
    });
  }

  /* --------------------------- Layout --------------------------- */

  private cellX(c: number): number { return c * (CELL_SIZE + CELL_GAP); }
  private cellY(r: number): number { return r * (CELL_SIZE + CELL_GAP); }

  private layoutFrame(): void {
    const pad = 22;
    const W = GRID_W + pad * 2;
    const H = GRID_H + pad * 2;
    const x = -pad, y = -pad;
    this.framePlaque.clear();
    this.framePlaque
      .roundRect(x - 12, y - 12, W + 24, H + 24, 26)
      .fill({ color: 0x14202c })
      .stroke({ color: 0x0a1218, width: 2 });
    this.framePlaque
      .roundRect(x, y, W, H, 20)
      .fill({ color: 0x05080c })
      .stroke({ color: 0x000000, width: 2 });
    this.framePlaque
      .roundRect(x - 4, y - 4, W + 8, H + 8, 22)
      .stroke({ color: 0x9ad6e8, width: 2.5, alpha: 0.9 });

    this.gridLines.clear();
    for (let c = 1; c < COLS; c++) {
      const lx = c * CELL_SIZE + (c - 0.5) * CELL_GAP;
      this.gridLines
        .moveTo(lx, -2).lineTo(lx, GRID_H + 2)
        .stroke({ color: 0x9ad6e8, width: 1, alpha: 0.20 });
    }
    for (let r = 1; r < ROWS; r++) {
      const ly = r * CELL_SIZE + (r - 0.5) * CELL_GAP;
      this.gridLines
        .moveTo(-2, ly).lineTo(GRID_W + 2, ly)
        .stroke({ color: 0x9ad6e8, width: 1, alpha: 0.16 });
    }
  }

  private layoutRoot(screenW: number, screenH: number): void {
    if (screenW <= 0 || screenH <= 0) return;
    const FRAME_OUTSET = 38;
    // Reserve room on all four sides for the HTML side panels (Buy Hunt
    // pill on the left, FS info on the right, Total Hunt Win bar below).
    const marginX = screenW < 480 ? 10 : screenW < 700 ? 36 : screenW < 900 ? 140 : 220;
    const marginTop = screenH < 600 ? 8 : 16;
    const marginBottom = screenH < 600 ? 70 : 120;
    const availW = Math.max(120, screenW - marginX * 2);
    const availH = Math.max(120, screenH - marginTop - marginBottom);
    const wrapperW = GRID_W + FRAME_OUTSET * 2;
    const wrapperH = GRID_H + FRAME_OUTSET * 2;

    const fitScale = Math.min(availW / wrapperW, availH / wrapperH);
    const scale = Math.max(0.45, Math.min(1.4, fitScale));
    this.root.scale.set(scale);
    const scaledW = GRID_W * scale;
    const scaledH = GRID_H * scale;
    this.root.position.set(
      Math.round((screenW - scaledW) / 2),
      Math.round(marginTop + (availH - scaledH) / 2),
    );
  }
}

const PAYOUT_FMT = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function formatPayout(value: number): string { return PAYOUT_FMT.format(value); }

function unfilterSnapshot(c: Container): unknown[] {
  const f = c.filters;
  return Array.isArray(f) ? [...f] : f ? [f as object] : [];
}
function restoreFilters(c: Container, prev: unknown[]): void {
  c.filters = prev.length === 0 ? [] : (prev as []);
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
