import { clusterPayout } from './paytable';
import { COLS, ROWS, MIN_CLUSTER, type Cluster, type Grid, type WildMultGrid } from './types';
import type { SymbolId } from './symbols';

/**
 * Find all winning clusters via orthogonal flood-fill.
 * Wilds substitute for any paying symbol but are not a cluster anchor by themselves.
 * Scatters never participate in clusters.
 *
 * Algorithm: for each non-WILD/non-SCATTER symbol type present, flood-fill through
 * cells of that symbol or WILD. A wild can belong to multiple clusters of different
 * symbols (standard cluster-pay behavior).
 *
 * `wilds` is a parallel grid of per-cell wild multipliers (0 if not wild).
 * Any wild cell that ends up inside a cluster contributes its multiplier
 * additively — the cluster's final payout is `basePayout × sumOfWildMults`,
 * with `sumOfWildMults` defaulting to 1 when no wilds participate.
 */
export function findClusters(grid: Grid, wilds: WildMultGrid, bet: number): Cluster[] {
  const clusters: Cluster[] = [];

  const payingSymbols = new Set<SymbolId>();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const s = grid[c][r];
      if (s !== 'WILD' && s !== 'SCATTER') payingSymbols.add(s);
    }
  }

  for (const target of payingSymbols) {
    const visited: boolean[][] = Array.from({ length: COLS }, () => new Array(ROWS).fill(false));
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (visited[c][r]) continue;
        if (grid[c][r] !== target) continue;
        const cells = floodFill(grid, c, r, target, visited);
        if (cells.length >= MIN_CLUSTER) {
          const base = clusterPayout(target, cells.length, bet);
          let wildSum = 0;
          for (const [cc, rr] of cells) {
            if (grid[cc][rr] === 'WILD') wildSum += wilds[cc][rr] || 0;
          }
          const wildMultiplier = wildSum > 0 ? wildSum : 1;
          clusters.push({
            symbol: target,
            cells,
            payout: base * wildMultiplier,
            wildMultiplier,
          });
        }
      }
    }
  }
  return clusters;
}

function floodFill(
  grid: Grid,
  startC: number,
  startR: number,
  target: SymbolId,
  visited: boolean[][],
): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  const wildVisited: boolean[][] = Array.from({ length: COLS }, () => new Array(ROWS).fill(false));
  const stack: Array<[number, number]> = [[startC, startR]];

  while (stack.length) {
    const [c, r] = stack.pop()!;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
    const cell = grid[c][r];
    const isMatch = cell === target;
    const isWild = cell === 'WILD';
    if (!isMatch && !isWild) continue;

    if (isMatch) {
      if (visited[c][r]) continue;
      visited[c][r] = true;
    } else {
      // Wild: track per-cluster so we don't loop, but don't mark globally
      // (a wild can pay for multiple symbol clusters).
      if (wildVisited[c][r]) continue;
      wildVisited[c][r] = true;
    }
    out.push([c, r] as const);
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }

  // A cluster must contain at least one non-wild cell of the target symbol;
  // otherwise it's pure wilds and shouldn't pay on its own.
  const hasAnchor = out.some(([c, r]) => grid[c][r] === target);
  return hasAnchor ? out : [];
}
