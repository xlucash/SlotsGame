import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { SoundService } from '../../../core/services/sound.service';

type Phase =
  | 'idle'
  | 'fadeIn'    // overlay appearing
  | 'scanning'  // reticle drifting
  | 'locking'   // reticle smoothly tracking onto the deer
  | 'locked'    // breath hold + lock indicator
  | 'firing'    // muzzle flash
  | 'hit'       // deer collapses
  | 'fadeOut';

/**
 * Cinematic "bonus hunt" intro played between bonus trigger and the first FS spin.
 *
 * Visual: dim moonlit clearing, big stag silhouette in the middle distance,
 * rifle scope reticle drifts across the screen, locks onto the heart, fires.
 * Muzzle flash whites out the screen, deer collapses, overlay fades.
 *
 * Caller invokes `play()` and awaits the returned promise.
 */
@Component({
  selector: 'app-bonus-intro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active()) {
      <div #host class="hunt"
           [attr.data-phase]="phase()"
           [class.locked]="phase() === 'locked'"
           [class.firing]="phase() === 'firing'"
           [class.hit]="phase() === 'hit' || phase() === 'fadeOut'">

        <!-- Distant scenery -->
        <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stop-color="#fff7d0" stop-opacity="1"/>
              <stop offset="55%" stop-color="#fff7d0" stop-opacity="0.0"/>
            </radialGradient>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0"   stop-color="#08121a"/>
              <stop offset="0.6" stop-color="#0a1820"/>
              <stop offset="1"   stop-color="#040608"/>
            </linearGradient>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0e1a14"/>
              <stop offset="1" stop-color="#04080a"/>
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#skyGrad)"/>
          <!-- Stars -->
          <g fill="#fff" opacity="0.7">
            <circle cx="120" cy="80" r="1.4"/><circle cx="280" cy="40" r="1"/><circle cx="420" cy="120" r="1.6"/>
            <circle cx="560" cy="60" r="1"/><circle cx="700" cy="100" r="1.2"/><circle cx="980" cy="40" r="1.6"/>
            <circle cx="1180" cy="80" r="1.2"/><circle cx="1320" cy="120" r="1"/><circle cx="1480" cy="60" r="1.4"/>
            <circle cx="200" cy="200" r="0.8"/><circle cx="640" cy="180" r="0.8"/><circle cx="1100" cy="220" r="0.8"/>
            <circle cx="1500" cy="240" r="0.8"/>
          </g>
          <!-- Moon halo + disc -->
          <circle cx="1240" cy="180" r="240" fill="url(#moonGlow)" opacity="0.6"/>
          <circle cx="1240" cy="180" r="62" fill="#faf0d4"/>
          <circle cx="1226" cy="170" r="58" fill="#fff7e0" opacity="0.4"/>
          <circle cx="1224" cy="166" r="14" fill="#c7b48a" opacity="0.6"/>
          <circle cx="1260" cy="195" r="8"  fill="#c7b48a" opacity="0.6"/>
          <!-- Distant ridges -->
          <path d="M0 580 L150 530 L320 575 L520 510 L720 565 L920 520 L1120 580 L1320 535 L1500 580 L1600 560 V900 H0 Z"
                fill="#0a1418" opacity="0.85"/>
          <path d="M0 640 L180 595 L380 640 L600 580 L820 620 L1040 575 L1240 625 L1450 590 L1600 620 V900 H0 Z"
                fill="#070d10" opacity="0.95"/>
          <!-- Ground -->
          <rect x="0" y="700" width="1600" height="200" fill="url(#groundGrad)"/>
          <!-- Pine trees flanking the clearing -->
          <g fill="#04080a">
            <path d="M40 720 L100 540 L160 720 Z"/>
            <path d="M30 730 L100 580 L170 730 Z"/>
            <path d="M120 720 L180 555 L240 720 Z"/>
            <path d="M220 720 L280 580 L340 720 Z"/>
            <path d="M1280 720 L1340 580 L1400 720 Z"/>
            <path d="M1360 720 L1420 555 L1480 720 Z"/>
            <path d="M1440 730 L1510 580 L1580 730 Z"/>
            <path d="M1500 720 L1560 540 L1620 720 Z"/>
          </g>
          <!-- Tall grass detail near foreground -->
          <g stroke="#04080a" stroke-width="2" fill="none">
            <path d="M50 760 Q60 720 70 760"/>
            <path d="M150 770 Q165 730 180 770"/>
            <path d="M1380 765 Q1395 725 1410 765"/>
            <path d="M1480 770 Q1495 728 1510 770"/>
          </g>
        </svg>

        <!-- The stag silhouette -->
        <svg #deer class="deer" viewBox="0 0 600 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g class="stag-body" stroke="#04080a" stroke-width="3">
            <!-- Antlers (left + right) -->
            <g stroke="#0a1410" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" fill="none">
              <path d="M270 110 L240 50 L210 65 M240 50 L220 30 M240 50 L255 25 M260 80 L225 70"/>
              <path d="M330 110 L360 50 L390 65 M360 50 L380 30 M360 50 L345 25 M340 80 L375 70"/>
            </g>
            <!-- Head -->
            <ellipse cx="300" cy="160" rx="40" ry="55" fill="#0a1410"/>
            <!-- Ears -->
            <ellipse cx="270" cy="118" rx="10" ry="20" fill="#0a1410" transform="rotate(-22 270 118)"/>
            <ellipse cx="330" cy="118" rx="10" ry="20" fill="#0a1410" transform="rotate(22 330 118)"/>
            <!-- Neck -->
            <path d="M280 200 Q260 230 250 280 L350 280 Q340 230 320 200 Z" fill="#0a1410"/>
            <!-- Body -->
            <ellipse cx="380" cy="320" rx="120" ry="60" fill="#0a1410"/>
            <!-- Front legs (each rotates from the top of the leg for a gallop effect) -->
            <g class="leg leg-fl"><rect x="290" y="345" width="14" height="100" fill="#0a1410" rx="4"/></g>
            <g class="leg leg-fr"><rect x="320" y="345" width="14" height="100" fill="#0a1410" rx="4"/></g>
            <!-- Back legs -->
            <g class="leg leg-bl"><rect x="430" y="345" width="14" height="100" fill="#0a1410" rx="4"/></g>
            <g class="leg leg-br"><rect x="460" y="345" width="14" height="100" fill="#0a1410" rx="4"/></g>
            <!-- Tail -->
            <ellipse cx="500" cy="295" rx="6" ry="14" fill="#0a1410" transform="rotate(20 500 295)"/>
            <!-- Heart marker (target zone) -->
            <circle class="heart" cx="350" cy="295" r="14" fill="none" stroke="#c9543a" stroke-width="0" stroke-dasharray="3 4"/>
          </g>
        </svg>

        <!-- Scope vignette overlay (pseudo-circle) -->
        <div class="scope-vignette"></div>

        <!-- Reticle drifts via JS-driven CSS variables --rx / --ry -->
        <div class="reticle">
          <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
            <!-- Outer ring -->
            <circle cx="100" cy="100" r="92" fill="none" stroke="#ffd97a" stroke-width="1.5" opacity="0.85"/>
            <circle cx="100" cy="100" r="84" fill="none" stroke="#ffd97a" stroke-width="0.6" opacity="0.5" stroke-dasharray="2 4"/>
            <!-- Lock ring (red, animates in on lock) -->
            <circle class="lock-ring" cx="100" cy="100" r="60" fill="none" stroke="#ff3a3a" stroke-width="2.5" stroke-dasharray="4 4"/>
            <!-- Crosshair lines (gap in center) -->
            <line x1="0"   y1="100" x2="80"  y2="100" stroke="#ffd97a" stroke-width="2"/>
            <line x1="120" y1="100" x2="200" y2="100" stroke="#ffd97a" stroke-width="2"/>
            <line x1="100" y1="0"   x2="100" y2="80"  stroke="#ffd97a" stroke-width="2"/>
            <line x1="100" y1="120" x2="100" y2="200" stroke="#ffd97a" stroke-width="2"/>
            <!-- Range marks -->
            <line x1="100" y1="36"  x2="100" y2="48"  stroke="#ffd97a" stroke-width="1.2"/>
            <line x1="100" y1="56"  x2="100" y2="64"  stroke="#ffd97a" stroke-width="1"/>
            <line x1="100" y1="142" x2="100" y2="150" stroke="#ffd97a" stroke-width="1"/>
            <line x1="100" y1="160" x2="100" y2="170" stroke="#ffd97a" stroke-width="1"/>
            <!-- Center dot -->
            <circle cx="100" cy="100" r="2" fill="#ffd97a"/>
          </svg>
        </div>

        <!-- HUD copy -->
        <div class="hud-top" aria-hidden="true">
          <span class="hud-corners tl"></span>
          <span class="hud-corners tr"></span>
          <span class="hud-label">{{ hudLabel() }}</span>
        </div>

        <!-- Muzzle flash -->
        <div class="muzzle-flash"></div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 190;
    }
    .hunt {
      position: fixed; inset: 0;
      overflow: hidden;
      background: #04070a;
      pointer-events: auto;
      animation: huntIn 0.4s ease-out;
      --rx: 50%;
      --ry: 50%;
    }
    .hunt[data-phase='fadeOut'] {
      animation: huntOut 0.4s ease-in forwards;
    }

    .scene {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
    }

    /* The deer is positioned absolutely in the clearing.
       Translate down + rotate when shot. */
    .deer {
      position: absolute;
      left: 50%;
      bottom: 14%;
      width: min(40vw, 460px);
      height: auto;
      transform: translateX(-50%);
      transform-origin: 50% 90%;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7));
    }
    /* While the scope sweeps, the deer gallops in from off-screen-left. */
    .hunt[data-phase='fadeIn'] .deer {
      transform: translateX(-220%) translateY(0);
    }
    .hunt[data-phase='scanning'] .deer {
      animation: deerRunIn 1.6s cubic-bezier(0.25, 0, 0.4, 1) forwards;
    }
    /* During lock-on the deer slows to a wary stop with a small bob. */
    .hunt[data-phase='locking'] .deer,
    .hunt.locked .deer {
      animation: deerBob 0.6s ease-in-out infinite;
    }
    /* Shot — collapse forward, animation off so the transition takes over. */
    .hunt.hit .deer {
      animation: none;
      transform: translateX(-50%) translateY(8%) rotate(-58deg);
      opacity: 0.65;
      transition:
        transform 0.7s cubic-bezier(0.5, 0, 0.7, 1),
        opacity 0.5s ease;
    }
    .deer .heart { stroke-width: 0; }
    .hunt.locked .deer .heart { stroke-width: 2; animation: heartPulse 0.4s ease-in-out infinite; }

    /* Galloping legs — each leg rotates from the top of the rect. The pairs
       move in opposite phases for a 4-beat gait. Disabled when locked/hit. */
    .leg { transform-box: fill-box; transform-origin: 50% 0%; }
    .hunt[data-phase='scanning'] .leg-fl,
    .hunt[data-phase='scanning'] .leg-br { animation: legSwingA 0.32s ease-in-out infinite; }
    .hunt[data-phase='scanning'] .leg-fr,
    .hunt[data-phase='scanning'] .leg-bl { animation: legSwingB 0.32s ease-in-out infinite; }
    .hunt[data-phase='locking'] .leg-fl,
    .hunt[data-phase='locking'] .leg-br { animation: legSwingA 0.46s ease-in-out infinite; }
    .hunt[data-phase='locking'] .leg-fr,
    .hunt[data-phase='locking'] .leg-bl { animation: legSwingB 0.46s ease-in-out infinite; }

    @keyframes deerRunIn {
      0%   { transform: translateX(-220%) translateY(-6px); }
      25%  { transform: translateX(-150%) translateY(2px); }
      50%  { transform: translateX(-110%) translateY(-6px); }
      75%  { transform: translateX(-78%)  translateY(2px); }
      100% { transform: translateX(-50%)  translateY(0); }
    }
    @keyframes deerBob {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      50%      { transform: translateX(-50%) translateY(-3px); }
    }
    @keyframes legSwingA {
      0%, 100% { transform: rotate(-26deg); }
      50%      { transform: rotate( 26deg); }
    }
    @keyframes legSwingB {
      0%, 100% { transform: rotate( 26deg); }
      50%      { transform: rotate(-26deg); }
    }

    /* Scope vignette: dark overlay with a soft radial cutout that follows the
       reticle. Implemented via radial-gradient mask using --rx / --ry. */
    .scope-vignette {
      position: absolute; inset: 0;
      background: radial-gradient(circle at var(--rx) var(--ry),
        transparent 0,
        transparent 200px,
        rgba(0,0,0,0.55) 380px,
        rgba(0,0,0,0.92) 100%);
      transition: background 60ms linear;
    }
    @media (max-width: 700px) {
      .scope-vignette {
        background: radial-gradient(circle at var(--rx) var(--ry),
          transparent 0,
          transparent 130px,
          rgba(0,0,0,0.5) 240px,
          rgba(0,0,0,0.94) 100%);
      }
    }

    .reticle {
      position: absolute;
      left: var(--rx);
      top: var(--ry);
      transform: translate(-50%, -50%);
      width: 200px; height: 200px;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    @media (max-width: 700px) { .reticle { width: 140px; height: 140px; } }
    .reticle svg { width: 100%; height: 100%; filter: drop-shadow(0 0 4px #ffd97a); }
    .lock-ring {
      opacity: 0;
      transform-origin: 100px 100px;
      transform: scale(0.5);
      transition: opacity 0.18s ease-out, transform 0.18s ease-out, stroke 0.2s;
    }
    .hunt.locked .lock-ring {
      opacity: 1;
      transform: scale(1);
      animation: lockRotate 1.6s linear infinite;
      stroke: #ff5a3a;
    }

    /* Slight breathing wobble on the reticle when locked. */
    .hunt.locked .reticle {
      animation: breathe 1.8s ease-in-out infinite;
    }

    /* Muzzle-flash — full-screen white burst when fired. */
    .muzzle-flash {
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at var(--rx) var(--ry), #fff 0%, rgba(255,255,255,0.6) 18%, transparent 55%);
      opacity: 0;
      pointer-events: none;
    }
    .hunt.firing .muzzle-flash {
      animation: flash 200ms ease-out;
    }

    /* HUD chrome */
    .hud-top {
      position: absolute;
      top: 18px; left: 50%;
      transform: translateX(-50%);
      display: flex; align-items: center; gap: 12px;
      color: var(--gold);
      font-family: var(--font-brand);
      letter-spacing: 4px;
      font-size: 14px;
      font-weight: 900;
      text-shadow: 0 0 8px rgba(255, 217, 122, 0.4);
    }
    .hud-corners {
      width: 12px; height: 12px;
      border: 1.5px solid var(--gold);
      opacity: 0.85;
    }
    .hud-corners.tl { border-right: none; border-bottom: none; }
    .hud-corners.tr { border-left:  none; border-bottom: none; }
    .hud-label { padding: 2px 8px; }
    .hunt[data-phase='locked'] .hud-label,
    .hunt[data-phase='firing'] .hud-label { color: #ff5a3a; text-shadow: 0 0 12px rgba(255, 90, 58, 0.6); }

    @keyframes huntIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes huntOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes flash {
      0%   { opacity: 0; }
      18%  { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes lockRotate { to { transform: rotate(360deg) scale(1); } }
    @keyframes heartPulse {
      0%, 100% { stroke-opacity: 0.7; }
      50%      { stroke-opacity: 1.0; }
    }
    @keyframes breathe {
      0%, 100% { transform: translate(-50%, -50%) translateY(0); }
      50%      { transform: translate(-50%, -50%) translateY(2px); }
    }
  `],
})
export class BonusIntroComponent {
  /** True while the cinematic is on screen — read by parent for stage-click routing. */
  readonly active = signal(false);
  protected readonly phase = signal<Phase>('idle');

  @ViewChild('host') private hostRef?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly sound = inject(SoundService);
  private destroyed = false;
  private rafId: number | null = null;
  private currentX = 0.5;
  private currentY = 0.5;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    });
  }

  protected hudLabel(): string {
    const p = this.phase();
    if (p === 'scanning') return 'SCANNING';
    if (p === 'locking')  return 'TRACKING';
    if (p === 'locked')   return 'TARGET LOCKED';
    if (p === 'firing' || p === 'hit') return 'TARGET DOWN';
    return 'BONUS HUNT';
  }

  /**
   * Run the cinematic to completion. Resolves when the overlay finishes
   * fading out. Not interruptible — the player watches the whole thing.
   */
  async play(): Promise<void> {
    if (this.active()) return;
    this.active.set(true);
    this.phase.set('fadeIn');
    // Wait one frame so the host element exists, then settle initial reticle pos.
    await this.nextFrame();
    if (this.destroyed) return;
    this.currentX = 0.30; this.currentY = 0.40;
    this.applyReticle();

    await wait(380);
    if (this.destroyed) return;
    this.phase.set('scanning');
    await this.scanPhase();
    if (this.destroyed) return;

    this.phase.set('locking');
    await this.lockOnto(0.5, 0.55, 720);
    if (this.destroyed) return;

    this.phase.set('locked');
    await wait(700);
    if (this.destroyed) return;

    this.phase.set('firing');
    this.sound.play('gunshot');
    await wait(180);
    if (this.destroyed) return;

    this.phase.set('hit');
    await wait(900);
    if (this.destroyed) return;

    this.phase.set('fadeOut');
    await wait(420);
    this.cleanup();
  }

  private cleanup(): void {
    this.active.set(false);
    this.phase.set('idle');
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Drift the reticle around in a pseudo-random S-curve for ~1.6s. We pick
   * a few waypoints and ease between them, biasing toward the upper half
   * of the screen so the lock-on sweep down to the deer feels earned.
   */
  private async scanPhase(): Promise<void> {
    const waypoints: Array<[number, number, number]> = [
      [0.30, 0.40, 320],
      [0.65, 0.30, 380],
      [0.20, 0.50, 360],
      [0.70, 0.55, 320],
      [0.45, 0.45, 280],
    ];
    for (const [x, y, dur] of waypoints) {
      if (this.destroyed) return;
      await this.lockOnto(x, y, dur);
    }
  }

  /** Tween reticle from current → (tx, ty). */
  private lockOnto(tx: number, ty: number, durationMs: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const startX = this.currentX;
    const startY = this.currentY;
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        if (this.destroyed) { resolve(); return; }
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        this.currentX = startX + (tx - startX) * eased;
        this.currentY = startY + (ty - startY) * eased;
        this.applyReticle();
        if (t < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
          resolve();
        }
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  /** Push current reticle position into the host's CSS custom properties. */
  private applyReticle(): void {
    const host = this.hostRef?.nativeElement;
    if (!host) return;
    host.style.setProperty('--rx', `${this.currentX * 100}%`);
    host.style.setProperty('--ry', `${this.currentY * 100}%`);
  }

  private nextFrame(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return new Promise((res) => requestAnimationFrame(() => res()));
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
