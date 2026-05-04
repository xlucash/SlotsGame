import { Injectable, computed, signal } from '@angular/core';

export const BET_LEVELS: readonly number[] = [
  0.20, 0.40, 0.60, 1.00, 2.00, 4.00, 6.00, 10.00, 20.00, 40.00, 50.00, 60.00, 80.00, 100.00,
  // Upper tiers reachable only in Hunter's Cluster (cap = 300). At its
  // ×22 buy cost mult the 300 PLN tier produces a ~6 600 PLN buy, the
  // headroom most players will actually use a winning streak to climb to.
  // Yeti's stays capped at 50 (×190 mult = ~9.5 k buy).
  150.00, 200.00, 300.00,
];

const DEFAULT_LEVEL_INDEX = 3; // 1.00 PLN

@Injectable({ providedIn: 'root' })
export class BetService {
  private readonly _index = signal(DEFAULT_LEVEL_INDEX);
  readonly index = this._index.asReadonly();
  readonly amount = computed(() => BET_LEVELS[this._index()]);

  /**
   * Per-game cap on the maximum bet allowed. Each game's shell sets this
   * on init so:
   *  - Hunter's Cluster ×60 buy reaches 6 000 PLN at the 100 PLN top tier
   *  - Yeti's Pass ×190 buy stays under 10 000 PLN by capping at 50 PLN
   * The shared ladder declares every level once; the cap just decides
   * which tail of it the increase button can walk into.
   */
  private readonly _maxBet = signal(Number.POSITIVE_INFINITY);
  setMaxBet(max: number): void {
    this._maxBet.set(max);
    // If the cap dropped under the current bet, snap the player down to
    // the highest still-allowed tier so we don't leave them holding a bet
    // they can't actually use.
    while (BET_LEVELS[this._index()] > max && this._index() > 0) {
      this._index.update((i) => i - 1);
    }
  }

  readonly canIncrease = computed(() => {
    const i = this._index();
    if (i >= BET_LEVELS.length - 1) return false;
    return BET_LEVELS[i + 1] <= this._maxBet();
  });
  readonly canDecrease = computed(() => this._index() > 0);

  increase(): void {
    if (this.canIncrease()) this._index.update((i) => i + 1);
  }
  decrease(): void {
    if (this.canDecrease()) this._index.update((i) => i - 1);
  }
}
