import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`:host { display: block; height: 100vh; height: 100svh; height: 100dvh; }`],
})
export class App {}
