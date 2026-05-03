import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { BalanceService } from '../../../shared/services/balance.service';
import { formatPLN } from '../../../shared/util/format';
import { YetiGameService } from '../core/services/game.service';

/**
 * Vertical "BUY HUNT" pill anchored to the LEFT edge of the grid via CSS
 * variables (--grid-left / --grid-top / --grid-bottom). Hidden outside
 * the idle base game.
 */
@Component({
  selector: 'app-yeti-side-buy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button class="buy"
              [disabled]="!canBuy()"
              (click)="open.emit(); $event.stopPropagation()">
        <span class="emblem" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
                  fill="#9ad6e8" stroke="#0c1828" stroke-width="0.6"/>
          </svg>
        </span>
        <span class="title">BUY<br/>HUNT</span>
        <span class="cost">{{ formatPLN(game.bonusCost()) }}</span>
      </button>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      /* Anchor right edge ~28px to the LEFT of the grid frame's outer edge. */
      left: calc(var(--grid-left, 24px) - 28px);
      top: calc((var(--grid-top, 0px) + var(--grid-bottom, 100%)) / 2);
      transform: translate(-100%, -50%);
      z-index: 4;
      pointer-events: auto;
    }
    .buy {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px;
      width: 96px;
      padding: 18px 10px;
      border-radius: 18px;
      background: linear-gradient(180deg, #1a3548 0%, #06141c 100%);
      color: #9ad6e8;
      font-family: var(--font-brand); font-weight: 900;
      letter-spacing: 1.5px;
      cursor: pointer;
      border: 1px solid #9ad6e8;
      box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.32),
        inset 0 -3px 8px rgba(0,0,0,0.5),
        0 8px 22px rgba(20, 32, 44, 0.6);
      transition: transform 0.12s, filter 0.15s, box-shadow 0.2s;
      animation: buyBreathe 3.8s ease-in-out infinite;
    }
    .buy::before {
      content: '';
      position: absolute; inset: 5px;
      border-radius: 13px;
      border: 1px dashed rgba(154,214,232,0.35);
      pointer-events: none;
    }
    .buy:hover:not(:disabled) {
      transform: translateY(-2px) scale(1.03);
      filter: brightness(1.18);
      box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.45),
        0 12px 28px rgba(154,214,232,0.45);
    }
    .buy:active:not(:disabled) { transform: translateY(0) scale(0.98); }
    .buy:disabled { opacity: 0.4; cursor: not-allowed; animation: none; }

    .emblem {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      animation: starSpin 6s linear infinite;
      display: inline-block;
    }
    .title {
      font-size: 13px;
      line-height: 1.05;
      text-align: center;
      text-shadow: 0 2px 0 #04101a;
    }
    .cost {
      font-family: var(--font-display); font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.8px;
      opacity: 0.95;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.32);
      border: 1px solid rgba(154,214,232,0.3);
      color: #fff;
    }
    @keyframes buyBreathe {
      0%, 100% { box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.32),
        inset 0 -3px 8px rgba(0,0,0,0.5),
        0 8px 22px rgba(20,32,44,0.6); }
      50% { box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.4),
        inset 0 -3px 8px rgba(0,0,0,0.5),
        0 10px 28px rgba(154,214,232,0.4); }
    }
    @keyframes starSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    @media (max-width: 700px) {
      :host {
        left: 12px; top: 12px;
        transform: none;
      }
      .buy {
        flex-direction: row; gap: 8px;
        width: auto;
        padding: 8px 12px;
        border-radius: 999px;
      }
      .title { font-size: 11px; line-height: 1.1; }
      .title br { display: none; }
      .cost { font-size: 9px; padding: 2px 6px; }
      .emblem svg { width: 18px; height: 18px; }
    }
  `],
})
export class YetiSideBuyButtonComponent {
  protected readonly game = inject(YetiGameService);
  private readonly balance = inject(BalanceService);
  protected readonly formatPLN = formatPLN;

  @Output() readonly open = new EventEmitter<void>();

  protected readonly visible = computed(() => this.game.phase() === 'idle');
  protected readonly canBuy = computed(() => this.balance.balance() >= this.game.bonusCost());
}
