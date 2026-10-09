// Web Audio API Synthesizer für Stack 3D
// Erzeugt harmonisch ansteigende Tonleitern (Pentatonik) wie in Monument Valley / Stack

export class StackAudioController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  // C-Dur Pentatonik Frequenzen (C, D, E, G, A, C...)
  private pentatonicScale: number[] = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00
  ];

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Erfolgreicher Stack (aufsteigender klarer Glocken-Ton)
  public playStackSound(comboLevel: number = 0, isPerfect: boolean = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const noteIndex = Math.min(comboLevel, this.pentatonicScale.length - 1);
    const freq = this.pentatonicScale[noteIndex];
    const now = this.ctx.currentTime;

    // Haupt-Oszillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isPerfect ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // Perkussive Lautstärkenhüllkurve (weicher Glöckchenklang)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isPerfect ? 0.35 : 0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isPerfect ? 0.6 : 0.35));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);

    // Bei "PERFEKT": Ein harmonischer Oberton (Oktave höher)
    if (isPerfect) {
      const overtone = this.ctx.createOscillator();
      const overGain = this.ctx.createGain();

      overtone.type = "sine";
      overtone.frequency.setValueAtTime(freq * 2, now);

      overGain.gain.setValueAtTime(0, now);
      overGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      overtone.connect(overGain);
      overGain.connect(this.ctx.destination);

      overtone.start(now);
      overtone.stop(now + 0.55);
    }
  }

  // Schnitt-Sound: Abgetrennter Teil fällt (dumpfes Holzkratzen / Sub-Impuls)
  public playSliceSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Game Over Sound: Absturz ins Nichts
  public playGameOverSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.7);
  }
}
