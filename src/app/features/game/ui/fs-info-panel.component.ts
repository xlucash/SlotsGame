import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameService } from '../../../core/services/game.service';

/**
 * Free-spins info card pinned to the right of the grid:
 *  - Big multiplier display (×N) — main feature, animated
 *  - Spins remaining underneath
 * Hidden outside FS mode.
 */
@Component({
  selector: 'app-fs-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside class="panel" role="status" aria-live="polite">
        <div class="multiplier">
          <span class="label">Multiplier</span>
          <strong class="value" [class.bumped]="game.fsMultiplier() > 1">
            <span class="x">×</span>{{ game.fsMultiplier() }}
          </strong>
        </div>
        <div class="divider" aria-hidden="true">
          <svg viewBox="0 0 80 6" width="80" height="6">
            <path d="M0 3 H30 M50 3 H80 M32 3 L40 0 L48 3 L40 6 Z" fill="none" stroke="#ffd97a" stroke-width="0.8"/>
          </svg>
        </div>
        <div class="spins">
          <span class="label">Spins Left</span>
          <strong class="value">{{ game.freeSpinsLeft() }}</strong>
        </div>
      </aside>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      /* Anchor the panel's left edge ~28px to the right of the brass-frame outer edge. */
      left: calc(var(--grid-right, 100%) + 28px);
      top: calc((var(--grid-top, 0px) + var(--grid-bottom, 100%)) / 2);
      transform: translateY(-50%);
      z-index: 4;
      pointer-events: none;
    }
    .panel {
      display: flex; flex-direction: column; align-items: stretch;
      gap: 14px;
      min-width: 144px;
      padding: 18px 16px;
      border-radius: 18px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255,123,74,0.18), transparent 70%),
        linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 100%);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.22),
        0 12px 32px rgba(0,0,0,0.55),
        0 0 28px rgba(255,217,122,0.18);
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
    .multiplier .value {
      display: flex; justify-content: center; align-items: baseline;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 56px;
      line-height: 1;
      color: var(--ruby-glow);
      text-shadow:
        0 2px 0 var(--ruby-deep),
        0 0 28px rgba(255,123,74,0.55),
        0 0 56px rgba(255,123,74,0.25);
      letter-spacing: 0.5px;
      transition: transform 0.25s ease;
    }
    .multiplier .value .x {
      font-size: 32px;
      opacity: 0.85;
      margin-right: 2px;
      color: var(--gold);
      text-shadow: 0 2px 0 var(--ruby-deep), 0 0 20px rgba(255,217,122,0.5);
    }
    .multiplier .value.bumped {
      animation: multBump 0.7s cubic-bezier(0.2, 0.8, 0.3, 1.3);
    }
    .divider {
      display: flex; justify-content: center;
      opacity: 0.7;
    }
    .spins .value {
      display: block;
      text-align: center;
      font-size: 36px;
      font-weight: 900;
      color: var(--gold);
      text-shadow:
        0 2px 0 var(--wood-dark),
        0 0 18px rgba(255,217,122,0.4);
      letter-spacing: 1px;
      font-variant-numeric: tabular-nums;
    }
    @keyframes fsPanelIn {
      from { opacity: 0; transform: translateY(-50%) translateX(20px); }
      to   { opacity: 1; transform: translateY(-50%); }
    }
    @keyframes multBump {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }

    /* Narrow viewport: dock to top-right of stage as a compact horizontal pill. */
    @media (max-width: 700px) {
      :host {
        right: 12px; left: auto;
        top: 12px;
        transform: none;
      }
      .panel {
        flex-direction: row; align-items: center;
        gap: 12px;
        padding: 8px 12px;
        min-width: 0;
      }
      .label { margin-bottom: 2px; }
      .multiplier .value { font-size: 30px; }
      .multiplier .value .x { font-size: 18px; }
      .spins .value { font-size: 20px; }
      .divider { display: none; }
    }
    @media (max-width: 420px) {
      .multiplier .value { font-size: 24px; }
      .spins .value { font-size: 16px; }
    }
  `],
})
export class FsInfoPanelComponent {
  protected readonly game = inject(GameService);
  protected readonly visible = computed(() => this.game.inFreeSpins());
}
