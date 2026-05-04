import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LeaderboardService } from '../services/leaderboard.service';
import { formatPLN } from '../util/format';

const GAME_LABELS: Record<'hunters' | 'yeti', string> = {
  hunters: "Hunter's Cluster",
  yeti: "Yeti's Pass",
};

/**
 * Top-10 leaderboard panel. Renders live from the LeaderboardService
 * `top10` signal — Firestore `onSnapshot` keeps it current without any
 * polling. The active player's row is highlighted.
 *
 * Hidden completely when Firebase isn't configured (e.g. local dev
 * without a project) so the lobby doesn't show an empty box.
 */
@Component({
  selector: 'app-leaderboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <section class="lb">
        <header>
          <h2>Top Winnings</h2>
          @if (currentNick()) {
            <span class="me">Playing as <strong>{{ currentNick() }}</strong></span>
          }
        </header>

        @if (rows().length === 0) {
          <p class="empty">No scores yet — be the first to land a big one.</p>
        } @else {
          <ol>
            @for (row of rows(); track row.id; let i = $index) {
              <li [class.is-me]="row.id === currentId()">
                <span class="rank">{{ i + 1 }}</span>
                <span class="nick">{{ row.nick }}</span>
                <span class="game">{{ gameLabel(row.game) }}</span>
                <span class="amount">{{ formatPLN(row.bestWin) }} <em>PLN</em></span>
              </li>
            }
          </ol>
        }
      </section>
    }
  `,
  styles: [`
    .lb {
      max-width: 720px;
      margin: 36px auto 0;
      padding: 22px 24px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.5));
      border: 1px solid var(--brass, #ffd97a);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.2), 0 14px 32px rgba(0,0,0,.55);
      color: var(--bone, #f0e6d2);
      font-family: var(--font-body);
    }
    header {
      display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px dashed rgba(255,217,122,.25);
    }
    h2 {
      margin: 0;
      font: 900 18px/1 var(--font-brand);
      letter-spacing: 2.5px;
      color: var(--gold, #ffd97a);
      text-transform: uppercase;
    }
    .me { font-size: 11px; opacity: .7; letter-spacing: .5px; }
    .me strong { color: var(--gold, #ffd97a); }

    .empty { margin: 0; padding: 18px 0; text-align: center; opacity: .55; font-size: 12px; letter-spacing: .5px; }

    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    li {
      display: grid;
      grid-template-columns: 32px 1fr auto auto;
      align-items: baseline;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(0,0,0,.25);
      border: 1px solid transparent;
      transition: background .15s, border-color .15s;
    }
    li.is-me {
      background: rgba(255,217,122,.08);
      border-color: rgba(255,217,122,.45);
    }
    .rank { font: 900 14px/1 var(--font-display); color: var(--gold, #ffd97a); text-align: center; opacity: .85; }
    li:nth-child(1) .rank { font-size: 18px; }
    li:nth-child(2) .rank { font-size: 16px; }
    li:nth-child(3) .rank { font-size: 15px; }
    .nick { font: 700 14px/1 var(--font-display); color: #fff; letter-spacing: .5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .game { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; opacity: .55; }
    .amount {
      font: 900 14px/1 var(--font-display); color: var(--gold, #ffd97a);
      text-shadow: 0 0 10px rgba(255,217,122,.25);
    }
    .amount em { font-style: normal; font-size: 9px; opacity: .65; margin-left: 2px; letter-spacing: 1.5px; }

    @media (max-width: 540px) {
      .lb { padding: 16px 14px; }
      header { flex-direction: column; align-items: flex-start; gap: 4px; }
      li { grid-template-columns: 24px 1fr auto; row-gap: 2px; padding: 6px 10px; }
      .game { grid-column: 2; font-size: 9px; }
      .amount { grid-column: 3; grid-row: 1 / span 2; align-self: center; }
    }
  `],
})
export class LeaderboardComponent {
  private readonly leaderboard = inject(LeaderboardService);

  protected readonly formatPLN = formatPLN;
  protected readonly visible = computed(() => this.leaderboard.enabled);
  protected readonly rows = this.leaderboard.top10;
  protected readonly currentNick = this.leaderboard.nickname;
  protected readonly currentId = computed(() => this.leaderboard.nickname()?.toLowerCase() ?? null);

  protected gameLabel(g: 'hunters' | 'yeti'): string { return GAME_LABELS[g]; }
}
