import { Injectable, computed, signal } from '@angular/core';

export const BET_LEVELS: readonly number[] = [
  0.20, 0.40, 0.60, 1.00, 2.00, 4.00, 6.00, 10.00, 20.00, 40.00, 60.00, 100.00,
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
