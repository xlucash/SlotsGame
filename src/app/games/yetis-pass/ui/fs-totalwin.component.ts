import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CounterComponent } from '../../../shared/ui/counter.component';
import { YetiGameService } from '../core/services/game.service';

/**
 * "Total Hunt Win" bar pinned beneath the grid while in free spins.
 * Cumulative win across the current FS round, climbing as cascades land.
 */
@Component({
  selector: 'app-yeti-fs-totalwin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent],
  template: `
    @if (visible()) {
      <div class="bar" role="status" aria-live="polite">
        <span class="label">Total Hunt Win</span>
        <strong class="amount">
          <app-counter [value]="game.fsTotalWin()" [duration]="0.45"></app-counter>
          <em>PLN</em>
        </strong>
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      top: calc(var(--grid-bottom, 70%) + 22px);
      left: calc((var(--grid-left, 0px) + var(--grid-right, 100%)) / 2);
      transform: translateX(-50%);
      z-index: 4;
      pointer-events: none;
    }
    .bar {
      display: flex; align-items: baseline; gap: 14px;
      padding: 10px 24px;
      border-radius: 14px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(154,214,232,0.18), transparent 70%),
        linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%);
      border: 1px solid #9ad6e8;
      box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.22),
        0 8px 22px rgba(0,0,0,0.5),
        0 0 22px rgba(154,214,232,0.15);
      color: #fff;
      font-family: var(--font-display);
      animation: barIn 0.35s ease-out;
    }
    .label {
      font-size: 10px;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      opacity: 0.7;
      font-family: var(--font-body);
      font-weight: 600;
    }
    .amount {
      display: inline-flex; align-items: baseline; gap: 6px;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 28px;
      color: #9ad6e8;
      text-shadow: 0 2px 0 #04101a, 0 0 22px rgba(154,214,232,0.45);
      font-variant-numeric: tabular-nums;
    }
    .amount em {
      font-style: normal; font-size: 12px;
      opacity: 0.7; letter-spacing: 1.6px;
      color: var(--bone-dim);
    }
    @keyframes barIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      to   { opacity: 1; transform: translateX(-50%); }
    }
    @media (max-width: 700px) {
      :host { top: calc(var(--grid-bottom, 70%) + 12px); }
      .bar { padding: 6px 14px; gap: 10px; }
      .label { font-size: 9px; letter-spacing: 1.4px; }
      .amount { font-size: 20px; }
      .amount em { font-size: 10px; }
    }
  `],
})
export class YetiFsTotalwinComponent {
  protected readonly game = inject(YetiGameService);
  protected readonly visible = computed(() => this.game.inFreeSpins());
}
