export const enum Sym {
  BULLET = 'BULLET',
  SHELL = 'SHELL',
  KNIFE = 'KNIFE',
  SCOPE = 'SCOPE',
  RABBIT = 'RABBIT',
  DEER = 'DEER',
  BOAR = 'BOAR',
  WOLF = 'WOLF',
  BEAR = 'BEAR',
  WILD = 'WILD',
  SCATTER = 'SCATTER',
}

export type SymbolId =
  | 'BULLET' | 'SHELL' | 'KNIFE' | 'SCOPE'
  | 'RABBIT' | 'DEER' | 'BOAR' | 'WOLF' | 'BEAR'
  | 'WILD' | 'SCATTER';

export interface SymbolMeta {
  id: SymbolId;
  label: string;
  tier: 'low' | 'high' | 'wild' | 'scatter';
  color: number;
}

export const SYMBOLS: Record<SymbolId, SymbolMeta> = {
  BULLET: { id: 'BULLET', label: 'Bullet', tier: 'low',     color: 0xb08a4a },
  SHELL:  { id: 'SHELL',  label: 'Shell',  tier: 'low',     color: 0xc94a3a },
  KNIFE:  { id: 'KNIFE',  label: 'Knife',  tier: 'low',     color: 0x9aa3ad },
  SCOPE:  { id: 'SCOPE',  label: 'Scope',  tier: 'low',     color: 0x4a8a78 },
  RABBIT: { id: 'RABBIT', label: 'Rabbit', tier: 'high',    color: 0xd9c7a3 },
  DEER:   { id: 'DEER',   label: 'Deer',   tier: 'high',    color: 0xa66b3c },
  BOAR:   { id: 'BOAR',   label: 'Boar',   tier: 'high',    color: 0x4d3a2a },
  WOLF:   { id: 'WOLF',   label: 'Wolf',   tier: 'high',    color: 0x6b7480 },
  BEAR:   { id: 'BEAR',   label: 'Bear',   tier: 'high',    color: 0x2c1e14 },
  WILD:   { id: 'WILD',   label: 'Hunter', tier: 'wild',    color: 0xf2c14e },
  SCATTER:{ id: 'SCATTER',label: 'Shotgun',tier: 'scatter', color: 0xe85d2f },
};

/**
 * Weighted distribution used when generating new symbols.
 * Higher weight = more frequent. Tuned so high-pays and wilds/scatters are rare.
 * SCATTER weight is calibrated to land FS at roughly 1/180 spins.
 *
 * NOTE on WILD weight: wilds now carry an extra ×2 / ×5 multiplier that
 * is applied to clusters they belong to. The weight is tuned together with
 * WILD_MULTIPLIER_WEIGHTS to keep base RTP inside the 85–98% test band.
 */
export const SYMBOL_WEIGHTS: Record<SymbolId, number> = {
  BULLET: 16,
  SHELL: 14,
  KNIFE: 13,
  SCOPE: 12,
  RABBIT: 11,
  DEER: 9,
  BOAR: 7,
  WOLF: 5,
  BEAR: 3,
  WILD: 0.55,
  SCATTER: 2.4,
};

/**
 * Distribution of multiplier values carried by each wild that lands.
 * ×2 is the common case; ×5 is the rare upgrade. Average ≈ 2.6×.
 */
export const WILD_MULTIPLIER_WEIGHTS: ReadonlyArray<readonly [number, number]> = [
  [2, 80],
  [5, 20],
];

import { pickWeighted, type Rng } from '../../shared/math/rng';

const ENTRIES: ReadonlyArray<readonly [SymbolId, number]> =
  Object.entries(SYMBOL_WEIGHTS) as Array<[SymbolId, number]>;
const TOTAL_WEIGHT = ENTRIES.reduce((s, [, w]) => s + w, 0);

const WILD_MULT_TOTAL = WILD_MULTIPLIER_WEIGHTS.reduce((s, [, w]) => s + w, 0);

/** Pick a Hunter's-Cluster symbol weighted by SYMBOL_WEIGHTS. */
export function pickSymbol(rng: Rng): SymbolId {
  return pickWeighted(rng, ENTRIES, TOTAL_WEIGHT);
}

/** Pick a multiplier value for a freshly-landed wild. */
export function pickWildMultiplier(rng: Rng): number {
  return pickWeighted(rng, WILD_MULTIPLIER_WEIGHTS, WILD_MULT_TOTAL);
}
