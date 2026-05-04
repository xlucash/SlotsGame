import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { LeaderboardService, type GameKey, type LeaderboardEntry } from '../services/leaderboard.service';
import { formatPLN } from '../util/format';

const TOP_N_PER_SCOPE = 5;
const GAME_TITLE: Record<GameKey, string> = {
  hunters: "Hunter's Cluster",
  yeti: "Yeti's Pass",
};

/**
 * In-game leaderboard sidebar — shows TWO stacked top-5 lists: the top
 * winnings in the current game, then the top winnings across both games
 * combined. Pinned to the right edge of the viewport.
 *
 * Theming via the `--lb-accent` CSS var so the same component reads as
 * gold inside Hunter's and ice-blue inside Yeti's. Hides on viewports
 * narrower than 1100px to avoid overlapping the grid (the lobby's
 * full-width leaderboard covers that case).
 */
@Component({
  selector: 'app-leaderboard-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside class="lb" role="complementary" aria-label="Top Winnings">
        <header>
          <h2>Top Winnings</h2>
          @if (currentNick()) {
            <span class="me" title="Playing as {{ currentNick() }}">{{ currentNick() }}</span>
          }
        </header>

        <section>
          <h3>{{ gameTitle() }}</h3>
          @if (gameRows().length === 0) {
            <p class="empty">No scores yet</p>
          } @else {
            <ol>
              @for (row of gameRows(); track row.id; let i = $index) {
                <li [class.is-me]="row.id === currentId()">
                  <span class="rank">{{ i + 1 }}</span>
                  <span class="nick">{{ row.nick }}</span>
                  <span class="amount">{{ formatPLN(row.bestWin) }}</span>
                </li>
              }
            </ol>
          }
        </section>

        <section class="global">
          <h3>Global</h3>
          @if (globalRows().length === 0) {
            <p class="empty">No scores yet</p>
          } @else {
            <ol>
              @for (row of globalRows(); track row.id; let i = $index) {
                <li [class.is-me]="row.id === currentId()">
                  <span class="rank">{{ i + 1 }}</span>
                  <span class="nick">{{ row.nick }}</span>
                  <span class="amount">{{ formatPLN(row.bestWin) }}</span>
                </li>
              }
            </ol>
          }
        </section>
      </aside>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      /* Wide enough to fit ~15-char nicknames without ellipsis after the
         rank + amount columns claim their share. Was 220px which clipped
         after ~8 chars. */
      width: 260px;
      z-index: 3;
      pointer-events: none;
      /* Hosts override --lb-accent / --lb-accent-soft to theme the panel. */
      --lb-accent: #ffd97a;
      --lb-accent-soft: rgba(255, 217, 122, 0.45);
      --lb-accent-glow: rgba(255, 217, 122, 0.25);
      --lb-accent-fill: rgba(255, 217, 122, 0.10);
    }
    @media (max-width: 1100px) { :host { display: none; } }

    .lb {
      pointer-events: auto;
      display: flex; flex-direction: column;
      gap: 10px;
      padding: 12px 12px 10px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.45));
      border: 1px solid var(--lb-accent-soft);
      box-shadow: inset 0 1px 0 var(--lb-accent-fill), 0 12px 28px rgba(0,0,0,.55);
      color: var(--bone, #f0e6d2);
      font-family: var(--font-display);
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }
    header {
      display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--lb-accent-fill);
    }
    h2 {
      margin: 0;
      font: 900 12px/1 var(--font-brand);
      letter-spacing: 1.8px;
      color: var(--lb-accent);
      text-transform: uppercase;
    }
    .me {
      font-size: 10px; opacity: .7;
      max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--lb-accent);
    }

    section { display: flex; flex-direction: column; gap: 4px; }
    section.global { padding-top: 8px; border-top: 1px dashed var(--lb-accent-fill); }
    h3 {
      margin: 0 0 4px;
      font: 900 11px/1 var(--font-brand);
      letter-spacing: 1.4px;
      color: var(--lb-accent);
      text-transform: uppercase;
    }

    .empty { margin: 4px 0; text-align: center; opacity: .55; font-size: 10px; }

    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    li {
      display: grid;
      grid-template-columns: 16px 1fr auto;
      align-items: baseline; gap: 6px;
      padding: 3px 6px;
      border-radius: 6px;
      border: 1px solid transparent;
      font-size: 11px;
    }
    li.is-me { background: var(--lb-accent-fill); border-color: var(--lb-accent-soft); }
    .rank { font: 900 10px/1 var(--font-display); color: var(--lb-accent); text-align: center; opacity: .85; }
    .nick { color: #fff; letter-spacing: .3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .amount {
      font: 900 11px/1 var(--font-display); color: var(--lb-accent);
      text-shadow: 0 0 8px var(--lb-accent-glow);
    }
  `],
})
export class LeaderboardPanelComponent {
  private readonly leaderboard = inject(LeaderboardService);

  /** Which game is currently being played; controls which per-game list is shown. */
  @Input({ required: true }) game!: GameKey;

  protected readonly formatPLN = formatPLN;
  protected readonly visible = computed(() => this.leaderboard.enabled);
  protected readonly currentNick = this.leaderboard.nickname;
  protected readonly currentId = computed(() => this.leaderboard.nickname()?.toLowerCase() ?? null);
  protected gameTitle(): string { return GAME_TITLE[this.game]; }

  protected readonly gameRows = computed<ReadonlyArray<LeaderboardEntry>>(() => {
    const all = this.game === 'yeti' ? this.leaderboard.topYeti() : this.leaderboard.topHunters();
    return all.slice(0, TOP_N_PER_SCOPE);
  });
  protected readonly globalRows = computed<ReadonlyArray<LeaderboardEntry>>(
    () => this.leaderboard.topGlobal().slice(0, TOP_N_PER_SCOPE),
  );
}
