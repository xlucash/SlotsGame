import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MathRng } from '../../../core/math/rng';
import { WHEEL_OUTCOMES, pickWheelOutcome } from '../../../core/services/bonus-buy';
import { SoundService } from '../../../core/services/sound.service';

/**
 * SVG fortune wheel for the bonus-buy gamble. Renders one slice per WHEEL_OUTCOME
 * (slice arc proportional to its weight so visually-bigger slices land more
 * often) with the spin count drawn on it. On `spin()` it picks an outcome via
 * the model RNG, computes the rotation needed to land that slice under the top
 * pointer, and animates the wheel using a CSS transform with a long ease-out.
 */
@Component({
  selector: 'app-fortune-wheel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wheel-container" (click)="skip()" role="button" tabindex="0">
      <div class="frame">
        <svg viewBox="-110 -110 220 220" class="wheel"
             #wheel
             [style.transform]="'rotate(' + rotation() + 'deg)'"
             [style.transition]="transition()">
          @for (s of slices; track $index) {
            <g>
              <path [attr.d]="s.path" [attr.fill]="s.fill" stroke="#3a2a14" stroke-width="1.2"/>
              <text [attr.x]="s.tx" [attr.y]="s.ty"
                    [attr.transform]="'rotate(' + s.textRotation + ' ' + s.tx + ' ' + s.ty + ')'"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    [attr.fill]="s.textFill"
                    font-family="Cinzel"
                    font-weight="900"
                    [attr.font-size]="s.fontSize"
                    [attr.style]="'paint-order: stroke; stroke: ' + s.textStroke + '; stroke-width: 3px;'">
                {{ s.outcome.spins }}
              </text>
            </g>
          }
          <!-- Hub -->
          <circle cx="0" cy="0" r="22" fill="#1a1108" stroke="#ffd97a" stroke-width="2"/>
          <circle cx="0" cy="0" r="8" fill="#ffd97a"/>
          <circle cx="0" cy="0" r="3" fill="#5e4318"/>
          <!-- Outer rim -->
          <circle cx="0" cy="0" r="105" fill="none" stroke="#ffd97a" stroke-width="2"/>
          <circle cx="0" cy="0" r="100" fill="none" stroke="#5e4318" stroke-width="3"/>
        </svg>
        <div class="pointer" aria-hidden="true">
          <svg viewBox="0 0 30 30" width="30" height="30">
            <path d="M15 26 L4 6 L26 6 Z" fill="#c9543a" stroke="#1a1108" stroke-width="1.5"/>
            <circle cx="15" cy="11" r="3" fill="#ffd97a"/>
          </svg>
        </div>
      </div>

      <div class="result" [class.shown]="resultShown()">
        @if (resultShown()) {
          <span class="result-label">You won</span>
          <strong class="result-spins">{{ resultSpins() }} <small>FREE SPINS</small></strong>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wheel-container {
      display: flex; flex-direction: column; align-items: center; gap: 18px;
    }
    .frame {
      position: relative;
      width: 340px; height: 340px;
      filter: drop-shadow(0 12px 32px rgba(0,0,0,0.6));
    }
    @media (max-width: 600px) {
      .frame { width: 280px; height: 280px; }
    }
    @media (max-width: 420px) {
      .frame { width: 240px; height: 240px; }
    }
    .wheel {
      width: 100%; height: 100%;
      will-change: transform;
    }
    .pointer {
      position: absolute;
      top: -10px; left: 50%;
      transform: translateX(-50%);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
    }
    .result {
      min-height: 56px;
      display: flex; flex-direction: column; align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.4s ease-out;
    }
    .result.shown { opacity: 1; }
    .result-label {
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      opacity: 0.7;
    }
    .result-spins {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 32px;
      color: var(--gold);
      text-shadow: 0 2px 0 var(--wood-dark), 0 0 22px rgba(255,217,122,0.55);
    }
    .result-spins small {
      font-size: 12px; opacity: 0.75; letter-spacing: 2px;
      font-weight: 700;
    }
  `],
})
export class FortuneWheelComponent implements AfterViewInit {
  @ViewChild('wheel') private wheelRef?: ElementRef<SVGSVGElement>;

  /** Emitted when the wheel finishes spinning, carrying the final spin count. */
  @Output() readonly settled = new EventEmitter<number>();

  protected readonly slices = this.buildSlices();
  protected readonly rotation = signal(0);
  protected readonly transition = signal('none');
  protected readonly resultSpins = signal<number | null>(null);
  protected readonly resultShown = signal(false);

  private spinning = false;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingOutcome: { spins: number; weight: number } | null = null;
  private tickTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly sound = inject(SoundService);

  ngAfterViewInit(): void {
    // Force browser reflow so any subsequent transition kicks in cleanly.
    this.wheelRef?.nativeElement.getBoundingClientRect();
  }

  /**
   * Click-to-skip — short-circuit the long ease-out and snap the wheel to
   * the already-picked outcome immediately. Pre-result clicks fast-forward;
   * post-result clicks are no-ops (the modal's "Begin the Hunt" CTA handles
   * confirmation).
   */
  skip(): void {
    if (!this.spinning || !this.pendingOutcome) return;
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    for (const t of this.tickTimers) clearTimeout(t);
    this.tickTimers = [];
    // The rotation signal is already at the correct slice-target (set by
    // spin() as `currentRotation + baseDelta + 360*N`). Don't recompute it —
    // doing so once led to landing on the slice exactly opposite the picked
    // outcome. Disable the transition and bump the signal to an equivalent
    // angle (+360°) so the binding actually re-renders the new transition:none
    // along with the same effective orientation, snapping into place.
    this.transition.set('none');
    this.rotation.update((r) => r + 360);

    const outcome = this.pendingOutcome;
    this.pendingOutcome = null;
    this.spinning = false;
    this.sound.play('wheelLand');
    this.resultSpins.set(outcome.spins);
    this.resultShown.set(true);
    this.settled.emit(outcome.spins);
  }

  /** Trigger a spin. Picks the outcome up-front, then animates to it. */
  spin(): void {
    if (this.spinning) return;
    this.spinning = true;
    const rng = new MathRng();
    const outcome = pickWheelOutcome(rng);
    this.pendingOutcome = outcome;

    const slice = this.slices.find((s) => s.outcome === outcome);
    if (!slice) return;
    const targetCenter = slice.midAngle;
    const baseDelta = (-90 - targetCenter + 360) % 360;
    const totalDelta = baseDelta + 360 * (5 + Math.floor(Math.random() * 2));
    const finalRotation = this.rotation() + totalDelta;

    this.transition.set('transform 4.2s cubic-bezier(0.18, 0.7, 0.18, 1)');
    this.rotation.set(finalRotation);

    // Schedule click ticks roughly tracking the ease-out — fast at first,
    // slowing as the wheel approaches its target.
    const TICKS = 28;
    const TOTAL = 4200;
    for (let i = 0; i < TICKS; i++) {
      const t = i / (TICKS - 1);
      const eased = 1 - Math.pow(1 - t, 3); // matches the css cubic-bezier closely
      const delay = eased * TOTAL;
      this.tickTimers.push(setTimeout(() => this.sound.play('wheelTick'), delay));
    }

    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      this.pendingOutcome = null;
      this.tickTimers = [];
      this.sound.play('wheelLand');
      this.resultSpins.set(outcome.spins);
      this.resultShown.set(true);
      this.spinning = false;
      this.settled.emit(outcome.spins);
    }, 4400);
  }

  /**
   * Build SVG slice definitions. Slice arcs are weighted (bigger slice = higher
   * probability). Per-outcome theming: low counts use dark wood, mid counts get
   * progressively warmer browns, 16 burns orange, 20 is solid gold.
   */
  private buildSlices(): WheelSlice[] {
    const totalWeight = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);

    let cursor = -90;
    const slices: WheelSlice[] = [];
    for (let i = 0; i < WHEEL_OUTCOMES.length; i++) {
      const o = WHEEL_OUTCOMES[i];
      const arc = (o.weight / totalWeight) * 360;
      const a0 = cursor;
      const a1 = cursor + arc;
      const mid = a0 + arc / 2;
      const r = 100;
      const x0 = Math.cos(deg(a0)) * r;
      const y0 = Math.sin(deg(a0)) * r;
      const x1 = Math.cos(deg(a1)) * r;
      const y1 = Math.sin(deg(a1)) * r;
      const largeArc = arc > 180 ? 1 : 0;
      const path = `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
      // Text position at ~75% radius — gives narrower slices a bit more arc width.
      const tr = 75;
      const tx = Math.cos(deg(mid)) * tr;
      const ty = Math.sin(deg(mid)) * tr;
      const textRotation = mid + 90;

      const theme = themeFor(o.spins, i);
      // Smaller font for narrower slices so the digits fit inside the wedge.
      const fontSize = fontSizeFor(o.weight);

      slices.push({
        outcome: o,
        path,
        fill: theme.fill,
        textFill: theme.textFill,
        textStroke: theme.textStroke,
        fontSize,
        midAngle: mid,
        tx,
        ty,
        textRotation,
      });
      cursor = a1;
    }
    return slices;
  }
}

/** Per-outcome visual theme. 16 is orange, 20 is solid gold; the rest scale
 *  from dark wood for tiny counts to warmer browns for larger ones. */
function themeFor(spins: number, index: number): { fill: string; textFill: string; textStroke: string } {
  switch (spins) {
    case 20: return { fill: '#ffe066', textFill: '#3a1a00', textStroke: '#fff8d8' };
    case 16: return { fill: '#ff9a4a', textFill: '#fff',    textStroke: '#5a1a08' };
    case 14: return { fill: '#c95428', textFill: '#fff',    textStroke: '#3a0a04' };
    case 12: return { fill: '#a04014', textFill: '#fff',    textStroke: '#1a0606' };
    case 10: return { fill: '#7a3a18', textFill: '#fff',    textStroke: '#1a0e08' };
    default:
      // Alternate dark wood / blood-brown for the low-count tiles.
      return index % 2 === 0
        ? { fill: '#3a2a14', textFill: '#fff', textStroke: '#1a1108' }
        : { fill: '#5e2418', textFill: '#fff', textStroke: '#1a0606' };
  }
}

/** Fit-to-slice font sizing. Narrow slices (low weight) get smaller text. */
function fontSizeFor(weight: number): number {
  return Math.round(Math.min(22, Math.max(12, 8 + weight * 1.1)));
}

interface WheelSlice {
  outcome: { spins: number; weight: number };
  path: string;
  fill: string;
  textFill: string;
  textStroke: string;
  fontSize: number;
  midAngle: number;
  tx: number;
  ty: number;
  textRotation: number;
}

function deg(d: number): number { return (d * Math.PI) / 180; }
