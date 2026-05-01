import { ChangeDetectionStrategy, Component, EventEmitter, Output, ViewChild, inject, signal } from '@angular/core';
import { BalanceService } from '../../../core/services/balance.service';
import { BetService } from '../../../core/services/bet.service';
import { GameService } from '../../../core/services/game.service';
import { BONUS_BUY_COST_MULT, DEFAULT_BONUS_SPINS, WHEEL_OUTCOMES } from '../../../core/services/bonus-buy';
import { FortuneWheelComponent } from './fortune-wheel.component';
import { formatPLN } from './format';

type View = 'choose' | 'wheel';

/**
 * Bonus-buy modal. Two views:
 *  - 'choose': single buy card with two CTAs — take the safe 8 spins, or
 *    pay the same and gamble on the fortune wheel for [5..20] spins.
 *  - 'wheel': fortune wheel animates and lands on a result, then a Continue
 *    button starts the FS round.
 *
 * Cost is identical for both paths (the gamble is variance, not value).
 */
@Component({
  selector: 'app-bonus-buy-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FortuneWheelComponent],
  template: `
    <div class="overlay" (click)="onBackdropClick()">
      <div class="modal panel-wood" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="bb-title">
        <button class="close" (click)="close.emit()" aria-label="Close">×</button>

        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 200 14" width="220" height="14">
            <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
            <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
          </svg>
        </div>

        @if (view() === 'choose') {
          <h1 id="bb-title" class="title-engraved">Bonus Buy</h1>
          <p class="sub">Pick your stake — the cost is {{ COST_MULT }}× total bet.</p>

          <div class="stake-row">
            <div class="stake-cell">
              <span class="label">Total Bet</span>
              <div class="stepper">
                <button class="step" (click)="bet.decrease()" [disabled]="!bet.canDecrease()" aria-label="Decrease bet">
                  <svg viewBox="0 0 12 12" width="12" height="12"><rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor"/></svg>
                </button>
                <strong class="num">{{ formatPLN(bet.amount()) }}</strong>
                <button class="step" (click)="bet.increase()" [disabled]="!bet.canIncrease()" aria-label="Increase bet">
                  <svg viewBox="0 0 12 12" width="12" height="12"><rect x="5" y="2" width="2" height="8" rx="1" fill="currentColor"/><rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
            <div class="stake-divider" aria-hidden="true"></div>
            <div class="cost-cell">
              <span class="label">Bonus Cost</span>
              <strong class="cost num">{{ formatPLN(cost()) }}</strong>
            </div>
          </div>

          <div class="paths">
            <div class="path safe">
              <div class="path-emblem">
                <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
                  <circle cx="30" cy="30" r="26" fill="#1a1108" stroke="#ffd97a" stroke-width="2"/>
                  <text x="30" y="38" text-anchor="middle" font-family="Cinzel" font-weight="900" font-size="22" fill="#ffd97a">8</text>
                </svg>
              </div>
              <h2>Take 8 Spins</h2>
              <p>The safe choice. Guaranteed <strong>8 free spins</strong> at multiplier ×1.</p>
              <button class="cta safe-cta"
                      [disabled]="!canAfford()"
                      (click)="onTakeDefault()">
                @if (canAfford()) {
                  <span>BUY · {{ formatPLN(cost()) }}</span>
                } @else {
                  <span>Insufficient balance</span>
                }
              </button>
            </div>

            <div class="path gamble">
              <div class="path-emblem spinning">
                <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
                  <circle cx="30" cy="30" r="26" fill="#1a1108" stroke="#ffd97a" stroke-width="2"/>
                  @for (s of wheelSlicePreview; track $index) {
                    <path [attr.d]="s" fill="#5e2418" stroke="#ffd97a" stroke-width="0.6"/>
                  }
                  <circle cx="30" cy="30" r="6" fill="#ffd97a"/>
                </svg>
              </div>
              <h2>Spin the Wheel</h2>
              <p>Same cost, gamble for <strong>5 – 20 spins</strong>. Average lands at ~8.</p>
              <button class="cta gamble-cta"
                      [disabled]="!canAfford()"
                      (click)="onGamble()">
                <span>SPIN THE WHEEL</span>
              </button>
            </div>
          </div>
        } @else if (view() === 'wheel') {
          <div class="wheel-view">
            <h1 class="title-engraved">Fortune Wheel</h1>
            @if (wheelResult() === null) {
              <p class="sub">May the hunt favor you...</p>
            } @else {
              <p class="sub">Your hunt awaits.</p>
            }

            <app-fortune-wheel #wheel (settled)="onWheelSettled($event)"></app-fortune-wheel>

            @if (wheelResult() !== null) {
              <button class="cta gamble-cta continue"
                      (click)="onContinueWithResult()">
                <span>BEGIN THE HUNT</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; display: block; pointer-events: auto; z-index: 200; }
    .overlay {
      position: fixed; inset: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 100%);
      display: grid; place-items: center;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.25s ease-out;
      z-index: 20;
    }
    .modal {
      position: relative;
      padding: 26px 36px 32px;
      border-radius: 22px;
      max-width: 700px;
      width: calc(100% - 48px);
      color: var(--bone);
      animation: rise 0.35s cubic-bezier(0.2, 0.7, 0.25, 1.05);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.2),
        0 30px 80px rgba(0,0,0,0.7),
        0 0 60px rgba(255,217,122,0.18);
    }
    .close {
      position: absolute; top: 14px; right: 16px;
      width: 32px; height: 32px;
      border: 1px solid var(--brass-deep);
      background: rgba(0,0,0,0.5);
      color: var(--bone);
      font-size: 20px; line-height: 1;
      cursor: pointer; border-radius: 50%;
      transition: filter 0.15s, transform 0.15s;
    }
    .close:hover { filter: brightness(1.4); color: var(--gold); transform: rotate(90deg); }

    .ornament { display: flex; justify-content: center; margin-bottom: 6px; opacity: 0.85; }

    h1 {
      margin: 0 0 6px;
      font-size: 30px;
      text-align: center;
    }
    .sub {
      margin: 0 0 22px;
      opacity: 0.85; font-size: 13px;
      text-align: center;
      letter-spacing: 0.4px;
    }
    .sub .cost { color: var(--gold); font-family: var(--font-display); font-weight: 700; }

    /* ----- choose view ----- */
    .stake-row {
      display: flex; align-items: stretch; justify-content: center;
      gap: 18px;
      padding: 14px 22px;
      margin: 0 auto 22px;
      max-width: 460px;
      border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 100%);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255, 217, 122, 0.18),
        inset 0 0 12px rgba(0, 0, 0, 0.4);
    }
    .stake-cell, .cost-cell {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .stake-cell { flex: 1.1; }
    .cost-cell { flex: 0.9; }
    .label {
      font-size: 9px;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      opacity: 0.65;
      font-weight: 600;
    }
    .stepper {
      display: flex; align-items: center; gap: 6px;
      padding: 3px 5px;
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%);
      border: 1px solid var(--brass-deep);
    }
    .step {
      width: 30px; height: 30px;
      border: 1px solid var(--brass-deep);
      background: linear-gradient(180deg, var(--wood-warm) 0%, var(--wood-mid) 100%);
      color: var(--gold);
      border-radius: 7px;
      cursor: pointer;
      display: grid; place-items: center;
      box-shadow: inset 0 1px 0 rgba(255,217,122,0.22);
      transition: filter 0.1s, transform 0.1s;
    }
    .step:hover:not(:disabled) { filter: brightness(1.25); transform: translateY(-1px); }
    .step:active:not(:disabled) { transform: translateY(0); }
    .step:disabled { opacity: 0.3; cursor: not-allowed; }
    .stepper strong {
      min-width: 92px; text-align: center;
      font-family: var(--font-display); font-weight: 700;
      font-size: 17px; color: #fff;
      letter-spacing: 0.4px;
    }
    .stake-divider {
      width: 1px;
      background: linear-gradient(180deg,
        transparent 0%,
        var(--brass) 30%,
        var(--brass) 70%,
        transparent 100%);
      opacity: 0.5;
    }
    .cost {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 24px;
      color: var(--gold);
      text-shadow: 0 0 18px rgba(255,217,122,0.35);
    }

    .paths {
      display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
    }
    @media (max-width: 600px) { .paths { grid-template-columns: 1fr; } }

    .path {
      position: relative;
      padding: 22px 22px 20px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,217,122,0.05) 0%, rgba(0,0,0,0.45) 100%);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255, 217, 122, 0.22),
        0 8px 28px rgba(0,0,0,0.45);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      text-align: center;
      transition: transform 0.18s ease, box-shadow 0.18s, filter 0.18s;
    }
    .path::before, .path::after {
      content: '';
      position: absolute;
      width: 14px; height: 14px;
      opacity: 0.7;
    }
    .path::before { top: 8px; left: 8px; border-top: 1px solid var(--brass); border-left: 1px solid var(--brass); }
    .path::after { bottom: 8px; right: 8px; border-bottom: 1px solid var(--brass); border-right: 1px solid var(--brass); }
    .path:hover {
      transform: translateY(-3px);
      filter: brightness(1.06);
      box-shadow:
        inset 0 1px 0 rgba(255, 217, 122, 0.4),
        0 14px 36px rgba(0,0,0,0.6),
        0 0 22px rgba(255, 217, 122, 0.25);
    }
    .path.gamble {
      background: linear-gradient(180deg, rgba(201,84,42,0.18) 0%, rgba(0,0,0,0.5) 100%);
      border-color: var(--ruby-bright);
    }
    .path-emblem {
      filter: drop-shadow(0 4px 12px rgba(255,217,122,0.35));
    }
    .path-emblem.spinning svg { animation: emblemRotate 8s linear infinite; }

    .path h2 {
      margin: 0;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 22px;
      letter-spacing: 1.5px;
      color: var(--gold);
      text-transform: uppercase;
    }
    .path.gamble h2 { color: var(--ruby-glow); }
    .path > p { margin: 0; opacity: 0.85; font-size: 13px; line-height: 1.45; }
    .path > p strong { color: var(--gold); font-weight: 700; }

    .cta {
      margin-top: 4px;
      padding: 14px 28px;
      border-radius: 999px;
      border: 1px solid var(--brass);
      background:
        linear-gradient(180deg, var(--brass) 0%, rgba(0,0,0,0.5) 200%);
      color: #fff;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 14px;
      letter-spacing: 2px;
      cursor: pointer;
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.3),
        inset 0 -3px 6px rgba(0,0,0,0.45),
        0 6px 16px rgba(0,0,0,0.45);
      transition: filter 0.1s, transform 0.1s;
    }
    .cta:hover:not(:disabled) { filter: brightness(1.18); transform: translateY(-1px); }
    .cta:disabled { opacity: 0.55; cursor: not-allowed; background: rgba(0,0,0,0.4); }
    .gamble-cta {
      border-color: var(--ruby-bright);
      background:
        linear-gradient(180deg, var(--ruby-bright) 0%, var(--ruby-deep) 100%);
    }
    .continue { margin-top: 12px; }

    /* ----- wheel view ----- */
    .wheel-view {
      display: flex; flex-direction: column; align-items: center;
      gap: 0;
    }
    .wheel-view h1, .wheel-view .sub { width: 100%; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rise {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes emblemRotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      .modal { padding: 18px 18px 22px; }
      h1 { font-size: 22px; }
      .sub { font-size: 12px; margin-bottom: 14px; }
      .stake-row { padding: 10px 14px; gap: 12px; margin-bottom: 16px; }
      .stepper strong { font-size: 14px; min-width: 76px; }
      .step { width: 28px; height: 28px; }
      .cost { font-size: 18px; }
      .path { padding: 14px 14px 12px; }
      .path-emblem svg { width: 44px; height: 44px; }
      .path h2 { font-size: 18px; }
      .path > p { font-size: 12px; }
      .features { gap: 18px; padding: 8px 0; }
      .features strong { font-size: 18px; }
      .cta { padding: 12px 18px; font-size: 12px; letter-spacing: 1.5px; }
    }
  `],
})
export class BonusBuyModalComponent {
  protected readonly balance = inject(BalanceService);
  protected readonly bet = inject(BetService);
  protected readonly game = inject(GameService);
  protected readonly formatPLN = formatPLN;
  protected readonly COST_MULT = BONUS_BUY_COST_MULT;

  @Output() readonly buy = new EventEmitter<number>(); // emits the spin count to award
  @Output() readonly close = new EventEmitter<void>();
  @ViewChild('wheel') private wheel?: FortuneWheelComponent;

  protected readonly view = signal<View>('choose');
  protected readonly wheelResult = signal<number | null>(null);

  // Pre-computed slice paths for the small wheel preview shown on the gamble card.
  protected readonly wheelSlicePreview = (() => {
    const r = 26;
    const segments = WHEEL_OUTCOMES.length;
    const arcs: string[] = [];
    let a0 = -Math.PI / 2;
    const totalW = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
    for (const o of WHEEL_OUTCOMES) {
      const da = (o.weight / totalW) * Math.PI * 2;
      const a1 = a0 + da;
      const x0 = 30 + Math.cos(a0) * r;
      const y0 = 30 + Math.sin(a0) * r;
      const x1 = 30 + Math.cos(a1) * r;
      const y1 = 30 + Math.sin(a1) * r;
      const large = da > Math.PI ? 1 : 0;
      arcs.push(`M30 30 L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`);
      a0 = a1;
    }
    return arcs;
  })();

  protected cost(): number { return this.bet.amount() * BONUS_BUY_COST_MULT; }
  protected canAfford(): boolean { return this.balance.balance() >= this.cost(); }

  protected onBackdropClick(): void {
    // Don't allow backdrop dismiss while wheel is mid-spin (no result yet).
    if (this.view() === 'wheel' && this.wheelResult() === null) return;
    this.close.emit();
  }

  protected onTakeDefault(): void {
    if (!this.canAfford()) return;
    this.buy.emit(DEFAULT_BONUS_SPINS);
  }

  protected onGamble(): void {
    if (!this.canAfford()) return;
    this.view.set('wheel');
    this.wheelResult.set(null);
    // Wait one frame so the wheel component initializes, then spin it.
    queueMicrotask(() => requestAnimationFrame(() => this.wheel?.spin()));
  }

  protected onWheelSettled(spins: number): void {
    this.wheelResult.set(spins);
  }

  protected onContinueWithResult(): void {
    const r = this.wheelResult();
    if (r === null) return;
    this.buy.emit(r);
  }
}
