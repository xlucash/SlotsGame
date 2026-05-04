import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BalanceService } from '../../../shared/services/balance.service';
import { GameService } from '../../../core/services/game.service';
import { CounterComponent } from '../../../shared/ui/counter.component';
import { formatPLN } from '../../../shared/util/format';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CounterComponent, RouterLink],
  template: `
    <header class="top-bar bar-rail bar-rail--top">
      <a class="lodge-btn" routerLink="/" aria-label="Back to Better Hunter's Lodge" title="Back to Better Hunter's Lodge">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M3 12 L12 4 L21 12 M5 11 V20 H10 V14 H14 V20 H19 V11"
                fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
        <span class="lodge-label">LODGE</span>
      </a>
      <div class="brand">
        <div class="emblem" aria-hidden="true">
          <svg viewBox="0 0 56 56" width="52" height="52">
            <defs>
              <radialGradient id="bg" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#ffe066"/>
                <stop offset="55%" stop-color="#8c6420"/>
                <stop offset="100%" stop-color="#1a1108"/>
              </radialGradient>
              <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffe066"/>
                <stop offset="100%" stop-color="#5e4318"/>
              </linearGradient>
            </defs>
            <circle cx="28" cy="28" r="26" fill="url(#bg)" stroke="url(#rim)" stroke-width="2"/>
            <circle cx="28" cy="28" r="20" fill="none" stroke="#ffd97a" stroke-width="0.7" stroke-dasharray="1.5 2.5" opacity="0.8"/>
            <!-- Crossed shotgun silhouette -->
            <g stroke="#1a1108" stroke-width="1.2" fill="#0a0806">
              <rect x="6" y="26" width="44" height="3.6" rx="1" transform="rotate(-32 28 28)"/>
              <rect x="6" y="26" width="44" height="3.6" rx="1" transform="rotate(32 28 28)"/>
              <rect x="6" y="22.5" width="13" height="10" rx="2" fill="#5a3a1a" transform="rotate(-32 28 28)"/>
              <rect x="6" y="22.5" width="13" height="10" rx="2" fill="#5a3a1a" transform="rotate(32 28 28)"/>
            </g>
            <!-- Center medallion -->
            <circle cx="28" cy="28" r="6" fill="#0a0806" stroke="#ffd97a" stroke-width="1"/>
            <path d="M22 28 H34 M28 22 V34" stroke="#ffd97a" stroke-width="1.2"/>
            <circle cx="28" cy="28" r="1.6" fill="#ffd97a"/>
          </svg>
        </div>
        <div class="brand-text">
          <strong class="title">Hunter's Cluster</strong>
          <span class="tag">6 × 5 · cluster pays · min 4</span>
        </div>
      </div>

      <div class="balance">
        <div class="coin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <defs>
              <radialGradient id="coin" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#ffe9a3"/>
                <stop offset="60%" stop-color="#b88a2c"/>
                <stop offset="100%" stop-color="#5e4318"/>
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#coin)" stroke="#5e4318" stroke-width="1"/>
            <circle cx="12" cy="12" r="7.5" fill="none" stroke="#5e4318" stroke-width="0.6" opacity="0.7"/>
            <text x="12" y="15.5" text-anchor="middle" font-size="8" font-weight="900" font-family="Cinzel" fill="#5e4318">$</text>
          </svg>
        </div>
        <div class="balance-text">
          <span class="label">Balance</span>
          <strong class="amount">
            <!-- Balance snaps to the new value (no per-cent count-up). -->
            <app-counter [value]="balance.balance()" [duration]="0"></app-counter>
            <em>PLN</em>
          </strong>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; position: relative; z-index: 5; }

    .top-bar {
      display: flex; align-items: center; gap: 18px;
      padding: 10px 22px;
      color: var(--bone);
      border-radius: 0;
      border-left: none; border-right: none; border-top: none;
      position: relative;
    }
    @media (max-width: 700px) {
      .top-bar { gap: 10px; padding: 6px 12px; }
      .brand-text .title { font-size: 16px; letter-spacing: 1.5px; }
      .brand-text .tag   { display: none; }
      .emblem svg { width: 38px; height: 38px; }
      .balance { padding: 6px 12px 6px 8px; gap: 6px; }
      .balance .amount { font-size: 18px; }
      .balance .amount em { font-size: 9px; }
      .coin svg { width: 18px; height: 18px; }
    }
    @media (max-width: 420px) {
      .brand-text .title { font-size: 14px; }
      .balance .amount { font-size: 16px; }
    }

    .brand { display: flex; align-items: center; gap: 14px; }
    .emblem {
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(255,217,122,0.18));
      animation: emblemPulse 4s ease-in-out infinite;
    }
    @keyframes emblemPulse {
      0%, 100% { filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(255,217,122,0.18)); }
      50%      { filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 18px rgba(255,217,122,0.32)); }
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
    .brand-text .title {
      font-family: var(--font-brand); font-weight: 900;
      font-size: 22px;
      color: var(--gold);
      letter-spacing: 2px;
      text-transform: uppercase;
      text-shadow:
        0 1px 0 var(--wood-dark),
        0 2px 0 #000,
        0 0 18px rgba(255, 217, 122, 0.35);
    }
    .brand-text .tag {
      font-family: var(--font-display);
      font-size: 10px;
      letter-spacing: 2.5px;
      opacity: 0.55;
      margin-top: 4px;
      text-transform: uppercase;
    }

    /* Prominent labeled "Lodge" pill — players were missing the icon-only
       version. Pulses subtly so it reads as interactive without being
       loud enough to compete with the spin button. */
    .lodge-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border: 1px solid var(--brass);
      background: linear-gradient(180deg, rgba(255,217,122,.18), rgba(0,0,0,.35));
      color: var(--gold);
      border-radius: 999px;
      cursor: pointer;
      text-decoration: none; flex: 0 0 auto;
      font-family: var(--font-brand); font-weight: 900;
      letter-spacing: 1.6px;
      box-shadow: inset 0 1px 0 rgba(255,217,122,.3), 0 4px 14px rgba(255,217,122,.18);
      animation: lodgeBreathe 3.6s ease-in-out infinite;
      transition: filter .12s, transform .12s, box-shadow .18s;
    }
    .lodge-btn:hover { filter: brightness(1.18); transform: translateY(-1px); box-shadow: 0 0 22px rgba(255,217,122,.5); }
    .lodge-btn:active { transform: translateY(0); }
    .lodge-btn .lodge-label { font-size: 11px; }
    @keyframes lodgeBreathe {
      0%, 100% { box-shadow: inset 0 1px 0 rgba(255,217,122,.3), 0 4px 14px rgba(255,217,122,.18); }
      50% { box-shadow: inset 0 1px 0 rgba(255,217,122,.5), 0 0 22px rgba(255,217,122,.45); }
    }

    .balance { margin-left: auto; }

    /* Balance widget */
    .balance {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 18px 8px 12px;
      border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 100%);
      border: 1px solid var(--brass);
      box-shadow:
        inset 0 1px 0 rgba(255,217,122,0.18),
        inset 0 0 14px rgba(0,0,0,0.4);
      position: relative;
    }
    .coin {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      animation: coinSpin 6s linear infinite;
    }
    @keyframes coinSpin {
      0%, 100% { transform: rotateY(0deg); }
      50%      { transform: rotateY(360deg); }
    }
    .balance-text { display: flex; flex-direction: column; line-height: 1.05; }
    .balance .label {
      font-size: 9px; opacity: 0.6;
      text-transform: uppercase; letter-spacing: 1.5px;
      font-weight: 600;
    }
    .balance .amount {
      display: flex; align-items: baseline; gap: 6px;
      font-family: var(--font-display); font-weight: 900;
      font-size: 24px; color: #fff;
      text-shadow: 0 0 12px rgba(255,217,122,0.18);
      letter-spacing: 0.5px;
    }
    .balance .amount em {
      font-style: normal; font-size: 11px;
      opacity: 0.65; letter-spacing: 1.5px;
      font-family: var(--font-display);
    }
  `],
})
export class TopBarComponent {
  protected readonly balance = inject(BalanceService);
  protected readonly game = inject(GameService);
  protected readonly formatPLN = formatPLN;
}
