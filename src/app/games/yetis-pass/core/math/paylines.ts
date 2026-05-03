/**
 * 25 paylines for the 5×5 grid. Each line is a tuple of row-indices,
 * one per reel column. A symbol is "on" the line at column `c` if it
 * sits at `(c, lines[c])`.
 *
 * Coverage: every row visited by at least one line, plus diagonals,
 * V-shapes, zig-zags and step patterns to give the math a healthy
 * hit-rate distribution at 25 lines.
 */
export type Payline = readonly [r0: number, r1: number, r2: number, r3: number, r4: number];

export const PAYLINES: readonly Payline[] = [
  // 1–5: horizontal rows
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [4, 4, 4, 4, 4],
  // 6–8: V down the middle and lower
  [0, 1, 2, 1, 0],
  [1, 2, 3, 2, 1],
  [2, 3, 4, 3, 2],
  // 9–11: inverted V (peaks down)
  [4, 3, 2, 3, 4],
  [3, 2, 1, 2, 3],
  [2, 1, 0, 1, 2],
  // 12–15: small zig-zags top + bottom
  [0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1],
  [3, 4, 3, 4, 3],
  [4, 3, 4, 3, 4],
  // 16–18: ascending steps
  [0, 0, 1, 1, 2],
  [1, 1, 2, 2, 3],
  [2, 2, 3, 3, 4],
  // 19–21: descending steps
  [4, 4, 3, 3, 2],
  [3, 3, 2, 2, 1],
  [2, 2, 1, 1, 0],
  // 22–25: long zig (wide gap)
  [0, 2, 0, 2, 0],
  [4, 2, 4, 2, 4],
  [1, 3, 1, 3, 1],
  [3, 1, 3, 1, 3],
];

export const COLS = 5;
export const ROWS = 5;
