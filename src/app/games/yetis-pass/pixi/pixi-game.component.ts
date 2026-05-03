import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { Application } from 'pixi.js';
import type { LineWin, PersistentWild, SpinResult } from '../core/math/types';
import { COLS, ROWS } from '../core/math/paylines';
import { MathRng } from '../../../shared/math/rng';
import { pickSymbol, type SymbolId } from '../core/math/symbols';
import { YetiBackgroundScene } from './background-scene';
import { YetiGridRenderer } from './grid-renderer';

@Component({
  selector: 'app-yeti-pixi-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="pixi-host"></div>`,
  styles: [`
    :host { position: absolute; inset: 0; display: block; }
    .pixi-host { position: absolute; inset: 0; overflow: hidden; }
    .pixi-host canvas { display: block; }
  `],
})
export class YetiPixiGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private app: Application | null = null;
  private renderer: YetiGridRenderer | null = null;
  private background: YetiBackgroundScene | null = null;
  private resizeObserver: ResizeObserver | null = null;

  readonly lastLineWin = signal<LineWin | null>(null);
  readonly ready = signal(false);
  readonly gridRect = signal<{ left: number; right: number; top: number; bottom: number } | null>(null);

  async ngAfterViewInit(): Promise<void> {
    const host = this.hostRef.nativeElement;
    const initialW = Math.max(1, host.clientWidth);
    const initialH = Math.max(1, host.clientHeight);

    const app = new Application();
    await app.init({
      background: 0x06121a,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: initialW,
      height: initialH,
    });
    host.appendChild(app.canvas);

    const background = new YetiBackgroundScene(app);
    const renderer = new YetiGridRenderer(app);
    renderer.setCallbacks({
      onLineWin: (w) => this.lastLineWin.set(w),
    });

    this.app = app;
    this.background = background;
    this.renderer = renderer;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(host);
    requestAnimationFrame(() => this.handleResize());

    renderer.showGrid(makePreviewGrid());
    this.ready.set(true);
    this.gridRect.set(renderer.getGridRect());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.background?.destroy();
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.renderer = null;
    this.background = null;
  }

  async play(result: SpinResult): Promise<void> {
    if (!this.renderer) return;
    this.lastLineWin.set(null);
    await this.renderer.playSpin(result);
  }

  showPersistentWilds(persistent: ReadonlyArray<PersistentWild>): void {
    this.renderer?.renderPersistentReels(persistent);
  }

  /**
   * Pulse + glow every SUMMIT cell currently on the board. Caller awaits this
   * after a triggering spin lands so the player sees the bonus condition
   * before the cinematic intro takes over.
   */
  async glowScatters(): Promise<void> { await this.renderer?.glowScatters(); }

  /** True while the win-line reveal is mid-flight — used by host click-to-skip. */
  get isHighlightingWins(): boolean { return this.renderer?.isHighlightingWins ?? false; }
  skipWinHighlights(): void { this.renderer?.skipWinHighlights(); }

  private handleResize(): void {
    const app = this.app;
    const host = this.hostRef.nativeElement;
    if (!app) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    if (app.screen.width === w && app.screen.height === h) return;
    app.renderer.resize(w, h);
    this.background?.relayout(w, h);
    this.renderer?.relayout(w, h);
    if (this.renderer) this.gridRect.set(this.renderer.getGridRect());
  }
}

function makePreviewGrid(): SymbolId[][] {
  const rng = new MathRng();
  const g: SymbolId[][] = [];
  for (let c = 0; c < COLS; c++) {
    const col: SymbolId[] = [];
    for (let r = 0; r < ROWS; r++) col.push(pickSymbol(rng));
    g.push(col);
  }
  return g;
}
