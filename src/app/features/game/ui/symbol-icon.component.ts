import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import type { SymbolId } from '../../../core/math/symbols';
import { SymbolIconCache } from './symbol-icon-cache';

/**
 * Small symbol icon for HTML overlays (paytable, examples, etc.).
 *
 * The icon comes from the shared {@link SymbolIconCache} as a data URL —
 * one renderer bakes every symbol once. This component is just an `<img>`,
 * so it does NOT allocate its own WebGL context.
 */
@Component({
  selector: 'app-symbol-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="src()"
      [attr.width]="size"
      [attr.height]="size"
      alt=""
      decoding="async"
    />
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    img { display: block; }
  `],
})
export class SymbolIconComponent implements OnInit {
  @Input({ required: true }) symbol!: SymbolId;
  @Input() size = 64;

  private readonly cache = inject(SymbolIconCache);
  private destroyed = false;
  protected readonly src = signal<string>('');

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; });
  }

  async ngOnInit(): Promise<void> {
    const url = await this.cache.get(this.symbol, this.size);
    if (this.destroyed) return;
    this.src.set(url);
  }
}
