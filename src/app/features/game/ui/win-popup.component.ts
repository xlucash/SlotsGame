import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { formatPlain } from './format';

const AUTO_DISMISS_MS = 3000;

/**
 * Floating step-win indicator over the grid. Shows a brass-edged badge with
 * payout amount and the active multiplier; auto-fades.
 */
@Component({
  selector: 'app-win-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="popup" [attr.data-key]="counter()">
        <span class="plus">+</span>
        <span class="amt">{{ formatted() }}</span>
        <em>PLN</em>
        @if (multiplier() > 1) {
          <span class="mult">×{{ multiplier() }}</span>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute; inset: 0;
      display: grid; place-items: center;
      pointer-events: none;
      z-index: 6;
    }
    .popup {
      display: flex; align-items: baseline; gap: 10px;
      padding: 18px 32px;
      border-radius: 18px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255,217,122,0.18), transparent 70%),
        linear-gradient(180deg, rgba(20,17,13,0.95) 0%, rgba(8,6,4,0.95) 100%);
      border: 1px solid var(--brass-bright);
      box-shadow:
        0 0 56px rgba(255, 217, 122, 0.4),
        inset 0 1px 0 rgba(255, 217, 122, 0.4),
        inset 0 0 32px rgba(0,0,0,0.3),
        0 0 0 1px var(--brass-deep);
      color: #fff;
      font-family: var(--font-brand);
      animation: pop 0.45s cubic-bezier(0.2, 0.7, 0.25, 1.05) both;
    }
    .plus {
      font-size: 28px; color: var(--gold);
      font-weight: 900;
      text-shadow: 0 0 12px rgba(255,217,122,0.5);
    }
    .amt {
      font-size: 36px; color: var(--gold-glow);
      font-variant-numeric: tabular-nums; font-weight: 900;
      letter-spacing: 0.5px;
      text-shadow: 0 0 18px rgba(255,217,122,0.55);
    }
    em {
      font-style: normal; font-size: 14px;
      opacity: 0.7; letter-spacing: 2px;
      font-family: var(--font-display);
    }
    .mult {
      font-size: 26px; color: var(--ruby-glow); font-weight: 800;
      text-shadow: 0 0 14px rgba(255,123,74,0.55);
      margin-left: 4px;
      animation: multBeat 0.6s ease-out;
    }
    @keyframes pop {
      0%   { opacity: 0; transform: translateY(14px) scale(0.85); }
      40%  { opacity: 1; transform: translateY(0) scale(1.12); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes multBeat {
      0%   { transform: scale(0.7); }
      60%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
  `],
})
export class WinPopupComponent {
  private readonly _amount = signal(0);
  private readonly _multiplier = signal(1);
  private readonly _counter = signal(0);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly amount = this._amount.asReadonly();
  protected readonly multiplier = this._multiplier.asReadonly();
  protected readonly counter = this._counter.asReadonly();
  protected readonly visible = computed(() => this._counter() > 0 && this._amount() > 0);
  /** Per-step popup shows the final amount immediately — no count-up tween. */
  protected readonly formatted = computed(() => formatPlain(this._amount()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTimer());
  }

  show(amount: number, multiplier: number): void {
    this._amount.set(amount);
    this._multiplier.set(multiplier);
    this._counter.update((v) => v + 1);
    // Reset the auto-dismiss timer on every show — back-to-back cluster wins
    // each get the full 3s window after the most recent one lands.
    this.cancelTimer();
    this.dismissTimer = setTimeout(() => this.clear(), AUTO_DISMISS_MS);
  }

  clear(): void {
    this.cancelTimer();
    this._amount.set(0);
    this._multiplier.set(1);
    this._counter.set(0);
  }

  private cancelTimer(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
