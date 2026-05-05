import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { GameService } from '../../../core/services/game.service';
import { CounterComponent } from '../../../shared/ui/counter.component';

/**
 * Readout pinned beneath the grid. Two modes:
 *   - Free spins: shows cumulative "Total Hunt Win" climbing as cascades
 *     land.
 *   - Auto-spin (base play): shows the per-spin Last Win prominently so
 *     a player running 50–250 auto rounds can actually see what just hit.
 *     The bottom-bar swaps to the running auto total to compensate.
 */
@Component({
  selector: 'app-fs-totalwin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent],
  template: `
    @if (visible()) {
      <div class="bar" role="status" aria-live="polite">
        <span class="label">{{ label() }}</span>
        <strong class="amount">
          <app-counter [value]="amount()" [duration]="counterDuration()"></app-counter>
          <em>PLN</em>
        </strong>
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      /* Anchor the bar's top edge ~22px below the brass-frame outer edge. */
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
        radial-gradient(ellipse at 50% 0%, rgba(255,217,122,0.18), transparent 70%),
        linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.22),
        0 8px 22px rgba(0,0,0,0.5),
        0 0 22px rgba(255,217,122,0.15);
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
      color: var(--gold);
      text-shadow:
        0 2px 0 var(--wood-dark),
        0 0 22px rgba(255,217,122,0.45);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.4px;
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
export class FsTotalwinComponent {
  protected readonly game = inject(GameService);

  // Auto-spin state pushed in by the host (it owns autoRemaining).
  private readonly _autoActive = signal(false);
  private readonly _lastWin = signal(0);
  @Input() set autoActive(v: boolean) { this._autoActive.set(v); }
  @Input() set lastWin(v: number) { this._lastWin.set(v); }

  protected readonly visible = computed(
    () => this.game.inFreeSpins() || this._autoActive(),
  );
  protected readonly label = computed(
    () => this.game.inFreeSpins() ? 'Total Hunt Win' : 'Last Win',
  );
  protected readonly amount = computed(
    () => this.game.inFreeSpins() ? this.game.fsTotalWin() : this._lastWin(),
  );
  /** Tally counts up during FS so the player watches it climb; auto-spin
   *  Last Win snaps because each spin is its own value, not a tally. */
  protected readonly counterDuration = computed(
    () => this.game.inFreeSpins() ? 0.35 : 0,
  );
}
