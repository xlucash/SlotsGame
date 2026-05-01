import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { GameService } from '../../../core/services/game.service';

const VISIBLE_MS = 1800;

/**
 * Big celebratory popup that fires every time the player wins free spins,
 * either via organic scatter trigger or in-bonus retrigger. Reads the
 * `fsAwardCounter` signal as a ping — every increment shows the popup with
 * the current `fsAwardAmount`.
 */
@Component({
  selector: 'app-fs-award-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="halo" aria-hidden="true"></div>
      <div class="popup" role="status" aria-live="polite" [attr.data-key]="ping()">
        <div class="emblem" aria-hidden="true">
          <svg viewBox="0 0 80 80" width="92" height="92">
            <defs>
              <radialGradient id="award-bg" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#ffe066"/>
                <stop offset="55%" stop-color="#8c6420"/>
                <stop offset="100%" stop-color="#1a1108"/>
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="36" fill="url(#award-bg)" stroke="#ffd97a" stroke-width="2"/>
            <circle cx="40" cy="40" r="28" fill="none" stroke="#ffd97a" stroke-width="0.7" stroke-dasharray="1.5 2.5"/>
            <!-- Crossed shotguns -->
            <g stroke="#1a1108" stroke-width="1.4" fill="#0a0806">
              <rect x="6" y="38" width="68" height="4" rx="1.5" transform="rotate(-32 40 40)"/>
              <rect x="6" y="38" width="68" height="4" rx="1.5" transform="rotate(32 40 40)"/>
              <rect x="6" y="34" width="18" height="12" rx="2" fill="#5a3a1a" transform="rotate(-32 40 40)"/>
              <rect x="6" y="34" width="18" height="12" rx="2" fill="#5a3a1a" transform="rotate(32 40 40)"/>
            </g>
            <!-- Star burst -->
            <path d="M40 12 L43 38 L66 40 L43 42 L40 68 L37 42 L14 40 L37 38 Z"
                  fill="#ffe066" stroke="#8c6420" stroke-width="0.6" opacity="0.9"/>
            <circle cx="40" cy="40" r="3" fill="#c9543a"/>
          </svg>
        </div>
        <div class="text">
          <span class="plus">+{{ amount() }}</span>
          <span class="label">Free Spins</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute; inset: 0;
      display: grid; place-items: center;
      pointer-events: none;
      z-index: 8;
    }
    .halo {
      position: absolute; inset: 0;
      background: radial-gradient(circle at center, rgba(255, 217, 122, 0.28) 0%, transparent 55%);
      animation: haloIn 0.5s ease-out, haloOut 0.6s ease-in 1.2s forwards;
    }
    .popup {
      position: relative;
      display: flex; align-items: center; gap: 22px;
      padding: 22px 36px 22px 28px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255,217,122,0.22), transparent 70%),
        linear-gradient(180deg, rgba(20,17,13,0.95) 0%, rgba(8,6,4,0.95) 100%);
      border: 2px solid var(--brass-bright);
      box-shadow:
        0 0 80px rgba(255, 217, 122, 0.55),
        inset 0 1px 0 rgba(255, 217, 122, 0.4),
        inset 0 0 32px rgba(0,0,0,0.3),
        0 0 0 1px var(--brass-deep);
      color: #fff;
      animation: rise 0.55s cubic-bezier(0.18, 1.0, 0.3, 1.18),
                 fadeOut 0.6s ease-in 1.2s forwards;
    }
    .emblem {
      filter: drop-shadow(0 6px 20px rgba(255,217,122,0.55));
      animation: emblemSpin 1.6s ease-out;
    }
    .text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1; }
    .plus {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 64px;
      color: var(--gold);
      text-shadow:
        0 3px 0 var(--wood-dark),
        0 0 32px rgba(255,217,122,0.65),
        0 0 64px rgba(255,217,122,0.3);
      letter-spacing: 0.5px;
      animation: plusPop 0.75s cubic-bezier(0.2, 0.8, 0.3, 1.3);
    }
    .label {
      margin-top: 4px;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 22px;
      letter-spacing: 4px;
      color: var(--ruby-glow);
      text-transform: uppercase;
      text-shadow:
        0 2px 0 var(--ruby-deep),
        0 0 22px rgba(255,123,74,0.55);
    }
    @keyframes rise {
      0%   { opacity: 0; transform: translateY(20px) scale(0.7); }
      55%  { opacity: 1; transform: translateY(0) scale(1.12); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeOut {
      to { opacity: 0; transform: translateY(-12px) scale(0.96); }
    }
    @keyframes haloIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes haloOut { to   { opacity: 0; } }
    @keyframes plusPop {
      0%   { transform: scale(0.5); }
      60%  { transform: scale(1.32); }
      100% { transform: scale(1); }
    }
    @keyframes emblemSpin {
      0%   { transform: rotate(-90deg) scale(0.5); }
      100% { transform: rotate(0deg) scale(1); }
    }
  `],
})
export class FsAwardPopupComponent {
  protected readonly game = inject(GameService);

  protected readonly amount = signal(0);
  protected readonly ping = signal(0);
  protected readonly visible = computed(() => this.ping() > 0);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTimer());

    // Watch the service's award counter; each change triggers a popup.
    effect(() => {
      const counter = this.game.fsAwardCounter();
      if (counter === 0) return;
      // Read amount untracked so the effect only re-runs when the counter ticks.
      const amt = untracked(() => this.game.fsAwardAmount());
      this.amount.set(amt);
      this.ping.update((v) => v + 1);
      this.cancelTimer();
      this.dismissTimer = setTimeout(() => this.ping.set(0), VISIBLE_MS);
    });
  }

  private cancelTimer(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
