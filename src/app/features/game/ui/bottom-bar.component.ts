import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { BalanceService } from '../../../shared/services/balance.service';
import { BetService } from '../../../shared/services/bet.service';
import { GameService } from '../../../core/services/game.service';
import { CounterComponent } from '../../../shared/ui/counter.component';
import { formatPLN } from '../../../shared/util/format';

const AUTO_PRESETS: readonly number[] = [10, 25, 50, 100, 250];

@Component({
  selector: 'app-bottom-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent],
  template: `
    <footer class="bottom-bar bar-rail bar-rail--bottom">
      <div class="cluster bet-cluster">
        <span class="label">Total Bet</span>
        <div class="stepper">
          <button class="step" (click)="bet.decrease()" [disabled]="!bet.canDecrease() || !canChangeBet()" aria-label="Decrease bet">
            <svg viewBox="0 0 12 12" width="14" height="14"><rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor"/></svg>
          </button>
          <strong class="num">{{ formatPLN(bet.amount()) }}</strong>
          <button class="step" (click)="bet.increase()" [disabled]="!bet.canIncrease() || !canChangeBet()" aria-label="Increase bet">
            <svg viewBox="0 0 12 12" width="14" height="14"><rect x="5" y="2" width="2" height="8" rx="1" fill="currentColor"/><rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor"/></svg>
          </button>
        </div>
      </div>

      <div class="spin-cluster">
        <!-- Auto-spin satellite: opens count menu, or shows the live counter while running. -->
        <div class="auto-wrap">
          @if (autoActive) {
            <button class="auto-btn auto-running" (click)="stopAuto.emit()" aria-label="Stop auto-spin">
              <span class="lbl">STOP</span>
              <span class="num">{{ autoRemainingDisplay() }}</span>
            </button>
          } @else {
            <button class="auto-btn"
                    [disabled]="!canStartAuto()"
                    (click)="autoMenuOpen.set(!autoMenuOpen())"
                    aria-label="Open auto-spin menu">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M5 12 A7 7 0 0 1 12 5 L 12 8 L 17 4 L 12 0 L 12 3 A9 9 0 1 0 21 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              <span class="lbl">AUTO</span>
            </button>
            @if (autoMenuOpen()) {
              <div class="auto-menu" role="menu" (click)="$event.stopPropagation()">
                @for (n of presets; track n) {
                  <button class="auto-option" role="menuitem"
                          [disabled]="!canStartAuto()"
                          (click)="onAutoPick(n)">{{ n }}</button>
                }
                <button class="auto-option infinite" role="menuitem"
                        [disabled]="!canStartAuto()"
                        (click)="onAutoPick(infinite)">∞</button>
              </div>
            }
          }
        </div>

        <button class="spin"
                [class.busy]="!canSpin()"
                [class.stopping]="autoActive"
                [disabled]="autoActive ? false : !canSpin()"
                (click)="onSpinClick()">
          <span class="spin-rim"></span>
          <span class="spin-inner">
            @if (autoActive) {
              <span class="big">STOP</span>
              <span class="sub">{{ autoRemainingDisplay() }} left</span>
            } @else if (game.inFreeSpins()) {
              <span class="big">FREE</span>
              <span class="sub">{{ game.freeSpinsLeft() }} left</span>
            } @else if (game.phase() === 'spinning') {
              <span class="big spinning" aria-hidden="true">⌖</span>
            } @else {
              <span class="big">SPIN</span>
              <span class="sub">{{ formatPLN(bet.amount()) }}</span>
            }
          </span>
        </button>
      </div>

      <div class="cluster win-cluster">
        <span class="label">{{ autoActive ? 'Auto Win' : 'Last Win' }}</span>
        <strong class="amount" [class.flash]="winDisplay() > 0">
          <app-counter [value]="winDisplay()" [duration]="0"></app-counter>
          <em>PLN</em>
        </strong>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; position: relative; z-index: 5; }

    .bottom-bar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 18px; padding: 8px 22px;
      color: var(--bone); position: relative;
      border-radius: 0; border-left: none; border-right: none; border-bottom: none;
    }
    .bottom-bar::before {
      content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
      background: linear-gradient(90deg, transparent, var(--brass) 12%, var(--gold) 50%, var(--brass) 88%, transparent);
      opacity: .7;
    }

    .label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1.7px; opacity: .6; font-weight: 600; margin-bottom: 6px; }
    .cluster { min-width: 200px; }

    /* Bet stepper */
    .stepper {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 6px; border-radius: 12px;
      background: linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.35));
      border: 1px solid var(--brass);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.16), inset 0 -2px 6px rgba(0,0,0,.5);
    }
    .step {
      width: 38px; height: 38px;
      border: 1px solid var(--brass-deep);
      background: linear-gradient(180deg, var(--wood-warm), var(--wood-mid));
      color: var(--gold); border-radius: 9px; cursor: pointer;
      display: grid; place-items: center;
      box-shadow: inset 0 1px 0 rgba(255,217,122,.25), inset 0 -2px 4px rgba(0,0,0,.45);
      transition: filter .1s, transform .1s;
    }
    .step:hover:not(:disabled) { filter: brightness(1.25); transform: translateY(-1px); }
    .step:active:not(:disabled) { transform: translateY(0); }
    .step:disabled { opacity: .3; cursor: not-allowed; }
    .stepper strong { flex: 1; min-width: 110px; text-align: center; font: 700 19px/1 var(--font-display); color: #fff; letter-spacing: .5px; }

    /* Buy bonus */
    .buy-bonus {
      position: relative;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      padding: 14px 26px; border-radius: 14px;
      background: linear-gradient(180deg, var(--ruby), var(--ruby-deep));
      color: var(--gold); cursor: pointer; letter-spacing: 1.6px;
      transition: transform .1s, filter .1s, box-shadow .2s;
      border: 1px solid var(--brass);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.3), inset 0 -2px 6px rgba(0,0,0,.5),
                  0 6px 18px rgba(139,26,26,.45), 0 0 0 1px var(--ruby-deep);
    }
    .buy-bonus::before { content: ''; position: absolute; inset: 4px; border-radius: 11px; border: 1px dashed rgba(255,217,122,.35); pointer-events: none; }
    .buy-bonus:hover:not(:disabled) {
      transform: translateY(-1px); filter: brightness(1.18);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.45), 0 8px 22px rgba(255,123,74,.45),
                  0 0 0 1px var(--ruby-deep), var(--glow-ruby);
    }
    .buy-bonus:disabled { opacity: .4; cursor: not-allowed; }
    .buy-bonus .big { font: 900 16px/1 var(--font-brand); }
    .buy-bonus .sub { font-size: 10px; opacity: .85; text-transform: uppercase; letter-spacing: 1.4px; font-family: var(--font-body); }

    /* Spin cluster (with auto satellite) */
    .spin-cluster { position: relative; padding: 0; margin: -22px 0 -8px; display: flex; align-items: center; gap: 12px; }
    .auto-wrap { position: relative; }
    .auto-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      width: 64px; height: 64px; border-radius: 50%;
      border: 1px solid var(--brass);
      background: linear-gradient(180deg, var(--wood-warm), var(--wood-mid));
      color: var(--gold); cursor: pointer; font-family: var(--font-display);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.25), inset 0 -3px 6px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.45);
      transition: filter .1s, transform .1s, box-shadow .18s;
    }
    .auto-btn:hover:not(:disabled) { filter: brightness(1.18); transform: translateY(-1px); }
    .auto-btn:disabled { opacity: .45; cursor: not-allowed; }
    .auto-btn .lbl { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; }
    .auto-btn .num { font: 900 16px/1 var(--font-brand); color: #fff; }
    .auto-running {
      background: linear-gradient(180deg, var(--ruby-bright), var(--ruby-deep));
      color: #fff; border-color: var(--brass-bright);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.32), 0 0 22px rgba(201,84,42,.55), 0 4px 12px rgba(0,0,0,.45);
      animation: autoPulse 1.4s ease-in-out infinite;
    }
    @keyframes autoPulse {
      0%, 100% { box-shadow: inset 0 1px 0 rgba(255,217,122,.32), 0 0 22px rgba(201,84,42,.55), 0 4px 12px rgba(0,0,0,.45); }
      50% { box-shadow: inset 0 1px 0 rgba(255,217,122,.45), 0 0 36px rgba(255,123,74,.65), 0 4px 12px rgba(0,0,0,.45); }
    }
    .auto-menu {
      position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
      padding: 10px; border-radius: 14px;
      background: linear-gradient(180deg, #2a1a0c, #14110d);
      border: 1px solid var(--brass);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.22), 0 12px 32px rgba(0,0,0,.6);
      animation: menuRise .18s ease-out;
      z-index: 5; min-width: 200px;
    }
    .auto-menu::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 6px solid transparent; border-top-color: var(--brass);
    }
    .auto-option {
      padding: 10px 8px; border-radius: 10px;
      border: 1px solid var(--brass-deep); background: rgba(0,0,0,.4);
      color: var(--gold); font: 900 14px/1 var(--font-brand);
      cursor: pointer; transition: filter .1s, transform .1s;
    }
    .auto-option:hover:not(:disabled) { filter: brightness(1.25); transform: translateY(-1px); }
    .auto-option.infinite { font-size: 22px; }
    .auto-option:disabled { opacity: .4; cursor: not-allowed; }
    @keyframes menuRise {
      from { opacity: 0; transform: translateX(-50%) translateY(6px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .spin {
      width: 116px; height: 116px; border-radius: 50%;
      border: none; padding: 0; background: transparent;
      cursor: pointer; display: grid; place-items: center; position: relative;
      transition: transform .08s ease;
    }
    .spin .spin-rim {
      position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, var(--brass-bright), var(--brass-deep), var(--brass-bright), var(--brass-deep), var(--brass-bright));
      box-shadow: 0 0 0 2px var(--wood-dark), 0 0 22px rgba(255,217,122,.45), 0 12px 28px rgba(0,0,0,.65);
      animation: rimShimmer 8s linear infinite;
    }
    .spin .spin-rim::before {
      content: ''; position: absolute; inset: 6px; border-radius: 50%;
      background: radial-gradient(circle at 30% 25%, #ff8a4f 0%, var(--ruby) 55%, var(--ruby-deep) 95%);
      box-shadow: inset 0 -10px 22px rgba(0,0,0,.55), inset 0 8px 14px rgba(255,217,122,.25);
    }
    .spin .spin-rim::after {
      content: ''; position: absolute; inset: 14px; border-radius: 50%;
      border: 1px dashed rgba(255,217,122,.4);
    }
    .spin .spin-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; color: #fff; }
    .spin .big { font: 900 22px/1 var(--font-brand); letter-spacing: 2px; text-shadow: 0 2px 0 var(--ruby-deep), 0 0 14px rgba(255,217,122,.45); }
    .spin .big.spinning { font-size: 32px; animation: spinRot .7s linear infinite; display: inline-block; }
    .spin .sub { font-size: 11px; opacity: .92; letter-spacing: 1px; font-family: var(--font-display); }
    .spin:hover:not(:disabled) { transform: scale(1.04); }
    .spin:hover:not(:disabled) .spin-rim { box-shadow: 0 0 0 2px var(--wood-dark), 0 0 32px rgba(255,217,122,.65), 0 14px 32px rgba(0,0,0,.65); }
    .spin:active:not(:disabled) { transform: scale(.96); }
    .spin:disabled { opacity: .6; cursor: not-allowed; }
    @keyframes rimShimmer { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(20deg); } }
    @keyframes spinRot { to { transform: rotate(360deg); } }

    /* Win readout */
    .win-cluster { text-align: right; }
    .win-cluster .amount {
      display: inline-flex; align-items: baseline; gap: 6px;
      font: 900 28px/1 var(--font-display); color: #fff; letter-spacing: .5px;
    }
    .win-cluster .amount em { font-style: normal; font-size: 12px; opacity: .6; letter-spacing: 1.5px; font-family: var(--font-display); }
    .win-cluster .flash { animation: winFlash .85s ease-out; color: var(--gold); text-shadow: 0 0 22px rgba(255,217,122,.5); }
    @keyframes winFlash {
      0% { transform: scale(1); color: #fff; }
      30% { transform: scale(1.18); color: var(--gold-glow); text-shadow: 0 0 28px rgba(255,224,102,.8); }
      100% { transform: scale(1); color: var(--gold); }
    }

    @media (max-width: 700px) {
      .bottom-bar { gap: 8px; padding: 6px 10px; }
      .cluster, .win-cluster { min-width: 0; }
      .label { font-size: 8px; letter-spacing: 1.2px; margin-bottom: 3px; }
      .stepper { padding: 3px 4px; gap: 4px; }
      .step { width: 32px; height: 32px; }
      .stepper strong { font-size: 14px; min-width: 76px; }
      .spin-cluster { margin: -16px 0 -4px; }
      .spin { width: 88px; height: 88px; }
      .spin .big { font-size: 16px; letter-spacing: 1.4px; }
      .spin .big.spinning { font-size: 24px; }
      .spin .sub { font-size: 9px; letter-spacing: .6px; }
      .win-cluster .amount { font-size: 16px; }
      .win-cluster .amount em { font-size: 9px; }
    }
    @media (max-width: 420px) {
      .stepper strong { font-size: 12px; min-width: 60px; }
      .step { width: 28px; height: 28px; }
      .spin { width: 76px; height: 76px; }
      .spin .big { font-size: 14px; }
      .win-cluster .amount { font-size: 14px; }
    }
  `],
})
export class BottomBarComponent {
  protected readonly balance = inject(BalanceService);
  protected readonly bet = inject(BetService);
  protected readonly game = inject(GameService);
  protected readonly formatPLN = formatPLN;

  @Input() autoActive = false;
  @Input() autoRemaining = 0;
  /** Running total of wins during the active auto-spin run (host owns it). */
  @Input() autoWin = 0;

  /** Pick the right number for the win-cluster: running total during auto,
   *  per-spin last-win otherwise. Plain getter so OnPush re-reads it on
   *  each input change instead of needing the value to live in a signal. */
  protected winDisplay(): number {
    return this.autoActive ? this.autoWin : this.game.lastWin();
  }

  @Output() readonly spin = new EventEmitter<void>();
  @Output() readonly autoStart = new EventEmitter<number>();
  @Output() readonly stopAuto = new EventEmitter<void>();

  protected readonly autoMenuOpen = signal(false);
  protected readonly presets = AUTO_PRESETS;
  protected readonly infinite = Number.POSITIVE_INFINITY;

  protected readonly canChangeBet = computed(() => this.game.phase() === 'idle');
  protected readonly canStartAuto = computed(() =>
    this.game.phase() === 'idle' && this.balance.balance() >= this.bet.amount(),
  );
  protected readonly canSpin = computed(() => {
    const phase = this.game.phase();
    if (phase === 'idle') return this.balance.balance() >= this.bet.amount();
    if (phase === 'fs-intro' || phase === 'fs-outro') return true;
    return false;
  });

  protected onAutoPick(count: number): void {
    this.autoMenuOpen.set(false);
    this.autoStart.emit(count);
  }

  protected onSpinClick(): void {
    if (this.autoActive) {
      this.stopAuto.emit();
      return;
    }
    this.spin.emit();
  }

  protected autoRemainingDisplay(): string {
    if (this.autoRemaining === Number.POSITIVE_INFINITY) return '∞';
    return String(this.autoRemaining);
  }
}
