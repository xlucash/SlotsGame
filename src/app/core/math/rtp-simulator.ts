import { spin } from './engine';
import type { Rng } from '../../shared/math/rng';
import { FREE_SPINS_RETRIGGER_COUNT } from './paytable';

export interface SessionStats {
  spins: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  fsTriggers: number;
  fsTriggerRate: number;
  baseHits: number;
  baseHitRate: number;
  fsContribution: number; // win attributable to FS
  baseContribution: number; // win attributable to base game
  maxWin: number; // max single base spin (incl. its FS) win, in × bet
}

/**
 * Mirrors GameService spin → commitSpin → FS chain logic so that the simulated
 * RTP matches what a real player would experience. Each base spin that
 * triggers FS plays out the awarded spins (with retriggers) using the
 * persistent multiplier model.
 */
export function simulateSession(spins: number, bet: number, rng: Rng): SessionStats {
  let totalBet = 0, totalWin = 0;
  let fsTriggers = 0, baseHits = 0;
  let baseContribution = 0, fsContribution = 0;
  let maxWin = 0;

  for (let i = 0; i < spins; i++) {
    totalBet += bet;
    const base = spin({ bet, rng, isFreeSpin: false });
    totalWin += base.totalWin;
    baseContribution += base.totalWin;
    if (base.totalWin > 0) baseHits++;

    let perSpinWin = base.totalWin;

    if (base.triggeredFreeSpins > 0) {
      fsTriggers++;
      let fsLeft = base.triggeredFreeSpins;
      let mult = 1;
      while (fsLeft > 0) {
        const fs = spin({ bet, rng, isFreeSpin: true, startingMultiplier: mult });
        totalWin += fs.totalWin;
        fsContribution += fs.totalWin;
        perSpinWin += fs.totalWin;
        mult = fs.endMultiplier;
        if (fs.triggeredFreeSpins > 0) fsLeft += fs.triggeredFreeSpins;
        fsLeft--;
      }
    }

    const winInBets = perSpinWin / bet;
    if (winInBets > maxWin) maxWin = winInBets;
  }

  return {
    spins,
    totalBet,
    totalWin,
    rtp: totalWin / totalBet,
    fsTriggers,
    fsTriggerRate: fsTriggers / spins,
    baseHits,
    baseHitRate: baseHits / spins,
    fsContribution,
    baseContribution,
    maxWin,
  };
}

/**
 * Plays out a single bonus-buy round (the player paid for `spinCount` FS at
 * `startingMultiplier`). Returns total win across the round, including any
 * wins from retriggers. Used for buy-RTP simulation.
 */
export function playFreeSpinsRound(
  spinCount: number,
  startingMultiplier: number,
  bet: number,
  rng: Rng,
): number {
  let total = 0;
  let mult = startingMultiplier;
  let left = spinCount;
  while (left > 0) {
    const fs = spin({ bet, rng, isFreeSpin: true, startingMultiplier: mult });
    total += fs.totalWin;
    mult = fs.endMultiplier;
    if (fs.triggeredFreeSpins > 0) left += fs.triggeredFreeSpins;
    left--;
  }
  return total;
}

export interface BuyEv {
  rounds: number;
  totalCost: number;
  totalWin: number;
  rtp: number;
  meanPayoutInBets: number;
}

export function simulateBuyRtp(
  rounds: number,
  spinCount: number,
  startingMultiplier: number,
  costPerRound: number,
  bet: number,
  rng: Rng,
): BuyEv {
  let totalWin = 0;
  for (let i = 0; i < rounds; i++) {
    totalWin += playFreeSpinsRound(spinCount, startingMultiplier, bet, rng);
  }
  const totalCost = rounds * costPerRound;
  return {
    rounds,
    totalCost,
    totalWin,
    rtp: totalWin / totalCost,
    meanPayoutInBets: totalWin / rounds / bet,
  };
}

// Re-export the FS retrigger constant so tests can introspect mechanic limits.
export const FS_RETRIGGER_THRESHOLD = FREE_SPINS_RETRIGGER_COUNT;
