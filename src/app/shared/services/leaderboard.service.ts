import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  Firestore, Query, collection, doc, getDoc, getFirestore, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { GameService as HuntersGameService } from '../../core/services/game.service';
import { YetiGameService } from '../../games/yetis-pass/core/services/game.service';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './firebase.config';

export type GameKey = 'hunters' | 'yeti';

const NICK_KEY = 'better-hunters-lodge.nickname';
const LEADERBOARD_LIMIT = 10;

/**
 * Firestore collections, one per scope. Same document shape in all of them
 * so a single read/write helper works across scopes — only the collection
 * name differs.
 */
const COLLECTIONS: Record<'global' | GameKey, string> = {
  global:  'leaderboard',
  hunters: 'leaderboard_hunters',
  yeti:    'leaderboard_yeti',
};

export interface LeaderboardEntry {
  /** Document id — lower-cased nickname. */
  id: string;
  /** Display name as the player typed it. */
  nick: string;
  /** Largest single-spin win in this scope, in PLN. */
  bestWin: number;
  /** Which game produced the win (informational; same as scope for per-game lists). */
  game: GameKey;
  /** Server-side update time. */
  updatedAt?: Date;
}

/**
 * Tracks the local player's nickname (persisted in localStorage) and three
 * leaderboards in parallel: a global one (player's biggest win in any
 * game) plus one per game. Watches both games' `lastWin` signals; on a new
 * personal best in a game it upserts to that game's collection AND, if it
 * also tops the player's overall best, the global collection.
 *
 * All three top-10 lists are exposed as signals fed from `onSnapshot`, so
 * any UI binding to them re-renders the moment any player anywhere lands
 * a new high score.
 *
 * If Firebase isn't configured the service degrades to a no-op: nickname
 * still works locally, leaderboards stay empty.
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly _nickname = signal<string | null>(this.readNickFromStorage());
  readonly nickname = this._nickname.asReadonly();
  readonly hasNickname = computed(() => !!this._nickname());

  private readonly _topGlobal = signal<ReadonlyArray<LeaderboardEntry>>([]);
  private readonly _topHunters = signal<ReadonlyArray<LeaderboardEntry>>([]);
  private readonly _topYeti = signal<ReadonlyArray<LeaderboardEntry>>([]);
  readonly topGlobal = this._topGlobal.asReadonly();
  readonly topHunters = this._topHunters.asReadonly();
  readonly topYeti = this._topYeti.asReadonly();
  /** Backwards-compatible alias used by the lobby panel. */
  readonly top10 = this.topGlobal;

  /** Player's current personal best per scope (for skip-write guard). */
  private personalBest: Record<'global' | GameKey, number> = { global: 0, hunters: 0, yeti: 0 };

  readonly enabled = isFirebaseConfigured();

  private firebaseApp: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    if (this.enabled) {
      try {
        this.firebaseApp = initializeApp(FIREBASE_CONFIG);
        this.db = getFirestore(this.firebaseApp);
        this.subscribeToBoard('global', this._topGlobal);
        this.subscribeToBoard('hunters', this._topHunters);
        this.subscribeToBoard('yeti', this._topYeti);
      } catch (e) {
        console.warn('[Leaderboard] Firebase init failed:', e);
      }
    }

    if (this._nickname()) void this.loadAllPersonalBests(this._nickname()!);

    // Watch both games' lastWin signals. Each game zeroes lastWin at spin
    // start and sets it to totalWin at spin end, so the first read after
    // a winning spin is exactly when we want to record.
    const hunters = inject(HuntersGameService);
    const yeti = inject(YetiGameService);
    effect(() => this.maybeRecord(hunters.lastWin(), 'hunters'));
    effect(() => this.maybeRecord(yeti.lastWin(), 'yeti'));
  }

  /** Set / change the player's nickname. */
  setNickname(name: string): void {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    this._nickname.set(trimmed);
    try { localStorage.setItem(NICK_KEY, trimmed); } catch { /* ignore */ }
    this.personalBest = { global: 0, hunters: 0, yeti: 0 };
    void this.loadAllPersonalBests(trimmed);
  }

  /** Drop the nickname (e.g. for a "switch player" UI). */
  clearNickname(): void {
    this._nickname.set(null);
    this.personalBest = { global: 0, hunters: 0, yeti: 0 };
    try { localStorage.removeItem(NICK_KEY); } catch { /* ignore */ }
  }

  private maybeRecord(win: number, game: GameKey): void {
    if (!Number.isFinite(win) || win <= 0) return;
    const nick = this._nickname();
    if (!nick) return;
    // Per-game upsert when this win beats the player's previous best in
    // that game. The global one piggybacks on it because most of the time
    // the same condition holds, and we've already paid for the read.
    if (win > this.personalBest[game]) {
      void this.upsertScore(nick, win, game, game);
    }
    if (win > this.personalBest.global) {
      void this.upsertScore(nick, win, game, 'global');
    }
  }

  private async upsertScore(
    nick: string,
    bestWin: number,
    game: GameKey,
    scope: 'global' | GameKey,
  ): Promise<void> {
    if (!this.db) return;
    const id = nick.toLowerCase();
    try {
      const ref = doc(this.db, COLLECTIONS[scope], id);
      const existing = await getDoc(ref);
      const prev = (existing.data()?.['bestWin'] as number | undefined) ?? 0;
      // Always reflect the canonical Firestore value into our local cap so
      // we don't keep retrying writes someone else already beat.
      this.personalBest[scope] = Math.max(this.personalBest[scope], prev);
      if (bestWin <= this.personalBest[scope]) return;
      await setDoc(ref, { nick, bestWin, game, updatedAt: serverTimestamp() }, { merge: true });
      this.personalBest[scope] = bestWin;
    } catch (e) {
      console.warn(`[Leaderboard] upsert (${scope}) failed:`, e);
    }
  }

  private async loadAllPersonalBests(nick: string): Promise<void> {
    if (!this.db) return;
    await Promise.all((Object.keys(COLLECTIONS) as Array<'global' | GameKey>).map(async (scope) => {
      try {
        const snap = await getDoc(doc(this.db!, COLLECTIONS[scope], nick.toLowerCase()));
        const prev = (snap.data()?.['bestWin'] as number | undefined) ?? 0;
        this.personalBest[scope] = prev;
      } catch (e) {
        console.warn(`[Leaderboard] load personal best (${scope}) failed:`, e);
      }
    }));
  }

  private subscribeToBoard(
    scope: 'global' | GameKey,
    target: { set(rows: ReadonlyArray<LeaderboardEntry>): void },
  ): void {
    if (!this.db) return;
    const q: Query = query(
      collection(this.db, COLLECTIONS[scope]),
      orderBy('bestWin', 'desc'),
      limit(LEADERBOARD_LIMIT),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: LeaderboardEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rows.push({
          id: d.id,
          nick: String(data['nick'] ?? d.id),
          bestWin: Number(data['bestWin'] ?? 0),
          game: (data['game'] as GameKey) ?? 'hunters',
          updatedAt: data['updatedAt']?.toDate?.(),
        });
      });
      target.set(rows);
    }, (err) => {
      console.warn(`[Leaderboard] snapshot (${scope}) error:`, err);
    });
    this.unsubscribers.push(unsub);
  }

  private readNickFromStorage(): string | null {
    try { return localStorage.getItem(NICK_KEY); } catch { return null; }
  }
}
