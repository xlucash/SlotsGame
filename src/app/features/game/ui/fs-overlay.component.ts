import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { GameService } from '../../../core/services/game.service';
import { CounterComponent } from '../../../shared/ui/counter.component';

@Component({
  selector: 'app-fs-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent],
  template: `
    @if (game.phase() === 'fs-intro') {
      <div class="overlay">
        <div class="card panel-wood intro" role="dialog" aria-labelledby="fs-intro-title">
          <div class="ornament top">
            <svg viewBox="0 0 200 14" width="200" height="14" aria-hidden="true">
              <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
              <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
            </svg>
          </div>
          <div class="emblem">
            <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
              <defs>
                <radialGradient id="g1" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stop-color="#ffe066"/>
                  <stop offset="55%" stop-color="#8c6420"/>
                  <stop offset="100%" stop-color="#1a1108"/>
                </radialGradient>
              </defs>
              <circle cx="40" cy="40" r="36" fill="url(#g1)" stroke="#ffd97a" stroke-width="2"/>
              <circle cx="40" cy="40" r="28" fill="none" stroke="#ffd97a" stroke-width="0.7" stroke-dasharray="1.5 2.5"/>
              <path d="M40 8 L43 36 L72 40 L43 44 L40 72 L37 44 L8 40 L37 36 Z" fill="#0a0806" stroke="#ffd97a" stroke-width="1"/>
              <circle cx="40" cy="40" r="3" fill="#c9543a"/>
            </svg>
          </div>
          <h1 id="fs-intro-title" class="title-engraved">The Hunt Begins</h1>
          <p class="lead">Scatters collected — venture into the woods.</p>
          <ul>
            <li><strong class="num">{{ game.freeSpinsLeft() }}</strong> free spins awarded</li>
            <li>Win multiplier <strong>persists</strong> the entire round</li>
            <li>Multiplier <strong>+1</strong> on every cascading win</li>
            <li>Land 3 more scatters to retrigger <strong>+5 spins</strong></li>
          </ul>
          <button class="cta" (click)="continue.emit()">
            <span>Begin the Hunt</span>
          </button>
          <div class="ornament bottom">
            <svg viewBox="0 0 200 14" width="200" height="14" aria-hidden="true">
              <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
              <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
            </svg>
          </div>
        </div>
      </div>
    } @else if (game.phase() === 'fs-outro') {
      <div class="overlay">
        <div class="card panel-wood outro" role="dialog" aria-labelledby="fs-outro-title">
          <div class="ornament top">
            <svg viewBox="0 0 200 14" width="200" height="14" aria-hidden="true">
              <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
              <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
            </svg>
          </div>
          <div class="emblem trophy">
            <svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true">
              <defs>
                <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffe066"/>
                  <stop offset="100%" stop-color="#8c6420"/>
                </linearGradient>
              </defs>
              <path d="M22 14 H58 V36 C58 50, 50 60, 40 60 C30 60, 22 50, 22 36 Z" fill="url(#cup)" stroke="#3a2a14" stroke-width="2"/>
              <path d="M22 18 C12 18, 12 32, 22 32" fill="none" stroke="#ffd97a" stroke-width="2"/>
              <path d="M58 18 C68 18, 68 32, 58 32" fill="none" stroke="#ffd97a" stroke-width="2"/>
              <rect x="34" y="60" width="12" height="6" fill="#3a2a14"/>
              <rect x="26" y="66" width="28" height="5" fill="#5a4424" stroke="#3a2a14" stroke-width="1"/>
              <text x="40" y="40" text-anchor="middle" font-size="14" font-weight="900" font-family="Cinzel" fill="#3a2a14">★</text>
            </svg>
          </div>
          <h1 id="fs-outro-title" class="title-engraved">Hunt Complete</h1>
          <p class="lead">Total Free Spins win</p>
          <strong class="total">
            <app-counter [value]="game.lastWin()" [duration]="1.4"></app-counter>
            <em>PLN</em>
          </strong>
          <span class="mult">Final multiplier ×{{ game.fsMultiplier() }}</span>
          <button class="cta" (click)="continue.emit()">
            <span>Collect</span>
          </button>
          <div class="ornament bottom">
            <svg viewBox="0 0 200 14" width="200" height="14" aria-hidden="true">
              <path d="M0 7 H80 M120 7 H200 M85 7 L100 0 L115 7 L100 14 Z" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
              <circle cx="100" cy="7" r="2.5" fill="#ffd97a"/>
            </svg>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 180; }
    .overlay {
      position: fixed; inset: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.92) 100%);
      display: grid; place-items: center;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.35s ease-out;
      z-index: 10;
    }
    .card {
      padding: 28px 44px 30px;
      border-radius: 22px;
      max-width: 480px;
      text-align: center;
      color: var(--bone);
      animation: rise 0.45s cubic-bezier(0.2, 0.7, 0.25, 1.05);
      position: relative;
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.2),
        0 30px 80px rgba(0,0,0,0.7),
        0 0 60px rgba(255,217,122,0.18);
    }
    .ornament {
      display: flex; justify-content: center;
      opacity: 0.85;
      margin: 4px 0;
    }
    .emblem {
      filter: drop-shadow(0 6px 22px rgba(255,217,122,0.45));
      margin: 8px 0 2px;
      animation: emblemFloat 3s ease-in-out infinite;
    }
    @keyframes emblemFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-4px); }
    }
    h1 {
      font-size: 32px;
      margin: 4px 0 10px;
    }
    .lead {
      margin: 0 0 14px; opacity: 0.8;
      font-size: 13px;
      letter-spacing: 0.3px;
    }
    ul {
      text-align: left;
      margin: 0 auto 22px; padding: 14px 24px;
      list-style: none;
      line-height: 2;
      border-top: 1px solid rgba(255,217,122,0.25);
      border-bottom: 1px solid rgba(255,217,122,0.25);
      max-width: 380px;
      font-size: 14px;
    }
    ul li::before {
      content: '⚜';
      color: var(--gold);
      margin-right: 12px;
      font-size: 13px;
    }
    ul strong {
      color: var(--gold);
      font-family: var(--font-display);
      font-weight: 700;
    }
    .total {
      display: flex; align-items: baseline; justify-content: center; gap: 8px;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 56px;
      color: var(--gold);
      margin: 8px 0 4px;
      letter-spacing: 1px;
      text-shadow:
        0 2px 0 var(--wood-dark),
        0 0 32px rgba(255,217,122,0.5);
      animation: totalGlow 2.4s ease-in-out infinite;
    }
    .total em {
      font-style: normal; font-size: 18px;
      opacity: 0.7; letter-spacing: 2px;
    }
    @keyframes totalGlow {
      0%, 100% { text-shadow: 0 2px 0 var(--wood-dark), 0 0 28px rgba(255,217,122,0.45); }
      50%      { text-shadow: 0 2px 0 var(--wood-dark), 0 0 44px rgba(255,217,122,0.7); }
    }
    .mult {
      display: block;
      font-size: 12px;
      opacity: 0.7;
      text-transform: uppercase; letter-spacing: 2.5px;
      margin-bottom: 22px;
    }
    .cta {
      padding: 14px 40px;
      border-radius: 999px;
      border: 1px solid var(--brass-bright);
      background:
        linear-gradient(180deg, var(--ruby-bright) 0%, var(--ruby) 50%, var(--ruby-deep) 100%);
      color: #fff;
      font-family: var(--font-brand); font-weight: 900;
      font-size: 15px;
      letter-spacing: 2.5px;
      cursor: pointer;
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.45),
        inset 0 -3px 6px rgba(0,0,0,0.4),
        0 6px 18px rgba(139, 26, 26, 0.55),
        0 0 24px rgba(255,123,74,0.25);
      transition: transform 0.1s, filter 0.1s, box-shadow 0.2s;
    }
    .cta:hover {
      transform: scale(1.04);
      filter: brightness(1.12);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.5),
        0 8px 24px rgba(255,123,74,0.55),
        var(--glow-ruby);
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rise {
      from { transform: translateY(28px) scale(0.94); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
  `],
})
export class FsOverlayComponent {
  protected readonly game = inject(GameService);
  @Output() readonly continue = new EventEmitter<void>();
}
