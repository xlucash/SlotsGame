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
import { YetiGameService } from '../core/services/game.service';

const VISIBLE_MS = 1800;

/**
 * Yeti's Pass +N FREE SPINS popup. Mirrors the Hunter's Cluster award
 * popup but with the Himalayan ice palette. Reads `fsAwardCounter` as a
 * ping — every increment shows the popup with the current amount, fades
 * out after VISIBLE_MS.
 */
@Component({
  selector: 'app-yeti-fs-award-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="halo" aria-hidden="true"></div>
      <div class="popup" role="status" aria-live="polite" [attr.data-key]="ping()">
        <div class="emblem" aria-hidden="true">
          <svg viewBox="0 0 80 80" width="92" height="92">
            <defs>
              <radialGradient id="yeti-award-bg" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#aef0ff"/>
                <stop offset="55%" stop-color="#1d3a4f"/>
                <stop offset="100%" stop-color="#04101a"/>
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="36" fill="url(#yeti-award-bg)" stroke="#9ad6e8" stroke-width="2"/>
            <circle cx="40" cy="40" r="28" fill="none" stroke="#9ad6e8" stroke-width="0.7" stroke-dasharray="1.5 2.5"/>
            <!-- Six-arm snowflake -->
            <g stroke="#9ad6e8" stroke-width="2" stroke-linecap="round" fill="none">
              <line x1="40" y1="14" x2="40" y2="66"/>
              <line x1="18" y1="26" x2="62" y2="54"/>
              <line x1="62" y1="26" x2="18" y2="54"/>
              <path d="M40 20 L36 24 M40 20 L44 24 M40 60 L36 56 M40 60 L44 56"/>
              <path d="M22 30 L26 28 L24 32 M58 50 L54 52 L56 48"/>
              <path d="M58 30 L54 28 L56 32 M22 50 L26 52 L24 48"/>
            </g>
            <!-- Mountain peak overlay -->
            <path d="M24 52 L34 36 L40 44 L48 30 L56 52 Z"
                  fill="#9ad6e8" stroke="#04101a" stroke-width="1" opacity="0.95"/>
            <circle cx="40" cy="40" r="3" fill="#fff"/>
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
      background: radial-gradient(circle at center, rgba(154,214,232,.28) 0%, transparent 55%);
      animation: haloIn .5s ease-out, haloOut .6s ease-in 1.2s forwards;
    }
    .popup {
      position: relative;
      display: flex; align-items: center; gap: 22px;
      padding: 22px 36px 22px 28px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(154,214,232,.22), transparent 70%),
        linear-gradient(180deg, rgba(8,18,28,.95), rgba(4,9,13,.95));
      border: 2px solid #9ad6e8;
      box-shadow:
        0 0 80px rgba(154,214,232,.55),
        inset 0 1px 0 rgba(154,214,232,.4),
        inset 0 0 32px rgba(0,0,0,.3),
        0 0 0 1px #1d3a4f;
      color: #fff;
      animation: rise .55s cubic-bezier(.18, 1.0, .3, 1.18),
                 fadeOut .6s ease-in 1.2s forwards;
    }
    .emblem {
      filter: drop-shadow(0 6px 20px rgba(154,214,232,.55));
      animation: emblemSpin 1.6s ease-out;
    }
    .text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1; }
    .plus {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 64px;
      color: #9ad6e8;
      text-shadow:
        0 3px 0 #04101a,
        0 0 32px rgba(154,214,232,.65),
        0 0 64px rgba(154,214,232,.3);
      letter-spacing: .5px;
      animation: plusPop .75s cubic-bezier(.2, .8, .3, 1.3);
    }
    .label {
      margin-top: 4px;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 22px;
      letter-spacing: 4px;
      color: #aef0ff;
      text-transform: uppercase;
      text-shadow:
        0 2px 0 #04101a,
        0 0 22px rgba(154,214,232,.55);
    }
    @keyframes rise {
      0% { opacity: 0; transform: translateY(20px) scale(.7); }
      55% { opacity: 1; transform: translateY(0) scale(1.12); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeOut { to { opacity: 0; transform: translateY(-12px) scale(.96); } }
    @keyframes haloIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes haloOut { to { opacity: 0; } }
    @keyframes plusPop {
      0% { transform: scale(.5); }
      60% { transform: scale(1.32); }
      100% { transform: scale(1); }
    }
    @keyframes emblemSpin {
      0% { transform: rotate(-90deg) scale(.5); }
      100% { transform: rotate(0deg) scale(1); }
    }
  `],
})
export class YetiFsAwardPopupComponent {
  protected readonly game = inject(YetiGameService);

  protected readonly amount = signal(0);
  protected readonly ping = signal(0);
  protected readonly visible = computed(() => this.ping() > 0);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTimer());
    effect(() => {
      const counter = this.game.fsAwardCounter();
      if (counter === 0) return;
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
