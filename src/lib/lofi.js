// Web Audio procedural Lo-Fi chill beats + campfire crackle (no external audio files required).

class LofiEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.resting = false;
    this.night = false;
    this.timer = null;
    this.master = null;
    this.crackleGain = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);

    // Continuous vinyl dust / campfire crackle layer
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const r = Math.random();
      data[i] = r > 0.996 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.03;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.9;

    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.value = 0.05;

    noise.connect(bp);
    bp.connect(this.crackleGain);
    this.crackleGain.connect(this.master);
    noise.start();
  }

  setMood({ resting = false, night = false } = {}) {
    this.resting = resting;
    this.night = night;
    if (this.crackleGain && this.ctx) {
      // Louder warm fire crackle when resting at a camp
      this.crackleGain.gain.setTargetAtTime(resting ? 0.16 : 0.045, this.ctx.currentTime, 0.3);
    }
  }

  playChord(freqs, duration = 2.1) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.night ? 780 : 1050;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.08, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    filter.connect(env);
    env.connect(this.master);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      // subtle tape wow/flutter
      osc.detune.setValueAtTime(Math.sin(now + idx) * 6, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  playKick() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSnare() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.09;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(now);
  }

  tick() {
    if (!this.playing || !this.ctx) return;
    // Jazz lo-fi progression: Dm9 -> G13 -> Cmaj9 -> A7b13
    const chords = [
      [146.83, 261.63, 329.63, 349.23, 440.0],
      [196.0, 246.94, 329.63, 349.23, 440.0],
      [130.81, 246.94, 293.66, 329.63, 392.0],
      [110.0, 220.0, 277.18, 329.63, 392.0],
    ];
    const barStep = this.step % 8;
    const chordIdx = Math.floor(this.step / 8) % chords.length;

    if (barStep === 0) {
      this.playChord(chords[chordIdx], 2.5);
    }
    if (!this.resting) {
      if (barStep === 0 || barStep === 5) this.playKick();
      if (barStep === 2 || barStep === 6) this.playSnare();
    }
    this.step++;
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playing) {
      this.playing = false;
      clearInterval(this.timer);
      this.timer = null;
      this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      return false;
    } else {
      this.playing = true;
      this.step = 0;
      this.master.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.2);
      this.tick();
      this.timer = setInterval(() => this.tick(), 330);
      return true;
    }
  }
}

export const lofi = new LofiEngine();
