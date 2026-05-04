import { Injectable, signal } from '@angular/core';

export const STARTING_BALANCE = 8_000;

/**
 * In-memory player balance. Refreshing the page = new session = balance reset.
 * No localStorage by design.
 */
@Injectable({ providedIn: 'root' })
export class BalanceService {
  private readonly _balance = signal(STARTING_BALANCE);
  readonly balance = this._balance.asReadonly();

  debit(amount: number): boolean {
    if (amount <= 0) return true;
    if (this._balance() < amount) return false;
    this._balance.update((b) => b - amount);
    return true;
  }

  credit(amount: number): void {
    if (amount <= 0) return;
    this._balance.update((b) => b + amount);
  }
}
