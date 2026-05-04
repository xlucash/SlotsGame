import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LeaderboardService } from '../services/leaderboard.service';

/**
 * One-time popup for the leaderboard nickname.
 *
 * Renders only when the player hasn't yet picked one. Persisted via
 * `LeaderboardService.setNickname()` (which writes to localStorage), so
 * the popup never reappears unless the player explicitly clears storage
 * or hits a "switch player" button.
 *
 * Skippable — the player can dismiss without entering anything; they just
 * won't show up on the leaderboard until they pick a name later.
 */
@Component({
  selector: 'app-nickname-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="overlay" (click)="onSkip()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog">
          <h1>Welcome, hunter</h1>
          <p>Pick a name for the leaderboard. Your biggest single-spin win
             will be tracked across both games.</p>

          <input class="nick"
                 type="text"
                 maxlength="24"
                 placeholder="Your nickname"
                 [value]="draft()"
                 (input)="onInput($any($event.target).value)"
                 (keydown.enter)="onSubmit()"
                 autofocus />

          <div class="actions">
            <button class="skip" (click)="onSkip()">Skip</button>
            <button class="submit" [disabled]="!canSubmit()" (click)="onSubmit()">Enter Lodge</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 250; }
    .overlay {
      position: fixed; inset: 0;
      pointer-events: auto;
      background: radial-gradient(circle at center, rgba(0,0,0,.55), rgba(0,0,0,.92));
      backdrop-filter: blur(6px);
      display: grid; place-items: center;
      animation: fadeIn .25s ease-out;
    }
    .modal {
      width: min(92vw, 460px);
      padding: 28px 32px 24px;
      border-radius: 18px;
      background: linear-gradient(180deg, #2a1f12, #14110d);
      border: 1px solid var(--brass, #ffd97a);
      box-shadow: inset 0 1px 0 rgba(255,217,122,.2), 0 24px 60px rgba(0,0,0,.7);
      color: var(--bone, #f0e6d2);
      text-align: center;
      font-family: var(--font-body);
      animation: rise .35s cubic-bezier(.2,.7,.25,1.05);
    }
    h1 {
      margin: 0 0 8px;
      font: 900 26px/1 var(--font-brand);
      letter-spacing: 3px;
      color: var(--gold, #ffd97a);
      text-transform: uppercase;
    }
    p { margin: 0 0 18px; font-size: 13px; opacity: .8; }
    .nick {
      width: 100%; box-sizing: border-box;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--brass, #ffd97a);
      background: rgba(0,0,0,.4);
      color: #fff;
      font: 600 16px/1.2 var(--font-display);
      letter-spacing: 1px;
      text-align: center;
    }
    .nick:focus { outline: none; box-shadow: 0 0 0 2px rgba(255,217,122,.45); }
    .actions { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
    .submit, .skip {
      padding: 10px 22px;
      border-radius: 999px;
      font: 900 12px/1 var(--font-brand);
      letter-spacing: 1.6px; text-transform: uppercase;
      cursor: pointer; transition: filter .12s, transform .12s;
    }
    .submit {
      border: 1px solid var(--brass, #ffd97a);
      background: linear-gradient(180deg, #c9543a, #5a1a08);
      color: #fff;
      box-shadow: inset 0 1px 0 rgba(255,217,122,.25), 0 4px 14px rgba(0,0,0,.5);
    }
    .submit:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
    .submit:disabled { opacity: .4; cursor: not-allowed; }
    .skip {
      border: 1px solid #4a3a20;
      background: rgba(0,0,0,.4);
      color: var(--bone, #f0e6d2);
    }
    .skip:hover { filter: brightness(1.2); }
    @keyframes fadeIn { from { opacity: 0; } }
    @keyframes rise {
      from { opacity: 0; transform: translateY(20px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
})
export class NicknameModalComponent {
  private readonly leaderboard = inject(LeaderboardService);

  protected readonly draft = signal('');
  /** Modal is dismissed for the rest of this session even if Skip was clicked. */
  protected readonly skipped = signal(false);
  protected readonly visible = computed(() =>
    !this.leaderboard.hasNickname() && !this.skipped(),
  );
  protected readonly canSubmit = computed(() => this.draft().trim().length > 0);

  protected onInput(v: string): void { this.draft.set(v); }

  protected onSubmit(): void {
    const v = this.draft().trim();
    if (!v) return;
    this.leaderboard.setNickname(v);
  }

  protected onSkip(): void { this.skipped.set(true); }
}
