import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BalanceService } from '../../shared/services/balance.service';
import { BetService } from '../../shared/services/bet.service';
import { CounterComponent } from '../../shared/ui/counter.component';
import { formatPLN, formatPlain } from '../../shared/util/format';
import { YetiGameService } from './core/services/game.service';
import { YetiPixiGameComponent } from './pixi/pixi-game.component';
import { YetiPaytableModalComponent } from './ui/paytable-modal.component';
import { YetiBonusBuyModalComponent } from './ui/bonus-buy-modal.component';
import { YetiBonusIntroComponent } from './ui/bonus-intro.component';
import { YetiBigWinCelebrationComponent } from './ui/big-win-celebration.component';
import { YetiFsAwardPopupComponent } from './ui/fs-award-popup.component';
import { YetiFsInfoPanelComponent } from './ui/fs-info-panel.component';
import { YetiFsTotalwinComponent } from './ui/fs-totalwin.component';
import { YetiSideBuyButtonComponent } from './ui/side-buy-button.component';
import { LeaderboardPanelComponent } from '../../shared/ui/leaderboard-panel.component';

const AUTO_PRESETS: readonly number[] = [10, 25, 50, 100, 250];

@Component({
  selector: 'app-yetis-pass-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    YetiPixiGameComponent,
    CounterComponent,
    YetiPaytableModalComponent,
    YetiBonusBuyModalComponent,
    YetiBonusIntroComponent,
    YetiBigWinCelebrationComponent,
    YetiFsAwardPopupComponent,
    YetiFsInfoPanelComponent,
    YetiFsTotalwinComponent,
    YetiSideBuyButtonComponent,
    LeaderboardPanelComponent,
  ],
  template: `
    <div class="shell">
      <header class="top-bar">
        <a class="lodge-btn" routerLink="/" aria-label="Back to Better Hunter's Lodge" title="Back to Better Hunter's Lodge">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M3 12 L12 4 L21 12 M5 11 V20 H10 V14 H14 V20 H19 V11"
                  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
          <span class="lodge-label">LODGE</span>
        </a>
        <div class="brand">
          <strong class="title">Yeti's Pass</strong>
          <span class="tag">5 × 5 · 25 paylines · expanding wilds up to 250×</span>
        </div>

        <div class="balance">
          <span class="lbl">Balance</span>
          <strong>
            <app-counter [value]="balance.balance()" [duration]="0"></app-counter>
            <em>PLN</em>
          </strong>
        </div>
      </header>

      <main class="stage" #stage (click)="onStageClick()">
        <app-yeti-pixi-game #pixi></app-yeti-pixi-game>
        <app-yeti-side-buy-button
          (open)="buyOpen.set(true)"
          (info)="paytableOpen.set(true)">
        </app-yeti-side-buy-button>
        <app-yeti-fs-info-panel></app-yeti-fs-info-panel>
        <app-yeti-fs-totalwin></app-yeti-fs-totalwin>
        <app-yeti-fs-award-popup></app-yeti-fs-award-popup>
      </main>

      <footer class="bottom-bar">
        <div class="bet">
          <span class="lbl">Total Bet</span>
          <div class="stepper">
            <button (click)="bet.decrease()" [disabled]="!bet.canDecrease() || !canChangeBet()" aria-label="Decrease bet">−</button>
            <strong>{{ formatPLN(bet.amount()) }}</strong>
            <button (click)="bet.increase()" [disabled]="!bet.canIncrease() || !canChangeBet()" aria-label="Increase bet">+</button>
          </div>
        </div>

        <div class="spin-cluster">
          <div class="auto-wrap">
            @if (autoActive()) {
              <button class="auto-btn auto-running" (click)="stopAutoSpin()" aria-label="Stop auto-spin">
                <span class="lbl">STOP</span>
                <span class="num">{{ autoRemainingDisplay() }}</span>
              </button>
            } @else {
              <button class="auto-btn"
                      [disabled]="!canSpin()"
                      (click)="autoMenuOpen.set(!autoMenuOpen())"
                      aria-label="Auto-spin menu">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M5 12 A7 7 0 0 1 12 5 L 12 8 L 17 4 L 12 0 L 12 3 A9 9 0 1 0 21 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <span class="lbl">AUTO</span>
              </button>
              @if (autoMenuOpen()) {
                <div class="auto-menu" (click)="$event.stopPropagation()">
                  @for (n of presets; track n) {
                    <button (click)="onAutoPick(n)" [disabled]="!canSpin()">{{ n }}</button>
                  }
                  <button class="infinite" (click)="onAutoPick(infinite)" [disabled]="!canSpin()">∞</button>
                </div>
              }
            }
          </div>

          <button class="spin"
                  [disabled]="autoActive() ? false : !canSpin()"
                  (click)="onSpinClick()">
            @if (autoActive()) {
              <span class="big">STOP</span>
              <span class="sub">{{ autoRemainingDisplay() }} left</span>
            } @else if (game.inFreeSpins()) {
              <span class="big">FREE</span>
              <span class="sub">{{ game.freeSpinsLeft() }} left</span>
            } @else if (game.phase() === 'spinning') {
              <span class="big spinning">⌖</span>
            } @else {
              <span class="big">SPIN</span>
              <span class="sub">{{ formatPLN(bet.amount()) }}</span>
            }
          </button>
        </div>

        <div class="win">
          <span class="lbl">Last Win</span>
          <strong [class.flash]="game.lastWin() > 0">
            <app-counter [value]="game.lastWin()" [duration]="0"></app-counter>
            <em>PLN</em>
          </strong>
        </div>
      </footer>

      @if (game.phase() === 'fs-intro') {
        <div class="fs-overlay" (click)="onContinueFsIntro()">
          <div class="fs-card">
            <h1 class="title-engraved">Through the Pass</h1>
            <p>You've reached the summit beacon. <strong>{{ game.freeSpinsLeft() }}</strong> free spins await.</p>
            <ul>
              <li>Yeti wilds <strong>expand</strong> to cover their entire reel</li>
              <li>Each expanded wild carries a multiplier of <strong>up to 250×</strong></li>
              <li>Expanded wilds <strong>persist</strong> for the rest of the round</li>
              <li>3 more scatters retrigger <strong>+10 spins</strong></li>
            </ul>
            <button class="cta">Begin the Climb</button>
          </div>
        </div>
      } @else if (game.phase() === 'fs-outro') {
        <div class="fs-overlay" (click)="onContinueFsOutro()">
          <div class="fs-card outro">
            <h1 class="title-engraved">Summit Reached</h1>
            <p>Total Free Spins win</p>
            <strong class="total">
              <app-counter [value]="game.lastWin()" [duration]="1.4"></app-counter>
              <em>PLN</em>
            </strong>
            <button class="cta">Collect</button>
          </div>
        </div>
      }

      @if (paytableOpen()) {
        <app-yeti-paytable-modal (close)="paytableOpen.set(false)"></app-yeti-paytable-modal>
      }
      @if (buyOpen()) {
        <app-yeti-bonus-buy-modal
          (buy)="onBuyBonus()"
          (close)="buyOpen.set(false)">
        </app-yeti-bonus-buy-modal>
      }
      <app-yeti-bonus-intro #bonusIntro></app-yeti-bonus-intro>
      <app-yeti-big-win-celebration #bigWin></app-yeti-big-win-celebration>
      <app-leaderboard-panel game="yeti" class="yeti-themed"></app-leaderboard-panel>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; height: 100svh; height: 100dvh; overscroll-behavior: contain; }
    .shell { display: grid; grid-template-rows: auto 1fr auto; height: 100%; background: var(--bg-deep); }

    /* ----- Top bar ----- */
    .top-bar {
      display: flex; align-items: center; gap: 14px;
      padding: 10px 20px;
      background: linear-gradient(180deg, #0c2030, #060e18);
      color: var(--bone);
      border-bottom: 2px solid #4a8aa8;
      box-shadow: 0 4px 18px rgba(0,0,0,.4);
      position: relative;
    }
    .top-bar::after, .bottom-bar::before {
      content: ''; position: absolute; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #9ad6e8 12%, #eaf3f8 50%, #9ad6e8 88%, transparent);
      opacity: .7;
    }
    .top-bar::after { bottom: 0; }
    .bottom-bar::before { top: 0; }
    /* Prominent labeled "Lodge" pill in the Yeti ice-blue palette — the
       brand colour inside this game, so the home button reads as native
       to the page rather than borrowed from Hunter's Cluster. */
    .lodge-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border: 1px solid #9ad6e8;
      background: linear-gradient(180deg, rgba(154,214,232,.18), rgba(0,0,0,.35));
      color: #9ad6e8;
      border-radius: 999px;
      text-decoration: none; cursor: pointer;
      font-family: var(--font-brand); font-weight: 900;
      letter-spacing: 1.6px;
      box-shadow: inset 0 1px 0 rgba(154,214,232,.3), 0 4px 14px rgba(154,214,232,.18);
      animation: lodgeBreathe 3.6s ease-in-out infinite;
      transition: filter .12s, transform .12s, box-shadow .18s;
    }
    .lodge-btn:hover { filter: brightness(1.18); transform: translateY(-1px); box-shadow: 0 0 22px rgba(154,214,232,.5); }
    .lodge-btn .lodge-label { font-size: 11px; }
    @keyframes lodgeBreathe {
      0%, 100% { box-shadow: inset 0 1px 0 rgba(154,214,232,.3), 0 4px 14px rgba(154,214,232,.18); }
      50% { box-shadow: inset 0 1px 0 rgba(154,214,232,.5), 0 0 22px rgba(154,214,232,.45); }
    }
    .brand { display: flex; flex-direction: column; line-height: 1.05; flex: 0 0 auto; }
    .brand .title {
      font: 900 22px/1 var(--font-brand);
      letter-spacing: 2px; text-transform: uppercase;
      color: #9ad6e8;
      text-shadow: 0 1px 0 #04101a, 0 0 18px rgba(154,214,232,.35);
    }
    .brand .tag { font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; opacity: .55; margin-top: 4px; }

    /* margin-left: auto pushes balance to the right edge of the top bar.
       Was implicit before via the info button's auto-margin; that button
       moved to the side rail, so we set it directly here. */
    .balance {
      display: flex; flex-direction: column; line-height: 1.05;
      padding: 8px 14px; border-radius: 10px;
      background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.3));
      border: 1px solid #9ad6e8;
      margin-left: auto;
    }
    .balance .lbl, .lbl { font-size: 9px; letter-spacing: 1.5px; opacity: .6; text-transform: uppercase; font-weight: 600; }
    .balance strong { font: 900 22px/1 var(--font-display); color: #fff; }
    .balance em, .win em { font-style: normal; font-size: 11px; opacity: .65; margin-left: 4px; }

    /* ----- Stage ----- */
    .stage { position: relative; overflow: hidden; min-height: 0; }

    /* ----- Bottom bar ----- */
    .bottom-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 20px; gap: 16px;
      background: linear-gradient(0deg, #0c2030, #060e18);
      color: var(--bone);
      border-top: 2px solid #4a8aa8;
      box-shadow: 0 -4px 18px rgba(0,0,0,.4);
      position: relative;
    }
    .bet, .win { min-width: 200px; }
    .lbl { display: block; margin-bottom: 4px; }

    .stepper {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 6px; border-radius: 12px;
      background: linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,.35));
      border: 1px solid #9ad6e8;
    }
    .stepper button {
      width: 32px; height: 32px;
      border: 1px solid #4a8aa8;
      background: linear-gradient(180deg, #1a3548, #0c1a26);
      color: #9ad6e8;
      font-size: 18px; font-weight: 700;
      border-radius: 8px; cursor: pointer;
    }
    .stepper button:disabled { opacity: .35; cursor: not-allowed; }
    .stepper strong { flex: 1; min-width: 110px; text-align: center; font: 700 18px/1 var(--font-display); color: #fff; }

    /* Spin cluster */
    .spin-cluster { position: relative; margin: -22px 0 -8px; display: flex; align-items: center; gap: 12px; }
    .auto-wrap { position: relative; }
    .auto-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      width: 64px; height: 64px; border-radius: 50%;
      border: 1px solid #9ad6e8;
      background: linear-gradient(180deg, #1a3548, #0c1a26);
      color: #9ad6e8; cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(154,214,232,.25), 0 4px 12px rgba(0,0,0,.45);
      transition: filter .1s, transform .1s;
      font-family: var(--font-display);
    }
    .auto-btn:hover:not(:disabled) { filter: brightness(1.18); transform: translateY(-1px); }
    .auto-btn:disabled, .spin:disabled { opacity: .45; cursor: not-allowed; }
    .auto-btn .lbl { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 0; }
    .auto-btn .num { font: 900 16px/1 var(--font-brand); color: #fff; }
    .auto-running {
      background: linear-gradient(180deg, #c9543a, #5a1a08); color: #fff; border-color: #ffd97a;
      animation: autoPulse 1.4s ease-in-out infinite;
    }
    @keyframes autoPulse {
      0%, 100% { box-shadow: inset 0 1px 0 rgba(255,217,122,.3), 0 0 22px rgba(201,84,42,.55), 0 4px 12px rgba(0,0,0,.45); }
      50% { box-shadow: inset 0 1px 0 rgba(255,217,122,.45), 0 0 36px rgba(255,123,74,.65), 0 4px 12px rgba(0,0,0,.45); }
    }
    .auto-menu {
      position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
      padding: 10px; border-radius: 14px;
      background: linear-gradient(180deg, #0c2030, #06141c);
      border: 1px solid #9ad6e8;
      box-shadow: inset 0 1px 0 rgba(154,214,232,.22), 0 12px 32px rgba(0,0,0,.6);
      animation: menuRise .18s ease-out;
      z-index: 5; min-width: 200px;
    }
    .auto-menu button {
      padding: 10px 8px; border-radius: 10px;
      border: 1px solid #4a8aa8; background: rgba(0,0,0,.4); color: #9ad6e8;
      font: 900 14px/1 var(--font-brand); cursor: pointer;
    }
    .auto-menu button.infinite { font-size: 22px; }
    .auto-menu button:hover:not(:disabled) { filter: brightness(1.25); }
    .auto-menu button:disabled { opacity: .4; cursor: not-allowed; }
    @keyframes menuRise {
      from { opacity: 0; transform: translateX(-50%) translateY(6px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .spin {
      width: 116px; height: 116px; border-radius: 50%;
      border: 3px solid #9ad6e8;
      background: radial-gradient(circle at 30% 25%, #4a8aa8 0%, #143548 70%, #06141c 100%);
      color: #fff; cursor: pointer; display: grid; place-items: center;
      box-shadow: 0 8px 24px rgba(0,0,0,.6), inset 0 -10px 22px rgba(0,0,0,.5), inset 0 6px 14px rgba(154,214,232,.25);
    }
    .spin:hover:not(:disabled) { transform: scale(1.04); transition: transform .1s; }
    .spin .big { font: 900 22px/1 var(--font-brand); letter-spacing: 2px; text-shadow: 0 2px 0 #04101a; }
    .spin .big.spinning { font-size: 32px; animation: spinRot .7s linear infinite; display: inline-block; }
    .spin .sub { display: block; font: 11px/1 var(--font-display); opacity: .85; letter-spacing: 1px; }

    .win { text-align: right; }
    .win strong { font: 900 24px/1 var(--font-display); color: #fff; }
    .win .flash { color: #9ad6e8; text-shadow: 0 0 18px rgba(154,214,232,.55); }

    /* ----- FS overlay ----- */
    .fs-overlay {
      position: fixed; inset: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,.55) 0%, rgba(0,0,0,.92) 100%);
      backdrop-filter: blur(8px);
      display: grid; place-items: center;
      z-index: 50; animation: fadeIn .35s ease-out;
    }
    .fs-card {
      max-width: 480px; padding: 32px 36px; text-align: center; border-radius: 22px;
      background: linear-gradient(180deg, #0c2030, #06141c);
      border: 1px solid #9ad6e8;
      box-shadow: inset 0 1px 0 rgba(154,214,232,.25), 0 24px 60px rgba(0,0,0,.7), 0 0 60px rgba(154,214,232,.18);
      color: var(--bone);
      animation: rise .45s cubic-bezier(.2,.7,.25,1.05);
    }
    .fs-card h1 { margin: 0 0 12px; font-size: 32px; letter-spacing: 4px; color: #9ad6e8; }
    .fs-card p { margin: 0 0 16px; opacity: .85; font-size: 13px; }
    .fs-card ul {
      list-style: none; padding: 14px 18px; margin: 0 auto 22px;
      max-width: 380px; text-align: left; line-height: 1.9; font-size: 14px;
      border-top: 1px solid rgba(154,214,232,.25);
      border-bottom: 1px solid rgba(154,214,232,.25);
    }
    .fs-card ul li::before { content: '❄'; color: #9ad6e8; margin-right: 10px; }
    .fs-card strong { color: #9ad6e8; }
    /* Counter on its own row keeps the Collect button below it. */
    .fs-card .total {
      display: flex; align-items: baseline; justify-content: center; gap: 8px;
      font: 900 52px/1 var(--font-brand);
      color: #9ad6e8; margin: 8px 0 22px;
      text-shadow: 0 0 28px rgba(154,214,232,.5);
    }
    .fs-card .total em { font-style: normal; font-size: 16px; opacity: .7; }
    .cta {
      padding: 14px 36px; border-radius: 999px;
      border: 1px solid #9ad6e8;
      background: linear-gradient(180deg, #4a8aa8, #1a3548);
      color: #fff;
      font: 900 14px/1 var(--font-brand); letter-spacing: 2px;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 6px 18px rgba(0,0,0,.5);
    }
    .cta:hover { filter: brightness(1.15); transform: translateY(-1px); }

    @keyframes spinRot { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } }
    @keyframes rise {
      from { opacity: 0; transform: translateY(20px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (max-width: 700px) {
      .top-bar { gap: 8px; padding: 6px 12px; }
      .brand .title { font-size: 16px; letter-spacing: 1.5px; }
      .brand .tag { display: none; }
      .balance strong, .win strong { font-size: 16px; }
      .bottom-bar { padding: 6px 12px; gap: 8px; }
      .bet, .win { min-width: 0; }
      .stepper strong { font-size: 14px; min-width: 70px; }
      .stepper button { width: 28px; height: 28px; font-size: 16px; }
      .spin { width: 88px; height: 88px; }
      .spin .big { font-size: 16px; letter-spacing: 1.4px; }
      .spin .sub { font-size: 9px; }
      .auto-btn { width: 52px; height: 52px; }
    }
  `],
})
export class YetiGameComponent {
  protected readonly game = inject(YetiGameService);
  protected readonly balance = inject(BalanceService);
  protected readonly bet = inject(BetService);
  protected readonly formatPLN = formatPLN;
  protected readonly formatPlain = formatPlain;
  protected readonly presets = AUTO_PRESETS;
  protected readonly infinite = Number.POSITIVE_INFINITY;

  @ViewChild('pixi', { static: true }) private readonly pixi!: YetiPixiGameComponent;
  @ViewChild('bonusIntro', { static: true }) private readonly bonusIntro!: import('./ui/bonus-intro.component').YetiBonusIntroComponent;
  @ViewChild('bigWin', { static: true }) private readonly bigWin!: YetiBigWinCelebrationComponent;
  @ViewChild('stage', { static: true }) private readonly stageEl!: ElementRef<HTMLElement>;

  protected readonly paytableOpen = signal(false);
  protected readonly buyOpen = signal(false);
  protected readonly autoMenuOpen = signal(false);
  private readonly autoRemaining = signal(0);
  protected readonly autoActive = computed(() => this.autoRemaining() > 0);

  private busy = false;

  constructor() {
    // Mirror the Pixi grid bounding box into CSS custom properties on the
    // stage. The HTML side panels (Buy Hunt, FS info, Total Win) anchor
    // themselves via these variables so they always sit at the grid edges.
    effect(() => {
      const rect = this.pixi?.gridRect();
      const el = this.stageEl?.nativeElement;
      if (!rect || !el) return;
      el.style.setProperty('--grid-left',   `${rect.left}px`);
      el.style.setProperty('--grid-right',  `${rect.right}px`);
      el.style.setProperty('--grid-top',    `${rect.top}px`);
      el.style.setProperty('--grid-bottom', `${rect.bottom}px`);
    });
  }

  /** Click on the stage during the per-line win reveal short-circuits it. */
  protected onStageClick(): void {
    if (this.pixi.isHighlightingWins) this.pixi.skipWinHighlights();
  }

  /**
   * Catch-all skip: a click anywhere in the document during the win reveal
   * short-circuits the per-line animation. Without this, only clicks landing
   * inside the pixi stage would skip — the user's request was that "clicking
   * in random place" works, including the top/bottom bars.
   */
  @HostListener('window:click')
  protected onWindowClick(): void {
    if (this.pixi?.isHighlightingWins) this.pixi.skipWinHighlights();
  }

  protected readonly canChangeBet = computed(() => this.game.phase() === 'idle');
  protected readonly canSpin = computed(() => {
    const phase = this.game.phase();
    if (phase === 'idle') return this.balance.balance() >= this.bet.amount();
    if (phase === 'fs-intro' || phase === 'fs-outro') return true;
    return false;
  });

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.paytableOpen() || this.buyOpen() || this.bonusIntro.active()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.paytableOpen.set(false);
        this.buyOpen.set(false);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Enter/Space is the keyboard mirror of clicking on the stage — same
      // skip-cascade as Hunter's Cluster:
      //   1. big-win celebration is up → snap-and/or-close it
      //   2. payline reveal is in flight → skip the rest of the line-by-line
      //   3. otherwise act as the spin button
      if (this.bigWin.isActive()) {
        this.bigWin.skipOrDismiss();
        return;
      }
      if (this.pixi.isHighlightingWins) {
        this.pixi.skipWinHighlights();
        return;
      }
      this.onSpinClick();
    }
  }

  protected onSpinClick(): void {
    if (this.autoActive()) {
      this.stopAutoSpin();
      return;
    }
    void this.spinOnce();
  }

  protected async onContinueFsIntro(): Promise<void> {
    this.game.startFreeSpins();
    await this.bonusIntro.play();
    void this.runFreeSpinChain();
  }

  protected onContinueFsOutro(): void {
    this.game.finishFreeSpins();
    this.pixi.showPersistentWilds([]);
  }

  protected async onBuyBonus(): Promise<void> {
    if (this.busy) return;
    if (!this.game.buyBonus()) return;
    this.buyOpen.set(false);
    // Hold `busy` across the WHOLE buy → bonus-intro → FS-chain sequence so
    // nothing else (auto-spin tick, accidental key-press, FS overlay click)
    // can re-enter and start a parallel chain mid-cinematic. Match the
    // Hunter's Cluster pattern — one continuous async flow from buy to
    // first FS spin.
    this.busy = true;
    try {
      // Fake trigger spin so the player sees scatters land like a natural
      // trigger would. The cost was debited inside `buyBonus()`; this spin
      // pays nothing. If a YETI happened to land in the visual grid we
      // hand its expansion off to the game service so it persists into
      // the first FS spin (otherwise the player sees the column expand
      // and then mysteriously go away).
      const visualSpin = this.game.makeBonusBuyVisualSpin();
      await this.pixi.play(visualSpin);
      await this.pixi.glowScatters();
      this.game.applyBuyVisualPersistentWilds(visualSpin.endPersistentWilds);
      // Cinematic — no "Begin the Climb" overlay, since `buyBonus()` set the
      // phase straight to `fs-spinning`.
      await this.bonusIntro.play();
    } finally {
      this.busy = false;
    }
    // Now hand off to the FS chain. `runFreeSpinChain` takes its own busy
    // lock so the chain runs sequentially as usual.
    void this.runFreeSpinChain();
  }

  protected onAutoPick(count: number): void {
    this.autoMenuOpen.set(false);
    void this.startAutoSpin(count);
  }

  protected stopAutoSpin(): void {
    this.autoRemaining.set(0);
  }

  protected autoRemainingDisplay(): string {
    const n = this.autoRemaining();
    return n === Number.POSITIVE_INFINITY ? '∞' : String(n);
  }

  private async startAutoSpin(count: number): Promise<void> {
    if (this.autoActive() || count <= 0) return;
    this.autoRemaining.set(count);
    while (this.autoRemaining() > 0) {
      if (this.game.phase() !== 'idle' || !this.game.canSpin()) break;
      await this.spinOnce();
      // Auto-stop on FS trigger.
      if (this.game.inFreeSpins() || this.game.phase() !== 'idle') {
        this.autoRemaining.set(0);
        break;
      }
      this.autoRemaining.update((n) => (n === Number.POSITIVE_INFINITY ? n : n - 1));
    }
    this.autoRemaining.set(0);
  }

  private async spinOnce(): Promise<void> {
    if (this.busy) return;
    if (this.paytableOpen() || this.buyOpen() || this.bonusIntro.active()) return;
    const phase = this.game.phase();
    if (phase === 'fs-intro') {
      this.game.startFreeSpins();
      await this.bonusIntro.play();
      void this.runFreeSpinChain();
      return;
    }
    if (phase === 'fs-outro') {
      this.game.finishFreeSpins();
      this.pixi.showPersistentWilds([]);
      return;
    }
    if (phase !== 'idle') return;

    this.busy = true;
    try {
      const result = this.game.spinOnce();
      if (!result) return;
      await this.pixi.play(result);
      // When this spin triggered FS, celebrate the scatter landing on the
      // board BEFORE any overlay/cinematic kicks in. Otherwise the player
      // is yanked into the bonus intro the instant the spin settles and
      // never gets to register *why*.
      if (result.triggeredFreeSpins > 0) {
        await this.pixi.glowScatters();
      }
      // Big-win celebration runs BEFORE commitSpin so the FS-intro overlay
      // (which fires from commitSpin when scatters trigger) doesn't fight
      // for screen space with the celebration.
      await this.bigWin.play(result.totalWin, result.bet);
      this.game.commitSpin();
    } finally {
      this.busy = false;
    }
  }

  private async runFreeSpinChain(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.game.phase() === 'fs-spinning') {
        const result = this.game.spinOnce();
        if (!result) break;
        await this.pixi.play(result);
        if (result.triggeredFreeSpins > 0) {
          // Retrigger inside FS: same scatter celebration so the player
          // sees +N spins land on the board before the +award popup fires.
          await this.pixi.glowScatters();
        }
        await this.bigWin.play(result.totalWin, result.bet);
        this.game.commitSpin();
        await wait(450);
      }
    } finally {
      this.busy = false;
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
