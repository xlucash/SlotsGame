import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Application, Graphics } from 'pixi.js';
import type { SymbolId } from '../core/math/symbols';
import { drawSymbol } from '../pixi/symbol-art';

/**
 * Single shared Pixi renderer that bakes Yeti's-Pass symbol icons to data URLs
 * and caches them. One WebGL context for the whole game's icon needs — same
 * pattern as the Hunter's Cluster icon cache; isolated per-game so each game's
 * symbols don't leak into the other's cache.
 */
class YetiSymbolIconCache {
  private app: Application | null = null;
  private initPromise: Promise<Application> | null = null;
  private readonly cache = new Map<string, string>();

  async get(symbol: SymbolId, size: number): Promise<string> {
    const key = `${symbol}@${size}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const app = await this.ensureApp();
    app.renderer.resize(size, size);
    const g = new Graphics();
    g.position.set(size / 2, size / 2);
    drawSymbol(g, symbol, size * 0.85);
    app.stage.addChild(g);
    const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
    const dataUrl = canvas.toDataURL('image/png');
    app.stage.removeChild(g);
    g.destroy({ children: true });
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  private ensureApp(): Promise<Application> {
    if (this.app) return Promise.resolve(this.app);
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const a = new Application();
      await a.init({
        width: 64, height: 64,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2),
        autoStart: false,
      });
      this.app = a;
      return a;
    })();
    return this.initPromise;
  }
}

const sharedCache = new YetiSymbolIconCache();

@Component({
  selector: 'app-yeti-symbol-icon',
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

  private destroyed = false;
  protected readonly src = signal<string>('');

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; });
  }

  async ngOnInit(): Promise<void> {
    const url = await sharedCache.get(this.symbol, this.size);
    if (this.destroyed) return;
    this.src.set(url);
  }
}
