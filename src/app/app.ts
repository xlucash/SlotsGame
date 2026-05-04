import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LeaderboardService } from './shared/services/leaderboard.service';
import { NicknameModalComponent } from './shared/ui/nickname-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NicknameModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-nickname-modal></app-nickname-modal>
  `,
  styles: [`:host { display: block; height: 100vh; height: 100svh; height: 100dvh; }`],
})
export class App {
  // Eagerly construct the leaderboard service at app startup so its signal
  // effects on both games' lastWin signals are wired up before either game
  // gets to the first commitSpin. Without this the service is lazily
  // instantiated when the leaderboard component first renders, which
  // happens AFTER the player has already played in some flows.
  constructor() { inject(LeaderboardService); }
}
