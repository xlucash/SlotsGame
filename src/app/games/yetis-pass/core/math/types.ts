import type { SymbolId } from './symbols';

export type Grid = SymbolId[][];

/**
 * A single payline win.
 *  - `lineIndex` indexes into PAYLINES.
 *  - `symbol` is the run's matching symbol (the leftmost non-wild on the line,
 *    or YETI if the entire run is wilds).
 *  - `count` is the number of consecutive matching cells from the left
 *    (3, 4, or 5).
 *  - `payout` is in PLN — i.e. `linePayout(symbol, count, bet)` already
 *    multiplied by any expanding-wild multipliers that crossed this line.
 *  - `multiplierApplied` is the product of expanding-wild multipliers
 *    on the columns the run passes through. 1 if no expanded wild.
 */
export interface LineWin {
  lineIndex: number;
  symbol: SymbolId;
  count: 3 | 4 | 5;
  /** Cells (col, row) on the line that contributed to the win. */
  cells: ReadonlyArray<readonly [col: number, row: number]>;
  /** Base payout × multipliers. */
  payout: number;
  /** Combined multiplier applied to this line. */
  multiplierApplied: number;
}

/**
 * State of expanded-wild reels carried into a free spin from the previous spin.
 * Every entry says "column X is fully wild and applies multiplier M to any
 * line passing through it."
 */
export interface PersistentWild {
  col: number;
  multiplier: number;
}

/**
 * A wild that **expanded this spin** (newly activated). The renderer uses
 * `triggerCell` to know where the original wild landed before expansion.
 */
export interface NewlyExpandedWild extends PersistentWild {
  triggerCell: readonly [col: number, row: number];
}

export interface SpinResult {
  bet: number;
  isFreeSpin: boolean;
  /** Generated grid before any expansion is rendered. */
  initialGrid: Grid;
  /** Persistent wild reels carried in (FS only). */
  persistentWilds: ReadonlyArray<PersistentWild>;
  /** Wilds that expanded *this spin*. */
  newlyExpanded: ReadonlyArray<NewlyExpandedWild>;
  lineWins: ReadonlyArray<LineWin>;
  totalWin: number;
  /** Total scatter count across the visible grid. */
  scattersLanded: number;
  /** FS award triggered by this spin (10 on initial trigger or retrigger, 0 otherwise). */
  triggeredFreeSpins: number;
  /** All persistent wilds active going INTO the next spin (for FS chains). */
  endPersistentWilds: ReadonlyArray<PersistentWild>;
}
