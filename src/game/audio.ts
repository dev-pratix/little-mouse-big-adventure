// Procedural Web Audio effects: cheese collection chimes & mission victory fanfare.
// Fully self-contained — no audio asset downloads required, zero latency.

/**
 * Early Access build: all gameplay sound is disabled for this release.
 * Preserved for future releases without deleting existing audio implementation.
 */
export const AUDIO_ENABLED = false;

class SoundFX {
  private ctx: AudioContext | null = null;
  private muted = false;
  private listeners = new Set<() => void>();

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.listeners.forEach((l) => l());
    return this.muted;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getContext(): AudioContext | null {
    if (!AUDIO_ENABLED) return null;
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Cheerful upward chime when picking up a cheese wedge.
   * Pitches rise progressively with each cheese collected (1, 2, 3).
   */
  playCheesePickup(count: number) {
    if (!AUDIO_ENABLED || this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreqs =
      count === 1
        ? [523.25, 659.25, 783.99] // C5, E5, G5
        : count === 2
        ? [659.25, 783.99, 987.77] // E5, G5, B5
        : [783.99, 987.77, 1318.51]; // G5, B5, E6 (climax)

    baseFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  }

  /**
   * Triumphant victory fanfare when completing the heist at the mouse burrow.
   */
  playVictoryFanfare() {
    if (!AUDIO_ENABLED || this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const melody: [number, number, number][] = [
      // [freq, startOffset, duration]
      [523.25, 0.0, 0.15],   // C5
      [659.25, 0.16, 0.15],  // E5
      [783.99, 0.32, 0.18],  // G5
      [1046.5, 0.52, 0.45],  // C6
    ];

    for (const [freq, offset, dur] of melody) {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + offset);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 1.002, now + offset); // subtle chorus detune

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc2.start(now + offset);
      osc.stop(now + offset + dur + 0.05);
      osc2.stop(now + offset + dur + 0.05);
    }
  }
}

export const soundFX = new SoundFX();
