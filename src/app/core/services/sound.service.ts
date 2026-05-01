import { Injectable, signal } from '@angular/core';

export type SoundName =
  | 'spin'         // spin button pressed
  | 'drop'         // initial reel drop / new symbols falling
  | 'cascade'      // tumble step (subsequent wins inside a spin)
  | 'winSmall'     // cluster win, low value
  | 'winMedium'    // cluster win, mid value
  | 'winBig'       // cluster win, high value
  | 'scatterChime' // scatter glow / FS trigger
  | 'fsAward'      // +N FREE SPINS popup
  | 'multUp'       // multiplier increment in FS
  | 'fanfareBig'   // BIG WIN celebration
  | 'fanfareMega'  // MEGA WIN
  | 'fanfareSuper' // SUPER WIN
  | 'fanfareEpic'  // EPIC WIN
  | 'fanfareLegend' // LEGENDARY WIN
  | 'wheelTick'    // each slice as it passes pointer (quick)
  | 'wheelLand'    // final thunk
  | 'gunshot'      // bonus-intro firing
  | 'uiClick'      // generic button press
  | 'modalOpen'    // overlay reveal
  | 'modalClose';  // overlay dismissed

/**
 * Procedurally-synthesized sound effects via Web Audio API. No audio assets
 * required — every sound is generated on demand. Master gain + mute toggle
 * are exposed via signals so UI can bind to them.
 *
 * The AudioContext is lazily created on the first call to `play()` so the
 * browser doesn't reject a context started outside a user gesture.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private readonly _muted = signal(false);
  readonly muted = this._muted.asReadonly();
  private _volume = 0.5;

  toggleMute(): void {
    this._muted.update((m) => !m);
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this._muted() ? 0 : this._volume, this.ctx.currentTime);
    }
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx && !this._muted()) {
      this.master.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    }
  }

  /** Play a named sound. No-op if muted; lazily inits the AudioContext. */
  play(name: SoundName): void {
    if (this._muted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    GENERATORS[name]?.(ctx, this.master);
  }

  /**
   * Map a spin's totalWin × bet to a tier-appropriate fanfare/win sound.
   * Mirrors the BigWinCelebration tiers so audio matches visuals.
   */
  playWinTier(totalWin: number, bet: number): void {
    if (bet <= 0) return;
    const ratio = totalWin / bet;
    if (ratio >= 250) this.play('fanfareLegend');
    else if (ratio >= 100) this.play('fanfareEpic');
    else if (ratio >= 50)  this.play('fanfareSuper');
    else if (ratio >= 25)  this.play('fanfareMega');
    else if (ratio >= 10)  this.play('fanfareBig');
    else if (ratio >= 3)   this.play('winBig');
    else if (ratio >= 1)   this.play('winMedium');
    else if (ratio > 0)    this.play('winSmall');
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const Ctor = (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }
}

/* ============================================================
 *  Sound generators
 *
 *  Each function schedules oscillator/noise nodes, applies an
 *  amplitude envelope, and connects to the shared master gain.
 *  Nodes auto-disconnect after they stop.
 * ============================================================ */

type Gen = (ctx: AudioContext, dest: AudioNode) => void;

const GENERATORS: Record<SoundName, Gen> = {
  spin: (ctx, dest) => {
    // Quick rising chirp: sawtooth 220 → 720 Hz over 120ms.
    chirp(ctx, dest, { type: 'sawtooth', from: 220, to: 720, dur: 0.13, peak: 0.18 });
  },

  drop: (ctx, dest) => {
    // Soft thump: low sine with fast decay.
    chirp(ctx, dest, { type: 'sine', from: 140, to: 60, dur: 0.16, peak: 0.18 });
  },

  cascade: (ctx, dest) => {
    // Subsequent cascade — slightly higher than initial drop.
    chirp(ctx, dest, { type: 'sine', from: 220, to: 110, dur: 0.13, peak: 0.14 });
  },

  winSmall: (ctx, dest) => chime(ctx, dest, [659, 988], 0.35, 0.18),         // E5 + B5
  winMedium: (ctx, dest) => chime(ctx, dest, [523, 659, 988], 0.45, 0.20),   // C5 + E5 + B5
  winBig: (ctx, dest) => {
    chime(ctx, dest, [523, 659, 783, 1047], 0.6, 0.22);                     // Cmaj add9
    setTimeout(() => chime(ctx, dest, [659, 988], 0.4, 0.16), 120);
  },

  scatterChime: (ctx, dest) => {
    // Magical sweep — ascending thirds.
    arpeggio(ctx, dest, [392, 587, 784, 1047, 1318], 0.06, 0.18, 'sine');
  },

  fsAward: (ctx, dest) => {
    // Triumphant chord
    chord(ctx, dest, [392, 523, 659, 784], 0.7, 0.18);
    setTimeout(() => chord(ctx, dest, [523, 659, 784, 988], 0.6, 0.16), 200);
  },

  multUp: (ctx, dest) => {
    chirp(ctx, dest, { type: 'triangle', from: 880, to: 1320, dur: 0.18, peak: 0.18 });
  },

  fanfareBig: (ctx, dest) => fanfare(ctx, dest, [523, 659, 784], 0.8, 0.20),
  fanfareMega: (ctx, dest) => fanfare(ctx, dest, [523, 659, 784, 1047], 1.0, 0.22),
  fanfareSuper: (ctx, dest) => fanfare(ctx, dest, [392, 523, 659, 784, 988], 1.2, 0.24),
  fanfareEpic: (ctx, dest) => {
    fanfare(ctx, dest, [392, 523, 659, 784, 988], 1.4, 0.26);
    setTimeout(() => chord(ctx, dest, [784, 988, 1175, 1319], 0.8, 0.20), 600);
  },
  fanfareLegend: (ctx, dest) => {
    fanfare(ctx, dest, [261, 392, 523, 659, 784, 1047], 1.8, 0.28);
    setTimeout(() => chord(ctx, dest, [523, 659, 784, 1047, 1319], 1.2, 0.22), 700);
    setTimeout(() => chord(ctx, dest, [784, 988, 1175, 1568], 1.0, 0.20), 1300);
  },

  wheelTick: (ctx, dest) => {
    // Sharp short click — square pulse.
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.02);
    envelope(g, ctx, 0.001, 0.04, 0.12);
    osc.connect(g).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  },

  wheelLand: (ctx, dest) => {
    // Solid thunk + bell.
    chirp(ctx, dest, { type: 'sine', from: 280, to: 90, dur: 0.30, peak: 0.30 });
    setTimeout(() => chime(ctx, dest, [523, 659, 988], 0.6, 0.20), 80);
  },

  gunshot: (ctx, dest) => {
    // Noise burst with very fast attack and fast decay + low boom.
    const noise = noiseSource(ctx, 0.25);
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    envelope(noiseGain, ctx, 0.001, 0.02, 0.18, 0.45);
    noise.connect(noiseFilter).connect(noiseGain).connect(dest);
    noise.start();
    // Low boom underneath
    chirp(ctx, dest, { type: 'sine', from: 90, to: 30, dur: 0.30, peak: 0.40 });
  },

  uiClick: (ctx, dest) => {
    chirp(ctx, dest, { type: 'square', from: 1400, to: 800, dur: 0.06, peak: 0.10 });
  },

  modalOpen: (ctx, dest) => {
    chirp(ctx, dest, { type: 'sine', from: 440, to: 880, dur: 0.18, peak: 0.14 });
  },

  modalClose: (ctx, dest) => {
    chirp(ctx, dest, { type: 'sine', from: 660, to: 330, dur: 0.18, peak: 0.14 });
  },
};

/* ===================== Helpers ===================== */

interface ChirpOpts {
  type: OscillatorType;
  from: number;
  to: number;
  dur: number;
  peak: number; // peak gain
}

function chirp(ctx: AudioContext, dest: AudioNode, opts: ChirpOpts): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(0.0001, opts.to), ctx.currentTime + opts.dur);
  envelope(gain, ctx, 0.005, 0.04, opts.dur, opts.peak);
  osc.connect(gain).connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + opts.dur + 0.05);
}

/** Polyphonic chime — multi-frequency sine cluster with bell-like decay. */
function chime(ctx: AudioContext, dest: AudioNode, freqs: number[], dur: number, peak: number): void {
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    envelope(g, ctx, 0.005, 0.02, dur, peak / freqs.length);
    osc.connect(g).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }
}

/** Sustained chord — square + sine layers for a brassy, full sound. */
function chord(ctx: AudioContext, dest: AudioNode, freqs: number[], dur: number, peak: number): void {
  for (const f of freqs) {
    // sine fundamental
    const oscS = ctx.createOscillator();
    const gS = ctx.createGain();
    oscS.type = 'sine';
    oscS.frequency.value = f;
    envelope(gS, ctx, 0.02, 0.06, dur, peak / freqs.length);
    oscS.connect(gS).connect(dest);
    oscS.start();
    oscS.stop(ctx.currentTime + dur + 0.05);
    // triangle 4th-octave for body
    const oscT = ctx.createOscillator();
    const gT = ctx.createGain();
    oscT.type = 'triangle';
    oscT.frequency.value = f * 0.5;
    envelope(gT, ctx, 0.02, 0.10, dur, peak / freqs.length * 0.6);
    oscT.connect(gT).connect(dest);
    oscT.start();
    oscT.stop(ctx.currentTime + dur + 0.05);
  }
}

/** Quick rising arpeggio of single-osc notes spaced by `gap` seconds. */
function arpeggio(
  ctx: AudioContext, dest: AudioNode,
  freqs: number[], gap: number, peak: number, type: OscillatorType,
): void {
  freqs.forEach((f, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      envelope(g, ctx, 0.005, 0.04, 0.30, peak);
      osc.connect(g).connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }, i * gap * 1000);
  });
}

/** Fanfare — bottom-up arpeggio followed by a held chord. */
function fanfare(ctx: AudioContext, dest: AudioNode, freqs: number[], totalDur: number, peak: number): void {
  const stagger = totalDur / (freqs.length * 2);
  freqs.forEach((f, i) => {
    setTimeout(() => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc1.type = 'square'; osc1.frequency.value = f;
      osc2.type = 'sine';   osc2.frequency.value = f * 2;
      const remaining = totalDur - i * stagger;
      envelope(g, ctx, 0.008, 0.05, Math.max(0.4, remaining), peak / freqs.length);
      osc1.connect(g);
      osc2.connect(g);
      g.connect(dest);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + remaining + 0.1);
      osc2.stop(ctx.currentTime + remaining + 0.1);
    }, i * stagger * 1000);
  });
}

/** AHR envelope — attack, hold, release. Optionally a sustain plateau. */
function envelope(
  g: GainNode,
  ctx: AudioContext,
  attack: number,
  hold: number,
  release: number,
  peak = 0.2,
): void {
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

/** White-noise buffer source. Length in seconds. */
function noiseSource(ctx: AudioContext, lengthS: number): AudioBufferSourceNode {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * lengthS));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}
