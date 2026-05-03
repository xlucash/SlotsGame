import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import {
  FREE_SPINS_AWARDED,
  FREE_SPINS_RETRIGGER_AWARD,
  FREE_SPINS_TRIGGER_COUNT,
  PAYING_SYMBOLS_RANKED,
  WILD_MULTIPLIERS,
  expectedWildMultiplier,
  getLinePayouts,
} from '../core/math/paytable';
import type { SymbolId } from '../core/math/symbols';
import { SymbolIconComponent } from './symbol-icon.component';

interface DisplayRow { symbol: SymbolId; payouts: number[]; }

@Component({
  selector: 'app-yeti-paytable-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SymbolIconComponent],
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

        <h1>Paytable</h1>
        <p class="sub">25 paylines · pays from <strong>3 left-to-right</strong>. Each value is a <strong>multiplier of total bet</strong>.</p>

        <section class="block">
          <h2>Symbol Payouts</h2>
          <div class="table">
            <div class="th">Symbol</div>
            <div class="th num">3×</div>
            <div class="th num">4×</div>
            <div class="th num">5×</div>
            @for (row of rows; track row.symbol) {
              <ng-container>
                <div class="td icon-cell">
                  <app-yeti-symbol-icon [symbol]="row.symbol" [size]="56"></app-yeti-symbol-icon>
                </div>
                @for (p of row.payouts; track $index) {
                  <div class="td num"
                       [class.tier-mid]="$index === 1"
                       [class.tier-high]="$index === 2">
                    {{ fmt(p) }}<span class="x">x</span>
                  </div>
                }
              </ng-container>
            }
          </div>
        </section>

        <section class="block">
          <h2>Yeti Wild — Expanding Multipliers</h2>
          <div class="special wild">
            <div class="special-icon">
              <app-yeti-symbol-icon symbol="YETI" [size]="80"></app-yeti-symbol-icon>
            </div>
            <div class="special-text">
              <p>The <strong>Yeti</strong> substitutes for any paying symbol.</p>
              <p>When a Yeti lands and a paying combination follows on its line,
                 it <strong>expands to fill the entire reel</strong> with a random multiplier value.
                 Multipliers from multiple expanded reels combine additively on each winning line, capped at <strong>250×</strong>.</p>
              <p>In Free Spins, expanded wild reels <strong>persist for the rest of the round</strong> alongside their multiplier.</p>
              <ul class="mults">
                @for (m of multTiers; track m.value) {
                  <li><span [class.gold]="m.value >= 100">×{{ m.value }}</span> <em>{{ m.pct }}%</em></li>
                }
              </ul>
              <p class="footnote">Average multiplier ≈ <strong>{{ avgMult }}×</strong></p>
            </div>
          </div>
        </section>

        <section class="block">
          <h2>Summit Scatter — Free Spins</h2>
          <div class="special scatter">
            <div class="special-icon">
              <app-yeti-symbol-icon symbol="SUMMIT" [size]="80"></app-yeti-symbol-icon>
            </div>
            <div class="special-text">
              <p>Land <strong>{{ TRIGGER }} or more</strong> Summit Flag scatters anywhere on the board to trigger <strong>{{ FS_AWARDED }} Free Spins</strong>.</p>
              <p>3+ scatters during free spins retrigger <strong>+{{ RETRIGGER }} more spins</strong>.</p>
            </div>
          </div>
        </section>

        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 200 14" width="220" height="14">
            <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z"
                  fill="none" stroke="#9ad6e8" stroke-width="1.2"/>
            <circle cx="100" cy="7" r="2.5" fill="#9ad6e8"/>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; display: block; pointer-events: auto; z-index: 210; }
    .overlay {
      position: fixed; inset: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 100%);
      backdrop-filter: blur(8px);
      display: grid; place-items: center;
      animation: fadeIn 0.25s ease-out;
      overflow-y: auto;
      padding: 24px 12px;
    }
    .modal {
      position: relative;
      max-width: 760px; width: 100%;
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
    .ornament { display: flex; justify-content: center; opacity: 0.85; margin: 4px 0; }

    h1 {
      margin: 4px 0 4px; font-size: 28px;
      text-align: center;
      font-family: var(--font-brand); font-weight: 900;
      color: #9ad6e8; letter-spacing: 4px; text-transform: uppercase;
      text-shadow: 0 1px 0 #04101a, 0 0 18px rgba(154,214,232,0.35);
    }
    .sub { margin: 0 0 22px; font-size: 13px; opacity: 0.8; text-align: center; }
    .sub strong { color: #9ad6e8; }

    .block { margin: 22px 0 14px; }
    .block h2 {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 14px; letter-spacing: 3px;
      color: #9ad6e8;
      text-align: center;
      text-transform: uppercase;
      margin: 0 0 12px;
    }

    .table {
      display: grid; grid-template-columns: 80px repeat(3, 1fr);
      gap: 4px;
      background: rgba(0,0,0,0.32);
      border: 1px solid #4a8aa8;
      border-radius: 14px;
      padding: 10px 12px;
    }
    .th {
      font-size: 9px; letter-spacing: 1.5px;
      text-transform: uppercase; opacity: 0.7;
      padding: 6px 4px; text-align: center;
      border-bottom: 1px solid rgba(154,214,232,0.18);
    }
    .th.num { font-family: var(--font-display); font-weight: 700; font-size: 11px; }
    .td {
      display: flex; align-items: center; justify-content: center;
      padding: 4px;
      font-family: var(--font-display); font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .td.icon-cell { padding: 2px; }
    .td.num { font-size: 14px; color: #fff; }
    .td.num .x { font-size: 0.78em; opacity: 0.7; margin-left: 2px; }
    .td.tier-mid { color: #9ad6e8; }
    .td.tier-high { color: #ffd97a; text-shadow: 0 0 12px rgba(255,217,122,0.4); }

    .special {
      display: flex; gap: 18px;
      padding: 16px 18px;
      border-radius: 14px;
      margin-bottom: 12px;
      background: linear-gradient(180deg, rgba(154,214,232,0.06), rgba(0,0,0,0.35));
      border: 1px solid #4a8aa8;
    }
    .special.wild { border-color: #9ad6e8; }
    .special.scatter { border-color: #c9543a;
                       background: linear-gradient(180deg, rgba(201,84,58,0.18), rgba(0,0,0,0.4)); }
    .special-icon {
      flex: 0 0 auto;
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.5));
    }
    .special-text { flex: 1; min-width: 0; }
    .special-text p { margin: 0 0 6px; font-size: 13px; line-height: 1.55; opacity: 0.9; }
    .special-text strong { color: #9ad6e8; }
    .special.scatter .special-text strong { color: #ff7a5a; }

    .mults {
      list-style: none; margin: 8px 0 6px; padding: 8px 14px;
      border-radius: 8px;
      background: rgba(0,0,0,0.35);
      border: 1px dashed rgba(154,214,232,0.22);
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px;
      font-size: 12px;
    }
    .mults li { display: flex; align-items: baseline; gap: 6px; }
    .mults li span { font-family: var(--font-brand); font-weight: 900; color: #9ad6e8; }
    .mults li span.gold { color: #ffd97a; }
    .mults li em { font-style: normal; opacity: 0.6; font-size: 10px; }
    .footnote { font-size: 11px; opacity: 0.65; margin: 4px 0 0; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rise {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
  `],
})
export class YetiPaytableModalComponent {
  @Output() readonly close = new EventEmitter<void>();

  protected readonly TRIGGER = FREE_SPINS_TRIGGER_COUNT;
  protected readonly FS_AWARDED = FREE_SPINS_AWARDED;
  protected readonly RETRIGGER = FREE_SPINS_RETRIGGER_AWARD;

  protected readonly rows: readonly DisplayRow[] = PAYING_SYMBOLS_RANKED.map((s) => ({
    symbol: s,
    payouts: [...(getLinePayouts(s) ?? [0, 0, 0])],
  }));

  protected readonly multTiers = (() => {
    const total = WILD_MULTIPLIERS.reduce((s, m) => s + m.weight, 0);
    return WILD_MULTIPLIERS.map((m) => ({
      value: m.value,
      pct: ((m.weight / total) * 100).toFixed(m.weight < 0.5 ? 2 : 1),
    }));
  })();

  protected readonly avgMult = expectedWildMultiplier().toFixed(1);

  protected fmt(value: number): string {
    return MULT_FMT.format(value);
  }
}

const MULT_FMT = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
