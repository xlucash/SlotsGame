import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Animated number that smoothly ticks toward `value` when it changes.
 * Renders the number with the host's font (so the parent controls styling).
 */
@Component({
  selector: 'app-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="num">{{ formatted() }}</span>`,
  styles: [`
    :host { display: inline; }
  `],
})
export class CounterComponent {
  readonly value = input.required<number>();
  readonly fractionDigits = input<number>(2);
  readonly duration = input<number>(0.6);

  /** Fires when the tween reaches its target value (whether by ease-out or skip()). */
  readonly done = output<void>();

  private readonly current = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  private rafId: number | null = null;
  private formatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  /**
   * Clamp the displayed value to ≥ 0. Float arithmetic in the engine
   * (cluster payouts × multipliers summed across cascades) can land on a
   * tiny negative epsilon that Intl.NumberFormat renders as "-0,00".
   * The counter only ever displays winnings/balances, never debts, so
   * clamping here is safe and avoids that visual glitch.
   */
  protected readonly formatted = computed(() =>
    this.formatter.format(Math.max(0, this.current())),
  );

  constructor() {
    effect(() => {
      const fd = this.fractionDigits();
      this.formatter = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: fd,
        maximumFractionDigits: fd,
      });
    });
    effect(() => {
      const target = this.value();
      this.tweenTo(target);
    });
    this.destroyRef.onDestroy(() => {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    });
  }

  /** Cancel the in-flight tween and snap to the final value. Emits `done`. */
  skip(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.current.set(this.value());
    this.done.emit();
  }

  private tweenTo(target: number): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const start = this.current();
    if (Math.abs(target - start) < 0.01) {
      this.current.set(target);
      this.rafId = null;
      this.done.emit();
      return;
    }
    // duration <= 0 → caller wants the value to snap (no animation).
    if (this.duration() <= 0) {
      this.current.set(target);
      this.rafId = null;
      this.done.emit();
      return;
    }
    const startedAt = performance.now();
    const ms = Math.max(80, this.duration() * 1000);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / ms);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      this.current.set(start + (target - start) * eased);
      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
        this.done.emit();
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
