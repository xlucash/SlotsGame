import { describe, expect, it } from 'vitest';
import { spin } from './engine';
import { MathRng } from './rng';
import { findClusters } from './cluster-detection';
import type { Grid } from './types';

describe('engine', () => {
  it('runs a base spin and returns a grid + steps', () => {
    const r = spin({ bet: 1, rng: new MathRng() });
    expect(r.bet).toBe(1);
    expect(r.initialGrid.length).toBe(6);
    expect(r.initialGrid[0].length).toBe(5);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.totalWin).toBeGreaterThanOrEqual(0);
  });

  it('detects a deliberate horizontal cluster of 4', () => {
    const grid: Grid = Array.from({ length: 6 }, () => ['BULLET', 'BULLET', 'BULLET', 'BULLET', 'BULLET']);
    // Make every cell in row 0 a BEAR (4+ across columns).
    for (let c = 0; c < 6; c++) grid[c][0] = 'BEAR';
    const clusters = findClusters(grid, 1);
    expect(clusters.find((c) => c.symbol === 'BEAR')).toBeDefined();
    expect(clusters.find((c) => c.symbol === 'BEAR')!.cells.length).toBe(6);
    // BULLET runs across all columns at rows 1..4 = 24 cells, one big cluster.
    const bullet = clusters.find((c) => c.symbol === 'BULLET');
    expect(bullet?.cells.length).toBe(24);
  });

  it('aggregate base RTP is roughly in a sane range over 5000 spins', () => {
    const rng = new MathRng();
    let totalBet = 0, totalWin = 0, fsTriggers = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const r = spin({ bet: 1, rng });
      totalBet += 1;
      totalWin += r.totalWin;
      if (r.triggeredFreeSpins > 0) fsTriggers++;
    }
    const rtp = totalWin / totalBet;
    // Excludes FS payout, so it's the *base* RTP only — should be well below 1.
    expect(rtp).toBeGreaterThan(0.05);
    expect(rtp).toBeLessThan(2);
    expect(fsTriggers).toBeGreaterThan(0);
  });
});
