import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

type Phase = 'idle' | 'fadeIn' | 'running' | 'roar' | 'fadeOut';

/**
 * Yeti's Pass cinematic intro: dusk on the pass, an igloo and lantern in
 * the foreground, and a yeti silhouette running from right to left across
 * the screen with snow drifting. After the run it stops and lets out a
 * silent roar (head tilts back, eyes brighten) before the overlay fades.
 *
 * Plays end-to-end (not skippable) so the player gets the full beat.
 */
@Component({
  selector: 'app-yeti-bonus-intro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active()) {
      <div class="intro" [attr.data-phase]="phase()">
        <!-- Background scene -->
        <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#152838"/>
              <stop offset="0.45" stop-color="#2a4458"/>
              <stop offset="0.75" stop-color="#7a4a32"/>
              <stop offset="1" stop-color="#3a1a0c"/>
            </linearGradient>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#ffe9b5" stop-opacity="0.95"/>
              <stop offset="1" stop-color="#ffe9b5" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#ffd97a" stop-opacity="1"/>
              <stop offset="1" stop-color="#ffd97a" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- Sky -->
          <rect width="1600" height="900" fill="url(#sky)"/>
          <!-- Stars -->
          <g fill="#fff">
            <circle cx="120" cy="80" r="1.4"/><circle cx="280" cy="40" r="1"/>
            <circle cx="420" cy="120" r="1.6"/><circle cx="560" cy="60" r="1"/>
            <circle cx="700" cy="100" r="1.2"/><circle cx="980" cy="40" r="1.6"/>
            <circle cx="1180" cy="80" r="1.2"/><circle cx="1320" cy="120" r="1"/>
            <circle cx="1480" cy="60" r="1.4"/>
          </g>
          <!-- Setting sun + halo -->
          <circle cx="1280" cy="520" r="280" fill="url(#moonGlow)"/>
          <circle cx="1280" cy="520" r="92" fill="#ffe9b5"/>
          <!-- Distant ridges -->
          <path d="M0 580 L150 520 L280 575 L460 480 L640 560 L820 510 L1020 580 L1200 530 L1380 580 L1600 560 V900 H0 Z"
                fill="#1a2a36" opacity="0.92"/>
          <!-- Mid ridge with snow caps -->
          <g fill="#0c1a24" stroke="#9ad6e8" stroke-width="0.8" opacity="0.96">
            <path d="M0 700 L120 600 L220 660 L340 540 L500 640 L660 580 L840 670 L1020 600 L1180 680 L1380 620 L1600 690 V900 H0 Z"/>
          </g>
          <!-- Snow caps -->
          <g fill="#eaf3f8">
            <path d="M340 540 L320 580 L368 580 Z"/>
            <path d="M660 580 L644 614 L680 614 Z"/>
            <path d="M1020 600 L1004 640 L1040 640 Z"/>
            <path d="M1380 620 L1364 654 L1400 654 Z"/>
          </g>
          <!-- Foreground snowy slope -->
          <path d="M0 760 Q400 700 800 740 Q1200 770 1600 720 V900 H0 Z" fill="#eaf3f8" opacity="0.96"/>
          <!-- Igloo -->
          <g transform="translate(220 720)">
            <path d="M-120 60 A120 110 0 0 1 120 60 L120 60 L-120 60 Z" fill="#cce0e8" stroke="#14202c" stroke-width="3"/>
            <!-- Block lines -->
            <g stroke="#14202c" stroke-width="1.4" fill="none" opacity="0.5">
              <line x1="-100" y1="-2" x2="100" y2="-2"/>
              <line x1="-95" y1="-30" x2="95" y2="-30"/>
              <line x1="-65" y1="-58" x2="65" y2="-58"/>
              <line x1="-100" y1="30" x2="100" y2="30"/>
              <line x1="-50" y1="-90" x2="50" y2="-90"/>
              <line x1="-55" y1="-2" x2="-55" y2="-58"/>
              <line x1="55" y1="-2" x2="55" y2="-58"/>
              <line x1="-25" y1="-58" x2="-25" y2="-90"/>
              <line x1="25" y1="-58" x2="25" y2="-90"/>
            </g>
            <!-- Entrance arch -->
            <path d="M-32 60 A32 32 0 0 1 32 60 Z" fill="#14202c"/>
            <!-- Warm glow inside -->
            <ellipse cx="0" cy="48" rx="22" ry="14" fill="#ffd97a" opacity="0.7"/>
          </g>
          <!-- Lantern on the ground next to igloo -->
          <g transform="translate(380 760)">
            <circle cx="0" cy="-10" r="44" fill="url(#lanternGlow)"/>
            <rect x="-7" y="-22" width="14" height="22" rx="2" fill="#3a2a14" stroke="#14202c" stroke-width="1.5"/>
            <rect x="-9" y="-10" width="18" height="6" fill="#3a2a14"/>
            <ellipse cx="0" cy="-25" rx="6" ry="4" fill="#ffd97a"/>
          </g>
          <!-- Distant pine trees on the slope -->
          <g fill="#0a1014">
            <path d="M580 720 L600 690 L620 720 Z M610 720 L620 700 L630 720 Z"/>
            <path d="M900 730 L920 695 L940 730 Z M928 730 L935 712 L944 730 Z"/>
            <path d="M1160 716 L1180 686 L1200 716 Z"/>
          </g>
          <!-- Tracks left in the snow -->
          <g fill="#9ad6e8" opacity="0.4">
            <ellipse cx="700" cy="775" rx="6" ry="3"/>
            <ellipse cx="780" cy="780" rx="6" ry="3"/>
            <ellipse cx="860" cy="775" rx="6" ry="3"/>
            <ellipse cx="940" cy="780" rx="6" ry="3"/>
            <ellipse cx="1020" cy="775" rx="6" ry="3"/>
          </g>
        </svg>

        <!-- Drifting snow flakes overlay -->
        <div class="snowflakes" aria-hidden="true">
          <span class="flake f1"></span>
          <span class="flake f2"></span>
          <span class="flake f3"></span>
          <span class="flake f4"></span>
          <span class="flake f5"></span>
          <span class="flake f6"></span>
          <span class="flake f7"></span>
          <span class="flake f8"></span>
        </div>

        <!-- Yeti silhouette running across, then stops + roars -->
        <svg #yetiEl class="yeti" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g class="yeti-body">
            <!-- Shaggy head halo -->
            <circle cx="120" cy="78" r="58" fill="#eaf3f8"/>
            <g stroke="#14202c" stroke-width="3">
              <!-- Head -->
              <circle cx="120" cy="78" r="46" fill="#eaf3f8"/>
              <!-- Body -->
              <ellipse cx="120" cy="160" rx="60" ry="56" fill="#eaf3f8"/>
              <!-- Arms — animated swing via CSS .leg-fl pattern; simple here -->
              <g class="arm-l">
                <ellipse cx="68" cy="155" rx="14" ry="36" fill="#eaf3f8"/>
              </g>
              <g class="arm-r">
                <ellipse cx="172" cy="155" rx="14" ry="36" fill="#eaf3f8"/>
              </g>
              <!-- Legs (running) -->
              <g class="leg-l"><rect x="100" y="200" width="14" height="36" rx="6" fill="#eaf3f8"/></g>
              <g class="leg-r"><rect x="126" y="200" width="14" height="36" rx="6" fill="#eaf3f8"/></g>
            </g>
            <!-- Belly tint -->
            <ellipse cx="120" cy="170" rx="36" ry="32" fill="#9ad6e8" opacity="0.30"/>
            <!-- Eyes (glow) -->
            <circle cx="106" cy="74" r="6" fill="#14202c"/>
            <circle cx="134" cy="74" r="6" fill="#14202c"/>
            <circle cx="106" cy="74" r="3.6" fill="#9ad6e8"/>
            <circle cx="134" cy="74" r="3.6" fill="#9ad6e8"/>
            <!-- Mouth (closed default; opens on roar) -->
            <g class="mouth">
              <path d="M104 92 Q120 100 136 92 Q120 96 104 92 Z" fill="#14202c"/>
            </g>
          </g>
        </svg>

        <!-- HUD copy -->
        <div class="hud">
          <span class="hud-label">{{ phase() === 'roar' ? 'THE HUNT BEGINS' : 'INTO THE PASS' }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 190;
    }
    .intro {
      position: fixed; inset: 0;
      overflow: hidden;
      background: #04101a;
      pointer-events: auto;
      animation: introIn 0.4s ease-out;
    }
    .intro[data-phase='fadeOut'] { animation: introOut 0.5s ease-in forwards; }

    .scene { position: absolute; inset: 0; width: 100%; height: 100%; }

    /* ---- Yeti running ---- */
    .yeti {
      position: absolute;
      bottom: 14%;
      width: min(28vw, 280px);
      height: auto;
      transform: translateX(110vw);
      filter: drop-shadow(0 8px 22px rgba(0,0,0,0.7));
    }
    .intro[data-phase='running'] .yeti {
      animation: yetiRun 2.6s cubic-bezier(0.25, 0, 0.5, 1) forwards;
    }
    .intro[data-phase='roar'] .yeti,
    .intro[data-phase='fadeOut'] .yeti {
      transform: translateX(28vw);
    }

    /* Limb swings — only animated while running */
    .intro[data-phase='running'] .leg-l { animation: limbA 0.32s linear infinite; transform-origin: 107px 200px; transform-box: fill-box; }
    .intro[data-phase='running'] .leg-r { animation: limbB 0.32s linear infinite; transform-origin: 133px 200px; transform-box: fill-box; }
    .intro[data-phase='running'] .arm-l { animation: limbB 0.32s linear infinite; transform-origin: 68px 119px; transform-box: fill-box; }
    .intro[data-phase='running'] .arm-r { animation: limbA 0.32s linear infinite; transform-origin: 172px 119px; transform-box: fill-box; }

    /* Head tilt + eye flare on the roar */
    .intro[data-phase='roar'] .yeti-body { animation: roar 0.55s ease-out; transform-origin: 120px 124px; }
    .intro[data-phase='roar'] .mouth { animation: mouthOpen 0.55s ease-out forwards; transform-origin: 120px 95px; transform-box: fill-box; }

    /* ---- Snowflakes ---- */
    .snowflakes { position: absolute; inset: 0; pointer-events: none; }
    .flake {
      position: absolute;
      width: 6px; height: 6px;
      background: #eaf3f8;
      border-radius: 50%;
      opacity: 0.85;
      filter: drop-shadow(0 0 4px rgba(255,255,255,0.5));
    }
    .flake.f1 { left: 10%; animation: fall 7s linear infinite, drift 4s ease-in-out infinite alternate; }
    .flake.f2 { left: 22%; animation: fall 9s linear 1s infinite, drift 5s ease-in-out 0.5s infinite alternate; }
    .flake.f3 { left: 34%; animation: fall 8s linear 0.5s infinite, drift 4.5s ease-in-out 1s infinite alternate; }
    .flake.f4 { left: 46%; animation: fall 10s linear 1.5s infinite, drift 6s ease-in-out 0.2s infinite alternate; }
    .flake.f5 { left: 58%; animation: fall 7.5s linear 0.2s infinite, drift 4.2s ease-in-out 1.5s infinite alternate; }
    .flake.f6 { left: 70%; animation: fall 9.5s linear 1.8s infinite, drift 5.5s ease-in-out 0.8s infinite alternate; }
    .flake.f7 { left: 82%; animation: fall 8.5s linear 0.7s infinite, drift 4.8s ease-in-out 1.2s infinite alternate; }
    .flake.f8 { left: 92%; animation: fall 11s linear 1.1s infinite, drift 6.5s ease-in-out 0.4s infinite alternate; }

    /* ---- HUD ---- */
    .hud {
      position: absolute;
      top: 18px; left: 50%;
      transform: translateX(-50%);
      color: #9ad6e8;
      font-family: var(--font-brand);
      font-weight: 900;
      letter-spacing: 4px;
      font-size: 14px;
      text-shadow: 0 0 8px rgba(154, 214, 232, 0.4);
    }

    @keyframes introIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes introOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes yetiRun {
      0%   { transform: translateX(110vw); }
      100% { transform: translateX(28vw); }
    }
    @keyframes limbA {
      0%   { transform: rotate(-32deg); }
      50%  { transform: rotate( 32deg); }
      100% { transform: rotate(-32deg); }
    }
    @keyframes limbB {
      0%   { transform: rotate( 32deg); }
      50%  { transform: rotate(-32deg); }
      100% { transform: rotate( 32deg); }
    }
    @keyframes roar {
      0%   { transform: rotate(0); }
      40%  { transform: rotate(-12deg); }
      100% { transform: rotate(0); }
    }
    @keyframes mouthOpen {
      0%   { transform: scaleY(1); }
      40%  { transform: scaleY(2.5) translateY(4px); }
      100% { transform: scaleY(1.6) translateY(2px); }
    }
    @keyframes fall {
      from { top: -10%; }
      to   { top: 105%; }
    }
    @keyframes drift {
      from { margin-left: 0; }
      to   { margin-left: 30px; }
    }
  `],
})
export class YetiBonusIntroComponent {
  readonly active = signal(false);
  protected readonly phase = signal<Phase>('idle');
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; });
  }

  /**
   * Run the cinematic to completion. Resolves when the overlay fades out.
   */
  async play(): Promise<void> {
    if (this.active()) return;
    this.active.set(true);
    this.phase.set('fadeIn');
    await wait(380);
    if (this.destroyed) { this.cleanup(); return; }
    this.phase.set('running');
    await wait(2700); // matches yetiRun duration + a small dwell
    if (this.destroyed) { this.cleanup(); return; }
    this.phase.set('roar');
    await wait(900);
    if (this.destroyed) { this.cleanup(); return; }
    this.phase.set('fadeOut');
    await wait(520);
    this.cleanup();
  }

  private cleanup(): void {
    this.active.set(false);
    this.phase.set('idle');
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
