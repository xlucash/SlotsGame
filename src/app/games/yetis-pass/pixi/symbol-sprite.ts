import { Container, Graphics } from 'pixi.js';
import type { SymbolId } from '../core/math/symbols';
import { drawExpandedYeti, drawSymbol } from './symbol-art';

export const CELL_SIZE = 110;
export const CELL_GAP = 6;
export const ART_SIZE = 96;

/**
 * One cell of the 5×5 grid. Just the symbol art — no per-cell background.
 * The grid itself draws subtle row/column dividers (see GridRenderer).
 */
export class YetiSymbolSprite extends Container {
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

  private draw(): void {
    this.art.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
    drawSymbol(this.art, this._symbol, ART_SIZE);
  }
}

/**
 * Single tall yeti graphic that fills an expanded wild reel — replaces the
 * 5 individual cell sprites in that column with one continuous figure.
 * Sized at construction time and immutable thereafter.
 */
export class ExpandedYetiSprite extends Container {
  private readonly art: Graphics;

  constructor(width: number, height: number) {
    super();
    this.art = new Graphics();
    this.addChild(this.art);
    drawExpandedYeti(this.art, width, height);
  }
}
