// Web Audio API Synthesizer für Stack 3D mit sphärischem Echo/Reverb
// Erzeugt harmonisch ansteigende Glocken-Tonleitern (Pentatonik) mit Raumklang

export class StackAudioController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private delayNode: DelayNode | null = null;
  private feedbackNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // C-Dur Pentatonik Frequenzen über 3 Oktaven
  private pentatonicScale: number[] = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
    2093.00, 2349.32, 2637.02
  ];

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupEchoBus();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Sphärischer Stereo-Echo/Reverb-Bus
  private setupEchoBus() {
    if (!this.ctx) return;
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.22; // 220ms Echorhythmus

    this.feedbackNode = this.ctx.createGain();
    this.feedbackNode.gain.value = 0.38; // Weiches Ausklingen

    // Tiefpassfilter dämpft Höhen im Echo für natürlichen Raumklang
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = "lowpass";
    this.filterNode.frequency.value = 2200;

    this.delayNode.connect(this.filterNode);
    this.filterNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.filterNode.connect(this.ctx.destination);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Erfolgreicher Stack mit aufsteigender Pentatonik + harmonischem Akkord bei Perfekt
  public playStackSound(comboLevel: number = 0, isPerfect: boolean = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const noteIndex = Math.min(comboLevel, this.pentatonicScale.length - 1);
    const freq = this.pentatonicScale[noteIndex];

    // 1. Haupt-Glockenton
    this.triggerChime(freq, isPerfect ? 0.42 : 0.26, 0.45, isPerfect ? "sine" : "triangle");

    // 2. Bei PERFEKT: Harmonische Obertöne (Quinte + Oktave) für himmlischen Akkord
    if (isPerfect) {
      // Höhere Oktave
      this.triggerChime(freq * 2, 0.22, 0.55, "sine");

      // Zusätzlicher subtiler Kristall-Klick
      if (comboLevel >= 3) {
        this.triggerChime(freq * 3, 0.12, 0.35, "sine");
      }
    }
  }

  private triggerChime(freq: number, peakGain: number, duration: number, type: OscillatorType) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Organische Glocken-Hüllkurve
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Echo-Effekt einspeisen
    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // Schnitt-Sound: Abgetrennter Teil fällt (Sub-Bass Impuls + Rumpeln)
  public playSliceSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Game Over Sound: Dramatischer Absturz mit Rauschen
  public playGameOverSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.7);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(now);
    osc.stop(now + 0.8);
  }
}
