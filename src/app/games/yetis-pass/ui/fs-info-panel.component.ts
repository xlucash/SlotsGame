import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { YetiGameService } from '../core/services/game.service';

/**
 * Free-spins counter card pinned to the right of the grid during FS.
 * Shows the remaining spin count and a small list of currently active
 * expanding-wild reels with their multipliers (so the player sees the
 * persistent state at a glance).
 */
@Component({
  selector: 'app-yeti-fs-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside class="panel" role="status" aria-live="polite">
        <div class="cell">
          <span class="label">Spins Left</span>
          <strong class="value">{{ game.freeSpinsLeft() }}</strong>
        </div>
        @if (game.persistentWilds().length > 0) {
          <div class="divider" aria-hidden="true">
            <svg viewBox="0 0 80 6" width="80" height="6">
              <path d="M0 3 H30 M50 3 H80 M32 3 L40 0 L48 3 L40 6 Z" fill="none" stroke="#9ad6e8" stroke-width="0.8"/>
            </svg>
          </div>
          <div class="cell">
            <span class="label">Wild Reels</span>
            <ul class="mults">
              @for (pw of game.persistentWilds(); track pw.col) {
                <li><span class="mult">×{{ pw.multiplier }}</span></li>
              }
            </ul>
          </div>
        }
      </aside>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      left: calc(var(--grid-right, 100%) + 28px);
      top: calc((var(--grid-top, 0px) + var(--grid-bottom, 100%)) / 2);
      transform: translateY(-50%);
      z-index: 4;
      pointer-events: none;
    }
    .panel {
      display: flex; flex-direction: column; align-items: stretch;
      gap: 12px;
      min-width: 144px;
      padding: 16px 14px;
      border-radius: 18px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(154,214,232,0.18), transparent 70%),
        linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 100%);
      border: 1px solid #9ad6e8;
      box-shadow:
        inset 0 1px 0 rgba(154,214,232,0.22),
        0 12px 32px rgba(0,0,0,0.55),
        0 0 28px rgba(154,214,232,0.18);
      color: var(--bone);
      font-family: var(--font-display);
      animation: fsPanelIn 0.4s ease-out;
    }
    .label {
      display: block;
      text-align: center;
      font-size: 9px;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      opacity: 0.7;
      font-family: var(--font-body);
      font-weight: 600;
      margin-bottom: 6px;
    }
    .value {
      display: block;
      text-align: center;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 44px;
      color: #9ad6e8;
      text-shadow: 0 2px 0 #04101a, 0 0 22px rgba(154,214,232,0.45);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .divider { display: flex; justify-content: center; opacity: 0.7; }
    .mults {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .mult {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(154,214,232,0.10);
      border: 1px solid rgba(154,214,232,0.5);
      color: #9ad6e8;
      font-family: var(--font-display); font-weight: 900;
      font-size: 14px;
      text-shadow: 0 0 12px rgba(154,214,232,0.4);
    }
    @keyframes fsPanelIn {
      from { opacity: 0; transform: translateY(-50%) translateX(20px); }
      to   { opacity: 1; transform: translateY(-50%); }
    }
    @media (max-width: 700px) {
      :host {
        right: 12px; left: auto;
        top: 12px;
        transform: none;
      }
      .panel { flex-direction: row; align-items: center; gap: 12px; padding: 8px 12px; min-width: 0; }
      .label { margin-bottom: 2px; }
      .value { font-size: 22px; }
      .divider { display: none; }
      .mults { flex-direction: row; }
      .mult { font-size: 11px; padding: 2px 6px; }
    }
  `],
})
export class YetiFsInfoPanelComponent {
  protected readonly game = inject(YetiGameService);
  protected readonly visible = computed(() => this.game.inFreeSpins());
}
