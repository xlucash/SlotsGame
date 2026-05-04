import { pickWeighted, type Rng } from '../../../../shared/math/rng';
import type { SymbolId } from './symbols';

/**
 * Per-symbol line payouts as a multiplier of TOTAL bet (not per-line bet).
 * Indexes correspond to a left-to-right run of N matching reels:
 *   [0] = 3 in a row, [1] = 4 in a row, [2] = 5 in a row.
 * 0/1/2 matches pay nothing.
 *
 * Paytable tuned together with SYMBOL_WEIGHTS and the multiplier
 * distribution to land total RTP around 96%.
 */
const TABLE: Partial<Record<SymbolId, readonly [number, number, number]>> = {
  IGLOO:        [0.014, 0.046, 0.19],
  LANTERN:      [0.019, 0.065, 0.26],
  ICE_AXE:      [0.025, 0.086, 0.34],
  COMPASS:      [0.033, 0.113, 0.45],
  YAK:          [0.048, 0.163, 0.67],
  EAGLE:        [0.065, 0.225, 1.00],
  IBEX:         [0.10,  0.345, 1.55],
  SNOW_LEOPARD: [0.13,  0.54,  2.45],
  MAMMOTH:      [0.205, 0.90,  4.45],
};

/** Returns the line payout for `count` matches of `symbol` at total `bet`. */
export function linePayout(symbol: SymbolId, count: number, bet: number): number {
  const row = TABLE[symbol];
  if (!row || count < 3 || count > 5) return 0;
  return row[count - 3] * bet;
}

/** Read-only access for UI consumers (paytable modal). */
export function getLinePayouts(symbol: SymbolId): readonly number[] | undefined {
  return TABLE[symbol];
}

/** Symbol order for paytable display, top → bottom. */
export const PAYING_SYMBOLS_RANKED: readonly SymbolId[] = [
  'MAMMOTH', 'SNOW_LEOPARD', 'IBEX', 'EAGLE', 'YAK',
  'COMPASS', 'ICE_AXE', 'LANTERN', 'IGLOO',
];

/* ============================================================
 *  Free spins / bonus
 * ============================================================ */

export const FREE_SPINS_TRIGGER_COUNT = 3;
export const FREE_SPINS_AWARDED = 10;
/** Retrigger inside FS: 3+ scatters add a small +3 boost. The full 10
 *  re-grant felt overgenerous now that all yetis persist for the whole
 *  round — a single retrigger could double the round's length. */
export const FREE_SPINS_RETRIGGER_AWARD = 3;

/* ============================================================
 *  Expanding wild multiplier distribution
 *
 *  When a Yeti (wild) lands AND a paying line passes through its
 *  column, the wild expands to cover the whole reel and is
 *  assigned a multiplier from this distribution. Multipliers
 *  combine multiplicatively when a line crosses several
 *  expanded reels.
 *
 *  Expected value ≈ 7.4× — high enough that a single multi-wild
 *  combo can pay big, while keeping max-win frequency rare.
 * ============================================================ */

export interface MultiplierSlot { value: number; weight: number; }

export const WILD_MULTIPLIERS: readonly MultiplierSlot[] = [
  { value: 2,   weight: 55 },
  { value: 3,   weight: 22 },
  { value: 5,   weight: 12 },
  { value: 10,  weight: 6  },
  { value: 25,  weight: 3  },
  { value: 50,  weight: 1.4 },
  { value: 100, weight: 0.5 },
  { value: 250, weight: 0.1 },
];

const MULT_ENTRIES: ReadonlyArray<readonly [number, number]> =
  WILD_MULTIPLIERS.map((s) => [s.value, s.weight]);
const MULT_TOTAL = MULT_ENTRIES.reduce((s, [, w]) => s + w, 0);

/** Pick a wild multiplier from the weighted distribution above. */
export function pickWildMultiplier(rng: Rng): number {
  return pickWeighted(rng, MULT_ENTRIES, MULT_TOTAL);
}

/** Mean multiplier — useful in tests/diagnostics. */
export function expectedWildMultiplier(): number {
  return MULT_ENTRIES.reduce((s, [v, w]) => s + v * w, 0) / MULT_TOTAL;
}
