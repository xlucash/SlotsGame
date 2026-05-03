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
import { COLS, ROWS, type Grid, type SpinResult, type WildMultGrid } from '../../../core/math/types';
import { MathRng } from '../../../shared/math/rng';
import { pickSymbol, pickWildMultiplier } from '../../../core/math/symbols';
import type { SymbolId } from '../../../core/math/symbols';
import { GridRenderer } from './grid-renderer';
import { BackgroundScene } from './background-scene';

@Component({
  selector: 'app-pixi-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="pixi-host"></div>`,
  styles: [`
    :host { position: absolute; inset: 0; display: block; }
    .pixi-host { position: absolute; inset: 0; overflow: hidden; }
    .pixi-host canvas { display: block; }
  `],
})
export class PixiGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private app: Application | null = null;
  private renderer: GridRenderer | null = null;
  private background: BackgroundScene | null = null;
  private resizeObserver: ResizeObserver | null = null;

  readonly stepWin = signal<{ amount: number; multiplier: number } | null>(null);
  readonly ready = signal(false);
  /** Bounding box of the rendered grid (CSS px), or null until first paint. */
  readonly gridRect = signal<{ left: number; right: number; top: number; bottom: number } | null>(null);

  async ngAfterViewInit(): Promise<void> {
    const host = this.hostRef.nativeElement;
    const initialW = Math.max(1, host.clientWidth);
    const initialH = Math.max(1, host.clientHeight);

    const app = new Application();
    await app.init({
      background: 0x05080a,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: initialW,
      height: initialH,
    });
    host.appendChild(app.canvas);

    // Order matters: background first so it sits behind the grid.
    const background = new BackgroundScene(app);
    const renderer = new GridRenderer(app);
    renderer.setCallbacks({
      onStepWin: (amount, multiplier) => this.stepWin.set({ amount, multiplier }),
    });

    this.app = app;
    this.background = background;
    this.renderer = renderer;

    // Drive resizing from a ResizeObserver on the host element rather than Pixi's
    // built-in resizeTo, which has been flaky on first paint and during layout
    // reflows from sibling Angular components changing height.
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(host);
    // First paint fix-up — re-run on the next frame after styles settle.
    requestAnimationFrame(() => this.handleResize());

    {
      const { grid, wilds } = makePreviewGrid();
      renderer.showGrid(grid, wilds);
    }
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
    this.stepWin.set(null);
    await this.renderer.playSpin(result);
  }

  fastForward(): void { this.renderer?.fastForward(); }
  get isAnimating(): boolean { return this.renderer?.isAnimating ?? false; }

  glowScatters(): Promise<void> { return this.renderer?.glowScatters() ?? Promise.resolve(); }

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

function makePreviewGrid(): { grid: Grid; wilds: WildMultGrid } {
  const rng = new MathRng();
  const grid: Grid = [];
  const wilds: WildMultGrid = [];
  for (let c = 0; c < COLS; c++) {
    const colSyms: SymbolId[] = [];
    const colMults: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      const sym = pickSymbol(rng);
      colSyms.push(sym);
      colMults.push(sym === 'WILD' ? pickWildMultiplier(rng) : 0);
    }
    grid.push(colSyms);
    wilds.push(colMults);
  }
  return { grid, wilds };
}
