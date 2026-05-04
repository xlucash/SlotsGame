import { Injectable, computed, signal } from '@angular/core';

export const BET_LEVELS: readonly number[] = [
  0.20, 0.40, 0.60, 1.00, 2.00, 4.00, 6.00, 10.00, 20.00, 40.00, 60.00, 100.00,
  // High-roller tier — kept hidden from the lobby tagline since most
  // players won't reach it with a 10 000 PLN starting balance, but
  // available so a winning streak can step up to a meatier bonus buy
  // (×60 in Hunter's Cluster, ×60 in Yeti's Pass).
  150.00, 250.00, 500.00, 1000.00,
];

const DEFAULT_LEVEL_INDEX = 3; // 1.00 PLN

@Injectable({ providedIn: 'root' })
export class BetService {
  private readonly _index = signal(DEFAULT_LEVEL_INDEX);
  readonly index = this._index.asReadonly();
  readonly amount = computed(() => BET_LEVELS[this._index()]);
  readonly canIncrease = computed(() => this._index() < BET_LEVELS.length - 1);
  readonly canDecrease = computed(() => this._index() > 0);

  increase(): void {
    if (this.canIncrease()) this._index.update((i) => i + 1);
  }
  decrease(): void {
    if (this.canDecrease()) this._index.update((i) => i - 1);
  }
}
