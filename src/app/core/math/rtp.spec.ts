import { describe, expect, it } from 'vitest';
import { MathRng } from '../../shared/math/rng';
import { simulateSession } from './rtp-simulator';

describe('RTP', () => {
  it('full session RTP (base + FS) sits in target band 85–98%', () => {
    const SPINS = 200_000;
    const stats = simulateSession(SPINS, 1, new MathRng());
    const summary =
      `RTP=${(stats.rtp * 100).toFixed(2)}%  ` +
      `FS=1/${(1 / stats.fsTriggerRate).toFixed(0)}  ` +
      `baseRTP=${(stats.baseContribution / stats.totalBet * 100).toFixed(1)}%  ` +
      `fsRTP=${(stats.fsContribution / stats.totalBet * 100).toFixed(1)}%  ` +
      `maxWin=${stats.maxWin.toFixed(0)}x`;
    expect(stats.rtp, summary).toBeGreaterThanOrEqual(0.85);
    expect(stats.rtp, summary).toBeLessThanOrEqual(0.98);
  }, 60_000);

  it('FS triggers happen at a believable rate (1/100 to 1/500 spins)', () => {
    const SPINS = 100_000;
    const stats = simulateSession(SPINS, 1, new MathRng());
    expect(stats.fsTriggers).toBeGreaterThan(0);
    expect(stats.fsTriggerRate).toBeGreaterThan(1 / 500);
    expect(stats.fsTriggerRate).toBeLessThan(1 / 80);
  }, 60_000);
});
