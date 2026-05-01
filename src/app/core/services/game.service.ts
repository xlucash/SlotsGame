import { Injectable, computed, inject, signal } from '@angular/core';
import { spin } from '../math/engine';
import { MathRng } from '../math/rng';
import type { SpinResult } from '../math/types';
import { BalanceService } from './balance.service';
import { BetService } from './bet.service';
import { BONUS_BUY_COST_MULT, BONUS_STARTING_MULTIPLIER } from './bonus-buy';

export type GamePhase = 'idle' | 'spinning' | 'fs-intro' | 'fs-spinning' | 'fs-outro';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly balance = inject(BalanceService);
  private readonly bet = inject(BetService);
  private readonly rng = new MathRng();

  private readonly _phase = signal<GamePhase>('idle');
  readonly phase = this._phase.asReadonly();

  private readonly _freeSpinsLeft = signal(0);
  readonly freeSpinsLeft = this._freeSpinsLeft.asReadonly();

  private readonly _fsMultiplier = signal(1);
  readonly fsMultiplier = this._fsMultiplier.asReadonly();

  private readonly _fsTotalWin = signal(0);
  readonly fsTotalWin = this._fsTotalWin.asReadonly();

  private readonly _lastWin = signal(0);
  readonly lastWin = this._lastWin.asReadonly();

  /**
   * Transient FS-award announcement. `fsAwardAmount` holds the most recent
   * spin-count award (organic trigger or retrigger); `fsAwardCounter`
   * increments on every fire so consumers can subscribe to it as a "ping".
   */
  private readonly _fsAwardAmount = signal(0);
  private readonly _fsAwardCounter = signal(0);
  readonly fsAwardAmount = this._fsAwardAmount.asReadonly();
  readonly fsAwardCounter = this._fsAwardCounter.asReadonly();

  /** Current spin result for the renderer to consume. Null between spins. */
  private readonly _currentResult = signal<SpinResult | null>(null);
  readonly currentResult = this._currentResult.asReadonly();

  readonly inFreeSpins = computed(
    () => this._phase() === 'fs-spinning' || this._phase() === 'fs-intro' || this._phase() === 'fs-outro',
  );
  readonly canSpin = computed(() => this._phase() === 'idle' && this.balance.balance() >= this.bet.amount());
  readonly canBuyBonus = computed(() => this._phase() === 'idle');

  bonusCost(): number {
    return this.bet.amount() * BONUS_BUY_COST_MULT;
  }

  /**
   * Purchase a free-spins round directly. `spinCount` is set by the caller —
   * either the default (DEFAULT_BONUS_SPINS) when the player skipped the wheel,
   * or whatever the wheel landed on.
   *
   * Skips the scatter-collection phase and the FS intro overlay — drops the
   * player straight into fs-spinning. Returns true on success.
   */
  buyBonus(spinCount: number): boolean {
    if (!this.canBuyBonus()) return false;
    if (spinCount <= 0) return false;
    const cost = this.bonusCost();
    if (!this.balance.debit(cost)) return false;
    this._lastWin.set(0);
    this._fsTotalWin.set(0);
    this._fsMultiplier.set(BONUS_STARTING_MULTIPLIER);
    this._freeSpinsLeft.set(spinCount);
    this._phase.set('fs-spinning');
    return true;
  }

  /**
   * Execute one spin (base or free). Renderer should await the returned result
   * before kicking off animations, then call `commitWin()` when animations finish
   * so the balance update lines up with the visual win counter.
   */
  spinOnce(): SpinResult | null {
    if (this.inFreeSpins()) return this.runFreeSpin();
    if (!this.canSpin()) return null;

    const bet = this.bet.amount();
    if (!this.balance.debit(bet)) return null;
    this._phase.set('spinning');
    this._lastWin.set(0);

    const result = spin({ bet, rng: this.rng, isFreeSpin: false });
    this._currentResult.set(result);
    return result;
  }

  /**
   * Called by renderer after the visual sequence for the current spin completes.
   * Awards win, advances FS state machine.
   */
  commitSpin(): void {
    const result = this._currentResult();
    if (!result) return;

    if (!result.isFreeSpin) {
      this._lastWin.set(result.totalWin);
      this.balance.credit(result.totalWin);
      if (result.triggeredFreeSpins > 0) {
        this.fireFsAward(result.triggeredFreeSpins);
        this._freeSpinsLeft.set(result.triggeredFreeSpins);
        this._fsMultiplier.set(1);
        this._fsTotalWin.set(0);
        this._phase.set('fs-intro');
      } else {
        this._phase.set('idle');
      }
    } else {
      this._fsTotalWin.update((v) => v + result.totalWin);
      this._fsMultiplier.set(result.endMultiplier);
      if (result.triggeredFreeSpins > 0) {
        this.fireFsAward(result.triggeredFreeSpins);
        this._freeSpinsLeft.update((v) => v + result.triggeredFreeSpins);
      }
      this._freeSpinsLeft.update((v) => Math.max(0, v - 1));
      if (this._freeSpinsLeft() === 0) {
        const total = this._fsTotalWin();
        this.balance.credit(total);
        this._lastWin.set(total);
        this._phase.set('fs-outro');
      } else {
        this._phase.set('fs-spinning');
      }
    }
    this._currentResult.set(null);
  }

  /** Player acknowledged the FS intro screen — start running free spins. */
  startFreeSpins(): void {
    if (this._phase() === 'fs-intro') this._phase.set('fs-spinning');
  }

  /** Player acknowledged the FS outro screen — return to base game. */
  finishFreeSpins(): void {
    if (this._phase() === 'fs-outro') {
      this._freeSpinsLeft.set(0);
      this._fsMultiplier.set(1);
      this._fsTotalWin.set(0);
      this._phase.set('idle');
    }
  }

  private fireFsAward(amount: number): void {
    this._fsAwardAmount.set(amount);
    this._fsAwardCounter.update((v) => v + 1);
  }

  private runFreeSpin(): SpinResult | null {
    if (this._phase() !== 'fs-spinning') return null;
    const bet = this.bet.amount();
    const result = spin({
      bet,
      rng: this.rng,
      isFreeSpin: true,
      startingMultiplier: this._fsMultiplier(),
    });
    this._currentResult.set(result);
    return result;
  }
}
