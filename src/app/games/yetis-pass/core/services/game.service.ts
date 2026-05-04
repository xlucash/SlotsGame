import { Injectable, computed, inject, signal } from '@angular/core';
import { BalanceService } from '../../../../shared/services/balance.service';
import { BetService } from '../../../../shared/services/bet.service';
import { MathRng } from '../../../../shared/math/rng';
import { makeBonusBuyTriggerSpin, spin } from '../math/engine';
import { FREE_SPINS_TRIGGER_COUNT } from '../math/paytable';
import type { PersistentWild, SpinResult } from '../math/types';

export type GamePhase = 'idle' | 'spinning' | 'fs-intro' | 'fs-spinning' | 'fs-outro';

/**
 * Game-state machine for Yeti's Pass. Mirrors the shape of Hunter's Cluster's
 * GameService (phase / lastWin / FS counters / spinOnce + commitSpin) so the
 * renderer can drive both games with the same orchestration pattern, but
 * tracks paylines- and persistent-wild-specific state instead of cluster
 * tumble state.
 */
@Injectable({ providedIn: 'root' })
export class YetiGameService {
  private readonly balance = inject(BalanceService);
  private readonly bet = inject(BetService);
  private readonly rng = new MathRng();

  private readonly _phase = signal<GamePhase>('idle');
  readonly phase = this._phase.asReadonly();

  private readonly _freeSpinsLeft = signal(0);
  readonly freeSpinsLeft = this._freeSpinsLeft.asReadonly();

  /** Persistent wild reels active this FS round. */
  private readonly _persistentWilds = signal<ReadonlyArray<PersistentWild>>([]);
  readonly persistentWilds = this._persistentWilds.asReadonly();

  private readonly _fsTotalWin = signal(0);
  readonly fsTotalWin = this._fsTotalWin.asReadonly();

  private readonly _lastWin = signal(0);
  readonly lastWin = this._lastWin.asReadonly();

  /** Current spin result, awaiting its visual sequence to commit. */
  private readonly _currentResult = signal<SpinResult | null>(null);
  readonly currentResult = this._currentResult.asReadonly();

  /**
   * Transient FS-award announcement for the +N FREE SPINS popup. The
   * counter increments each time `commitSpin` detects a triggered or
   * retriggered FS award.
   */
  private readonly _fsAwardAmount = signal(0);
  private readonly _fsAwardCounter = signal(0);
  readonly fsAwardAmount = this._fsAwardAmount.asReadonly();
  readonly fsAwardCounter = this._fsAwardCounter.asReadonly();

  readonly inFreeSpins = computed(
    () => this._phase() === 'fs-spinning'
       || this._phase() === 'fs-intro'
       || this._phase() === 'fs-outro',
  );
  readonly canSpin = computed(
    () => this._phase() === 'idle' && this.balance.balance() >= this.bet.amount(),
  );

  /** Run one spin. Returns the model result for the renderer to play out. */
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
   * Called by the renderer when the visual sequence finishes. Awards win,
   * advances FS state machine, fires the +N popup if a trigger landed.
   */
  commitSpin(): void {
    const result = this._currentResult();
    if (!result) return;

    if (!result.isFreeSpin) {
      this._lastWin.set(result.totalWin);
      this.balance.credit(result.totalWin);
      if (result.triggeredFreeSpins > 0) {
        // Initial trigger: the FS-intro overlay + bonus-intro cinematic
        // already announce "you won free spins"; no separate +N popup.
        this._freeSpinsLeft.set(result.triggeredFreeSpins);
        this._persistentWilds.set([]);
        this._fsTotalWin.set(0);
        this._phase.set('fs-intro');
      } else {
        this._phase.set('idle');
      }
    } else {
      this._fsTotalWin.update((v) => v + result.totalWin);
      this._persistentWilds.set(result.endPersistentWilds);
      if (result.triggeredFreeSpins > 0) {
        // Retrigger inside FS — this is the only path that should fire the
        // +N FREE SPINS popup, since the player hit fresh scatters and
        // gained additional spins mid-round.
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

  /** Cost of bonus buy in × current bet. */
  readonly BONUS_BUY_COST_MULT = 60;
  /** Free spins awarded by a bonus buy. */
  readonly BONUS_BUY_FS_COUNT = 10;

  bonusCost(): number { return this.bet.amount() * this.BONUS_BUY_COST_MULT; }

  /**
   * Build a visual-only spin result that lands a few scatters on the board.
   * Used by the bonus-buy flow to play a fake trigger animation instead of
   * teleporting the player straight into the bonus intro. Pays nothing —
   * the cost was debited by `buyBonus()`. Always uses the trigger threshold
   * + 1 so the celebration reads unambiguously as "this triggered the bonus".
   */
  makeBonusBuyVisualSpin(): SpinResult {
    return makeBonusBuyTriggerSpin({
      bet: this.bet.amount(),
      rng: this.rng,
      scattersCount: FREE_SPINS_TRIGGER_COUNT + 1,
      freeSpinsAwarded: this.BONUS_BUY_FS_COUNT,
    });
  }

  /**
   * Hand-off from the bonus-buy visual spin: any wild that expanded
   * during the fake-trigger animation needs to become an active
   * persistent wild for the FS round. The visual spin doesn't go
   * through commitSpin (it'd credit fake wins / advance counters), so
   * the host calls this after the animation finishes.
   */
  applyBuyVisualPersistentWilds(wilds: ReadonlyArray<PersistentWild>): void {
    if (wilds.length === 0) return;
    this._persistentWilds.set(wilds);
  }

  /**
   * Buy the bonus directly: debit cost, drop player straight into the
   * spinning state — bypassing the `fs-intro` phase (and therefore the
   * "Through the Pass / Begin the Climb" overlay). The host plays a
   * fake-trigger spin + cinematic intro before kicking the chain; nothing
   * here should land them on the overlay.
   */
  buyBonus(): boolean {
    if (this._phase() !== 'idle') return false;
    const cost = this.bonusCost();
    if (!this.balance.debit(cost)) return false;
    this._lastWin.set(0);
    this._fsTotalWin.set(0);
    this._persistentWilds.set([]);
    this._freeSpinsLeft.set(this.BONUS_BUY_FS_COUNT);
    this._phase.set('fs-spinning');
    // No +N popup here — the bonus-intro cinematic announces the round.
    return true;
  }

  startFreeSpins(): void {
    if (this._phase() === 'fs-intro') this._phase.set('fs-spinning');
  }

  finishFreeSpins(): void {
    if (this._phase() === 'fs-outro') {
      this._freeSpinsLeft.set(0);
      this._persistentWilds.set([]);
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
      persistentWilds: this._persistentWilds(),
    });
    this._currentResult.set(result);
    return result;
  }
}
