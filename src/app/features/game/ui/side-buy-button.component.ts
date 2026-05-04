import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { BetService } from '../../../shared/services/bet.service';
import { GameService } from '../../../core/services/game.service';
import { BONUS_BUY_COST_MULT } from '../../../core/services/bonus-buy';
import { formatPLN } from '../../../shared/util/format';

/**
 * Vertical "BUY BONUS" pill plus a "HOW TO PLAY" info button stacked
 * directly below it. Anchored to the LEFT edge of the grid via CSS
 * variables.
 *
 * The buy button only renders during idle base play (it'd be meaningless
 * during FS); the info button is ALWAYS reachable so a confused player
 * can pop the paytable mid-spin without hunting for a hidden top-bar
 * icon.
 */
@Component({
  selector: 'app-side-buy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rail">
      @if (showBuy()) {
        <button class="buy"
                [disabled]="!game.canBuyBonus()"
                (click)="open.emit(); $event.stopPropagation()">
          <span class="emblem" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
                    fill="#ffd97a" stroke="#5e4318" stroke-width="0.6"/>
            </svg>
          </span>
          <span class="title">BUY<br/>BONUS</span>
          <span class="cost">{{ formatPLN(cost()) }}</span>
        </button>
      }

      <button class="info"
              (click)="info.emit(); $event.stopPropagation()"
              aria-label="How to play">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <text x="12" y="17" text-anchor="middle"
                font-family="Cinzel, serif" font-weight="900" font-size="14"
                fill="currentColor">i</text>
        </svg>
        <span class="label">HOW<br/>TO PLAY</span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      left: calc(var(--grid-left, 24px) - 28px);
      top: calc((var(--grid-top, 0px) + var(--grid-bottom, 100%)) / 2);
      transform: translate(-100%, -50%);
      z-index: 4;
      pointer-events: auto;
    }
    .rail { display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .buy, .info {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 96px; cursor: pointer;
      font-family: var(--font-brand); font-weight: 900;
      letter-spacing: 1.5px;
      transition: transform .15s, filter .15s, box-shadow .2s;
      border: 1px solid var(--brass);
    }
    .buy {
      gap: 8px; padding: 18px 10px; border-radius: 18px;
      color: var(--gold);
      background: linear-gradient(180deg, var(--ruby), var(--ruby-deep));
      box-shadow: inset 0 1px 0 rgba(255,217,122,.32), inset 0 -3px 8px rgba(0,0,0,.5),
                  0 8px 22px rgba(139,26,26,.6), 0 0 0 1px var(--ruby-deep);
      animation: buyBreathe 3.8s ease-in-out infinite;
      position: relative;
    }
    .buy::before {
      content: ''; position: absolute; inset: 5px; border-radius: 13px;
      border: 1px dashed rgba(255,217,122,.35); pointer-events: none;
    }
    .buy:hover:not(:disabled) {
      transform: translateY(-2px) scale(1.03); filter: brightness(1.18);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.45), 0 12px 28px rgba(255,123,74,.55), var(--glow-ruby);
    }
    .buy:active:not(:disabled) { transform: translateY(0) scale(.98); }
    .buy:disabled { opacity: .4; cursor: not-allowed; animation: none; }

    .info {
      gap: 4px; padding: 12px 10px; border-radius: 14px;
      color: var(--gold);
      background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.3));
      box-shadow: inset 0 1px 0 rgba(255,217,122,.22), 0 6px 16px rgba(0,0,0,.4);
    }
    .info:hover { transform: translateY(-1px); filter: brightness(1.2); box-shadow: 0 0 18px rgba(255,217,122,.4); }
    .info:active { transform: translateY(0); }
    .info .label {
      font-size: 10px; line-height: 1.05; text-align: center;
      letter-spacing: 1.3px; text-shadow: 0 2px 0 var(--wood-dark);
    }

    .emblem { filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); animation: starSpin 6s linear infinite; display: inline-block; }
    .title { font-size: 13px; line-height: 1.05; text-align: center; text-shadow: 0 2px 0 var(--ruby-deep); }
    .cost {
      font-family: var(--font-display); font-weight: 700;
      font-size: 11px; letter-spacing: .8px; opacity: .95;
      padding: 4px 8px; border-radius: 6px;
      background: rgba(0,0,0,.32); border: 1px solid rgba(255,217,122,.3); color: #fff;
    }
    @keyframes buyBreathe {
      0%, 100% { box-shadow: inset 0 1px 0 rgba(255,217,122,.32), inset 0 -3px 8px rgba(0,0,0,.5),
                              0 8px 22px rgba(139,26,26,.6), 0 0 0 1px var(--ruby-deep); }
      50% { box-shadow: inset 0 1px 0 rgba(255,217,122,.4), inset 0 -3px 8px rgba(0,0,0,.5),
                        0 10px 28px rgba(255,123,74,.5), 0 0 0 1px var(--ruby-deep), 0 0 22px rgba(255,123,74,.3); }
    }
    @keyframes starSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    @media (max-width: 700px) {
      :host { left: 12px; top: 12px; transform: none; }
      .rail { flex-direction: row; gap: 8px; }
      .buy, .info {
        flex-direction: row; gap: 8px; width: auto;
        padding: 8px 12px; border-radius: 999px;
      }
      .title, .info .label { font-size: 11px; line-height: 1.1; }
      .title br, .info .label br { display: none; }
      .cost { font-size: 9px; padding: 2px 6px; }
      .emblem svg { width: 18px; height: 18px; }
      .info svg { width: 16px; height: 16px; }
    }
  `],
})
export class SideBuyButtonComponent {
  protected readonly game = inject(GameService);
  protected readonly bet = inject(BetService);
  protected readonly formatPLN = formatPLN;

  @Output() readonly open = new EventEmitter<void>();
  @Output() readonly info = new EventEmitter<void>();

  protected readonly cost = computed(() => this.bet.amount() * BONUS_BUY_COST_MULT);
  /**
   * Buy is visible during base play (idle + mid-spin) and stays hidden in
   * the FS round where it'd be meaningless. During mid-spin `game.canBuyBonus()`
   * is false so the button reads as inactive without hiding.
   */
  protected readonly showBuy = computed(() => {
    const p = this.game.phase();
    return p === 'idle' || p === 'spinning';
  });
}
