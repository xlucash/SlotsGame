import type { Rng } from '../math/rng';

/**
 * Cost of a bonus buy in × current bet. Tuned so buy RTP sits in ~92–95%
 * (close to the base-game RTP of ~90%, which is conventional for buy
 * bonuses — players pay a small premium for guaranteed entry).
 */
export const BONUS_BUY_COST_MULT = 22;

/** Default (no-gamble) free-spins count. */
export const DEFAULT_BONUS_SPINS = 8;

export const BONUS_STARTING_MULTIPLIER = 1;

export interface WheelOutcome {
  spins: number;
  weight: number;
}

/**
 * Fortune-wheel outcomes — many small slices for visual richness. Weights
 * tuned so expected spins ≈ DEFAULT_BONUS_SPINS (8); the gamble is
 * RTP-neutral against the safe choice, just higher variance.
 *
 * EV = Σ(spins × weight) / Σ weight
 *    = (3×16 + 4×14 + 5×14 + 6×12 + 7×10 + 8×9 + 10×8 + 12×7 + 14×5 + 16×3 + 20×2) / 100
 *    = (48 + 56 + 70 + 72 + 70 + 72 + 80 + 84 + 70 + 48 + 40) / 100
 *    = 710 / 100
 *    = 7.10 spins  ← within ±1 of DEFAULT_BONUS_SPINS
 *
 * Minimum slice is 3 spins — never go below that.
 */
export const WHEEL_OUTCOMES: readonly WheelOutcome[] = [
  { spins: 3,  weight: 12 },
  { spins: 4,  weight: 11 },
  { spins: 5,  weight: 11 },
  { spins: 6,  weight: 10 },
  { spins: 7,  weight: 10 },
  { spins: 8,  weight: 10 },
  { spins: 10, weight: 10 },
  { spins: 12, weight: 9  },
  { spins: 14, weight: 8  },
  { spins: 16, weight: 6  },
  { spins: 20, weight: 3  },
];

const TOTAL_WHEEL_WEIGHT = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);

export function expectedWheelSpins(): number {
  return WHEEL_OUTCOMES.reduce((s, o) => s + o.spins * o.weight, 0) / TOTAL_WHEEL_WEIGHT;
}

/** Pick a wheel outcome by weight. Returns the resulting spin count. */
export function pickWheelOutcome(rng: Rng): WheelOutcome {
  let r = rng.next() * TOTAL_WHEEL_WEIGHT;
  for (const o of WHEEL_OUTCOMES) {
    r -= o.weight;
    if (r <= 0) return o;
  }
  return WHEEL_OUTCOMES[WHEEL_OUTCOMES.length - 1];
}
