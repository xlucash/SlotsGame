import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameComponent } from './features/game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameComponent],
  template: `<app-game></app-game>`,
  styles: [`:host { display: block; height: 100vh; }`],
})
export class App {}
