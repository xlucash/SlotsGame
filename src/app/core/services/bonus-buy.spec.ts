import { describe, expect, it } from 'vitest';
import { MathRng } from '../../shared/math/rng';
import { simulateBuyRtp } from '../math/rtp-simulator';
import {
  BONUS_BUY_COST_MULT,
  BONUS_STARTING_MULTIPLIER,
  DEFAULT_BONUS_SPINS,
  WHEEL_OUTCOMES,
  expectedWheelSpins,
  pickWheelOutcome,
} from './bonus-buy';

describe('Bonus buy economics', () => {
  it('default 8-spin buy lands buy-RTP in 85–98%', () => {
    // Slightly fewer rounds: graduated retriggers (3→+2, 4→+4, 5+→+6) chain
    // longer FS sequences, so each round is more expensive to simulate.
    const ROUNDS = 30_000;
    const stats = simulateBuyRtp(
      ROUNDS,
      DEFAULT_BONUS_SPINS,
      BONUS_STARTING_MULTIPLIER,
      BONUS_BUY_COST_MULT,
      1,
      new MathRng(),
    );
    const summary = `buyRTP=${(stats.rtp * 100).toFixed(2)}%  ` +
                    `payout=${stats.meanPayoutInBets.toFixed(2)}xbet  ` +
                    `cost=${BONUS_BUY_COST_MULT}xbet`;
    expect(stats.rtp, summary).toBeGreaterThanOrEqual(0.85);
    expect(stats.rtp, summary).toBeLessThanOrEqual(0.98);
  }, 120_000);

  it('wheel expected spin count matches default (RTP-neutral gamble)', () => {
    const ev = expectedWheelSpins();
    // ~within ±1 spin of the no-gamble option
    expect(ev).toBeGreaterThan(DEFAULT_BONUS_SPINS - 1);
    expect(ev).toBeLessThan(DEFAULT_BONUS_SPINS + 1);
  });

  it('wheel weights add up and outcomes are picked proportionally over many rolls', () => {
    const N = 200_000;
    const counts = new Map<number, number>();
    for (const o of WHEEL_OUTCOMES) counts.set(o.spins, 0);
    const rng = new MathRng();
    for (let i = 0; i < N; i++) {
      const o = pickWheelOutcome(rng);
      counts.set(o.spins, counts.get(o.spins)! + 1);
    }
    const total = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
    for (const o of WHEEL_OUTCOMES) {
      const expectedRate = o.weight / total;
      const measuredRate = counts.get(o.spins)! / N;
      // Within 0.5 percentage points of expected at this sample size.
      expect(Math.abs(expectedRate - measuredRate)).toBeLessThan(0.01);
    }
  });
});
