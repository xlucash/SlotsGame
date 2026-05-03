import { Graphics } from 'pixi.js';
import type { SymbolId } from '../core/math/symbols';

interface ArtPalette {
  fill: number;
  shadow: number;
  highlight: number;
  outline: number;
  accent: number;
  warm?: number;
}

const PAL: Record<SymbolId, ArtPalette> = {
  IGLOO:        { fill: 0xc6dde5, shadow: 0x6a8a98, highlight: 0xffffff, outline: 0x14202c, accent: 0x4a8aa8, warm: 0xfff5e0 },
  LANTERN:      { fill: 0xe6a040, shadow: 0x8b5a18, highlight: 0xffe066, outline: 0x2a1408, accent: 0xfff3a0, warm: 0xc97a2a },
  ICE_AXE:      { fill: 0xb9c0c8, shadow: 0x6a7280, highlight: 0xffffff, outline: 0x14181c, accent: 0xb88a2c, warm: 0x6b3a18 },
  COMPASS:      { fill: 0xb88a2c, shadow: 0x5e4318, highlight: 0xffe066, outline: 0x1a1108, accent: 0xc94a3a, warm: 0xe9dcc1 },
  YAK:          { fill: 0x4a3424, shadow: 0x261509, highlight: 0x6b4426, outline: 0x14080a, accent: 0xc97a4a, warm: 0xa66b3c },
  EAGLE:        { fill: 0x5a3a1a, shadow: 0x2a1408, highlight: 0x8b6c3a, outline: 0x0a0604, accent: 0xffd97a, warm: 0xe9dcc1 },
  IBEX:         { fill: 0x7a5a2e, shadow: 0x3a2a14, highlight: 0xa68654, outline: 0x14080a, accent: 0xfff5e0, warm: 0xc9a868 },
  SNOW_LEOPARD: { fill: 0xd0d6dc, shadow: 0x6a7484, highlight: 0xffffff, outline: 0x14181c, accent: 0x4a8aa8, warm: 0x2c2c2c },
  MAMMOTH:      { fill: 0x6a4828, shadow: 0x2a1808, highlight: 0x9c7048, outline: 0x0a0604, accent: 0xeaf3f8, warm: 0xc9a868 },
  YETI:         { fill: 0xeaf3f8, shadow: 0x9ad6e8, highlight: 0xffffff, outline: 0x14202c, accent: 0x4a8aa8, warm: 0x6c8a98 },
  SUMMIT:       { fill: 0xc9543a, shadow: 0x5a1a08, highlight: 0xffd97a, outline: 0x14080a, accent: 0xeaf3f8, warm: 0xff7a5a },
};

export function paletteFor(id: SymbolId): ArtPalette { return PAL[id]; }

const SW = 2.5;
const SW_INNER = 1.4;

/** Draws a symbol centered at (0,0) within a square of `size`. */
export function drawSymbol(g: Graphics, id: SymbolId, size: number): void {
  g.clear();
  const half = size / 2;

  // Subtle drop shadow.
  g.ellipse(0, half * 0.85, half * 0.7, half * 0.10).fill({ color: 0x000000, alpha: 0.32 });

  const pal = PAL[id];
  switch (id) {
    case 'IGLOO':        drawIgloo(g, half, pal); break;
    case 'LANTERN':      drawLantern(g, half, pal); break;
    case 'ICE_AXE':      drawIceAxe(g, half, pal); break;
    case 'COMPASS':      drawCompass(g, half, pal); break;
    case 'YAK':          drawYak(g, half, pal); break;
    case 'EAGLE':        drawEagle(g, half, pal); break;
    case 'IBEX':         drawIbex(g, half, pal); break;
    case 'SNOW_LEOPARD': drawSnowLeopard(g, half, pal); break;
    case 'MAMMOTH':      drawMammoth(g, half, pal); break;
    case 'YETI':         drawYeti(g, half, pal); break;
    case 'SUMMIT':       drawSummit(g, half, pal); break;
  }
}

/* --------------------------- LOWS --------------------------- */

function drawIgloo(g: Graphics, h: number, p: ArtPalette): void {
  // Snow dome
  g.moveTo(-h * 0.78, h * 0.4)
    .arc(0, h * 0.4, h * 0.78, Math.PI, 0, false)
    .lineTo(h * 0.78, h * 0.4)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Highlights — line of "snow blocks"
  for (let i = -2; i <= 2; i++) {
    g.moveTo(i * h * 0.32 - h * 0.10, -h * 0.20)
     .lineTo(i * h * 0.32 - h * 0.10, h * 0.40)
     .stroke({ color: p.outline, width: 1.2, alpha: 0.5 });
  }
  for (let i = -3; i <= 3; i++) {
    const y = h * 0.05;
    g.moveTo(i * h * 0.22, y).lineTo(i * h * 0.22 + h * 0.10, y)
      .stroke({ color: p.outline, width: 1, alpha: 0.4 });
  }
  // Entrance arch
  g.moveTo(-h * 0.20, h * 0.40)
    .arc(0, h * 0.40, h * 0.20, Math.PI, 0, false)
    .lineTo(h * 0.20, h * 0.40)
    .closePath()
    .fill(p.outline);
  g.moveTo(-h * 0.13, h * 0.40)
    .arc(0, h * 0.40, h * 0.13, Math.PI, 0, false)
    .closePath()
    .fill(p.shadow);
  // Snow on top — small glossy highlight
  g.ellipse(-h * 0.30, -h * 0.40, h * 0.20, h * 0.10)
    .fill({ color: p.highlight, alpha: 0.55 });
  // Tiny snowflakes around
  g.circle(-h * 0.65, -h * 0.55, h * 0.04).fill(p.highlight);
  g.circle(h * 0.55, -h * 0.45, h * 0.03).fill(p.highlight);
}

function drawLantern(g: Graphics, h: number, p: ArtPalette): void {
  // Top hanging hook
  g.moveTo(0, -h * 0.95)
    .quadraticCurveTo(h * 0.18, -h * 0.85, 0, -h * 0.70)
    .stroke({ color: p.outline, width: 3 });
  // Top cap
  g.poly([-h * 0.36, -h * 0.62, h * 0.36, -h * 0.62, h * 0.30, -h * 0.50, -h * 0.30, -h * 0.50])
    .fill(p.shadow).stroke({ color: p.outline, width: SW });
  // Glass body
  g.roundRect(-h * 0.36, -h * 0.50, h * 0.72, h * 0.78, 6)
    .fill({ color: p.fill, alpha: 0.85 })
    .stroke({ color: p.outline, width: SW });
  // Inner flame
  g.moveTo(0, h * 0.10)
    .quadraticCurveTo(-h * 0.12, -h * 0.05, 0, -h * 0.30)
    .quadraticCurveTo(h * 0.12, -h * 0.05, 0, h * 0.10)
    .closePath()
    .fill(p.accent)
    .stroke({ color: p.warm ?? p.outline, width: 1.5 });
  // Inner flame core
  g.moveTo(0, h * 0.05)
    .quadraticCurveTo(-h * 0.05, -h * 0.05, 0, -h * 0.18)
    .quadraticCurveTo(h * 0.05, -h * 0.05, 0, h * 0.05)
    .closePath()
    .fill({ color: p.highlight, alpha: 0.85 });
  // Vertical glass dividers
  g.moveTo(-h * 0.18, -h * 0.50).lineTo(-h * 0.18, h * 0.28)
    .stroke({ color: p.outline, width: 1, alpha: 0.5 });
  g.moveTo(h * 0.18, -h * 0.50).lineTo(h * 0.18, h * 0.28)
    .stroke({ color: p.outline, width: 1, alpha: 0.5 });
  // Bottom cap
  g.roundRect(-h * 0.40, h * 0.28, h * 0.80, h * 0.16, 4)
    .fill(p.shadow).stroke({ color: p.outline, width: SW });
}

function drawIceAxe(g: Graphics, h: number, p: ArtPalette): void {
  // Shaft (wood)
  g.roundRect(-h * 0.06, -h * 0.50, h * 0.12, h * 1.40, 3)
    .fill(p.warm ?? p.fill)
    .stroke({ color: p.outline, width: SW });
  // Head — pick on right, adze on left
  g.moveTo(-h * 0.45, -h * 0.55)
    .lineTo(-h * 0.06, -h * 0.65)
    .lineTo(-h * 0.06, -h * 0.40)
    .lineTo(-h * 0.30, -h * 0.40)
    .closePath()
    .fill(p.accent)
    .stroke({ color: p.outline, width: SW });
  g.moveTo(h * 0.06, -h * 0.65)
    .lineTo(h * 0.55, -h * 0.65)
    .lineTo(h * 0.65, -h * 0.40)
    .lineTo(h * 0.06, -h * 0.40)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Steel gleam
  g.moveTo(h * 0.10, -h * 0.62).lineTo(h * 0.50, -h * 0.62)
    .stroke({ color: p.highlight, width: 1.2, alpha: 0.7 });
  // Handle wrap (leather strap)
  g.rect(-h * 0.07, h * 0.20, h * 0.14, h * 0.30).fill({ color: p.outline, alpha: 0.5 });
  // Spike at bottom
  g.poly([-h * 0.06, h * 0.85, h * 0.06, h * 0.85, 0, h * 0.95])
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
}

function drawCompass(g: Graphics, h: number, p: ArtPalette): void {
  // Brass case
  g.circle(0, 0, h * 0.78).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.circle(0, 0, h * 0.70).stroke({ color: p.outline, width: 1, alpha: 0.6 });
  // Cardinal markings
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const r1 = h * 0.55, r2 = h * 0.66;
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
      .lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
      .stroke({ color: p.outline, width: i % 2 === 0 ? 2 : 1 });
  }
  // Needle
  g.poly([0, -h * 0.55, h * 0.10, 0, 0, h * 0.55, -h * 0.10, 0])
    .stroke({ color: p.outline, width: SW });
  g.moveTo(0, -h * 0.55).lineTo(h * 0.10, 0).lineTo(0, 0).lineTo(-h * 0.10, 0).closePath()
    .fill(p.accent); // North half = red
  g.moveTo(0, h * 0.55).lineTo(h * 0.10, 0).lineTo(0, 0).lineTo(-h * 0.10, 0).closePath()
    .fill(p.warm ?? p.fill);
  // Pivot
  g.circle(0, 0, h * 0.06).fill(p.outline);
  g.circle(0, 0, h * 0.025).fill(p.highlight);
  // Top winder/loop
  g.circle(0, -h * 0.85, h * 0.10)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
}

/* --------------------------- HIGHS --------------------------- */

function drawYak(g: Graphics, h: number, p: ArtPalette): void {
  // Long hairy body silhouette
  g.ellipse(0, h * 0.20, h * 0.80, h * 0.50)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Head
  g.ellipse(-h * 0.50, -h * 0.10, h * 0.32, h * 0.40)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Curved horns
  g.moveTo(-h * 0.55, -h * 0.45)
    .quadraticCurveTo(-h * 0.85, -h * 0.50, -h * 0.75, -h * 0.18)
    .stroke({ color: p.warm ?? p.accent, width: 5 });
  g.moveTo(-h * 0.40, -h * 0.45)
    .quadraticCurveTo(-h * 0.30, -h * 0.55, -h * 0.40, -h * 0.20)
    .stroke({ color: p.warm ?? p.accent, width: 4 });
  // Eye
  g.circle(-h * 0.55, -h * 0.10, h * 0.05).fill(p.outline);
  g.circle(-h * 0.55, -h * 0.12, h * 0.018).fill(p.highlight);
  // Snout
  g.ellipse(-h * 0.72, h * 0.10, h * 0.12, h * 0.10).fill(p.shadow);
  // Hairy fringe (under-belly)
  for (let i = -3; i <= 3; i++) {
    const x = i * h * 0.18;
    g.moveTo(x, h * 0.55).lineTo(x, h * 0.78)
      .stroke({ color: p.outline, width: 2 });
  }
  // Front legs
  g.rect(-h * 0.30, h * 0.55, h * 0.10, h * 0.32).fill(p.outline);
  g.rect(-h * 0.10, h * 0.58, h * 0.10, h * 0.30).fill(p.outline);
  // Back legs
  g.rect(h * 0.30, h * 0.58, h * 0.10, h * 0.30).fill(p.outline);
  g.rect(h * 0.50, h * 0.55, h * 0.10, h * 0.32).fill(p.outline);
  // Tail tuft
  g.circle(h * 0.85, h * 0.05, h * 0.10).fill(p.fill).stroke({ color: p.outline, width: 1.4 });
}

function drawEagle(g: Graphics, h: number, p: ArtPalette): void {
  // Head
  g.circle(0, -h * 0.40, h * 0.32).fill(p.highlight).stroke({ color: p.outline, width: SW });
  // Crown of feathers
  for (let i = -2; i <= 2; i++) {
    const x = i * h * 0.10;
    g.moveTo(x, -h * 0.65).lineTo(x + h * 0.04, -h * 0.78)
      .stroke({ color: p.outline, width: 2 });
  }
  // Hooked beak
  g.moveTo(-h * 0.05, -h * 0.30)
    .lineTo(h * 0.18, -h * 0.20)
    .lineTo(-h * 0.05, -h * 0.10)
    .closePath()
    .fill(p.accent)
    .stroke({ color: p.outline, width: SW });
  g.moveTo(h * 0.10, -h * 0.20)
    .lineTo(h * 0.18, -h * 0.15)
    .stroke({ color: p.outline, width: 1.5 });
  // Sharp eye
  g.circle(h * 0.05, -h * 0.45, h * 0.06).fill(p.accent);
  g.circle(h * 0.06, -h * 0.45, h * 0.025).fill(p.outline);
  // Body
  g.ellipse(0, h * 0.20, h * 0.40, h * 0.50)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Wings (spread, partial)
  g.moveTo(-h * 0.30, h * 0.05)
    .quadraticCurveTo(-h * 0.95, h * 0.20, -h * 0.55, h * 0.55)
    .quadraticCurveTo(-h * 0.40, h * 0.40, -h * 0.20, h * 0.45)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  g.moveTo(h * 0.30, h * 0.05)
    .quadraticCurveTo(h * 0.95, h * 0.20, h * 0.55, h * 0.55)
    .quadraticCurveTo(h * 0.40, h * 0.40, h * 0.20, h * 0.45)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Wing feather lines
  for (let i = 0; i < 3; i++) {
    const off = i * h * 0.08;
    g.moveTo(-h * 0.30 - off, h * 0.20)
      .lineTo(-h * 0.65 - off * 0.5, h * 0.40)
      .stroke({ color: p.outline, width: 1.2, alpha: 0.6 });
    g.moveTo(h * 0.30 + off, h * 0.20)
      .lineTo(h * 0.65 + off * 0.5, h * 0.40)
      .stroke({ color: p.outline, width: 1.2, alpha: 0.6 });
  }
  // Talons
  g.moveTo(-h * 0.10, h * 0.65).lineTo(-h * 0.10, h * 0.85).stroke({ color: p.outline, width: 3 });
  g.moveTo(h * 0.10, h * 0.65).lineTo(h * 0.10, h * 0.85).stroke({ color: p.outline, width: 3 });
}

function drawIbex(g: Graphics, h: number, p: ArtPalette): void {
  // Long swept-back horns
  g.moveTo(-h * 0.18, -h * 0.40)
    .quadraticCurveTo(-h * 0.55, -h * 0.70, -h * 0.50, -h * 0.95)
    .stroke({ color: p.warm ?? p.accent, width: 6, cap: 'round' });
  g.moveTo(h * 0.18, -h * 0.40)
    .quadraticCurveTo(h * 0.55, -h * 0.70, h * 0.50, -h * 0.95)
    .stroke({ color: p.warm ?? p.accent, width: 6, cap: 'round' });
  // Horn ribbing
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const x = -h * 0.18 + (-h * 0.55 - (-h * 0.18)) * t;
    const y = -h * 0.40 + (-h * 0.85 - (-h * 0.40)) * t;
    g.circle(x, y, 2).fill(p.outline);
  }
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const x = h * 0.18 + (h * 0.55 - h * 0.18) * t;
    const y = -h * 0.40 + (-h * 0.85 - (-h * 0.40)) * t;
    g.circle(x, y, 2).fill(p.outline);
  }
  // Head
  g.ellipse(0, -h * 0.05, h * 0.32, h * 0.45)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Lighter underchin
  g.ellipse(0, h * 0.30, h * 0.22, h * 0.20)
    .fill(p.warm ?? p.shadow);
  // Beard
  g.moveTo(-h * 0.05, h * 0.32).lineTo(0, h * 0.55).lineTo(h * 0.05, h * 0.32).closePath()
    .fill(p.outline);
  // Eye
  g.circle(-h * 0.10, -h * 0.10, h * 0.05).fill(p.outline);
  g.circle(h * 0.10, -h * 0.10, h * 0.05).fill(p.outline);
  g.circle(-h * 0.085, -h * 0.115, h * 0.017).fill(p.highlight);
  g.circle(h * 0.115, -h * 0.115, h * 0.017).fill(p.highlight);
  // Nose
  g.ellipse(0, h * 0.18, h * 0.05, h * 0.04).fill(p.outline);
  // Ears
  g.ellipse(-h * 0.30, -h * 0.20, h * 0.06, h * 0.10)
    .fill(p.shadow).stroke({ color: p.outline, width: 1.5 });
  g.ellipse(h * 0.30, -h * 0.20, h * 0.06, h * 0.10)
    .fill(p.shadow).stroke({ color: p.outline, width: 1.5 });
}

function drawSnowLeopard(g: Graphics, h: number, p: ArtPalette): void {
  // Round head
  g.circle(0, h * 0.05, h * 0.55).fill(p.fill).stroke({ color: p.outline, width: SW });
  // Spotted pattern
  for (const [x, y, r] of [
    [-h * 0.25, -h * 0.15, h * 0.08],
    [h * 0.18, -h * 0.20, h * 0.07],
    [-h * 0.30, h * 0.20, h * 0.06],
    [h * 0.28, h * 0.18, h * 0.07],
    [0, h * 0.30, h * 0.06],
  ] as const) {
    g.circle(x, y, r).fill(p.shadow).stroke({ color: p.outline, width: 0.8 });
  }
  // Ears
  g.poly([-h * 0.45, -h * 0.30, -h * 0.30, -h * 0.55, -h * 0.20, -h * 0.30])
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  g.poly([h * 0.45, -h * 0.30, h * 0.30, -h * 0.55, h * 0.20, -h * 0.30])
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  g.poly([-h * 0.40, -h * 0.30, -h * 0.30, -h * 0.45, -h * 0.22, -h * 0.30])
    .fill(p.warm ?? p.shadow);
  g.poly([h * 0.40, -h * 0.30, h * 0.30, -h * 0.45, h * 0.22, -h * 0.30])
    .fill(p.warm ?? p.shadow);
  // Piercing pale eyes
  g.circle(-h * 0.18, h * 0.00, h * 0.08).fill(p.highlight)
    .stroke({ color: p.outline, width: SW_INNER });
  g.circle(h * 0.18, h * 0.00, h * 0.08).fill(p.highlight)
    .stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.18, h * 0.00, h * 0.04).fill(p.accent);
  g.circle(h * 0.18, h * 0.00, h * 0.04).fill(p.accent);
  g.rect(-h * 0.20, h * 0.00 - h * 0.04, h * 0.04, h * 0.08).fill(p.outline);
  g.rect(h * 0.16, h * 0.00 - h * 0.04, h * 0.04, h * 0.08).fill(p.outline);
  // Nose
  g.poly([-h * 0.05, h * 0.18, h * 0.05, h * 0.18, 0, h * 0.26]).fill(p.warm ?? p.outline);
  // Whiskers
  for (const sign of [-1, 1] as const) {
    g.moveTo(sign * h * 0.10, h * 0.30).lineTo(sign * h * 0.55, h * 0.25)
      .stroke({ color: p.outline, width: 1.2 });
    g.moveTo(sign * h * 0.10, h * 0.36).lineTo(sign * h * 0.55, h * 0.40)
      .stroke({ color: p.outline, width: 1.2 });
  }
}

function drawMammoth(g: Graphics, h: number, p: ArtPalette): void {
  // Tusks (curved ivory)
  g.moveTo(-h * 0.15, h * 0.20)
    .quadraticCurveTo(-h * 0.45, h * 0.50, -h * 0.30, h * 0.70)
    .lineTo(-h * 0.20, h * 0.65)
    .quadraticCurveTo(-h * 0.30, h * 0.45, -h * 0.10, h * 0.20)
    .closePath()
    .fill(p.accent)
    .stroke({ color: p.outline, width: SW });
  g.moveTo(h * 0.15, h * 0.20)
    .quadraticCurveTo(h * 0.45, h * 0.50, h * 0.30, h * 0.70)
    .lineTo(h * 0.20, h * 0.65)
    .quadraticCurveTo(h * 0.30, h * 0.45, h * 0.10, h * 0.20)
    .closePath()
    .fill(p.accent)
    .stroke({ color: p.outline, width: SW });
  // Body — large furry mass
  g.ellipse(0, h * 0.05, h * 0.65, h * 0.55)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Trunk dangling
  g.moveTo(-h * 0.10, h * 0.20)
    .quadraticCurveTo(-h * 0.20, h * 0.55, h * 0.05, h * 0.78)
    .lineTo(h * 0.18, h * 0.78)
    .quadraticCurveTo(-h * 0.05, h * 0.55, h * 0.10, h * 0.20)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Trunk segments
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const x = -h * 0.05 + (h * 0.05 - (-h * 0.05)) * t;
    const y = h * 0.30 + (h * 0.70 - h * 0.30) * t;
    g.moveTo(x - h * 0.06, y).lineTo(x + h * 0.06, y)
      .stroke({ color: p.outline, width: 1, alpha: 0.6 });
  }
  // Eyes
  g.circle(-h * 0.20, -h * 0.10, h * 0.05).fill(p.shadow)
    .stroke({ color: p.outline, width: SW_INNER });
  g.circle(h * 0.20, -h * 0.10, h * 0.05).fill(p.shadow)
    .stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.20, -h * 0.10, h * 0.020).fill(p.highlight);
  g.circle(h * 0.20, -h * 0.10, h * 0.020).fill(p.highlight);
  // Hairy crown / forehead tuft
  for (let i = -3; i <= 3; i++) {
    const x = i * h * 0.12;
    g.moveTo(x, -h * 0.45).lineTo(x + h * 0.04, -h * 0.62)
      .stroke({ color: p.outline, width: 2.5 });
  }
  // Ear silhouettes
  g.ellipse(-h * 0.55, -h * 0.10, h * 0.18, h * 0.30)
    .fill(p.shadow)
    .stroke({ color: p.outline, width: SW });
  g.ellipse(h * 0.55, -h * 0.10, h * 0.18, h * 0.30)
    .fill(p.shadow)
    .stroke({ color: p.outline, width: SW });
}

/* --------------------------- SPECIALS --------------------------- */

function drawYeti(g: Graphics, h: number, p: ArtPalette): void {
  // Huge furry shape
  g.ellipse(0, h * 0.15, h * 0.70, h * 0.55)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Head
  g.circle(0, -h * 0.40, h * 0.42)
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Shaggy outline tufts around head
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    const r1 = h * 0.40, r2 = h * 0.50;
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 - h * 0.40)
      .lineTo(Math.cos(a) * r2, Math.sin(a) * r2 - h * 0.40)
      .stroke({ color: p.outline, width: 2.5 });
  }
  // Glowing blue eyes
  g.circle(-h * 0.16, -h * 0.42, h * 0.08).fill(p.outline);
  g.circle(h * 0.16, -h * 0.42, h * 0.08).fill(p.outline);
  g.circle(-h * 0.16, -h * 0.42, h * 0.05).fill(p.accent);
  g.circle(h * 0.16, -h * 0.42, h * 0.05).fill(p.accent);
  g.circle(-h * 0.14, -h * 0.44, h * 0.018).fill(p.highlight);
  g.circle(h * 0.18, -h * 0.44, h * 0.018).fill(p.highlight);
  // Open snarling mouth
  g.moveTo(-h * 0.22, -h * 0.18)
    .quadraticCurveTo(0, -h * 0.06, h * 0.22, -h * 0.18)
    .quadraticCurveTo(h * 0.10, h * 0.00, -h * 0.10, h * 0.00)
    .closePath()
    .fill(p.outline);
  // Fangs
  for (const x of [-h * 0.10, h * 0.10]) {
    g.poly([x - h * 0.04, -h * 0.18, x + h * 0.04, -h * 0.18, x, -h * 0.05]).fill(p.highlight);
  }
  // Arms — raised
  g.moveTo(-h * 0.55, h * 0.20)
    .quadraticCurveTo(-h * 0.85, -h * 0.10, -h * 0.55, -h * 0.30)
    .quadraticCurveTo(-h * 0.40, h * 0.05, -h * 0.30, h * 0.30)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  g.moveTo(h * 0.55, h * 0.20)
    .quadraticCurveTo(h * 0.85, -h * 0.10, h * 0.55, -h * 0.30)
    .quadraticCurveTo(h * 0.40, h * 0.05, h * 0.30, h * 0.30)
    .closePath()
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Belly fur
  g.ellipse(0, h * 0.30, h * 0.30, h * 0.20).fill({ color: p.warm ?? p.shadow, alpha: 0.55 });
}

/**
 * Tall expanded-wild graphic — fills a single 1-column × 5-row reel.
 * Drawn at (0, 0) origin going down/right; caller sets dimensions.
 *
 * Scene: dusky cyan column, snowy floor, a towering shaggy yeti silhouette
 * with arms raised + glowing eyes + radial backlight.
 */
export function drawExpandedYeti(g: Graphics, width: number, height: number): void {
  g.clear();
  const w = width;
  const h = height;
  const cx = w / 2;

  // Background — column gradient (cyan glow), faked with stacked rects of
  // increasing alpha for a vertical falloff.
  g.roundRect(0, 0, w, h, 12)
    .fill({ color: 0x14202c });
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const y = h * 0.05 + t * (h * 0.9);
    const bandH = h / 14;
    const a = 0.04 + Math.sin(t * Math.PI) * 0.10;
    g.rect(2, y, w - 4, bandH).fill({ color: 0x9ad6e8, alpha: a });
  }
  // Subtle edge inset
  g.roundRect(0, 0, w, h, 12)
    .stroke({ color: 0x9ad6e8, width: 2.5, alpha: 0.85 });
  g.roundRect(4, 4, w - 8, h - 8, 9)
    .stroke({ color: 0xeaf3f8, width: 1, alpha: 0.25 });

  // Snowy ground at the bottom
  g.moveTo(2, h * 0.84)
    .quadraticCurveTo(cx, h * 0.78, w - 2, h * 0.84)
    .lineTo(w - 2, h - 4)
    .lineTo(2, h - 4)
    .closePath()
    .fill({ color: 0xeaf3f8, alpha: 0.85 });

  // Backlight halo
  g.circle(cx, h * 0.40, w * 0.55)
    .fill({ color: 0x9ad6e8, alpha: 0.18 });
  g.circle(cx, h * 0.40, w * 0.40)
    .fill({ color: 0x9ad6e8, alpha: 0.10 });

  // Yeti silhouette — proportions tuned for a tall column (height >> width)
  const yetiW = w * 0.74;
  const yetiX = cx;
  const headR = yetiW * 0.32;
  const headY = h * 0.18;
  const bodyTop = headY + headR * 0.7;
  const bodyBottom = h * 0.82;
  const bodyW = yetiW * 0.55;

  // Body
  g.roundRect(yetiX - bodyW / 2, bodyTop, bodyW, bodyBottom - bodyTop, bodyW * 0.4)
    .fill({ color: 0xeaf3f8 })
    .stroke({ color: 0x14202c, width: 3 });
  // Belly fur (slightly warmer)
  g.roundRect(yetiX - bodyW * 0.32, bodyTop + bodyW * 0.10, bodyW * 0.64, (bodyBottom - bodyTop) * 0.65, bodyW * 0.32)
    .fill({ color: 0x9ad6e8, alpha: 0.30 });

  // Arms raised slightly outward
  g.moveTo(yetiX - bodyW / 2, bodyTop + bodyW * 0.20)
    .quadraticCurveTo(yetiX - yetiW * 0.55, bodyTop - bodyW * 0.10, yetiX - yetiW * 0.42, bodyTop + bodyW * 0.50)
    .quadraticCurveTo(yetiX - yetiW * 0.30, bodyTop + bodyW * 0.30, yetiX - bodyW * 0.20, bodyTop + bodyW * 0.40)
    .closePath()
    .fill({ color: 0xeaf3f8 })
    .stroke({ color: 0x14202c, width: 3 });
  g.moveTo(yetiX + bodyW / 2, bodyTop + bodyW * 0.20)
    .quadraticCurveTo(yetiX + yetiW * 0.55, bodyTop - bodyW * 0.10, yetiX + yetiW * 0.42, bodyTop + bodyW * 0.50)
    .quadraticCurveTo(yetiX + yetiW * 0.30, bodyTop + bodyW * 0.30, yetiX + bodyW * 0.20, bodyTop + bodyW * 0.40)
    .closePath()
    .fill({ color: 0xeaf3f8 })
    .stroke({ color: 0x14202c, width: 3 });

  // Head
  g.circle(yetiX, headY, headR)
    .fill({ color: 0xeaf3f8 })
    .stroke({ color: 0x14202c, width: 3 });

  // Shaggy tufts around head
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14;
    const r1 = headR * 0.95;
    const r2 = headR * 1.20;
    g.moveTo(yetiX + Math.cos(a) * r1, headY + Math.sin(a) * r1)
     .lineTo(yetiX + Math.cos(a) * r2, headY + Math.sin(a) * r2)
     .stroke({ color: 0x14202c, width: 2.5 });
  }

  // Glowing blue eyes
  const eyeY = headY - headR * 0.05;
  g.circle(yetiX - headR * 0.32, eyeY, headR * 0.14).fill({ color: 0x14202c });
  g.circle(yetiX + headR * 0.32, eyeY, headR * 0.14).fill({ color: 0x14202c });
  g.circle(yetiX - headR * 0.32, eyeY, headR * 0.10).fill({ color: 0x9ad6e8 });
  g.circle(yetiX + headR * 0.32, eyeY, headR * 0.10).fill({ color: 0x9ad6e8 });
  g.circle(yetiX - headR * 0.30, eyeY - headR * 0.04, headR * 0.04).fill(0xffffff);
  g.circle(yetiX + headR * 0.34, eyeY - headR * 0.04, headR * 0.04).fill(0xffffff);

  // Snarling mouth
  g.moveTo(yetiX - headR * 0.40, headY + headR * 0.30)
    .quadraticCurveTo(yetiX, headY + headR * 0.55, yetiX + headR * 0.40, headY + headR * 0.30)
    .quadraticCurveTo(yetiX + headR * 0.20, headY + headR * 0.50, yetiX, headY + headR * 0.50)
    .quadraticCurveTo(yetiX - headR * 0.20, headY + headR * 0.50, yetiX - headR * 0.40, headY + headR * 0.30)
    .closePath()
    .fill(0x14202c);
  // Fangs
  for (const sign of [-1, 1] as const) {
    const fx = yetiX + sign * headR * 0.20;
    g.poly([
      fx - headR * 0.06, headY + headR * 0.30,
      fx + headR * 0.06, headY + headR * 0.30,
      fx,                headY + headR * 0.50,
    ]).fill(0xffffff);
  }

  // Faint icicles hanging at the top
  for (const x of [w * 0.18, w * 0.42, w * 0.66]) {
    g.poly([x - 4, 0, x + 4, 0, x, h * 0.05])
      .fill({ color: 0xeaf3f8, alpha: 0.85 });
  }
}

function drawSummit(g: Graphics, h: number, p: ArtPalette): void {
  // Mountain silhouette behind
  g.poly([
    -h * 0.85, h * 0.85,
    -h * 0.55, h * 0.20,
    -h * 0.30, h * 0.40,
    h * 0.05, -h * 0.45,
    h * 0.45, h * 0.30,
    h * 0.85, h * 0.85,
  ]).fill(p.shadow).stroke({ color: p.outline, width: SW });
  // Snow caps
  g.poly([
    h * 0.05, -h * 0.45,
    -h * 0.10, -h * 0.05,
    h * 0.25, -h * 0.05,
  ]).fill(p.accent);
  g.poly([
    -h * 0.55, h * 0.20,
    -h * 0.65, h * 0.45,
    -h * 0.45, h * 0.45,
  ]).fill(p.accent);
  // Summit flag pole
  g.moveTo(h * 0.05, -h * 0.45).lineTo(h * 0.05, -h * 0.85)
    .stroke({ color: p.outline, width: 3 });
  // Flag (red triangle)
  g.poly([h * 0.05, -h * 0.85, h * 0.40, -h * 0.75, h * 0.05, -h * 0.65])
    .fill(p.fill)
    .stroke({ color: p.outline, width: SW });
  // Sun glow above peak
  g.circle(-h * 0.45, -h * 0.65, h * 0.18)
    .fill({ color: p.warm ?? p.highlight, alpha: 0.65 });
  // Stars / sparkles
  g.circle(h * 0.55, -h * 0.65, h * 0.04).fill(p.highlight);
  g.circle(-h * 0.10, -h * 0.85, h * 0.03).fill(p.highlight);
}
