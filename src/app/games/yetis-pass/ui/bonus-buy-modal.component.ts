import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { BalanceService } from '../../../shared/services/balance.service';
import { BetService } from '../../../shared/services/bet.service';
import { formatPLN } from '../../../shared/util/format';
import { YetiGameService } from '../core/services/game.service';

@Component({
  selector: 'app-yeti-bonus-buy-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog">
        <button class="close" (click)="close.emit()" aria-label="Close">×</button>

        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 200 14" width="220" height="14">
            <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z"
                  fill="none" stroke="#9ad6e8" stroke-width="1.2"/>
            <circle cx="100" cy="7" r="2.5" fill="#9ad6e8"/>
          </svg>
        </div>

        <h1>Buy The Hunt</h1>
        <p class="lead">Skip the chase. Trigger free spins instantly.</p>

        <div class="stake-row">
          <div class="stake-cell">
            <span class="lbl">Total Bet</span>
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
            <span class="lbl">Bonus Cost</span>
            <strong class="cost num">{{ formatPLN(cost()) }}</strong>
          </div>
        </div>

        <div class="card">
          <div class="emblem" aria-hidden="true">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="36" fill="#0c1828" stroke="#9ad6e8" stroke-width="2"/>
              <path d="M16 56 L28 38 L36 48 L48 32 L60 50 L66 56 Z" fill="#9ad6e8" stroke="#0c1828"/>
              <path d="M28 38 L32 36 L34 40 L30 42 Z M48 32 L52 30 L56 38 L50 38 Z" fill="#fff"/>
            </svg>
          </div>
          <div class="features">
            <div><span>Free Spins</span><strong>{{ FS_COUNT }}</strong></div>
            <div class="vsep"></div>
            <div><span>Cost</span><strong>{{ formatPLN(cost()) }}</strong></div>
            <div class="vsep"></div>
            <div><span>Multiplier</span><strong>up to ×250</strong></div>
          </div>
          <button class="cta"
                  [disabled]="!canAfford()"
                  (click)="buy.emit()">
            @if (canAfford()) {
              <span>BEGIN THE CLIMB · {{ formatPLN(cost()) }}</span>
            } @else {
              <span>Insufficient balance</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; display: block; pointer-events: auto; z-index: 200; }
    .overlay {
      position: fixed; inset: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 100%);
      backdrop-filter: blur(8px);
      display: grid; place-items: center;
      animation: fadeIn 0.25s ease-out;
      padding: 24px 12px;
    }
    .modal {
      position: relative;
      max-width: 540px; width: 100%;
      padding: 26px 32px 30px;
      border-radius: 22px;
      background: linear-gradient(180deg, #0c2030, #06141c);
      border: 1px solid #9ad6e8;
      box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.22),
        0 30px 80px rgba(0,0,0,0.7),
        0 0 60px rgba(154,214,232,0.18);
      color: var(--bone);
      animation: rise 0.35s cubic-bezier(0.2, 0.7, 0.25, 1.05);
      font-family: var(--font-body);
    }
    .close {
      position: absolute; top: 14px; right: 16px;
      width: 32px; height: 32px;
      border: 1px solid #4a8aa8;
      background: rgba(0,0,0,0.5);
      color: var(--bone);
      font-size: 20px; line-height: 1;
      cursor: pointer; border-radius: 50%;
      transition: filter 0.15s, transform 0.15s;
    }
    .close:hover { filter: brightness(1.4); color: #9ad6e8; transform: rotate(90deg); }
    .ornament { display: flex; justify-content: center; opacity: 0.85; margin: 4px 0 12px; }

    h1 {
      margin: 0;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 28px;
      letter-spacing: 4px;
      color: #9ad6e8;
      text-align: center;
      text-transform: uppercase;
      text-shadow: 0 1px 0 #04101a, 0 0 18px rgba(154,214,232,0.35);
    }
    .lead {
      margin: 8px 0 22px;
      font-size: 13px; opacity: 0.78;
      text-align: center; letter-spacing: 0.4px;
    }

    /* Stake stepper inside the modal so the player can adjust their wager
       and see the bonus cost update without leaving the dialog. */
    .stake-row {
      display: flex; align-items: stretch; justify-content: center;
      gap: 18px;
      padding: 14px 22px;
      margin: 0 auto 18px;
      max-width: 460px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.30));
      border: 1px solid #9ad6e8;
      box-shadow: inset 0 1px 0 rgba(154,214,232,0.18), inset 0 0 12px rgba(0,0,0,0.4);
    }
    .stake-cell, .cost-cell {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .stake-cell { flex: 1.1; }
    .cost-cell { flex: 0.9; }
    .lbl {
      font-size: 9px; letter-spacing: 1.6px;
      text-transform: uppercase; opacity: 0.65; font-weight: 600;
    }
    .stepper {
      display: flex; align-items: center; gap: 6px;
      padding: 3px 5px;
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.3));
      border: 1px solid #4a8aa8;
    }
    .step {
      width: 30px; height: 30px;
      border: 1px solid #4a8aa8;
      background: linear-gradient(180deg, #1a3548, #0c1a26);
      color: #9ad6e8;
      border-radius: 7px;
      cursor: pointer;
      display: grid; place-items: center;
      box-shadow: inset 0 1px 0 rgba(154,214,232,0.22);
      transition: filter 0.1s, transform 0.1s;
    }
    .step:hover:not(:disabled) { filter: brightness(1.25); transform: translateY(-1px); }
    .step:disabled { opacity: 0.3; cursor: not-allowed; }
    .stepper strong {
      min-width: 92px; text-align: center;
      font-family: var(--font-display); font-weight: 700;
      font-size: 17px; color: #fff;
    }
    .stake-divider {
      width: 1px;
      background: linear-gradient(180deg, transparent, #9ad6e8 30%, #9ad6e8 70%, transparent);
      opacity: 0.5;
    }
    .cost {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 24px;
      color: #9ad6e8;
      text-shadow: 0 0 18px rgba(154,214,232,0.35);
    }

    .card {
      padding: 22px 24px 20px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(154,214,232,0.10), rgba(0,0,0,0.4));
      border: 1px solid #9ad6e8;
      box-shadow: inset 0 1px 0 rgba(154,214,232,0.25);
      display: flex; flex-direction: column; align-items: center; gap: 16px;
    }
    .emblem { filter: drop-shadow(0 6px 20px rgba(154,214,232,0.4)); }
    .features {
      display: flex; align-items: center; gap: 18px;
      padding: 12px 0;
      border-top: 1px dashed rgba(154,214,232,0.25);
      border-bottom: 1px dashed rgba(154,214,232,0.25);
      width: 100%; justify-content: center;
    }
    .features div { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
    .features span {
      font-size: 9px; letter-spacing: 1.5px;
      text-transform: uppercase; opacity: 0.7; font-weight: 600;
    }
    .features strong {
      font-family: var(--font-display); font-weight: 900;
      font-size: 22px; color: #fff; margin-top: 2px;
    }
    .vsep {
      width: 1px; height: 30px;
      background: linear-gradient(180deg, transparent, rgba(154,214,232,0.4), transparent);
    }
    .cta {
      padding: 14px 28px;
      border-radius: 999px;
      border: 1px solid #9ad6e8;
      background: linear-gradient(180deg, #4a8aa8, #1a3548);
      color: #fff;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 14px; letter-spacing: 2px;
      cursor: pointer;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        0 6px 18px rgba(0,0,0,0.5),
        0 0 24px rgba(154,214,232,0.25);
      transition: filter 0.1s, transform 0.1s;
    }
    .cta:hover:not(:disabled) { filter: brightness(1.18); transform: translateY(-1px); }
    .cta:disabled { opacity: 0.55; cursor: not-allowed; background: rgba(0,0,0,0.4); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rise {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
  `],
})
export class YetiBonusBuyModalComponent {
  protected readonly game = inject(YetiGameService);
  protected readonly balance = inject(BalanceService);
  protected readonly bet = inject(BetService);
  protected readonly formatPLN = formatPLN;

  protected readonly FS_COUNT = this.game.BONUS_BUY_FS_COUNT;

  @Output() readonly buy = new EventEmitter<void>();
  @Output() readonly close = new EventEmitter<void>();

  protected cost(): number { return this.game.bonusCost(); }
  protected canAfford(): boolean { return this.balance.balance() >= this.cost(); }
}
