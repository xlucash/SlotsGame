import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface GameCard {
  readonly title: string;
  readonly tagline: string;
  readonly route: string;
  readonly accent: string;
  readonly preview: 'hunters-cluster' | 'yetis-pass';
}

const GAMES: readonly GameCard[] = [
  {
    title: "Hunter's Cluster",
    tagline: 'Forest hunt · cluster pays · 6 × 5 · free spins with persistent multiplier',
    route: '/hunters-cluster',
    accent: '#ffd97a',
    preview: 'hunters-cluster',
  },
  {
    title: "Yeti's Pass",
    tagline: 'Himalayan stalk · 5 × 5 · 25 paylines · expanding wilds up to 250×',
    route: '/yetis-pass',
    accent: '#9ad6e8',
    preview: 'yetis-pass',
  },
];

/**
 * Better Hunter's Lodge — landing screen with one card per game in the catalogue.
 * Each card shows a miniature "screenshot" of the actual game (themed
 * background + grid + symbols) so the player can recognize the game at a
 * glance instead of reading taglines. The previews are inline SVG so they
 * scale crisply and don't need any image asset pipeline.
 */
@Component({
  selector: 'app-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="lodge">
      <header class="lodge-head">
        <div class="ornament" aria-hidden="true">
          <svg viewBox="0 0 240 14" width="240" height="14">
            <path d="M0 7 H100 M140 7 H240 M105 7 L120 0 L135 7 L120 14 Z"
                  fill="none" stroke="#ffd97a" stroke-width="1.4"/>
            <circle cx="120" cy="7" r="2.5" fill="#ffd97a"/>
          </svg>
        </div>
        <h1 class="title-engraved">Better Hunter's Lodge</h1>
        <p class="lead">Choose your hunt. Each ledger pays in its own way.</p>
      </header>

      <div class="cards">
        @for (g of games; track g.route) {
          <a class="card"
             [routerLink]="g.route"
             [style.--accent]="g.accent"
             [attr.aria-label]="g.title">
            <div class="badge">PLAY NOW</div>

            <div class="screenshot" aria-hidden="true">
              @switch (g.preview) {
                @case ('hunters-cluster') {
                  <!-- Hunter's Cluster: 6×5 cluster grid on dusk-forest backdrop -->
                  <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <linearGradient id="hc-sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#2c1f10"/>
                        <stop offset="1" stop-color="#0c0805"/>
                      </linearGradient>
                      <linearGradient id="hc-cell" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#1f1408"/>
                        <stop offset="1" stop-color="#0a0604"/>
                      </linearGradient>
                      <radialGradient id="hc-moon" cx="50%" cy="50%" r="50%">
                        <stop offset="0" stop-color="#ffe9b3"/>
                        <stop offset="0.7" stop-color="#a8884a"/>
                        <stop offset="1" stop-color="transparent"/>
                      </radialGradient>
                    </defs>
                    <!-- Sky + moon -->
                    <rect width="240" height="160" fill="url(#hc-sky)"/>
                    <circle cx="195" cy="32" r="22" fill="url(#hc-moon)" opacity="0.85"/>
                    <!-- Tree line silhouette -->
                    <path d="M0 60 L10 40 L18 56 L26 38 L34 54 L40 44 L48 56 L58 36 L66 54 L74 42 L82 56 L92 40 L100 56
                             L110 42 L118 56 L128 38 L138 56 L148 44 L158 56 L168 38 L178 56 L188 44 L198 56 L210 36
                             L220 56 L230 44 L240 56 L240 160 L0 160 Z"
                          fill="#0a0a05" opacity="0.85"/>
                    <!-- Grid frame -->
                    <rect x="14" y="62" width="212" height="86" rx="6"
                          fill="#0a0604" stroke="#ffd97a" stroke-width="1.2" opacity="0.95"/>
                    <!-- 6×5 cells -->
                    <g>
                      @for (c of [0,1,2,3,4,5]; track c) {
                        @for (r of [0,1,2,3,4]; track r) {
                          <rect [attr.x]="20 + c * 33"
                                [attr.y]="66 + r * 16"
                                width="29" height="13" rx="2"
                                fill="url(#hc-cell)"
                                stroke="#3a2a14" stroke-width="0.4"/>
                        }
                      }
                    </g>
                    <!-- Symbols scattered: amber paws, antlers, scope -->
                    <g fill="#ffd97a">
                      <!-- antlers -->
                      <path d="M30 70 L34 73 L34 76 M28 73 L34 73 M38 73 L34 73"
                            stroke="#ffd97a" stroke-width="0.8" fill="none"/>
                      <!-- paws -->
                      <circle cx="65" cy="74" r="1.6"/>
                      <circle cx="68" cy="71" r="1"/>
                      <circle cx="62" cy="71" r="1"/>
                      <circle cx="65" cy="69" r="0.9"/>
                      <!-- scope ring -->
                      <circle cx="100" cy="74" r="3" fill="none" stroke="#ffd97a" stroke-width="0.8"/>
                      <line x1="100" y1="71" x2="100" y2="77" stroke="#ffd97a" stroke-width="0.6"/>
                      <line x1="97" y1="74" x2="103" y2="74" stroke="#ffd97a" stroke-width="0.6"/>
                      <!-- bear silhouette -->
                      <ellipse cx="135" cy="74" rx="3" ry="2.2" fill="#1c1208"/>
                      <circle cx="132" cy="71" r="1" fill="#1c1208"/>
                      <circle cx="138" cy="71" r="1" fill="#1c1208"/>
                      <!-- shotgun shell -->
                      <rect x="167" y="71" width="5" height="6" rx="0.6" fill="#c94a3a"/>
                      <rect x="167" y="71" width="5" height="2" fill="#b08a4a"/>
                    </g>
                    <!-- Cluster glow on a few connected cells (mid-row) -->
                    <g fill="#ffd97a" opacity="0.18">
                      <rect x="86"  y="98" width="29" height="13" rx="2"/>
                      <rect x="119" y="98" width="29" height="13" rx="2"/>
                      <rect x="152" y="98" width="29" height="13" rx="2"/>
                      <rect x="119" y="114" width="29" height="13" rx="2"/>
                    </g>
                    <!-- Win-cluster outline -->
                    <path d="M88 100 H180 V112 H152 V126 H120 V112 H88 Z"
                          fill="none" stroke="#ffd97a" stroke-width="1" opacity="0.85"/>
                    <!-- Floating multiplier badge -->
                    <g>
                      <rect x="186" y="94" width="22" height="14" rx="3"
                            fill="#1a1108" stroke="#ffd97a" stroke-width="0.8"/>
                      <text x="197" y="104" text-anchor="middle"
                            font-family="Cinzel, serif" font-weight="900"
                            font-size="9" fill="#ffd97a">×8</text>
                    </g>
                  </svg>
                }
                @case ('yetis-pass') {
                  <!-- Yeti's Pass: 5×5 paylines grid on Himalayan night sky -->
                  <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <linearGradient id="yp-sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#0c1828"/>
                        <stop offset="1" stop-color="#06121a"/>
                      </linearGradient>
                      <linearGradient id="yp-cell" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#0a1622"/>
                        <stop offset="1" stop-color="#04090d"/>
                      </linearGradient>
                      <linearGradient id="yp-ridge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#1d3a4f"/>
                        <stop offset="1" stop-color="#0a1622"/>
                      </linearGradient>
                      <linearGradient id="yp-yeti" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#eaf3f8"/>
                        <stop offset="1" stop-color="#5e7e92"/>
                      </linearGradient>
                    </defs>
                    <!-- Sky -->
                    <rect width="240" height="160" fill="url(#yp-sky)"/>
                    <!-- Distant moon -->
                    <circle cx="38" cy="28" r="14" fill="#9ad6e8" opacity="0.55"/>
                    <circle cx="38" cy="28" r="14" fill="#06121a" transform="translate(4 -2)"/>
                    <!-- Snow-capped ridge -->
                    <path d="M0 70 L25 50 L40 60 L60 35 L85 60 L110 40 L135 60 L160 38 L185 60 L210 45 L240 65 L240 160 L0 160 Z"
                          fill="url(#yp-ridge)"/>
                    <path d="M55 38 L60 35 L66 41 L62 43 Z M105 43 L110 40 L116 46 L111 48 Z M155 41 L160 38 L168 46 L162 48 Z M205 48 L210 45 L218 53 L212 55 Z"
                          fill="#fff" opacity="0.9"/>
                    <!-- Falling snow -->
                    <g fill="#fff" opacity="0.7">
                      <circle cx="20" cy="20" r="0.8"/>
                      <circle cx="80" cy="14" r="0.7"/>
                      <circle cx="140" cy="22" r="0.8"/>
                      <circle cx="190" cy="12" r="0.7"/>
                      <circle cx="220" cy="22" r="0.7"/>
                    </g>
                    <!-- Grid frame -->
                    <rect x="38" y="58" width="164" height="92" rx="6"
                          fill="#04090d" stroke="#9ad6e8" stroke-width="1.2"/>
                    <!-- 5×5 cells -->
                    <g>
                      @for (c of [0,1,2,3,4]; track c) {
                        @for (r of [0,1,2,3,4]; track r) {
                          <rect [attr.x]="42 + c * 32"
                                [attr.y]="62 + r * 17.5"
                                width="28" height="14" rx="2"
                                fill="url(#yp-cell)"
                                stroke="#1d3a4f" stroke-width="0.4"/>
                        }
                      }
                    </g>
                    <!-- Expanded yeti reel (column 2) -->
                    <rect x="106" y="60" width="28" height="88" rx="3"
                          fill="#9ad6e8" opacity="0.10"
                          stroke="#9ad6e8" stroke-width="0.8"/>
                    <g transform="translate(120 102)">
                      <ellipse cx="0" cy="-12" rx="9" ry="7" fill="url(#yp-yeti)"/>
                      <rect x="-7" y="-7" width="14" height="22" rx="4" fill="url(#yp-yeti)"/>
                      <circle cx="-3" cy="-13" r="1" fill="#0c1828"/>
                      <circle cx="3" cy="-13" r="1" fill="#0c1828"/>
                      <path d="M-3 -10 L0 -8 L3 -10" stroke="#0c1828" stroke-width="0.6" fill="none"/>
                    </g>
                    <!-- Mult badge above expanded reel -->
                    <g>
                      <rect x="108" y="50" width="24" height="12" rx="3"
                            fill="#14202c" stroke="#ffd97a" stroke-width="0.8"/>
                      <text x="120" y="59" text-anchor="middle"
                            font-family="Cinzel, serif" font-weight="900"
                            font-size="8" fill="#ffd97a">×25</text>
                    </g>
                    <!-- A few non-wild symbols (snow leopard / mammoth dots) -->
                    <g>
                      <circle cx="56" cy="69" r="3" fill="#d0d6dc"/>
                      <circle cx="56" cy="69" r="3" fill="none" stroke="#9ad6e8" stroke-width="0.4"/>
                      <ellipse cx="56" cy="103" rx="3.5" ry="2.3" fill="#6a4828"/>
                      <ellipse cx="184" cy="86" rx="3.2" ry="2.1" fill="#7a5a2e"/>
                      <circle cx="184" cy="121" r="2.6" fill="#c9543a"/>
                      <circle cx="184" cy="121" r="2.6" fill="none" stroke="#fff" stroke-width="0.4"/>
                    </g>
                    <!-- Winning payline polyline -->
                    <path d="M56 69 L88 86 L120 103 L152 86 L184 69"
                          fill="none" stroke="#ffd97a" stroke-width="1.2" opacity="0.85"/>
                  </svg>
                }
              }
            </div>

            <h2 class="card-title">{{ g.title }}</h2>
            <p class="card-tag">{{ g.tagline }}</p>

            <span class="cta">
              Enter
              <span class="arrow">→</span>
            </span>
          </a>
        }
      </div>

      <footer class="lodge-foot">
        <span>10 000 PLN starting balance · refresh resets the session</span>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }
    .lodge {
      min-height: 100%;
      padding: 56px 24px 40px;
      box-sizing: border-box;
      color: var(--bone);
      font-family: var(--font-body);
      background:
        radial-gradient(ellipse 70% 50% at 50% 12%, rgba(255, 217, 122, 0.10), transparent 70%),
        radial-gradient(ellipse 80% 60% at 50% 100%, rgba(90, 207, 138, 0.08), transparent 70%),
        linear-gradient(180deg, var(--bg-night) 0%, var(--bg-deep) 100%);
    }

    .lodge-head {
      max-width: 720px;
      margin: 0 auto 40px;
      text-align: center;
    }
    .ornament {
      display: flex; justify-content: center;
      opacity: 0.85; margin-bottom: 12px;
    }
    h1 {
      margin: 0;
      font-size: clamp(34px, 6vw, 56px);
      letter-spacing: 6px;
    }
    .lead {
      margin: 10px 0 0;
      font-size: 14px;
      opacity: 0.75;
      letter-spacing: 0.5px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 22px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .card {
      --accent: #ffd97a;
      position: relative;
      display: flex; flex-direction: column;
      gap: 12px;
      padding: 14px 14px 18px;
      border-radius: 18px;
      text-decoration: none;
      color: var(--bone);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.55) 100%);
      border: 1px solid var(--accent);
      box-shadow:
        inset 0 1px 0 rgba(255, 217, 122, 0.18),
        0 12px 32px rgba(0, 0, 0, 0.55);
      transition: transform 0.18s ease, box-shadow 0.22s ease, filter 0.18s ease;
      overflow: hidden;
    }
    .card::before, .card::after {
      content: '';
      position: absolute;
      width: 14px; height: 14px;
      opacity: 0.7;
      pointer-events: none;
      z-index: 2;
    }
    .card::before { top: 6px; left: 6px;  border-top: 1px solid var(--accent); border-left: 1px solid var(--accent); }
    .card::after  { bottom: 6px; right: 6px; border-bottom: 1px solid var(--accent); border-right: 1px solid var(--accent); }

    .card:hover {
      transform: translateY(-3px);
      filter: brightness(1.06);
      box-shadow:
        inset 0 1px 0 rgba(255, 217, 122, 0.32),
        0 18px 40px rgba(0, 0, 0, 0.65),
        0 0 32px var(--accent);
    }
    .card:hover .screenshot { filter: brightness(1.08) saturate(1.05); }

    .badge {
      position: absolute; top: 18px; right: 18px;
      padding: 4px 10px;
      font-family: var(--font-display); font-weight: 900;
      font-size: 9px;
      letter-spacing: 1.6px;
      border-radius: 999px;
      background: var(--accent);
      color: var(--wood-dark, #2c1f10);
      z-index: 3;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    /* Mini "screenshot" of the actual game — the hero element of each card. */
    .screenshot {
      position: relative;
      aspect-ratio: 3 / 2;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: inset 0 0 24px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.5);
      transition: filter 0.2s ease;
    }
    .screenshot svg {
      display: block;
      width: 100%; height: 100%;
    }
    /* Vignette so the screenshot frame feels less flat. */
    .screenshot::after {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%);
      pointer-events: none;
    }

    .card-title {
      margin: 6px 0 0;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 22px;
      letter-spacing: 2.4px;
      text-align: center;
      color: var(--accent);
      text-shadow: 0 2px 0 var(--wood-dark, #2c1f10);
    }
    .card-tag {
      margin: 0;
      font-size: 11.5px;
      letter-spacing: 0.4px;
      opacity: 0.78;
      text-align: center;
      line-height: 1.45;
    }
    .cta {
      margin-top: auto;
      align-self: center;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 22px;
      border-radius: 999px;
      border: 1px solid var(--accent);
      background: linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.65));
      color: var(--accent);
      font-family: var(--font-display); font-weight: 700;
      font-size: 11.5px;
      letter-spacing: 1.8px;
      text-transform: uppercase;
    }
    .arrow { transition: transform 0.18s ease; }
    .card:hover .arrow { transform: translateX(4px); }

    .lodge-foot {
      max-width: 720px;
      margin: 32px auto 0;
      text-align: center;
      font-size: 11px;
      letter-spacing: 1.4px;
      opacity: 0.55;
    }

    @media (max-width: 720px) {
      .lodge { padding: 36px 16px 32px; }
      .cards { gap: 16px; }
    }
  `],
})
export class LobbyComponent {
  protected readonly games = GAMES;
}
