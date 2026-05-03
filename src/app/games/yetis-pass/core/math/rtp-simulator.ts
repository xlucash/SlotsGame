import type { Rng } from '../../../../shared/math/rng';
import { spin } from './engine';
import type { PersistentWild } from './types';

export interface SessionStats {
  spins: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  fsTriggers: number;
  fsTriggerRate: number;
  baseHits: number;
  baseHitRate: number;
  baseContribution: number;
  fsContribution: number;
  maxWin: number; // peak per-spin (incl. its FS chain) win in × bet
}

/**
 * Mirrors the live game's spin → FS-chain logic so RTP measurements match
 * what the player actually experiences. A base spin that triggers FS
 * plays out the awarded spins (with retriggers) using the persistent
 * expanding-wild state across the round.
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
      let persistent: ReadonlyArray<PersistentWild> = [];
      while (fsLeft > 0) {
        const fs = spin({
          bet,
          rng,
          isFreeSpin: true,
          persistentWilds: persistent,
        });
        totalWin += fs.totalWin;
        fsContribution += fs.totalWin;
        perSpinWin += fs.totalWin;
        persistent = fs.endPersistentWilds;
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
    baseContribution,
    fsContribution,
    maxWin,
  };
}
