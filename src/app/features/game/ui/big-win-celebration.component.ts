import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CounterComponent } from './counter.component';

interface Tier {
  readonly id: string;
  readonly title: string;
  readonly threshold: number;       // win >= threshold * bet
  readonly accent: string;
  readonly secondary: string;
  readonly counterDuration: number; // seconds for the counter tween
  readonly dwellMs: number;         // wait *after* counter finishes before auto-close
}

const TIERS: readonly Tier[] = [
  { id: 'big',       title: 'BIG WIN',       threshold: 10,  accent: '#ffd97a', secondary: '#8c6420', counterDuration: 2.4, dwellMs: 3000 },
  { id: 'mega',      title: 'MEGA WIN',      threshold: 25,  accent: '#ff9a4a', secondary: '#8b3a14', counterDuration: 2.8, dwellMs: 3500 },
  { id: 'super',     title: 'SUPER WIN',     threshold: 50,  accent: '#ff6a3a', secondary: '#5a1a08', counterDuration: 3.4, dwellMs: 4000 },
  { id: 'epic',      title: 'EPIC WIN',      threshold: 100, accent: '#ff3a4a', secondary: '#3a0612', counterDuration: 4.0, dwellMs: 5000 },
  { id: 'legendary', title: 'LEGENDARY WIN', threshold: 250, accent: '#ffe066', secondary: '#3a1a00', counterDuration: 4.6, dwellMs: 6000 },
];

interface ActiveCelebration {
  tier: Tier;
  amount: number;
}

type Phase = 'counting' | 'dwelling';

/**
 * Awaitable big-win celebration. Caller invokes `play(totalWin, bet)`; the
 * returned promise resolves when the player dismisses the popup.
 *
 * Click behavior:
 *  - First click while counter is still ticking: snap counter to final value
 *    (entering the dwell phase).
 *  - Second click (or any click during dwell): close.
 *
 * The auto-close timer only starts AFTER the counter finishes — never during
 * the counting animation — so the player always gets to see the final amount.
 */
@Component({
  selector: 'app-big-win-celebration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent],
  template: `
    @if (active(); as a) {
      <div class="overlay"
           [style.--accent]="a.tier.accent"
           [style.--secondary]="a.tier.secondary"
           (click)="onClick()">
        <div class="rays" aria-hidden="true"></div>
        <div class="card">
          <div class="emblem" aria-hidden="true">
            <svg viewBox="0 0 120 120" width="100" height="100">
              <defs>
                <radialGradient id="bw-bg" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" [attr.stop-color]="a.tier.accent"/>
                  <stop offset="55%" [attr.stop-color]="a.tier.secondary"/>
                  <stop offset="100%" stop-color="#0a0806"/>
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="56" fill="url(#bw-bg)" [attr.stroke]="a.tier.accent" stroke-width="2.5"/>
              <circle cx="60" cy="60" r="44" fill="none" [attr.stroke]="a.tier.accent" stroke-width="0.8" stroke-dasharray="2 3"/>
              <path d="M60 16 L64 56 L104 60 L64 64 L60 104 L56 64 L16 60 L56 56 Z"
                    [attr.fill]="a.tier.accent"
                    [attr.stroke]="a.tier.secondary"
                    stroke-width="1"/>
              <circle cx="60" cy="60" r="6" [attr.fill]="a.tier.secondary"/>
              <circle cx="60" cy="60" r="2.5" [attr.fill]="a.tier.accent"/>
            </svg>
          </div>

          <h1 class="title" [attr.data-key]="version()">{{ a.tier.title }}</h1>

          <div class="amount">
            <app-counter #counter
                         [value]="a.amount"
                         [duration]="a.tier.counterDuration"
                         (done)="onCounterDone()"></app-counter>
            <em>PLN</em>
          </div>

          <span class="hint">{{ phase() === 'counting' ? 'click to skip' : 'click to close' }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 220;
    }
    .overlay {
      position: fixed; inset: 0;
      background:
        radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 70%);
      pointer-events: auto;
      display: grid; place-items: center;
      animation: overlayIn 0.35s ease-out;
      backdrop-filter: blur(4px);
    }
    .rays {
      position: absolute; inset: -25%;
      background:
        repeating-conic-gradient(from 0deg,
          transparent 0deg,
          rgba(255, 217, 122, 0.04) 4deg,
          transparent 8deg,
          rgba(255, 217, 122, 0.10) 14deg,
          transparent 22deg);
      animation: spinRays 18s linear infinite;
      mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
      filter: drop-shadow(0 0 60px var(--accent));
    }
    .card {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      gap: 18px;
      padding: 36px 56px 28px;
      animation: cardIn 0.55s cubic-bezier(0.18, 1.0, 0.30, 1.18);
    }
    .emblem {
      filter: drop-shadow(0 0 32px var(--accent)) drop-shadow(0 8px 24px rgba(0,0,0,0.6));
      animation: emblemPulse 1.6s ease-in-out infinite;
    }
    .title {
      margin: 0;
      font-family: var(--font-brand); font-weight: 900;
      font-size: clamp(48px, 9vw, 120px);
      letter-spacing: 6px;
      color: var(--accent);
      text-shadow:
        0 4px 0 var(--secondary),
        0 6px 0 #000,
        0 0 32px var(--accent),
        0 0 80px var(--accent);
      line-height: 0.95;
      text-align: center;
      animation: titlePop 0.85s cubic-bezier(0.2, 0.8, 0.3, 1.4),
                 titleBeat 1.6s ease-in-out 0.85s infinite;
    }
    .amount {
      display: inline-flex; align-items: baseline; gap: 10px;
      font-family: var(--font-brand); font-weight: 900;
      font-size: clamp(40px, 6vw, 78px);
      color: #fff;
      text-shadow:
        0 3px 0 var(--secondary),
        0 0 28px var(--accent),
        0 0 56px var(--accent);
      letter-spacing: 1.5px;
      font-variant-numeric: tabular-nums;
    }
    .amount em {
      font-style: normal;
      font-size: 0.32em; opacity: 0.7;
      letter-spacing: 3px;
      color: var(--accent);
    }
    .hint {
      margin-top: 12px;
      font-size: 11px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      opacity: 0.55;
      color: var(--bone);
      animation: hintFade 1.4s ease-in-out infinite;
    }
    @keyframes overlayIn   { from { opacity: 0; } to { opacity: 1; } }
    @keyframes spinRays    { to { transform: rotate(360deg); } }
    @keyframes cardIn {
      0%   { opacity: 0; transform: translateY(20px) scale(0.7); }
      55%  { opacity: 1; transform: translateY(0) scale(1.08); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes titlePop {
      0%   { opacity: 0; transform: scale(0.4) rotate(-8deg); }
      60%  { opacity: 1; transform: scale(1.18) rotate(2deg); }
      100% { opacity: 1; transform: scale(1) rotate(0); }
    }
    @keyframes titleBeat {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.04); }
    }
    @keyframes emblemPulse {
      0%, 100% { transform: scale(1)   rotate(0deg);  filter: drop-shadow(0 0 22px var(--accent)) drop-shadow(0 8px 24px rgba(0,0,0,0.6)); }
      50%      { transform: scale(1.08) rotate(8deg); filter: drop-shadow(0 0 44px var(--accent)) drop-shadow(0 8px 24px rgba(0,0,0,0.6)); }
    }
    @keyframes hintFade {
      0%, 100% { opacity: 0.35; }
      50%      { opacity: 0.7;  }
    }
  `],
})
export class BigWinCelebrationComponent {
  protected readonly active = signal<ActiveCelebration | null>(null);
  protected readonly version = signal(0);
  protected readonly phase = signal<Phase>('counting');

  @ViewChild('counter') private counterRef?: CounterComponent;

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveFn: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTimer());
  }

  /**
   * Play the celebration if `totalWin` clears the lowest tier threshold.
   * Resolves when the player dismisses (or the dwell timer fires).
   */
  play(totalWin: number, bet: number): Promise<void> {
    const tier = this.tierFor(totalWin / Math.max(bet, 1e-9));
    if (!tier) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.resolveFn = resolve;
      this.cancelTimer();
      this.phase.set('counting');
      this.active.set({ tier, amount: totalWin });
      this.version.update((v) => v + 1);
      // No timer started here — the dwell timer starts when onCounterDone fires.
    });
  }

  /**
   * Counter finished its tween (ease-out completion or `skip()`). Move to the
   * dwell phase and start the auto-close timer.
   */
  protected onCounterDone(): void {
    if (this.phase() !== 'counting') return;
    this.phase.set('dwelling');
    const tier = this.active()?.tier;
    if (!tier) return;
    this.dismissTimer = setTimeout(() => this.dismiss(), tier.dwellMs);
  }

  /**
   * Click anywhere on the celebration:
   *  - During 'counting': snap the counter to the final value (the counter's
   *    `done` callback fires synchronously and transitions to 'dwelling').
   *  - During 'dwelling': close the popup.
   */
  protected onClick(): void {
    if (!this.active()) return;
    if (this.phase() === 'counting') {
      this.counterRef?.skip();
      return;
    }
    this.dismiss();
  }

  protected dismiss(): void {
    if (!this.active()) return;
    this.cancelTimer();
    this.active.set(null);
    this.phase.set('counting');
    const fn = this.resolveFn;
    this.resolveFn = null;
    fn?.();
  }

  private tierFor(winInBets: number): Tier | null {
    let match: Tier | null = null;
    for (const t of TIERS) {
      if (winInBets >= t.threshold) match = t;
    }
    return match;
  }

  private cancelTimer(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
