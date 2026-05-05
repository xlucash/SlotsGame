import type { Rng } from '../../../../shared/math/rng';
import { COLS, PAYLINES, ROWS } from './paylines';
import {
  FREE_SPINS_AWARDED,
  FREE_SPINS_RETRIGGER_AWARD,
  FREE_SPINS_TRIGGER_COUNT,
  linePayout,
  pickWildMultiplier,
} from './paytable';
import { pickSymbol, type SymbolId } from './symbols';
import type {
  Grid,
  LineWin,
  NewlyExpandedWild,
  PersistentWild,
  SpinResult,
} from './types';

/* ============================================================
 *  Yeti's Pass — 5×5 paylines engine with expanding wilds
 *
 *  Core loop:
 *    1. Generate a 5×5 grid of symbols.
 *    2. Apply persistent wild reels carried in from previous FS spins
 *       (the entire column is treated as YETI for line evaluation
 *       and contributes its multiplier to lines crossing the column).
 *    3. Evaluate the 25 paylines for left-to-right runs of 3+
 *       matching symbols (YETI substitutes for any paying symbol).
 *    4. For each NEWLY-LANDED wild (not already on a persistent reel)
 *       that participated in any winning line: assign a random
 *       multiplier (2..250×) and treat its entire reel as YETI for a
 *       second pass over the paylines. Compound multipliers across
 *       columns multiplicatively.
 *    5. Sum line wins, count scatters, decide if FS triggers.
 *
 *  Persistent wilds:
 *    - In free spins, every newly-expanded wild remains active for the
 *      remainder of the round (its column stays fully wild and keeps
 *      its multiplier).
 *    - The base game does NOT persist wilds across spins — each base
 *      spin starts from an empty `persistentWilds` list.
 * ============================================================ */

export interface SpinOptions {
  bet: number;
  rng: Rng;
  isFreeSpin?: boolean;
  /** Persistent wild reels active going INTO this spin (FS only). */
  persistentWilds?: ReadonlyArray<PersistentWild>;
}

/** All extended wilds persist for the rest of the round — capped only by
 *  the number of columns. Players were confused when a 4th yeti landed on
 *  screen and silently disappeared next spin under a tighter cap. The
 *  payline evaluator already requires a non-wild anchor for any line to
 *  pay, so the all-wild board pays nothing on its own; that's the real
 *  ceiling on runaway RTP. YETI weight + paytable absorb the extra value
 *  this brings to multi-stack boards. */
const MAX_PERSISTENT = COLS;

export function spin(opts: SpinOptions): SpinResult {
  const { bet, rng, isFreeSpin = false } = opts;
  const persistentIn = opts.persistentWilds ?? [];

  // 1. Generate grid.
  const grid = randomGrid(rng);

  // 2. The "wild columns" we'll use during line evaluation include the
  //    persistent ones from previous spins.
  const wildColumns = new Map<number, number>();
  for (const pw of persistentIn) wildColumns.set(pw.col, pw.multiplier);

  // 3. EVERY newly-landed YETI expands its column — winning combo or not.
  //    Pick the multiplier per wild and stamp the column. If multiple
  //    wilds land in the same column, the topmost one wins (we record the
  //    first row found from the top). Persistent columns aren't replaced.
  const newlyExpanded: NewlyExpandedWild[] = [];
  for (let c = 0; c < COLS; c++) {
    if (wildColumns.has(c)) continue;
    let triggerRow = -1;
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r] === 'YETI') { triggerRow = r; break; }
    }
    if (triggerRow === -1) continue;
    const mult = pickWildMultiplier(rng);
    wildColumns.set(c, mult);
    newlyExpanded.push({ col: c, multiplier: mult, triggerCell: [c, triggerRow] });
  }

  // 4. Evaluate paylines with all wild columns (persistent + newly expanded)
  //    treated as fully wild for substitution + multiplier.
  const lineWins = evaluatePaylines(grid, wildColumns, bet);

  const totalWin = lineWins.reduce((s, w) => s + w.payout, 0);

  // 6. Scatter count + FS trigger.
  //    Only count SUMMITs that are *visible* — cells inside an expanded
  //    wild column are covered by the tall-yeti graphic, so the player
  //    can't see them and shouldn't be credited for them. Without this
  //    filter you can land 1 visible scatter and trigger because two more
  //    are hiding under wild reels.
  const scattersLanded = countScatters(grid, wildColumns);
  let triggeredFreeSpins = 0;
  if (!isFreeSpin && scattersLanded >= FREE_SPINS_TRIGGER_COUNT) {
    triggeredFreeSpins = FREE_SPINS_AWARDED;
  } else if (isFreeSpin && scattersLanded >= FREE_SPINS_TRIGGER_COUNT) {
    // In Yeti's Pass the same threshold retriggers in FS — flat +10 spins.
    triggeredFreeSpins = FREE_SPINS_RETRIGGER_AWARD;
  }

  // 7. Persistent wilds carried into the NEXT spin: in FS, all expanded
  //    wilds (including the new ones) persist; in base, none persist.
  //    Capped at MAX_PERSISTENT so the round never reaches an all-wild
  //    "every line auto-wins" state. Existing carry-ins keep priority;
  //    new expansions only persist while there's room.
  const endPersistentWilds: PersistentWild[] = [];
  if (isFreeSpin) {
    for (const pw of persistentIn) endPersistentWilds.push(pw);
    for (const ne of newlyExpanded) {
      if (endPersistentWilds.length >= MAX_PERSISTENT) break;
      // Don't add if this column was already persistent.
      if (endPersistentWilds.some((p) => p.col === ne.col)) continue;
      endPersistentWilds.push({ col: ne.col, multiplier: ne.multiplier });
    }
    endPersistentWilds.sort((a, b) => a.col - b.col);
  }

  return {
    bet,
    isFreeSpin,
    initialGrid: grid,
    persistentWilds: persistentIn,
    newlyExpanded,
    lineWins,
    totalWin,
    scattersLanded,
    triggeredFreeSpins,
    endPersistentWilds,
  };
}

/**
 * Build a *visual-only* spin result for the bonus-buy fake-trigger animation.
 * The renderer plays this through `playSpin()` exactly like a real spin, but
 * it pays nothing (cost was already debited by `buyBonus`) — its only job is
 * to land the trigger condition (`scattersCount` SUMMITs) on the board so
 * the player sees the scatters appear before the bonus intro plays.
 *
 * Implementation: roll a normal random grid, plant `scattersCount` SUMMITs
 * at random cells, and treat any YETI that happens to land like a real
 * spin would — expand its column and carry it into the FS round via
 * `endPersistentWilds`. Caller is expected to feed that array back into
 * the game service so the first FS spin starts with those wild reels
 * already active.
 */
export function makeBonusBuyTriggerSpin(opts: { bet: number; rng: Rng; scattersCount: number; freeSpinsAwarded: number }): SpinResult {
  const grid = randomGrid(opts.rng);

  // Plant scatters in random distinct cells.
  const cells: Array<[number, number]> = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) cells.push([c, r]);
  // Fisher–Yates shuffle (partial).
  for (let i = 0; i < opts.scattersCount && i < cells.length; i++) {
    const j = i + Math.floor(opts.rng.next() * (cells.length - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
    const [c, r] = cells[i];
    grid[c][r] = 'SUMMIT';
  }

  // Mirror the real spin's expansion logic for any YETI in the grid so the
  // player sees the column expand AND the wild carries into FS. Same rule
  // as `spin()`: first YETI from the top is the trigger cell.
  const newlyExpanded: NewlyExpandedWild[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r] !== 'YETI') continue;
      const mult = pickWildMultiplier(opts.rng);
      newlyExpanded.push({ col: c, multiplier: mult, triggerCell: [c, r] });
      break;
    }
  }
  const endPersistentWilds: PersistentWild[] = newlyExpanded.map(
    (ne) => ({ col: ne.col, multiplier: ne.multiplier }),
  );

  return {
    bet: opts.bet,
    isFreeSpin: false,
    initialGrid: grid,
    persistentWilds: [],
    newlyExpanded,
    lineWins: [],
    totalWin: 0,
    scattersLanded: opts.scattersCount,
    triggeredFreeSpins: opts.freeSpinsAwarded,
    endPersistentWilds,
  };
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function randomGrid(rng: Rng): Grid {
  const g: Grid = [];
  for (let c = 0; c < COLS; c++) {
    const col: SymbolId[] = [];
    for (let r = 0; r < ROWS; r++) col.push(pickSymbol(rng));
    g.push(col);
  }
  return g;
}

function countScatters(grid: Grid, wildColumns: ReadonlyMap<number, number>): number {
  let n = 0;
  for (let c = 0; c < COLS; c++) {
    // Cells in an expanded-wild column are hidden under the tall yeti
    // sprite, so we treat them as "not on the board" for scatter purposes.
    if (wildColumns.has(c)) continue;
    for (let r = 0; r < ROWS; r++) if (grid[c][r] === 'SUMMIT') n++;
  }
  return n;
}

/**
 * Walk the 25 paylines left-to-right and return any 3+/4+/5+ runs.
 *
 * `wildColumns` maps a column index to the multiplier of a fully-expanded
 * wild reel — every cell in that column is treated as YETI, AND the line's
 * payout is multiplied by the column's multiplier value.
 *
 * A single-cell YETI (one not in a wildColumn) still substitutes on its
 * own cell — it just doesn't contribute a multiplier.
 */
function evaluatePaylines(
  grid: Grid,
  wildColumns: ReadonlyMap<number, number>,
  bet: number,
): LineWin[] {
  const wins: LineWin[] = [];

  // Full-board wild — all 5 columns expanded — used to pay nothing under
  // the "needs an anchor" rule, leaving the player with empty spins they
  // could not escape (the persistent-wilds cap is COLS, so once it
  // happens the round can't return to a non-wild board). Treat the
  // jackpot scenario as 5-of-a-kind of the highest-paying symbol on
  // every payline, with the wild-column multipliers applied as usual.
  const allWild = wildColumns.size >= COLS;
  const FULLBOARD_FALLBACK_SYMBOL: SymbolId = 'MAMMOTH';

  for (let i = 0; i < PAYLINES.length; i++) {
    const line = PAYLINES[i];

    // Pull the symbols on this line, treating wild columns as YETI.
    const lineSymbols: SymbolId[] = [];
    for (let c = 0; c < COLS; c++) {
      const r = line[c];
      lineSymbols.push(wildColumns.has(c) ? 'YETI' : grid[c][r]);
    }

    let matchSymbol: SymbolId | null = null;
    for (const s of lineSymbols) {
      if (s !== 'YETI' && s !== 'SUMMIT') { matchSymbol = s; break; }
    }
    if (matchSymbol === null) {
      if (!allWild) continue;
      // Full wild board jackpot: pay each payline as a 5-of-a-kind of
      // the top-paying symbol at flat multiplier (×1). Wild multipliers
      // are deliberately NOT compounded here — with 5 wild reels the
      // additive sum stacks high enough that adding it on top of 25
      // separate jackpot lines pushes RTP into runaway territory. Flat
      // pay keeps it a healthy bonus payout (~111× bet per spin) without
      // wrecking the long-run economics.
      const base = linePayout(FULLBOARD_FALLBACK_SYMBOL, 5, bet);
      if (base <= 0) continue;
      const cells: Array<readonly [number, number]> = [];
      for (let c = 0; c < COLS; c++) cells.push([c, line[c]] as const);
      wins.push({
        lineIndex: i,
        symbol: FULLBOARD_FALLBACK_SYMBOL,
        count: 5,
        cells,
        payout: base,
        multiplierApplied: 1,
      });
      continue;
    }

    // Count consecutive matches from the left (YETI substitutes; SUMMIT breaks).
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      const s = lineSymbols[c];
      if (s === 'SUMMIT') break;
      if (s === matchSymbol || s === 'YETI') count++;
      else break;
    }
    if (count < 3) continue;

    const base = linePayout(matchSymbol, count, bet);
    if (base <= 0) continue;

    // Sum multipliers from any wild columns the matching run crosses. Additive,
    // not multiplicative — multiplying compounds far too aggressively when 4-5
    // reels carry persistent wilds. Then cap the per-line total at the
    // user-facing "up to 250×" promise so a line crossing 5 expanded wilds
    // can't pay more than 250× the base regardless of stacked rolls.
    let multiplierApplied = 0;
    let crossedAnyWild = false;
    for (let c = 0; c < count; c++) {
      const m = wildColumns.get(c);
      if (m !== undefined) {
        multiplierApplied += m;
        crossedAnyWild = true;
      }
    }
    if (!crossedAnyWild) multiplierApplied = 1;
    if (multiplierApplied > 250) multiplierApplied = 250;

    const cells: Array<readonly [number, number]> = [];
    for (let c = 0; c < count; c++) cells.push([c, line[c]] as const);

    wins.push({
      lineIndex: i,
      symbol: matchSymbol,
      count: count as 3 | 4 | 5,
      cells,
      payout: base * multiplierApplied,
      multiplierApplied,
    });
  }

  return wins;
}
