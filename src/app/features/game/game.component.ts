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
import { GameService } from '../../core/services/game.service';
import { BetService } from '../../shared/services/bet.service';
import { BigWinCelebrationComponent } from './ui/big-win-celebration.component';
import { BonusBuyModalComponent } from './ui/bonus-buy-modal.component';
import { BonusIntroComponent } from './ui/bonus-intro.component';
import { BottomBarComponent } from './ui/bottom-bar.component';
import { FsAwardPopupComponent } from './ui/fs-award-popup.component';
import { FsInfoPanelComponent } from './ui/fs-info-panel.component';
import { FsOverlayComponent } from './ui/fs-overlay.component';
import { FsTotalwinComponent } from './ui/fs-totalwin.component';
import { PaytableModalComponent } from './ui/paytable-modal.component';
import { SideBuyButtonComponent } from './ui/side-buy-button.component';
import { TopBarComponent } from './ui/top-bar.component';
import { WinPopupComponent } from './ui/win-popup.component';
import { PixiGameComponent } from './pixi/pixi-game.component';

@Component({
  selector: 'app-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TopBarComponent,
    BottomBarComponent,
    FsOverlayComponent,
    WinPopupComponent,
    PixiGameComponent,
    BonusBuyModalComponent,
    SideBuyButtonComponent,
    FsInfoPanelComponent,
    FsTotalwinComponent,
    FsAwardPopupComponent,
    BigWinCelebrationComponent,
    BonusIntroComponent,
    PaytableModalComponent,
  ],
  template: `
    <div class="shell">
      <app-top-bar (openInfo)="paytableOpen.set(true)"></app-top-bar>

      <main class="stage" #stage (click)="onStageClick()">
        <app-pixi-game #pixi></app-pixi-game>
        <app-side-buy-button (open)="buyOpen.set(true)"></app-side-buy-button>
        <app-fs-info-panel></app-fs-info-panel>
        <app-fs-totalwin></app-fs-totalwin>
        <app-win-popup #popup></app-win-popup>
        <app-fs-award-popup></app-fs-award-popup>
        <app-bonus-intro #bonusIntro></app-bonus-intro>
        <app-big-win-celebration #bigWin></app-big-win-celebration>
        <app-fs-overlay (continue)="onOverlayContinue()"></app-fs-overlay>
        @if (buyOpen()) {
          <app-bonus-buy-modal
            (buy)="onBuyBonus($event)"
            (close)="buyOpen.set(false)">
          </app-bonus-buy-modal>
        }
        @if (paytableOpen()) {
          <app-paytable-modal (close)="paytableOpen.set(false)"></app-paytable-modal>
        }
      </main>

      <app-bottom-bar
        [autoActive]="autoActive()"
        [autoRemaining]="autoRemaining()"
        (spin)="onSpin()"
        (autoStart)="startAutoSpin($event)"
        (stopAuto)="stopAutoSpin()">
      </app-bottom-bar>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      /* Use the small/dynamic viewport so iOS Safari doesn't include the URL bar
         in our 100vh, which would push the bottom bar off-screen. */
      height: 100vh;
      height: 100svh;
      height: 100dvh;
      overscroll-behavior: contain;
    }
    .shell {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100%;
      background: var(--bg-deep);
    }
    .stage {
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
  `],
})
export class GameComponent {
  protected readonly game = inject(GameService);
  protected readonly buyOpen = signal(false);
  protected readonly paytableOpen = signal(false);

  @ViewChild('pixi', { static: true }) private readonly pixi!: PixiGameComponent;
  @ViewChild('popup', { static: true }) private readonly popup!: WinPopupComponent;
  @ViewChild('bigWin', { static: true }) private readonly bigWin!: BigWinCelebrationComponent;
  @ViewChild('bonusIntro', { static: true }) private readonly bonusIntro!: BonusIntroComponent;
  @ViewChild('stage', { static: true }) private readonly stageEl!: ElementRef<HTMLElement>;
  protected readonly bet = inject(BetService);

  private busy = false;
  /** When set, per-step +X popups are skipped so the BigWin celebration alone announces the spin's total. */
  private readonly suppressStepPopup = signal(false);
  /** Resolves the in-flight savor/idle/award delay. Lets the next spin click skip it. */
  private waitResolve: (() => void) | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Auto-spin state. `autoRemaining` is the count of pending auto-spins;
   * `Infinity` means run forever until stopped. Auto-stops on bonus trigger
   * (entering FS) and on insufficient balance.
   */
  protected readonly autoRemaining = signal(0);
  protected readonly autoActive = computed(() => this.autoRemaining() > 0);

  constructor() {
    effect(() => {
      const sw = this.pixi?.stepWin();
      if (!sw || sw.amount <= 0) return;
      if (this.suppressStepPopup()) return;
      this.popup.show(sw.amount, sw.multiplier);
    });
    // Mirror the Pixi grid bounding box into CSS custom properties on the
    // stage so HTML side-panels can anchor themselves directly to the grid
    // edges (they sit just outside the brass plaque, never overlapping it).
    effect(() => {
      const rect = this.pixi?.gridRect();
      const el = this.stageEl?.nativeElement;
      if (!rect || !el) return;
      el.style.setProperty('--grid-left',   `${rect.left}px`);
      el.style.setProperty('--grid-right',  `${rect.right}px`);
      el.style.setProperty('--grid-top',    `${rect.top}px`);
      el.style.setProperty('--grid-bottom', `${rect.bottom}px`);
      el.style.setProperty('--grid-width',  `${rect.right - rect.left}px`);
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.buyOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.buyOpen.set(false);
      }
      return;
    }
    if (this.paytableOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.paytableOpen.set(false);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.triggerPrimaryAction();
    }
  }

  protected onStageClick(): void {
    // Bonus-intro plays to completion — no click-to-skip.
    if (this.bonusIntro.active()) return;
    if (this.pixi.isAnimating) {
      this.pixi.fastForward();
      return;
    }
    this.popup.clear();
  }

  protected async onSpin(): Promise<void> {
    await this.triggerPrimaryAction();
  }

  protected async onOverlayContinue(): Promise<void> {
    const phase = this.game.phase();
    if (phase === 'fs-intro') {
      this.game.startFreeSpins();
      await this.bonusIntro.play();
      void this.runFreeSpinChain();
    } else if (phase === 'fs-outro') {
      this.game.finishFreeSpins();
    }
  }

  /**
   * True when a spin landed a normal win that didn't trigger the BigWin
   * celebration (which already supplies its own dwell). We hold the screen
   * briefly so the bottom-bar counter has time to tick up to the final amount.
   */
  private shouldSavor(result: { totalWin: number; bet: number }): boolean {
    return result.totalWin > 0 && result.totalWin < result.bet * 10;
  }

  /** True when this spin's total will trigger the BigWin celebration overlay. */
  private willCelebrate(result: { totalWin: number; bet: number }): boolean {
    return result.totalWin >= result.bet * 10;
  }

  /**
   * Begin an auto-spin run of `count` spins (Infinity means until stopped).
   * Auto-stops if balance drops below the bet, the player enters FS via the
   * organic trigger, or the player calls stopAutoSpin().
   */
  protected async startAutoSpin(count: number): Promise<void> {
    if (this.autoActive()) return;
    if (count <= 0) return;
    this.autoRemaining.set(count);
    await this.runAutoSpinLoop();
  }

  /** Manually halt the auto-spin run. Any in-flight spin still completes. */
  protected stopAutoSpin(): void {
    this.autoRemaining.set(0);
  }

  private async runAutoSpinLoop(): Promise<void> {
    // Keep cycling until the count drops, the player enters FS, or balance can't
    // cover another spin. Each iteration goes through the same primary action
    // path so animations, popups, and celebrations behave identically.
    while (this.autoRemaining() > 0) {
      if (this.game.phase() !== 'idle' || !this.game.canSpin()) break;
      await this.triggerPrimaryAction();
      // FS-trigger is the conventional auto-stop condition.
      if (this.game.inFreeSpins() || this.game.phase() !== 'idle') {
        this.autoRemaining.set(0);
        break;
      }
      this.autoRemaining.update((n) => (n === Infinity ? Infinity : n - 1));
    }
    this.autoRemaining.set(0);
  }

  protected async onBuyBonus(spinCount: number): Promise<void> {
    if (!this.game.buyBonus(spinCount)) return;
    this.buyOpen.set(false);
    this.popup.clear();
    // Show a "fake" trigger spin so the player sees scatters land on the
    // board exactly the way they would on a natural FS trigger, instead of
    // being yanked straight into the bonus intro. The cost was already
    // debited inside `buyBonus()`; this spin pays nothing — purely visual.
    if (!this.busy) {
      this.busy = true;
      try {
        await this.pixi.play(this.game.makeBonusBuyVisualSpin());
        await this.pixi.glowScatters();
      } finally {
        this.busy = false;
      }
    }
    await this.bonusIntro.play();
    void this.runFreeSpinChain();
  }

  private async triggerPrimaryAction(): Promise<void> {
    // Hard-block while any modal or full-screen overlay is up. The modals are
    // position:fixed so they should already eat the click, but this guards
    // against keyboard/programmatic invocation slipping through.
    if (this.buyOpen() || this.paytableOpen() || this.bonusIntro.active()) return;
    if (this.busy) {
      // Spin click during a busy state collapses to "skip what you're waiting on":
      //   - if the grid is mid-animation, fast-forward the cascade
      //   - otherwise we're in a savor/award/idle-gap delay, cancel it so the
      //     next spin starts immediately when busy releases.
      if (this.pixi.isAnimating) this.pixi.fastForward();
      else this.cancelInterruptibleWait();
      return;
    }
    const phase = this.game.phase();
    if (phase === 'fs-intro') {
      this.game.startFreeSpins();
      await this.bonusIntro.play();
      void this.runFreeSpinChain();
      return;
    }
    if (phase === 'fs-outro') {
      this.game.finishFreeSpins();
      return;
    }
    if (phase !== 'idle') return;

    this.busy = true;
    try {
      const result = this.game.spinOnce();
      if (!result) return;
      this.popup.clear();
      const beforeAward = this.game.fsAwardCounter();
      // If this spin's total clears the BigWin floor, suppress the per-step
      // popups during the cascade so only the celebration speaks for the win.
      this.suppressStepPopup.set(this.willCelebrate(result));
      await this.pixi.play(result);
      this.suppressStepPopup.set(false);
      if (result.triggeredFreeSpins > 0) {
        await this.pixi.glowScatters();
      }
      // Big-win celebration runs BEFORE commitSpin so the FS-intro overlay
      // (which fires from commitSpin when scatters trigger) doesn't fight
      // for screen space with the celebration.
      await this.bigWin.play(result.totalWin, result.bet);
      this.game.commitSpin();
      if (this.game.fsAwardCounter() > beforeAward) {
        await this.interruptibleWait(FS_AWARD_DELAY_MS);
      } else if (this.shouldSavor(result)) {
        await this.interruptibleWait(WIN_SAVOR_MS);
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * A setTimeout-based wait that can be short-circuited by a spin click
   * during the busy window (post-spin savor / FS-award / idle-gap delays).
   */
  private interruptibleWait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.waitResolve = resolve;
      this.waitTimer = setTimeout(() => {
        this.waitTimer = null;
        const r = this.waitResolve;
        this.waitResolve = null;
        r?.();
      }, ms);
    });
  }

  private cancelInterruptibleWait(): void {
    if (this.waitTimer !== null) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    const r = this.waitResolve;
    this.waitResolve = null;
    r?.();
  }

  private async runFreeSpinChain(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.game.phase() === 'fs-spinning') {
        const beforeAward = this.game.fsAwardCounter();
        const result = this.game.spinOnce();
        if (!result) break;
        this.popup.clear();
        this.suppressStepPopup.set(this.willCelebrate(result));
        await this.pixi.play(result);
        this.suppressStepPopup.set(false);
        if (result.triggeredFreeSpins > 0) {
          await this.pixi.glowScatters();
        }
        await this.bigWin.play(result.totalWin, result.bet);
        this.game.commitSpin();
        const retriggered = this.game.fsAwardCounter() > beforeAward;
        if (retriggered) {
          await this.interruptibleWait(FS_AWARD_DELAY_MS);
        } else if (this.shouldSavor(result)) {
          await this.interruptibleWait(WIN_SAVOR_MS);
        } else {
          await this.interruptibleWait(IDLE_GAP_MS);
        }
      }
    } finally {
      this.busy = false;
    }
  }
}

const FS_AWARD_DELAY_MS = 1400;
/** Pause on a winning non-celebrated spin so the counter finishes ticking.
 *  Short by design — interruptible: clicking spin during this window
 *  cancels the wait and proceeds. */
const WIN_SAVOR_MS = 700;
/** Tiny gap on dry FS spins so the chain doesn't feel jittery. */
const IDLE_GAP_MS = 200;

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
