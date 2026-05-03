/**
 * Tiny RNG abstraction shared across games.
 *
 * `Rng.next()` returns a uniform float in [0, 1). The default `MathRng`
 * is backed by `Math.random()`; tests can swap in a deterministic
 * implementation if they need reproducible sequences.
 *
 * `pickWeighted` is a small helper for sampling a key out of a
 * `Record<K, number>` weight table — used by every game's symbol picker.
 */
export interface Rng {
  next(): number;
}

export class MathRng implements Rng {
  next(): number { return Math.random(); }
}

/**
 * Pick a key from `weights` proportional to its value. The caller passes
 * pre-computed `entries` and `total` so a hot picker doesn't recompute
 * them on every call.
 */
export function pickWeighted<K extends string | number>(
  rng: Rng,
  entries: ReadonlyArray<readonly [K, number]>,
  total: number,
): K {
  let r = rng.next() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}
