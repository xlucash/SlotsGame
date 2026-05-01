import type { SymbolId } from './symbols';

export const COLS = 6;
export const ROWS = 5;
export const MIN_CLUSTER = 4;

export type Grid = SymbolId[][];

export interface Cluster {
  symbol: SymbolId;
  cells: ReadonlyArray<readonly [col: number, row: number]>;
  payout: number;
}

export interface TumbleStep {
  /** Grid before this tumble's removals (i.e. the state the player sees). */
  gridBefore: Grid;
  clusters: Cluster[];
  /** Grid after winning cells removed and gravity+fill applied. Empty if no clusters. */
  gridAfter: Grid;
  stepWin: number;
  /** Multiplier applied this step (free-spins only; 1 in base). */
  multiplier: number;
}

export interface SpinResult {
  bet: number;
  isFreeSpin: boolean;
  initialGrid: Grid;
  steps: TumbleStep[];
  totalScattersLanded: number;
  triggeredFreeSpins: number;
  totalWin: number;
  /** Multiplier value at end of this spin (FS only; carries to next FS). */
  endMultiplier: number;
}
