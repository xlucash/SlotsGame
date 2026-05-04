import { pickWeighted, type Rng } from '../../../../shared/math/rng';

export type SymbolId =
  | 'IGLOO' | 'LANTERN' | 'ICE_AXE' | 'COMPASS'   // lows
  | 'YAK' | 'EAGLE' | 'IBEX' | 'SNOW_LEOPARD' | 'MAMMOTH' // highs
  | 'YETI'      // wild
  | 'SUMMIT';   // scatter

export interface SymbolMeta {
  id: SymbolId;
  label: string;
  tier: 'low' | 'high' | 'wild' | 'scatter';
  /** UI accent — used by the renderer/legend. */
  color: number;
}

export const SYMBOLS: Record<SymbolId, SymbolMeta> = {
  IGLOO:        { id: 'IGLOO',        label: 'Igloo',        tier: 'low',     color: 0xc6dde5 },
  LANTERN:      { id: 'LANTERN',      label: 'Lantern',      tier: 'low',     color: 0xe6a040 },
  ICE_AXE:      { id: 'ICE_AXE',      label: 'Ice Axe',      tier: 'low',     color: 0x8a99a3 },
  COMPASS:      { id: 'COMPASS',      label: 'Compass',      tier: 'low',     color: 0xb88a2c },
  YAK:          { id: 'YAK',          label: 'Yak',          tier: 'high',    color: 0x4a3424 },
  EAGLE:        { id: 'EAGLE',        label: 'Mountain Eagle', tier: 'high',  color: 0x8b6c3a },
  IBEX:         { id: 'IBEX',         label: 'Himalayan Ibex', tier: 'high',  color: 0x7a5a2e },
  SNOW_LEOPARD: { id: 'SNOW_LEOPARD', label: 'Snow Leopard', tier: 'high',    color: 0xd0d6dc },
  MAMMOTH:      { id: 'MAMMOTH',      label: 'Woolly Mammoth', tier: 'high',  color: 0x6a4828 },
  YETI:         { id: 'YETI',         label: 'Yeti',         tier: 'wild',    color: 0xeaf3f8 },
  SUMMIT:       { id: 'SUMMIT',       label: 'Summit Flag',  tier: 'scatter', color: 0xc9543a },
};

/**
 * Reel weights — calibrated for ~96% RTP at 5×5 with 25 paylines and the
 * expanding-wild-with-multiplier mechanic. Lower weights = rarer symbols.
 *
 * SUMMIT (scatter) weight is set so 3+ scatters land roughly 1 in ~280 spins.
 * YETI (wild) is rare enough that a base-game expansion is genuinely
 * exciting (~1 wild per spin on average across all 25 cells).
 */
export const SYMBOL_WEIGHTS: Record<SymbolId, number> = {
  // Lows — frequent fillers
  IGLOO:   16,
  LANTERN: 14,
  ICE_AXE: 13,
  COMPASS: 12,
  // Highs — rarer, bigger payouts
  YAK:           10,
  EAGLE:          8,
  IBEX:           6,
  SNOW_LEOPARD:   5,
  MAMMOTH:        4,
  // Specials
  YETI:           0.80,
  SUMMIT:         1.28,
};

const ENTRIES: ReadonlyArray<readonly [SymbolId, number]> =
  Object.entries(SYMBOL_WEIGHTS) as Array<[SymbolId, number]>;
const TOTAL_WEIGHT = ENTRIES.reduce((s, [, w]) => s + w, 0);

export function pickSymbol(rng: Rng): SymbolId {
  return pickWeighted(rng, ENTRIES, TOTAL_WEIGHT);
}
