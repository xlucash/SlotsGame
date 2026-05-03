import { describe, expect, it } from 'vitest';
import { MathRng } from '../../../../shared/math/rng';
import { simulateSession } from './rtp-simulator';

describe("Yeti's Pass — RTP", () => {
  it('full session RTP (base + FS) sits in target band (target ~96%)', () => {
    // Yeti's Pass is high-variance (every YETI expands its column and rare
    // 250× rolls compound across persistent wilds in FS). 200k spins gives
    // ±10pp swings around the 96% target — the test band reflects that.
    // Re-tune symbols/paytable if the mean drifts; widen the band only if a
    // mechanic change genuinely increases variance.
    const SPINS = 200_000;
    const stats = simulateSession(SPINS, 1, new MathRng());
    const summary =
      `RTP=${(stats.rtp * 100).toFixed(2)}%  ` +
      `FS=1/${(1 / Math.max(1e-9, stats.fsTriggerRate)).toFixed(0)}  ` +
      `baseRTP=${(stats.baseContribution / stats.totalBet * 100).toFixed(1)}%  ` +
      `fsRTP=${(stats.fsContribution / stats.totalBet * 100).toFixed(1)}%  ` +
      `hit=${(stats.baseHitRate * 100).toFixed(1)}%  ` +
      `maxWin=${stats.maxWin.toFixed(0)}x`;
    expect(stats.rtp, summary).toBeGreaterThanOrEqual(0.84);
    expect(stats.rtp, summary).toBeLessThanOrEqual(1.16);
  }, 120_000);

  it('FS triggers at a believable rate (1/150 to 1/600 spins)', () => {
    const SPINS = 100_000;
    const stats = simulateSession(SPINS, 1, new MathRng());
    expect(stats.fsTriggers).toBeGreaterThan(0);
    expect(stats.fsTriggerRate).toBeGreaterThan(1 / 600);
    expect(stats.fsTriggerRate).toBeLessThan(1 / 150);
  }, 120_000);
});
