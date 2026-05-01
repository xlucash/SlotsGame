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
  WILD: 1.5,
  SCATTER: 2.4,
};
