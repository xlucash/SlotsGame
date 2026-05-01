import { Graphics } from 'pixi.js';
import type { SymbolId } from '../../../core/math/symbols';

/**
 * A richer palette per symbol — base tone, dark shadow, light highlight, and
 * an accent for eyes/details. Drawing functions layer these for cel-shaded depth.
 */
interface ArtPalette {
  fill: number;       // base body tone
  shadow: number;     // darker shading
  highlight: number;  // glossy highlight
  outline: number;    // bold outline
  accent: number;     // eyes / metal / detail
  warm?: number;      // optional warm secondary (tongue, inner ear, etc.)
}

const PAL: Record<SymbolId, ArtPalette> = {
  // High pays — animal cartoons
  BEAR:   { fill: 0x4a2e1a, shadow: 0x261509, highlight: 0x6b4426, outline: 0x14080a, accent: 0xffe066, warm: 0xc97a4a },
  WOLF:   { fill: 0x6c7480, shadow: 0x383e48, highlight: 0xa8b0bc, outline: 0x0d0e10, accent: 0xffd24a, warm: 0xe6e8ec },
  BOAR:   { fill: 0x5a3e2a, shadow: 0x2c1d10, highlight: 0x7b5634, outline: 0x14090a, accent: 0xffd97a, warm: 0xc97a4a },
  DEER:   { fill: 0xb87038, shadow: 0x6b3f1e, highlight: 0xe9b878, outline: 0x2a1408, accent: 0x1a0e06, warm: 0xfff0d6 },
  RABBIT: { fill: 0xf2e6c2, shadow: 0xb8a87a, highlight: 0xfff8e3, outline: 0x2a2218, accent: 0xc94a3a, warm: 0xff9aa8 },
  // Low pays — hunter's tools
  BULLET: { fill: 0xe6b958, shadow: 0x8c6420, highlight: 0xfff0b8, outline: 0x261806, accent: 0xc99a3a },
  SHELL:  { fill: 0xd84432, shadow: 0x6e1810, highlight: 0xff7a5a, outline: 0x1a0606, accent: 0xe6b958, warm: 0xffd97a },
  KNIFE:  { fill: 0xd4d8de, shadow: 0x6a7280, highlight: 0xffffff, outline: 0x101012, accent: 0xb88a2c, warm: 0x6b3a18 },
  SCOPE:  { fill: 0x1c2422, shadow: 0x080c0c, highlight: 0x4a5a52, outline: 0x000000, accent: 0x4a8a78, warm: 0xb88a2c },
  // Specials
  WILD:    { fill: 0x2a1a10, shadow: 0x140a08, highlight: 0x4a3020, outline: 0x000000, accent: 0xffd97a, warm: 0xd9b58a },
  SCATTER: { fill: 0x3c2614, shadow: 0x1a0e08, highlight: 0x6c4828, outline: 0x000000, accent: 0xffd97a, warm: 0xc9543a },
};

export function paletteFor(id: SymbolId): ArtPalette { return PAL[id]; }

/**
 * Draw a symbol into `g`, centered at origin, fitting a square of `size`.
 * Each draw layers ground-shadow → body silhouettes → shading → highlights → eyes.
 */
export function drawSymbol(g: Graphics, id: SymbolId, size: number): void {
  g.clear();
  const half = size / 2;

  // Soft drop-shadow under every symbol grounds it in the cell.
  g.ellipse(0, half * 0.85, half * 0.7, half * 0.12).fill({ color: 0x000000, alpha: 0.35 });

  const pal = PAL[id];
  switch (id) {
    case 'BEAR':   drawBear(g, half, pal); break;
    case 'WOLF':   drawWolf(g, half, pal); break;
    case 'BOAR':   drawBoar(g, half, pal); break;
    case 'DEER':   drawDeer(g, half, pal); break;
    case 'RABBIT': drawRabbit(g, half, pal); break;
    case 'BULLET': drawBullet(g, half, pal); break;
    case 'SHELL':  drawShell(g, half, pal); break;
    case 'KNIFE':  drawKnife(g, half, pal); break;
    case 'SCOPE':  drawScope(g, half, pal); break;
    case 'WILD':   drawWild(g, half, pal); break;
    case 'SCATTER':drawScatter(g, half, pal); break;
  }
}

const SW = 3;        // outline weight (thick cartoon stroke)
const SW_INNER = 1.5; // inner detail stroke

/* ============================ HIGH PAYS ============================ */

function drawBear(g: Graphics, h: number, p: ArtPalette): void {
  // Ears (drawn first so head sits in front)
  g.circle(-h * 0.42, -h * 0.62, h * 0.18).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.circle( h * 0.42, -h * 0.62, h * 0.18).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.circle(-h * 0.42, -h * 0.62, h * 0.09).fill(p.warm!);
  g.circle( h * 0.42, -h * 0.62, h * 0.09).fill(p.warm!);

  // Head — slightly squashed circle
  g.ellipse(0, -h * 0.18, h * 0.62, h * 0.55).fill(p.fill).stroke({ color: p.outline, width: SW });

  // Cheek shadow on lower face for cel-shading
  g.ellipse(0, h * 0.05, h * 0.50, h * 0.32).fill({ color: p.shadow, alpha: 0.55 });

  // Snout (lighter muzzle area)
  g.ellipse(0, h * 0.05, h * 0.32, h * 0.22).fill(p.highlight).stroke({ color: p.outline, width: SW });

  // Eyes (gold)
  g.circle(-h * 0.20, -h * 0.25, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  g.circle( h * 0.20, -h * 0.25, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.18, -h * 0.22, h * 0.05).fill(p.outline);
  g.circle( h * 0.22, -h * 0.22, h * 0.05).fill(p.outline);
  // Catchlights
  g.circle(-h * 0.16, -h * 0.25, h * 0.018).fill(0xffffff);
  g.circle( h * 0.24, -h * 0.25, h * 0.018).fill(0xffffff);

  // Nose — big triangular black with white shine
  g.moveTo(-h * 0.10, -h * 0.05)
    .lineTo( h * 0.10, -h * 0.05)
    .lineTo( 0, h * 0.06)
    .closePath()
    .fill(p.outline);
  g.circle(-h * 0.05, -h * 0.02, h * 0.02).fill({ color: 0xffffff, alpha: 0.7 });

  // Mouth
  g.moveTo(-h * 0.04, h * 0.16)
    .lineTo(0, h * 0.22)
    .lineTo( h * 0.04, h * 0.16)
    .stroke({ color: p.outline, width: 2.5 });

  // Top-of-head highlight (glossy fur)
  g.ellipse(-h * 0.10, -h * 0.50, h * 0.20, h * 0.08).fill({ color: p.highlight, alpha: 0.6 });
}

function drawWolf(g: Graphics, h: number, p: ArtPalette): void {
  // Pointed wolf head silhouette
  g.poly([
    -h * 0.62, -h * 0.10,
    -h * 0.50, -h * 0.55,
    -h * 0.30, -h * 0.78,   // left ear tip
    -h * 0.10, -h * 0.45,
     h * 0.10, -h * 0.45,
     h * 0.30, -h * 0.78,   // right ear tip
     h * 0.50, -h * 0.55,
     h * 0.62, -h * 0.10,
     h * 0.40,  h * 0.20,
     h * 0.18,  h * 0.55,   // muzzle right
    -h * 0.18,  h * 0.55,
    -h * 0.40,  h * 0.20,
  ]).fill(p.fill).stroke({ color: p.outline, width: SW });

  // Lighter chest/face highlight (vertical mask down the center)
  g.poly([
    -h * 0.18, -h * 0.30,
     h * 0.18, -h * 0.30,
     h * 0.14,  h * 0.55,
    -h * 0.14,  h * 0.55,
  ]).fill({ color: p.highlight, alpha: 0.55 });

  // Inner ears
  g.poly([-h * 0.26, -h * 0.62, -h * 0.20, -h * 0.40, -h * 0.13, -h * 0.50]).fill(p.warm!);
  g.poly([ h * 0.26, -h * 0.62,  h * 0.20, -h * 0.40,  h * 0.13, -h * 0.50]).fill(p.warm!);

  // Snout dark stripe
  g.ellipse(0, h * 0.32, h * 0.22, h * 0.14).fill({ color: p.shadow, alpha: 0.7 });

  // Slanted predator eyes (yellow)
  g.poly([-h * 0.30, -h * 0.28, -h * 0.10, -h * 0.18, -h * 0.30, -h * 0.10])
    .fill(p.accent).stroke({ color: p.outline, width: SW_INNER });
  g.poly([ h * 0.30, -h * 0.28,  h * 0.10, -h * 0.18,  h * 0.30, -h * 0.10])
    .fill(p.accent).stroke({ color: p.outline, width: SW_INNER });
  // Pupils — vertical slits
  g.rect(-h * 0.21, -h * 0.22, h * 0.025, h * 0.06).fill(p.outline);
  g.rect( h * 0.18, -h * 0.22, h * 0.025, h * 0.06).fill(p.outline);

  // Nose
  g.poly([-h * 0.06, h * 0.10, h * 0.06, h * 0.10, 0, h * 0.20]).fill(p.outline);

  // Fangs
  g.poly([-h * 0.06, h * 0.42, -h * 0.10, h * 0.55,  -h * 0.02, h * 0.46])
    .fill(0xffffff).stroke({ color: p.outline, width: 1.2 });
  g.poly([ h * 0.06, h * 0.42,  h * 0.10, h * 0.55,   h * 0.02, h * 0.46])
    .fill(0xffffff).stroke({ color: p.outline, width: 1.2 });
}

function drawBoar(g: Graphics, h: number, p: ArtPalette): void {
  // Squat head with rounded blocky shape
  g.roundRect(-h * 0.70, -h * 0.50, h * 1.40, h * 1.0, h * 0.22)
    .fill(p.fill).stroke({ color: p.outline, width: SW });

  // Top forehead highlight
  g.roundRect(-h * 0.55, -h * 0.45, h * 1.10, h * 0.18, h * 0.12)
    .fill({ color: p.highlight, alpha: 0.55 });

  // Bristly fur lines on top of head
  for (let i = -3; i <= 3; i++) {
    const x = i * h * 0.10;
    g.moveTo(x, -h * 0.50).lineTo(x + h * 0.04, -h * 0.62).stroke({ color: p.outline, width: 2 });
  }

  // Ears
  g.poly([-h * 0.55, -h * 0.45, -h * 0.32, -h * 0.78, -h * 0.20, -h * 0.40])
    .fill(p.shadow).stroke({ color: p.outline, width: SW });
  g.poly([ h * 0.55, -h * 0.45,  h * 0.32, -h * 0.78,  h * 0.20, -h * 0.40])
    .fill(p.shadow).stroke({ color: p.outline, width: SW });

  // Snout disk (lighter)
  g.ellipse(0, h * 0.20, h * 0.46, h * 0.34).fill(p.highlight).stroke({ color: p.outline, width: SW });
  g.ellipse(0, h * 0.20, h * 0.46, h * 0.34).fill({ color: p.warm!, alpha: 0.35 });

  // Nostrils
  g.ellipse(-h * 0.13, h * 0.20, h * 0.05, h * 0.07).fill(p.outline);
  g.ellipse( h * 0.13, h * 0.20, h * 0.05, h * 0.07).fill(p.outline);

  // Curved tusks
  const tuskStroke = { color: p.outline, width: 2 };
  g.moveTo(-h * 0.20, h * 0.45)
    .quadraticCurveTo(-h * 0.34, h * 0.20, -h * 0.24, -h * 0.12)
    .lineTo(-h * 0.10, -h * 0.10)
    .quadraticCurveTo(-h * 0.20, h * 0.30, -h * 0.10, h * 0.45)
    .closePath().fill(p.warm ?? p.accent).stroke(tuskStroke);
  g.moveTo( h * 0.20, h * 0.45)
    .quadraticCurveTo( h * 0.34, h * 0.20,  h * 0.24, -h * 0.12)
    .lineTo( h * 0.10, -h * 0.10)
    .quadraticCurveTo( h * 0.20, h * 0.30,  h * 0.10, h * 0.45)
    .closePath().fill(p.warm ?? p.accent).stroke(tuskStroke);
  // Tusk highlights
  g.moveTo(-h * 0.18, h * 0.20).lineTo(-h * 0.16, -h * 0.05).stroke({ color: 0xffffff, width: 1.4, alpha: 0.6 });
  g.moveTo( h * 0.18, h * 0.20).lineTo( h * 0.16, -h * 0.05).stroke({ color: 0xffffff, width: 1.4, alpha: 0.6 });

  // Eyes — small, angry
  g.circle(-h * 0.30, -h * 0.18, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  g.circle( h * 0.30, -h * 0.18, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  // Angry pupils (bottom-aligned slit)
  g.circle(-h * 0.30, -h * 0.16, h * 0.04).fill(p.outline);
  g.circle( h * 0.30, -h * 0.16, h * 0.04).fill(p.outline);
  // Brow line
  g.moveTo(-h * 0.40, -h * 0.30).lineTo(-h * 0.18, -h * 0.22).stroke({ color: p.outline, width: 3 });
  g.moveTo( h * 0.40, -h * 0.30).lineTo( h * 0.18, -h * 0.22).stroke({ color: p.outline, width: 3 });
}

function drawDeer(g: Graphics, h: number, p: ArtPalette): void {
  // Antlers — drawn first, behind head
  const antler = (sign: 1 | -1) => {
    const x = sign * h * 0.20;
    const trunkStroke = { color: p.outline, width: 6, cap: 'round' as const, join: 'round' as const };
    const innerStroke = { color: p.fill, width: 2.8, cap: 'round' as const };
    const branches = [
      [x, -h * 0.42, x + sign * h * 0.18, -h * 0.85],
      [x + sign * h * 0.18, -h * 0.85, x + sign * h * 0.42, -h * 0.72],
      [x + sign * h * 0.18, -h * 0.85, x + sign * h * 0.30, -h * 1.00],
      [x + sign * h * 0.10, -h * 0.62, x + sign * h * 0.36, -h * 0.55],
      [x + sign * h * 0.05, -h * 0.74, x + sign * h * 0.20, -h * 0.92],
    ];
    for (const [x1, y1, x2, y2] of branches) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke(trunkStroke);
    }
    for (const [x1, y1, x2, y2] of branches) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke(innerStroke);
    }
  };
  antler(-1); antler(1);

  // Head — long oval
  g.ellipse(0, h * 0.10, h * 0.42, h * 0.58).fill(p.fill).stroke({ color: p.outline, width: SW });
  // Lighter front highlight
  g.ellipse(-h * 0.10, -h * 0.05, h * 0.18, h * 0.32).fill({ color: p.highlight, alpha: 0.55 });

  // White muzzle/chin patch
  g.ellipse(0, h * 0.42, h * 0.24, h * 0.18).fill(p.warm!).stroke({ color: p.outline, width: SW_INNER });

  // Ears (drawn over head)
  g.ellipse(-h * 0.42, -h * 0.30, h * 0.13, h * 0.22).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.ellipse( h * 0.42, -h * 0.30, h * 0.13, h * 0.22).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.ellipse(-h * 0.42, -h * 0.30, h * 0.06, h * 0.14).fill(p.warm!);
  g.ellipse( h * 0.42, -h * 0.30, h * 0.06, h * 0.14).fill(p.warm!);

  // Eyes — gentle, big
  g.circle(-h * 0.18, -h * 0.05, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  g.circle( h * 0.18, -h * 0.05, h * 0.10).fill(0xffffff).stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.18, -h * 0.04, h * 0.06).fill(p.outline);
  g.circle( h * 0.18, -h * 0.04, h * 0.06).fill(p.outline);
  g.circle(-h * 0.15, -h * 0.06, h * 0.022).fill(0xffffff);
  g.circle( h * 0.21, -h * 0.06, h * 0.022).fill(0xffffff);
  // Long lashes
  g.moveTo(-h * 0.27, -h * 0.12).lineTo(-h * 0.32, -h * 0.16).stroke({ color: p.outline, width: 1.5 });
  g.moveTo( h * 0.27, -h * 0.12).lineTo( h * 0.32, -h * 0.16).stroke({ color: p.outline, width: 1.5 });

  // Nose
  g.ellipse(0, h * 0.32, h * 0.07, h * 0.05).fill(p.outline);
  g.circle(-h * 0.018, h * 0.305, h * 0.012).fill({ color: 0xffffff, alpha: 0.7 });
}

function drawRabbit(g: Graphics, h: number, p: ArtPalette): void {
  // Long ears
  g.ellipse(-h * 0.22, -h * 0.55, h * 0.14, h * 0.42).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.ellipse( h * 0.22, -h * 0.55, h * 0.14, h * 0.42).fill(p.fill).stroke({ color: p.outline, width: SW });
  g.ellipse(-h * 0.22, -h * 0.55, h * 0.06, h * 0.30).fill(p.warm!);
  g.ellipse( h * 0.22, -h * 0.55, h * 0.06, h * 0.30).fill(p.warm!);

  // Head — round and chubby
  g.circle(0, h * 0.10, h * 0.50).fill(p.fill).stroke({ color: p.outline, width: SW });

  // Cheek shadow
  g.ellipse(0, h * 0.32, h * 0.46, h * 0.18).fill({ color: p.shadow, alpha: 0.30 });

  // Pink cheek dots
  g.circle(-h * 0.28, h * 0.28, h * 0.10).fill({ color: p.warm!, alpha: 0.85 });
  g.circle( h * 0.28, h * 0.28, h * 0.10).fill({ color: p.warm!, alpha: 0.85 });

  // Top-head highlight
  g.ellipse(-h * 0.10, -h * 0.18, h * 0.24, h * 0.10).fill({ color: p.highlight, alpha: 0.7 });

  // Eyes — big and shiny
  g.circle(-h * 0.18, -h * 0.02, h * 0.10).fill(p.outline);
  g.circle( h * 0.18, -h * 0.02, h * 0.10).fill(p.outline);
  g.circle(-h * 0.15, -h * 0.05, h * 0.04).fill(0xffffff);
  g.circle( h * 0.21, -h * 0.05, h * 0.04).fill(0xffffff);
  g.circle(-h * 0.20, h * 0.01, h * 0.018).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle( h * 0.16, h * 0.01, h * 0.018).fill({ color: 0xffffff, alpha: 0.6 });

  // Pink heart-shaped nose
  g.moveTo(0, h * 0.22)
    .quadraticCurveTo(-h * 0.08, h * 0.10, -h * 0.05, h * 0.16)
    .quadraticCurveTo(0, h * 0.20, h * 0.05, h * 0.16)
    .quadraticCurveTo( h * 0.08, h * 0.10, 0, h * 0.22)
    .closePath().fill(p.accent);

  // Whiskers
  for (const sign of [-1, 1]) {
    g.moveTo(sign * h * 0.10, h * 0.30).lineTo(sign * h * 0.55, h * 0.22).stroke({ color: p.outline, width: 1.4 });
    g.moveTo(sign * h * 0.10, h * 0.34).lineTo(sign * h * 0.55, h * 0.34).stroke({ color: p.outline, width: 1.4 });
    g.moveTo(sign * h * 0.10, h * 0.38).lineTo(sign * h * 0.55, h * 0.46).stroke({ color: p.outline, width: 1.4 });
  }

  // Buck teeth
  g.roundRect(-h * 0.06, h * 0.32, h * 0.12, h * 0.14, 2)
    .fill(0xffffff).stroke({ color: p.outline, width: 1.4 });
  g.moveTo(0, h * 0.32).lineTo(0, h * 0.46).stroke({ color: p.outline, width: 1 });
}

/* ============================ LOW PAYS ============================ */

function drawBullet(g: Graphics, h: number, p: ArtPalette): void {
  // Brass casing
  g.roundRect(-h * 0.34, -h * 0.10, h * 0.68, h * 0.85, 4)
    .fill(p.fill).stroke({ color: p.outline, width: SW });

  // Side highlight strip (glossy column)
  g.roundRect(-h * 0.22, -h * 0.05, h * 0.10, h * 0.78, 3)
    .fill({ color: p.highlight, alpha: 0.85 });

  // Side shadow strip
  g.roundRect( h * 0.10, -h * 0.05, h * 0.18, h * 0.78, 3)
    .fill({ color: p.shadow, alpha: 0.5 });

  // Pointed copper tip
  g.poly([
    -h * 0.34, -h * 0.10,
     0,        -h * 0.86,
     h * 0.34, -h * 0.10,
  ]).fill(p.accent).stroke({ color: p.outline, width: SW });

  // Tip highlight
  g.poly([
    -h * 0.18, -h * 0.10,
     0,        -h * 0.65,
    -h * 0.04, -h * 0.10,
  ]).fill({ color: p.highlight, alpha: 0.65 });

  // Casing rim
  g.roundRect(-h * 0.36, -h * 0.10, h * 0.72, h * 0.10, 2)
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  g.rect(-h * 0.36, -h * 0.04, h * 0.72, h * 0.025).fill({ color: p.shadow, alpha: 0.7 });

  // Primer at base
  g.circle(0, h * 0.66, h * 0.11).fill(p.shadow).stroke({ color: p.outline, width: SW });
  g.circle(-h * 0.03, h * 0.63, h * 0.04).fill({ color: p.highlight, alpha: 0.6 });

  // Bottom rim line
  g.moveTo(-h * 0.34, h * 0.74).lineTo( h * 0.34, h * 0.74)
    .stroke({ color: p.outline, width: 2 });
}

function drawShell(g: Graphics, h: number, p: ArtPalette): void {
  // Plastic body (red)
  g.roundRect(-h * 0.38, -h * 0.78, h * 0.76, h * 1.12, 6)
    .fill(p.fill).stroke({ color: p.outline, width: SW });

  // Body gloss highlight (left strip)
  g.roundRect(-h * 0.30, -h * 0.74, h * 0.10, h * 1.04, 4)
    .fill({ color: p.highlight, alpha: 0.55 });
  // Body shadow (right)
  g.roundRect( h * 0.16, -h * 0.74, h * 0.20, h * 1.04, 4)
    .fill({ color: p.shadow, alpha: 0.45 });

  // Crimp star at top — five wedges
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const x0 = -h * 0.38 + t * h * 0.76;
    const x1 = x0 + h * 0.076;
    const xc = (x0 + x1) / 2;
    g.poly([x0, -h * 0.78, xc, -h * 0.92, x1, -h * 0.78])
      .fill(p.shadow);
  }
  g.moveTo(-h * 0.38, -h * 0.78).lineTo( h * 0.38, -h * 0.78).stroke({ color: p.outline, width: 2 });

  // Brass cap (bottom 40%)
  g.roundRect(-h * 0.38, h * 0.10, h * 0.76, h * 0.50, 4)
    .fill(p.accent).stroke({ color: p.outline, width: SW });
  // Brass highlight
  g.rect(-h * 0.30, h * 0.18, h * 0.10, h * 0.36).fill({ color: p.warm!, alpha: 0.7 });
  // Brass dark band
  g.rect(-h * 0.38, h * 0.32, h * 0.76, h * 0.05).fill(p.outline);

  // Primer
  g.circle(0, h * 0.46, h * 0.10).fill(p.shadow).stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.025, h * 0.43, h * 0.035).fill({ color: p.warm!, alpha: 0.7 });
}

function drawKnife(g: Graphics, h: number, p: ArtPalette): void {
  // Blade — curved bowie shape
  g.moveTo(-h * 0.10, h * 0.10)
    .lineTo( h * 0.10, h * 0.10)
    .lineTo( h * 0.18, -h * 0.30)
    .quadraticCurveTo(h * 0.10, -h * 0.85, 0, -h * 0.95)
    .quadraticCurveTo(-h * 0.16, -h * 0.85, -h * 0.18, -h * 0.30)
    .closePath()
    .fill(p.fill).stroke({ color: p.outline, width: SW });

  // Steel highlight (mirror shine on the flat)
  g.moveTo(-h * 0.04, -h * 0.30)
    .lineTo(-h * 0.10, -h * 0.78)
    .lineTo(-h * 0.06, h * 0.05)
    .closePath().fill({ color: p.highlight, alpha: 0.55 });

  // Edge shadow on right
  g.moveTo( h * 0.06, -h * 0.30)
    .lineTo( h * 0.18, -h * 0.30)
    .lineTo( h * 0.08, -h * 0.78)
    .closePath().fill({ color: p.shadow, alpha: 0.5 });

  // Sharpened edge line
  g.moveTo(-h * 0.13, -h * 0.55).lineTo(-h * 0.04, -h * 0.85).stroke({ color: 0xffffff, width: 1.6, alpha: 0.85 });

  // Brass guard with rounded ends
  g.roundRect(-h * 0.32, h * 0.08, h * 0.64, h * 0.12, 3)
    .fill(p.accent).stroke({ color: p.outline, width: SW });
  g.rect(-h * 0.30, h * 0.10, h * 0.60, h * 0.04).fill({ color: 0xffffff, alpha: 0.4 });

  // Wood handle
  g.roundRect(-h * 0.22, h * 0.20, h * 0.44, h * 0.66, 6)
    .fill(p.warm!).stroke({ color: p.outline, width: SW });

  // Wood grain
  for (let i = 0; i < 4; i++) {
    const y = h * 0.30 + i * h * 0.14;
    g.moveTo(-h * 0.18, y).quadraticCurveTo(0, y - h * 0.02, h * 0.18, y)
      .stroke({ color: p.outline, width: 1, alpha: 0.4 });
  }

  // Rivets
  g.circle(0, h * 0.36, h * 0.06).fill(p.accent).stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.015, h * 0.345, h * 0.018).fill({ color: 0xffffff, alpha: 0.7 });
  g.circle(0, h * 0.62, h * 0.06).fill(p.accent).stroke({ color: p.outline, width: SW_INNER });
  g.circle(-h * 0.015, h * 0.605, h * 0.018).fill({ color: 0xffffff, alpha: 0.7 });

  // Brass pommel
  g.roundRect(-h * 0.18, h * 0.82, h * 0.36, h * 0.10, 4)
    .fill(p.accent).stroke({ color: p.outline, width: SW });
}

function drawScope(g: Graphics, h: number, p: ArtPalette): void {
  // Main tube
  g.roundRect(-h * 0.85, -h * 0.22, h * 1.30, h * 0.44, h * 0.10)
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  // Top highlight band
  g.rect(-h * 0.80, -h * 0.18, h * 1.18, h * 0.07).fill({ color: p.highlight, alpha: 0.55 });
  // Bottom shadow band
  g.rect(-h * 0.80, h * 0.10, h * 1.18, h * 0.10).fill({ color: 0x000000, alpha: 0.45 });

  // Front objective bell
  g.roundRect( h * 0.42, -h * 0.36, h * 0.32, h * 0.72, 6)
    .fill(p.shadow).stroke({ color: p.outline, width: SW });

  // Lens with crosshair
  g.circle(h * 0.60, 0, h * 0.27).fill(0x05130d).stroke({ color: p.warm ?? p.accent, width: SW });
  // Lens reflection arc
  g.moveTo(h * 0.45, -h * 0.18)
    .quadraticCurveTo(h * 0.75, -h * 0.20, h * 0.78, -h * 0.05)
    .stroke({ color: p.accent, width: 2.5, alpha: 0.7 });
  // Crosshair
  g.moveTo(h * 0.60 - h * 0.22, 0).lineTo(h * 0.60 + h * 0.22, 0).stroke({ color: p.accent, width: 1.5 });
  g.moveTo(h * 0.60, -h * 0.22).lineTo(h * 0.60, h * 0.22).stroke({ color: p.accent, width: 1.5 });
  g.circle(h * 0.60, 0, h * 0.05).fill(p.accent);

  // Eyepiece (left)
  g.roundRect(-h * 0.95, -h * 0.30, h * 0.20, h * 0.60, 5)
    .fill(p.shadow).stroke({ color: p.outline, width: SW });
  g.rect(-h * 0.92, -h * 0.26, h * 0.06, h * 0.52).fill({ color: p.highlight, alpha: 0.5 });

  // Top turret
  g.roundRect(-h * 0.20, -h * 0.50, h * 0.40, h * 0.26, 4)
    .fill(p.shadow).stroke({ color: p.outline, width: SW });
  g.rect(-h * 0.05, -h * 0.55, h * 0.10, h * 0.10).fill(p.warm ?? p.accent).stroke({ color: p.outline, width: SW_INNER });
}

/* ============================ SPECIALS ============================ */

function drawWild(g: Graphics, h: number, p: ArtPalette): void {
  // Hat brim — wide
  g.ellipse(0, -h * 0.28, h * 0.92, h * 0.18).fill(p.fill).stroke({ color: p.outline, width: SW });

  // Hat crown — leather
  g.roundRect(-h * 0.32, -h * 0.78, h * 0.64, h * 0.50, 8)
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  // Crown crease
  g.moveTo(0, -h * 0.74).lineTo(0, -h * 0.40).stroke({ color: p.outline, width: 2.5 });
  // Crown highlight
  g.roundRect(-h * 0.28, -h * 0.74, h * 0.12, h * 0.42, 4).fill({ color: p.highlight, alpha: 0.45 });
  // Hatband (dark)
  g.rect(-h * 0.32, -h * 0.40, h * 0.64, h * 0.08).fill(p.outline);
  // Brass hat buckle
  g.rect(-h * 0.05, -h * 0.40, h * 0.10, h * 0.08).fill(p.accent).stroke({ color: p.outline, width: 1.5 });

  // Face
  g.circle(0, h * 0.05, h * 0.32).fill(p.warm ?? p.fill).stroke({ color: p.outline, width: SW });
  // Face shadow under brim
  g.ellipse(0, -h * 0.10, h * 0.30, h * 0.10).fill({ color: 0x000000, alpha: 0.45 });

  // Beard — full and bushy
  g.moveTo(-h * 0.32, h * 0.05)
    .quadraticCurveTo(-h * 0.34, h * 0.45, -h * 0.18, h * 0.55)
    .quadraticCurveTo(0, h * 0.62, h * 0.18, h * 0.55)
    .quadraticCurveTo( h * 0.34, h * 0.45,  h * 0.32, h * 0.05)
    .quadraticCurveTo(0, h * 0.30, -h * 0.32, h * 0.05)
    .closePath()
    .fill(p.fill).stroke({ color: p.outline, width: SW });
  // Beard streaks
  for (const x of [-h * 0.18, -h * 0.06, h * 0.06, h * 0.18]) {
    g.moveTo(x, h * 0.20).lineTo(x + h * 0.02, h * 0.50).stroke({ color: p.outline, width: 1.4, alpha: 0.5 });
  }

  // Glowing gold eyes (wild = magical hunter)
  g.circle(-h * 0.13, -h * 0.05, h * 0.06).fill(p.accent);
  g.circle( h * 0.13, -h * 0.05, h * 0.06).fill(p.accent);
  g.circle(-h * 0.11, -h * 0.07, h * 0.018).fill(0xffffff);
  g.circle( h * 0.15, -h * 0.07, h * 0.018).fill(0xffffff);
  // Glow halo
  g.circle(-h * 0.13, -h * 0.05, h * 0.10).fill({ color: p.accent, alpha: 0.18 });
  g.circle( h * 0.13, -h * 0.05, h * 0.10).fill({ color: p.accent, alpha: 0.18 });

  // Brow
  g.moveTo(-h * 0.22, -h * 0.16).lineTo(-h * 0.05, -h * 0.10).stroke({ color: p.outline, width: 3 });
  g.moveTo( h * 0.22, -h * 0.16).lineTo( h * 0.05, -h * 0.10).stroke({ color: p.outline, width: 3 });

  // Nose — small triangle
  g.moveTo(-h * 0.04, -h * 0.02).lineTo(0, h * 0.10).lineTo( h * 0.04, -h * 0.02).stroke({ color: p.outline, width: 2 });

  // Shoulders
  g.moveTo(-h * 0.55, h * 0.95)
    .quadraticCurveTo(-h * 0.45, h * 0.55, 0, h * 0.55)
    .quadraticCurveTo( h * 0.45, h * 0.55,  h * 0.55, h * 0.95)
    .closePath().fill(p.shadow).stroke({ color: p.outline, width: SW });
}

function drawScatter(g: Graphics, h: number, p: ArtPalette): void {
  // Brass medallion behind the guns
  g.circle(0, 0, h * 0.95).fill(p.shadow).stroke({ color: p.accent, width: SW });
  g.circle(0, 0, h * 0.95).fill({ color: p.fill, alpha: 0.5 });
  g.circle(0, 0, h * 0.85).stroke({ color: p.accent, width: 1.5, alpha: 0.5 });

  // Crossed shotgun layers
  drawGun(g, p, -1);
  drawGun(g, p,  1);

  // Center medallion (over crossed barrels)
  g.circle(0, 0, h * 0.32).fill(p.shadow).stroke({ color: p.accent, width: SW });
  g.circle(0, 0, h * 0.26).stroke({ color: p.warm ?? p.accent, width: 1.5, alpha: 0.7 });

  // Crosshair in center
  g.moveTo(-h * 0.20, 0).lineTo(h * 0.20, 0).stroke({ color: p.accent, width: 2 });
  g.moveTo(0, -h * 0.20).lineTo(0, h * 0.20).stroke({ color: p.accent, width: 2 });
  g.circle(0, 0, h * 0.06).fill(p.warm ?? p.accent);
  g.circle(0, 0, h * 0.06).stroke({ color: p.outline, width: 1.4 });

  // Decorative star points around medallion
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const r1 = h * 0.78, r2 = h * 0.92;
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
      .lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
      .stroke({ color: p.accent, width: 2, alpha: 0.7 });
  }

  function drawGun(gg: Graphics, pal: ArtPalette, dir: -1 | 1): void {
    const ang = dir * Math.PI * 0.27;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const rot = (lx: number, ly: number) => ({ x: lx * cos - ly * sin, y: lx * sin + ly * cos });

    // Double barrel — two stacked dark cylinders
    for (const yOff of [-h * 0.05, h * 0.05]) {
      const corners = [
        [-h * 0.95, yOff - h * 0.04],
        [ h * 0.95, yOff - h * 0.04],
        [ h * 0.95, yOff + h * 0.04],
        [-h * 0.95, yOff + h * 0.04],
      ];
      const r = corners.map(([x, y]) => rot(x, y));
      gg.poly(r.flatMap((p) => [p.x, p.y]))
        .fill(0x14110d).stroke({ color: pal.outline, width: 2 });
    }

    // Barrel highlight (top)
    const hlCorners = [[-h * 0.85, -h * 0.10], [h * 0.85, -h * 0.10], [h * 0.85, -h * 0.07], [-h * 0.85, -h * 0.07]];
    const hl = hlCorners.map(([x, y]) => rot(x, y));
    gg.poly(hl.flatMap((p) => [p.x, p.y]))
      .fill({ color: 0x6c7480, alpha: 0.7 });

    // Wood stock
    const stockCorners = [
      [-h * 1.18, -h * 0.20],
      [-h * 0.55, -h * 0.20],
      [-h * 0.55,  h * 0.24],
      [-h * 1.05,  h * 0.34],
    ];
    const s = stockCorners.map(([x, y]) => rot(x, y));
    gg.poly(s.flatMap((p) => [p.x, p.y]))
      .fill(0x6b3a18).stroke({ color: pal.outline, width: SW });
    // Stock grain highlight
    const grainCorners = [
      [-h * 1.10, -h * 0.16],
      [-h * 0.65, -h * 0.16],
      [-h * 0.65, -h * 0.10],
      [-h * 1.05, -h * 0.10],
    ];
    const gr = grainCorners.map(([x, y]) => rot(x, y));
    gg.poly(gr.flatMap((p) => [p.x, p.y]))
      .fill({ color: 0xa66b3c, alpha: 0.6 });

    // Trigger guard
    const trigCenter = rot(-h * 0.50, h * 0.18);
    gg.circle(trigCenter.x, trigCenter.y, h * 0.06).stroke({ color: pal.outline, width: 2 });

    // Muzzle dark openings
    for (const yOff of [-h * 0.05, h * 0.05]) {
      const muz = rot(h * 0.95, yOff);
      gg.circle(muz.x, muz.y, h * 0.05).fill(0x000000).stroke({ color: pal.accent, width: 1.5 });
    }
  }
}
