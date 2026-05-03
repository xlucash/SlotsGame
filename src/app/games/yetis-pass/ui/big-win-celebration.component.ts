import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CounterComponent } from '../../../shared/ui/counter.component';

interface Tier {
  readonly id: string;
  readonly title: string;
  readonly threshold: number;       // win >= threshold * bet
  readonly accent: string;
  readonly secondary: string;
  readonly counterDuration: number; // seconds for the counter tween
  readonly dwellMs: number;         // wait *after* counter finishes before auto-close
}

/**
 * Tiers tuned for Yeti's Pass. Thresholds match Hunter's Cluster so the two
 * games feel consistent in pacing; the palette steps from ice blue → aurora
 * cyan → silver white → pale gold to match the Himalayan theme.
 */
const TIERS: readonly Tier[] = [
  { id: 'big',       title: 'BIG WIN',       threshold: 10,  accent: '#9ad6e8', secondary: '#1a3548', counterDuration: 2.4, dwellMs: 3000 },
  { id: 'mega',      title: 'MEGA WIN',      threshold: 25,  accent: '#5eb6d0', secondary: '#0f2c40', counterDuration: 2.8, dwellMs: 3500 },
  { id: 'super',     title: 'SUPER WIN',     threshold: 50,  accent: '#aef0ff', secondary: '#173a52', counterDuration: 3.4, dwellMs: 4000 },
  { id: 'epic',      title: 'EPIC WIN',      threshold: 100, accent: '#e6f4fa', secondary: '#274a64', counterDuration: 4.0, dwellMs: 5000 },
  { id: 'legendary', title: 'LEGENDARY WIN', threshold: 250, accent: '#ffe6a8', secondary: '#3a2c10', counterDuration: 4.6, dwellMs: 6000 },
];

interface ActiveCelebration {
  tier: Tier;
  amount: number;
}

type Phase = 'counting' | 'dwelling';

/**
 * Yeti's Pass big-win celebration. Mirrors the Hunter's Cluster popup but
 * with the Himalayan ice palette and a snowflake/peak emblem instead of a
 * starburst. Click during counting → snap to final value; click during
 * dwell → close. Auto-close timer only starts after the counter finishes.
 */
@Component({
  selector: 'app-yeti-big-win-celebration',
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
        <div class="snow" aria-hidden="true">
          @for (f of snowflakes; track f.i) {
            <span class="flake"
                  [style.left.%]="f.left"
                  [style.animation-delay.s]="f.delay"
                  [style.animation-duration.s]="f.duration"></span>
          }
        </div>
        <div class="card">
          <div class="emblem" aria-hidden="true">
            <svg viewBox="0 0 120 120" width="104" height="104">
              <defs>
                <radialGradient id="yp-bw-bg" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" [attr.stop-color]="a.tier.accent"/>
                  <stop offset="55%" [attr.stop-color]="a.tier.secondary"/>
                  <stop offset="100%" stop-color="#04090d"/>
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="56" fill="url(#yp-bw-bg)" [attr.stroke]="a.tier.accent" stroke-width="2.5"/>
              <circle cx="60" cy="60" r="44" fill="none" [attr.stroke]="a.tier.accent" stroke-width="0.8" stroke-dasharray="2 3"/>
              <!-- Six-arm snowflake -->
              <g [attr.stroke]="a.tier.accent" stroke-width="2.4" stroke-linecap="round" fill="none">
                <line x1="60" y1="22" x2="60" y2="98"/>
                <line x1="27" y1="40" x2="93" y2="80"/>
                <line x1="93" y1="40" x2="27" y2="80"/>
                <!-- Arm decorations -->
                <path d="M60 30 L54 36 M60 30 L66 36 M60 90 L54 84 M60 90 L66 84"/>
                <path d="M33 44 L39 41 L36 47 M87 76 L81 79 L84 73"/>
                <path d="M87 44 L81 41 L84 47 M33 76 L39 79 L36 73"/>
              </g>
              <!-- Mountain peak overlay (front) -->
              <path d="M40 76 L50 60 L58 70 L70 50 L82 76 Z"
                    [attr.fill]="a.tier.accent"
                    [attr.stroke]="a.tier.secondary"
                    stroke-width="1"
                    opacity="0.95"/>
              <path d="M50 60 L52 58 L54 62 M70 50 L74 48 L78 56"
                    fill="#fff" opacity="0.95"/>
              <!-- Center medallion -->
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
        radial-gradient(circle at center, rgba(5, 16, 26, 0.55) 0%, rgba(2, 6, 10, 0.94) 70%);
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
          rgba(154, 214, 232, 0.04) 4deg,
          transparent 8deg,
          rgba(154, 214, 232, 0.10) 14deg,
          transparent 22deg);
      animation: spinRays 22s linear infinite;
      mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
      filter: drop-shadow(0 0 60px var(--accent));
    }
    /* Falling snowflakes ambient layer — light, slow drift, stays out of the
       way of the counter readability. */
    .snow {
      position: absolute; inset: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .flake {
      position: absolute;
      top: -12px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      opacity: 0.55;
      animation-name: flakeFall;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
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
      animation: emblemPulse 2.0s ease-in-out infinite;
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
      font-size: 0.32em; opacity: 0.75;
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
    @keyframes flakeFall {
      from { transform: translateY(-20px) translateX(0); opacity: 0; }
      10%  { opacity: 0.55; }
      90%  { opacity: 0.45; }
      to   { transform: translateY(120vh) translateX(40px); opacity: 0; }
    }
    @keyframes cardIn {
      0%   { opacity: 0; transform: translateY(20px) scale(0.7); }
      55%  { opacity: 1; transform: translateY(0) scale(1.08); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes titlePop {
      0%   { opacity: 0; transform: scale(0.4) rotate(-6deg); }
      60%  { opacity: 1; transform: scale(1.16) rotate(2deg); }
      100% { opacity: 1; transform: scale(1) rotate(0); }
    }
    @keyframes titleBeat {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.04); }
    }
    @keyframes emblemPulse {
      0%, 100% { transform: scale(1)    rotate(0deg);  filter: drop-shadow(0 0 24px var(--accent)) drop-shadow(0 8px 24px rgba(0,0,0,0.6)); }
      50%      { transform: scale(1.05) rotate(180deg); filter: drop-shadow(0 0 48px var(--accent)) drop-shadow(0 8px 24px rgba(0,0,0,0.6)); }
    }
    @keyframes hintFade {
      0%, 100% { opacity: 0.35; }
      50%      { opacity: 0.7;  }
    }
  `],
})
export class YetiBigWinCelebrationComponent {
  protected readonly active = signal<ActiveCelebration | null>(null);
  protected readonly version = signal(0);
  protected readonly phase = signal<Phase>('counting');
  /**
   * Pre-computed flake positions/timings. Keeping the maths in TypeScript
   * sidesteps CSS `calc()` quirks (the modulo operator isn't standard) that
   * could otherwise drop the whole stylesheet on stricter parsers — which
   * would leave only the bare counter text visible at the bottom of the
   * shell instead of a centered overlay.
   */
  protected readonly snowflakes = Array.from({ length: 22 }, (_, i) => ({
    i,
    left: ((i * 7.3) % 100),
    delay: i * -0.43,
    duration: 6 + i * 0.31,
  }));

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
    });
  }

  protected onCounterDone(): void {
    if (this.phase() !== 'counting') return;
    this.phase.set('dwelling');
    const tier = this.active()?.tier;
    if (!tier) return;
    this.dismissTimer = setTimeout(() => this.dismiss(), tier.dwellMs);
  }

  protected onClick(): void {
    if (!this.active()) return;
    if (this.phase() === 'counting') {
      this.counterRef?.skip();
      return;
    }
    this.dismiss();
  }

  /** True while the celebration overlay is on screen. */
  isActive(): boolean { return this.active() !== null; }

  /**
   * Keyboard-driven equivalent of clicking the overlay: snap the counter to
   * its final value during the counting phase, then close on the next press.
   * Hosts use this so Enter/Space short-circuits the celebration the same
   * way clicks do.
   */
  skipOrDismiss(): void { this.onClick(); }

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
