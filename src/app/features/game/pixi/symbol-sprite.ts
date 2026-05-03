import { Container, Graphics, Text } from 'pixi.js';
import type { SymbolId } from '../../../core/math/symbols';
import { drawSymbol } from './symbol-art';

export const CELL_SIZE = 96;
export const CELL_GAP = 6;
export const ART_SIZE = 86;

/**
 * One cell of the grid: just the symbol art. Tiles no longer have a per-cell
 * rounded background; the playfield uses subtle row/column gridlines drawn
 * once by GridRenderer instead. Win highlights are achieved purely by the
 * GlowFilter + scale pulse on the sprite (see GridRenderer.animateStep).
 *
 * WILD cells additionally render a golden ×N badge overlay, where N is the
 * wild's multiplier. The overlay sits as a child container so the existing
 * scale-pulse on win still cleanly affects the badge alongside the art.
 */
export class SymbolSprite extends Container {
  private readonly art: Graphics;
  private _symbol: SymbolId;
  private _wildMultiplier = 0;
  private wildOverlay: Container | null = null;

  constructor(symbol: SymbolId, wildMultiplier = 0) {
    super();
    this._symbol = symbol;
    this._wildMultiplier = wildMultiplier;
    this.art = new Graphics();
    this.addChild(this.art);
    this.draw();
    if (this.isWild()) this.drawWildOverlay();
  }

  get symbol(): SymbolId { return this._symbol; }
  get wildMultiplier(): number { return this._wildMultiplier; }

  setSymbol(s: SymbolId, wildMultiplier = 0): void {
    if (s === this._symbol && wildMultiplier === this._wildMultiplier) return;
    this._symbol = s;
    this._wildMultiplier = wildMultiplier;
    this.draw();
    this.removeOverlay();
    if (this.isWild()) this.drawWildOverlay();
  }

  setHighlighted(_on: boolean): void { /* no-op */ }

  /**
   * Kick a brief 1.0 → 1.18 → 1.0 pulse on the wild overlay. Intended to draw
   * the eye to a freshly-landed (or winning) wild without disturbing the
   * sprite's own win-cluster scale animation. Caller doesn't need to await.
   */
  pulseWildOverlay(): void {
    const o = this.wildOverlay;
    if (!o) return;
    o.scale.set(1);
    const start = performance.now();
    const dur = 520;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      // Smooth in-out ease pulsing 1→1.18→1
      const v = 1 + 0.18 * Math.sin(t * Math.PI);
      o.scale.set(v);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private isWild(): boolean { return this._symbol === 'WILD' && this._wildMultiplier > 0; }

  private draw(): void {
    this.art.clear();
    this.art.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
    drawSymbol(this.art, this._symbol, ART_SIZE);
  }

  private removeOverlay(): void {
    if (this.wildOverlay) {
      this.removeChild(this.wildOverlay);
      this.wildOverlay.destroy({ children: true });
      this.wildOverlay = null;
    }
  }

  /**
   * Tinted golden wash + ×N badge. The wash uses an additive-feeling overlay
   * (gold at low alpha) that brightens the hunter art underneath without
   * obscuring it. The badge sits in the top-right corner, scaled to the
   * sprite size so it stays readable on small phone screens.
   */
  private drawWildOverlay(): void {
    const overlay = new Container();
    const wash = new Graphics();
    // Subtle gold halo behind the art so the hunter reads as gilded.
    const half = ART_SIZE / 2;
    wash.circle(CELL_SIZE / 2, CELL_SIZE / 2, half * 1.05)
      .fill({ color: 0xffd97a, alpha: 0.16 })
      .stroke({ color: 0xffd97a, width: 2.2, alpha: 0.85 });
    overlay.addChild(wash);

    // ×N badge in the upper-right corner.
    const label = new Text({
      text: `×${this._wildMultiplier}`,
      style: {
        fontFamily: 'Cinzel, Times New Roman, serif',
        fontSize: this._wildMultiplier >= 5 ? 22 : 20,
        fontWeight: '900',
        fill: 0xffd97a,
        stroke: { color: 0x1a1108, width: 4 },
      },
    });
    label.anchor.set(0.5);
    const badgeBg = new Graphics();
    const bx = CELL_SIZE - 18;
    const by = 18;
    const w = label.width + 14;
    const h = label.height + 6;
    badgeBg.roundRect(bx - w / 2, by - h / 2, w, h, 8)
      .fill({ color: 0x14202c })
      .stroke({ color: 0xffd97a, width: 2 });
    overlay.addChild(badgeBg);
    label.position.set(bx, by);
    overlay.addChild(label);

    // Pivot at sprite center so pulses scale visually around the symbol.
    overlay.pivot.set(CELL_SIZE / 2, CELL_SIZE / 2);
    overlay.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
    this.addChild(overlay);
    this.wildOverlay = overlay;
  }
}
