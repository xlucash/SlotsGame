import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import {
  BANDS,
  FREE_SPINS_AWARDED,
  FREE_SPINS_RETRIGGER_COUNT,
  FREE_SPINS_TRIGGER_COUNT,
  PAYING_SYMBOLS_RANKED,
  getPayouts,
} from '../../../core/math/paytable';
import type { SymbolId } from '../../../core/math/symbols';
import { SymbolIconComponent } from './symbol-icon.component';

/** Which band columns to surface in the table — keeps the layout readable. */
const VISIBLE_BAND_INDEXES = [0, 2, 4, 6] as const; // 4, 6, 9-10, 15+

interface DisplayRow {
  symbol: SymbolId;
  payouts: number[]; // values aligned to VISIBLE_BAND_INDEXES
}

@Component({
  selector: 'app-paytable-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SymbolIconComponent],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal panel-wood" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="pt-title">
        <button class="close" (click)="close.emit()" aria-label="Close">×</button>

        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 200 14" width="220" height="14">
            <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
            <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
          </svg>
        </div>

        <h1 id="pt-title" class="title-engraved">Paytable</h1>
        <p class="sub">Cluster pays — connect <strong>4 or more</strong> matching symbols orthogonally.<br/>Each payout is shown as a <strong>multiplier of your total bet</strong> (e.g. <em>5x</em> means 5× your stake).</p>

        <!-- Symbols table -->
        <section class="block">
          <h2 class="block-title">Symbol Payouts</h2>
          <div class="table">
            <div class="th">Symbol</div>
            @for (label of bandLabels; track label) {
              <div class="th num">{{ label }}</div>
            }
            @for (row of rows; track row.symbol) {
              <ng-container>
                <div class="td icon-cell">
                  <app-symbol-icon [symbol]="row.symbol" [size]="56"></app-symbol-icon>
                </div>
                @for (p of row.payouts; track $index) {
                  <div class="td num"
                       [class.tier-low]="$index < 2"
                       [class.tier-mid]="$index === 2"
                       [class.tier-high]="$index === 3">
                    {{ fmtMult(p) }}<span class="x">x</span>
                  </div>
                }
              </ng-container>
            }
          </div>
        </section>

        <!-- Special symbols -->
        <section class="block">
          <h2 class="block-title">Special Symbols</h2>

          <div class="special wild">
            <div class="special-icon">
              <app-symbol-icon symbol="WILD" [size]="80"></app-symbol-icon>
              <span class="special-tag wild-tag">WILD</span>
            </div>
            <div class="special-text">
              <h3>The Hunter</h3>
              <p>Substitutes for any paying symbol to help complete a cluster. Cannot trigger free spins. Two clusters of different symbols can share the same Hunter.</p>
              <div class="example">
                <span class="example-label">Example</span>
                <div class="example-row">
                  <app-symbol-icon symbol="BEAR" [size]="36"></app-symbol-icon>
                  <app-symbol-icon symbol="BEAR" [size]="36"></app-symbol-icon>
                  <app-symbol-icon symbol="WILD" [size]="36"></app-symbol-icon>
                  <app-symbol-icon symbol="BEAR" [size]="36"></app-symbol-icon>
                  <span class="arrow">=</span>
                  <span class="example-result">cluster of 4 Bears</span>
                </div>
              </div>
            </div>
          </div>

          <div class="special scatter">
            <div class="special-icon">
              <app-symbol-icon symbol="SCATTER" [size]="80"></app-symbol-icon>
              <span class="special-tag scatter-tag">SCATTER</span>
            </div>
            <div class="special-text">
              <h3>Crossed Shotguns</h3>
              <p>Land <strong>{{ TRIGGER_COUNT }} or more</strong> Scatters anywhere on the board to trigger <strong>{{ FS_AWARDED }} Free Spins</strong>.</p>
              <p>During free spins, Scatters retrigger more spins:</p>
              <ul class="retrigger">
                <li><strong>3 Scatters</strong> · +2 spins</li>
                <li><strong>4 Scatters</strong> · +4 spins</li>
                <li><strong>5+ Scatters</strong> · +6 spins</li>
              </ul>
              <p>Scatters do not form clusters and do not pay on their own.</p>
            </div>
          </div>
        </section>

        <!-- How it works -->
        <section class="block">
          <h2 class="block-title">How It Works</h2>
          <ul class="howto">
            <li><strong>6 × 5 grid.</strong> Symbols can connect in any orthogonal direction (up, down, left, right).</li>
            <li><strong>Cascade wins.</strong> Winning symbols are removed; new symbols drop in to fill the gaps. Cascades continue as long as new clusters form.</li>
            <li><strong>Free Spins multiplier.</strong> Starts at ×1 and <strong>increments by +1</strong> on every cascading win — and <strong>persists for the entire round</strong>.</li>
            <li><strong>Bonus Buy.</strong> Skip the chase: pay 20× total bet to enter Free Spins instantly. Optionally gamble on the Fortune Wheel for 3 to 20 spins.</li>
          </ul>
        </section>

        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 200 14" width="220" height="14">
            <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
            <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
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
      display: grid; place-items: center;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.25s ease-out;
      z-index: 22;
      overflow-y: auto;
      padding: 24px 12px;
    }
    .modal {
      position: relative;
      padding: 26px 32px 30px;
      border-radius: 22px;
      max-width: 760px;
      width: 100%;
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

    .ornament { display: flex; justify-content: center; margin: 4px 0; opacity: 0.85; }

    h1 { margin: 4px 0 4px; font-size: 28px; text-align: center; }
    .sub {
      margin: 0 0 22px; font-size: 13px; opacity: 0.8;
      text-align: center; line-height: 1.55;
    }
    .sub strong { color: var(--gold); font-weight: 700; }

    .block { margin: 22px 0 14px; }
    .block-title {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 14px;
      letter-spacing: 3px;
      color: var(--brass-bright);
      text-align: center;
      margin: 0 0 12px;
      text-transform: uppercase;
    }

    /* Symbol payouts table */
    .table {
      display: grid;
      grid-template-columns: 88px repeat(4, 1fr);
      gap: 4px;
      background: rgba(0,0,0,0.32);
      border: 1px solid var(--brass-deep);
      border-radius: 14px;
      padding: 10px 12px;
    }
    .th {
      font-size: 9px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      opacity: 0.7;
      padding: 6px 4px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 217, 122, 0.18);
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
    .td.num .x {
      font-size: 0.78em;
      opacity: 0.7;
      margin-left: 2px;
      letter-spacing: 0;
    }
    .td.tier-low  { color: var(--bone); }
    .td.tier-mid  { color: var(--gold); }
    .td.tier-high { color: var(--ruby-glow); text-shadow: 0 0 12px rgba(255, 123, 74, 0.45); }

    /* Special symbols */
    .special {
      display: flex; gap: 18px; align-items: stretch;
      padding: 16px 18px;
      border-radius: 14px;
      margin-bottom: 12px;
      background: linear-gradient(180deg, rgba(255, 217, 122, 0.06), rgba(0, 0, 0, 0.3));
      border: 1px solid var(--brass);
    }
    .special.wild    { border-color: var(--brass-bright); }
    .special.scatter { border-color: var(--ruby-bright);
                       background: linear-gradient(180deg, rgba(201, 84, 42, 0.18), rgba(0, 0, 0, 0.4)); }
    .special-icon {
      flex: 0 0 auto;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.5));
    }
    .special-tag {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 10px;
      letter-spacing: 2px;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .wild-tag    { background: var(--gold);        color: var(--wood-dark); }
    .scatter-tag { background: var(--ruby-bright); color: #fff; }
    .special-text { flex: 1; min-width: 0; }
    .special-text h3 {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 17px;
      letter-spacing: 1.5px;
      margin: 0 0 6px;
      color: var(--gold);
    }
    .special.scatter .special-text h3 { color: var(--ruby-glow); }
    .special-text p {
      margin: 0 0 6px;
      font-size: 13px;
      line-height: 1.55;
      opacity: 0.9;
    }
    .special-text strong { color: var(--gold); font-weight: 700; }
    .retrigger {
      margin: 4px 0 8px;
      padding: 8px 14px;
      list-style: none;
      border-radius: 8px;
      background: rgba(0,0,0,0.32);
      border: 1px dashed rgba(255,217,122,0.22);
      font-size: 12px;
      line-height: 1.7;
    }
    .retrigger li::before {
      content: '⚜';
      color: var(--gold);
      margin-right: 8px;
      font-size: 11px;
    }

    .example {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px dashed rgba(255, 217, 122, 0.25);
    }
    .example-label {
      display: block;
      font-size: 9px; letter-spacing: 1.5px;
      text-transform: uppercase;
      opacity: 0.6;
      margin-bottom: 6px;
    }
    .example-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .arrow {
      font-family: var(--font-display); font-weight: 900;
      color: var(--gold);
      font-size: 18px;
      margin: 0 2px;
    }
    .example-result {
      font-size: 12px; opacity: 0.85;
      font-family: var(--font-display);
    }

    /* How-it-works list */
    .howto {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .howto li {
      position: relative;
      padding: 8px 8px 8px 26px;
      font-size: 13px;
      line-height: 1.55;
      opacity: 0.92;
    }
    .howto li::before {
      content: '⚜';
      position: absolute; left: 4px; top: 6px;
      color: var(--gold);
      font-size: 13px;
    }
    .howto strong { color: var(--gold); font-weight: 700; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rise {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }

    @media (max-width: 600px) {
      .modal { padding: 18px 16px 22px; }
      h1 { font-size: 22px; }
      .sub { font-size: 12px; margin-bottom: 14px; }
      .table { grid-template-columns: 64px repeat(4, 1fr); padding: 8px; }
      .td.num { font-size: 12px; }
      .th { font-size: 8px; }
      .special { flex-direction: column; gap: 10px; padding: 12px 14px; }
      .special-text h3 { font-size: 15px; }
      .special-text p { font-size: 12px; }
      .howto li { font-size: 12px; }
    }
  `],
})
export class PaytableModalComponent {
  @Output() readonly close = new EventEmitter<void>();

  protected readonly TRIGGER_COUNT = FREE_SPINS_TRIGGER_COUNT;
  protected readonly FS_AWARDED = FREE_SPINS_AWARDED;
  protected readonly RETRIGGER_COUNT = FREE_SPINS_RETRIGGER_COUNT;

  protected readonly bandLabels = VISIBLE_BAND_INDEXES.map((i) => labelFor(BANDS[i]));

  protected readonly rows: readonly DisplayRow[] = PAYING_SYMBOLS_RANKED.map((s) => {
    const full = getPayouts(s) ?? [];
    return {
      symbol: s,
      payouts: VISIBLE_BAND_INDEXES.map((i) => full[i] ?? 0),
    };
  });

  /** Format a bet multiplier in pl-PL (comma decimal, no trailing zeros). */
  protected fmtMult(value: number): string {
    return MULT_FMT.format(value);
  }
}

const MULT_FMT = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function labelFor(band: readonly [number, number]): string {
  const [lo, hi] = band;
  if (hi === Infinity) return `${lo}+`;
  if (lo === hi) return `${lo}`;
  return `${lo}–${hi}`;
}
