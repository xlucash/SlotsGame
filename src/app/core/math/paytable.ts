import type { SymbolId } from './symbols';

/**
 * Cluster-pay multipliers (× total bet) by cluster size band.
 * Bands: [4, 5, 6, 7-8, 9-10, 11-14, 15+]
 * Wild and scatter never form clusters themselves.
 */
export const BANDS: ReadonlyArray<readonly [min: number, max: number]> = [
  [4, 4], [5, 5], [6, 6], [7, 8], [9, 10], [11, 14], [15, Infinity],
];

const TABLE: Partial<Record<SymbolId, readonly number[]>> = {
  BULLET: [0.40, 0.65, 1.00, 1.70, 3.4,  8,  22],
  SHELL:  [0.50, 0.80, 1.30, 2.10, 4.2,  10, 27],
  KNIFE:  [0.65, 1.00, 1.70, 2.80, 5.8,  13, 34],
  SCOPE:  [0.85, 1.30, 2.10, 3.40, 7.3,  17, 44],
  RABBIT: [1.30, 2.10, 3.20, 5.80, 12,   25, 67],
  DEER:   [1.70, 2.80, 4.50, 7.50, 14.5, 31, 88],
  BOAR:   [2.10, 3.60, 5.80, 9.80, 21,   46, 118],
  WOLF:   [3.20, 5.70, 9.00, 15,   31,   72, 190],
  BEAR:   [5.00, 9.00, 14,   24,   50,   112, 300],
};

export function clusterPayout(symbol: SymbolId, size: number, bet: number): number {
  const row = TABLE[symbol];
  if (!row || size < 4) return 0;
  for (let i = 0; i < BANDS.length; i++) {
    const [lo, hi] = BANDS[i];
    if (size >= lo && size <= hi) return row[i] * bet;
  }
  return 0;
}

export const FREE_SPINS_TRIGGER_COUNT = 4;
export const FREE_SPINS_AWARDED = 10;
export const FREE_SPINS_RETRIGGER_COUNT = 3;

/**
 * Graduated retrigger award. The more scatters land in a free spin, the more
 * extra spins are granted — caps at 6 for 5+ scatters.
 *   3 scatters → +2 spins
 *   4 scatters → +4 spins
 *   5+ scatters → +6 spins
 *   <3 → no retrigger
 */
export function fsRetriggerAward(scatterCount: number): number {
  if (scatterCount < FREE_SPINS_RETRIGGER_COUNT) return 0;
  if (scatterCount >= 5) return 6;
  if (scatterCount === 4) return 4;
  return 2;
}

/** Order paying symbols high → low for paytable display. */
export const PAYING_SYMBOLS_RANKED: readonly SymbolId[] = [
  'BEAR', 'WOLF', 'BOAR', 'DEER', 'RABBIT', 'SCOPE', 'KNIFE', 'SHELL', 'BULLET',
];

/** Read-only access to the paytable for UI components (paytable modal). */
export function getPayouts(symbol: SymbolId): readonly number[] | undefined {
  return TABLE[symbol];
}
