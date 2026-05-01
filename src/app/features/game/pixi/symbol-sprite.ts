import { Container, Graphics } from 'pixi.js';
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
 */
export class SymbolSprite extends Container {
  private readonly art: Graphics;
  private _symbol: SymbolId;

  constructor(symbol: SymbolId) {
    super();
    this._symbol = symbol;
    this.art = new Graphics();
    this.addChild(this.art);
    this.draw();
  }

  get symbol(): SymbolId { return this._symbol; }

  setSymbol(s: SymbolId): void {
    if (s === this._symbol) return;
    this._symbol = s;
    this.draw();
  }

  /**
   * Kept as a no-op so existing GridRenderer call-sites remain valid;
   * win highlight is now driven by the GlowFilter applied at the sprite
   * level rather than a halo Graphics child.
   */
  setHighlighted(_on: boolean): void { /* no-op */ }

  private draw(): void {
    // Place the art so the cell-local center (CELL_SIZE/2, CELL_SIZE/2) lines up
    // with the position the renderer assigns to this sprite — keeps the existing
    // grid positioning math unchanged.
    this.art.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
    drawSymbol(this.art, this._symbol, ART_SIZE);
  }
}
