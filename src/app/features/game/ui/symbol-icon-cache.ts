import { Injectable } from '@angular/core';
import { Application, Graphics } from 'pixi.js';
import type { SymbolId } from '../../../core/math/symbols';
import { drawSymbol } from '../pixi/symbol-art';

const RESOLUTION = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);

/**
 * Single-Pixi-app cache for symbol icons rendered to data URLs.
 *
 * Why this exists: each `new Application()` allocates its own WebGL context.
 * Browsers cap concurrent contexts (~8–16). Spawning one per icon in a
 * modal pushed the count past the limit and the browser silently revoked
 * the oldest context — usually the main game's canvas, which then went
 * black until reload. Routing every icon through this single renderer
 * keeps the count at one extra context regardless of how many icons render.
 */
@Injectable({ providedIn: 'root' })
export class SymbolIconCache {
  private app: Application | null = null;
  private initPromise: Promise<Application> | null = null;
  private readonly cache = new Map<string, string>();

  /** Returns a data:image/png URL for the given symbol at the given pixel size. */
  async get(symbol: SymbolId, size: number): Promise<string> {
    const key = `${symbol}@${size}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const app = await this.ensureApp();
    // Resize the renderer for this specific symbol size — we only render one
    // symbol at a time and immediately extract the result, so reusing the
    // single app/canvas is safe.
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
        width: 64,
        height: 64,
        backgroundAlpha: 0,
        antialias: true,
        resolution: RESOLUTION,
        autoStart: false, // we don't need a render loop, we extract on demand
      });
      this.app = a;
      return a;
    })();
    return this.initPromise;
  }
}
