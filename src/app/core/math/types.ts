import type { SymbolId } from './symbols';

export const COLS = 6;
export const ROWS = 5;
export const MIN_CLUSTER = 4;

export type Grid = SymbolId[][];

/**
 * Per-cell wild multiplier value. 0 (or absent) means the cell isn't a wild;
 * any positive value means "this WILD carries this multiplier". Stored
 * parallel to `Grid` so every wild cell can carry its own ×N badge that
 * gets summed across clusters that pass through it.
 */
export type WildMultGrid = number[][];

export interface Cluster {
  symbol: SymbolId;
  cells: ReadonlyArray<readonly [col: number, row: number]>;
  /** Final payout for this cluster — base cluster payout × wildMultiplier. */
  payout: number;
  /** Sum of wild multipliers from any wild cells in this cluster (1 if none). */
  wildMultiplier: number;
}

export interface TumbleStep {
  /** Grid before this tumble's removals (i.e. the state the player sees). */
  gridBefore: Grid;
  /** Wild multipliers parallel to `gridBefore`. */
  wildsBefore: WildMultGrid;
  clusters: Cluster[];
  /** Grid after winning cells removed and gravity+fill applied. Empty if no clusters. */
  gridAfter: Grid;
  /** Wild multipliers parallel to `gridAfter`. */
  wildsAfter: WildMultGrid;
  stepWin: number;
  /** Multiplier applied this step (free-spins only; 1 in base). */
  multiplier: number;
}

export interface SpinResult {
  bet: number;
  isFreeSpin: boolean;
  initialGrid: Grid;
  /** Wild multipliers parallel to `initialGrid` for the very first paint. */
  initialWilds: WildMultGrid;
  steps: TumbleStep[];
  totalScattersLanded: number;
  triggeredFreeSpins: number;
  totalWin: number;
  /** Multiplier value at end of this spin (FS only; carries to next FS). */
  endMultiplier: number;
}
