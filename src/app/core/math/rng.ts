import { SYMBOL_WEIGHTS, type SymbolId } from './symbols';

export interface Rng {
  next(): number;
}

export class MathRng implements Rng {
  next(): number { return Math.random(); }
}

const ENTRIES: ReadonlyArray<readonly [SymbolId, number]> =
  (Object.entries(SYMBOL_WEIGHTS) as Array<[SymbolId, number]>);
const TOTAL_WEIGHT = ENTRIES.reduce((s, [, w]) => s + w, 0);

export function pickSymbol(rng: Rng): SymbolId {
  let r = rng.next() * TOTAL_WEIGHT;
  for (const [sym, w] of ENTRIES) {
    r -= w;
    if (r <= 0) return sym;
  }
  return ENTRIES[ENTRIES.length - 1][0];
}
