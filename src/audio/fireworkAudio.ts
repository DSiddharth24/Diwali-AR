/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API Sound Synthesizer for Diwali Fireworks
class FireworkAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.generateNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of stereo noise
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        // Pinkish-white noise distribution
        output[i] = Math.random() * 2 - 1;
      }
    }
    this.noiseBuffer = buffer;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // Trigger device haptic vibration if supported
  private triggerHaptic(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if vibration blocked
      }
    }
  }

  // Sizzling Fuse
  public playFuseBurn(durationSec: number = 2.0) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.noiseBuffer || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.setValueAtTime(0.18, now + durationSec - 0.2);
    gain.gain.linearRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + durationSec);
    this.triggerHaptic([30, 80, 40]);
  }

  // Continuous Anaar (Flower Pot) Fountain Sound
  public playAnaar(durationSec: number = 8.0, isSilver: boolean = false) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.noiseBuffer || !this.masterGain) return () => {};

    const now = this.ctx.currentTime;
    
    // Roaring base noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    // Resonant bandpass filter that sweeps and sizzles
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isSilver ? 4200 : 2200, now);
    filter.Q.setValueAtTime(2.5, now);

    // Subtle pitch rumble
    const rumbleOsc = this.ctx.createOscillator();
    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.setValueAtTime(80, now);

    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.06, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    // Eruption envelope
    gain.gain.linearRampToValueAtTime(0.35, now + 0.8);
    gain.gain.setValueAtTime(0.35, now + durationSec - 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    rumbleOsc.start(now);
    noise.stop(now + durationSec);
    rumbleOsc.stop(now + durationSec);

    // Stochastic sparkles popping inside the fountain
    const sparkleInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.playMicroSparkle(isSilver ? 5000 : 2800);
    }, 70);

    setTimeout(() => {
      clearInterval(sparkleInterval);
    }, durationSec * 1000);

    this.triggerHaptic([50, 40, 60, 40, 80]);

    return () => {
      clearInterval(sparkleInterval);
      try {
        noise.stop();
        rumbleOsc.stop();
      } catch {}
    };
  }

  // Micro crackle sparkle
  private playMicroSparkle(freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq + (Math.random() * 1200 - 600), now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Tactile drop impact sound
  public playDropSound() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
    this.triggerHaptic(25);
  }

  // Ground Chakkar / Wheel Whirring Doppler & Roaring Fire Sound
  public playChakkar(durationSec: number = 8.5) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.noiseBuffer || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // High-pitched screaming spinning oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 1.2); // Rapid spin up
    osc.frequency.setValueAtTime(820, now + durationSec - 2.0);
    osc.frequency.exponentialRampToValueAtTime(110, now + durationSec); // Spin down

    // Secondary sub-octave motor hum
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(410, now + 1.2);
    subOsc.frequency.exponentialRampToValueAtTime(60, now + durationSec);

    // LFO for Doppler spin rate
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5, now);
    lfo.frequency.linearRampToValueAtTime(28, now + 1.2);
    lfo.frequency.linearRampToValueAtTime(4, now + durationSec);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(160, now);
    lfo.connect(osc.frequency);

    // Roaring flame wind & jet hiss noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(2.2, now);

    // Roaring low-end fire rumble
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(450, now);

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0.04, now);
    mainGain.gain.linearRampToValueAtTime(0.45, now + 0.5); // Louder, more powerful
    mainGain.gain.setValueAtTime(0.45, now + durationSec - 1.2);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(mainGain);
    subOsc.connect(mainGain);
    noise.connect(filter);
    filter.connect(mainGain);
    noise.connect(rumbleFilter);
    rumbleFilter.connect(mainGain);
    mainGain.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    lfo.start(now);
    noise.start(now);

    osc.stop(now + durationSec);
    subOsc.stop(now + durationSec);
    lfo.stop(now + durationSec);
    noise.stop(now + durationSec);

    // Continuous high-velocity fire crackles during peak spin
    const crackleInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.playMicroSparkle(3200 + Math.random() * 2000);
    }, 45);

    setTimeout(() => {
      clearInterval(crackleInterval);
    }, durationSec * 1000);

    this.triggerHaptic([40, 50, 40, 50, 60, 40, 60]);
  }

  private distortionCurve: Float32Array<ArrayBuffer> | null = null;

  private getDistortionCurve(): Float32Array<ArrayBuffer> {
    if (!this.distortionCurve) {
      const k = 35;
      const n_samples = 2048;
      const buffer = new ArrayBuffer(n_samples * 4);
      const curve = new Float32Array(buffer);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      this.distortionCurve = curve;
    }
    return this.distortionCurve;
  }

  // Garland (Ladi) Rapid Roll-Crackling - Authentic Blasting Gunpowder Sound
  public playGarland(durationSec: number = 12.0, burstCount: number = 120) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Continuous Low-Frequency Gunpowder Combustion Rumble Bed
    if (this.noiseBuffer) {
      const rumbleNode = this.ctx.createBufferSource();
      rumbleNode.buffer = this.noiseBuffer;
      rumbleNode.loop = true;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(220, now);

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.02, now);
      rumbleGain.gain.linearRampToValueAtTime(0.28, now + 0.25);
      rumbleGain.gain.setValueAtTime(0.28, now + durationSec - 0.5);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      rumbleNode.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.masterGain);

      rumbleNode.start(now);
      rumbleNode.stop(now + durationSec);
    }

    const intervalMs = (durationSec * 1000) / burstCount;
    let currentBurst = 0;

    const timer = setInterval(() => {
      currentBurst++;
      if (currentBurst >= burstCount) {
        clearInterval(timer);
        // Colossal climax finale boom
        this.playBomb('atom', true);
        return;
      }

      // Blasting pop with alternating heavy shock thuds
      const isHeavyBlast = currentBurst % 4 === 0;
      this.playSingleLadiPop(isHeavyBlast);
    }, Math.max(20, intervalMs));

    this.triggerHaptic([40, 25, 45, 25, 55, 30, 70]);
  }

  // Single explosive cracker blast in garland string (Authentic Blasting Sound!)
  private playSingleLadiPop(isHeavyBlast: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Concussive Bass Blast Drop (Chest-thumping explosive impact)
    const blastOsc = this.ctx.createOscillator();
    blastOsc.type = 'sawtooth';
    const startFreq = isHeavyBlast ? 320 : 220 + Math.random() * 80;
    const endFreq = isHeavyBlast ? 32 : 42;
    blastOsc.frequency.setValueAtTime(startFreq, now);
    blastOsc.frequency.exponentialRampToValueAtTime(endFreq, now + (isHeavyBlast ? 0.08 : 0.05));

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(isHeavyBlast ? 0.75 : 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavyBlast ? 0.09 : 0.06));

    // 2. High-Energy Gunpowder Blast Noise Transient (Acoustic crack & air shock)
    let noiseGainNode: GainNode | null = null;
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      // Resonant bandpass filter focused on gunpowder explosive punch
      const blastFilter = this.ctx.createBiquadFilter();
      blastFilter.type = 'bandpass';
      blastFilter.frequency.setValueAtTime(isHeavyBlast ? 1100 : 1550 + (Math.random() * 500 - 250), now);
      blastFilter.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      blastFilter.Q.setValueAtTime(2.2, now);

      // Lowpass punch layer
      const lowFilter = this.ctx.createBiquadFilter();
      lowFilter.type = 'lowpass';
      lowFilter.frequency.setValueAtTime(450, now);

      noiseGainNode = this.ctx.createGain();
      const peakVol = isHeavyBlast ? 0.75 : 0.5 + Math.random() * 0.15;
      noiseGainNode.gain.setValueAtTime(peakVol, now);
      noiseGainNode.gain.exponentialRampToValueAtTime(0.001, now + (isHeavyBlast ? 0.1 : 0.06));

      noise.connect(blastFilter);
      blastFilter.connect(noiseGainNode);
      noise.connect(lowFilter);
      lowFilter.connect(noiseGainNode);

      noise.start(now);
      noise.stop(now + 0.11);
    }

    // 3. Distortion Waveshaper (Adds real acoustic clipping & explosive crunch)
    const waveshaper = this.ctx.createWaveShaper();
    waveshaper.curve = this.getDistortionCurve();
    waveshaper.oversample = '2x';

    // Output bus
    const blastBus = this.ctx.createGain();
    blastBus.gain.setValueAtTime(0.85, now);

    blastOsc.connect(oscGain);
    oscGain.connect(waveshaper);
    if (noiseGainNode) {
      noiseGainNode.connect(waveshaper);
    }
    waveshaper.connect(blastBus);
    blastBus.connect(this.masterGain);

    blastOsc.start(now);
    blastOsc.stop(now + (isHeavyBlast ? 0.1 : 0.07));
  }

  // Concussive Atom Bomb & Hydro Bomb Explosion
  public playBomb(type: 'atom' | 'hydro', isClimax: boolean = false) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Massive Sub-bass Sine drop (concussion)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    const subFreq = type === 'hydro' ? 120 : 160;
    const endFreq = type === 'hydro' ? 24 : 32;
    subOsc.frequency.setValueAtTime(subFreq, now);
    subOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.35);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(isClimax ? 0.9 : 0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'hydro' ? 0.8 : 0.6));

    // 2. High-energy explosion blast noise
    if (this.noiseBuffer) {
      const blastNoise = this.ctx.createBufferSource();
      blastNoise.buffer = this.noiseBuffer;

      const blastFilter = this.ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(type === 'hydro' ? 1200 : 2400, now);
      blastFilter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

      const blastGain = this.ctx.createGain();
      blastGain.gain.setValueAtTime(0.65, now);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      blastNoise.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(this.masterGain);

      blastNoise.start(now);
      blastNoise.stop(now + 0.6);
    }

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

    // Deep physical haptic concussion rumble
    this.triggerHaptic(type === 'hydro' ? [150, 40, 200] : [100, 30, 120]);
  }

  // Rocket Ascent Whistle & Aerial Detonation
  public playRocket(whistleDurationSec: number = 2.1) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Screaming whistling ascent
    const whistle = this.ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(450, now);
    whistle.frequency.exponentialRampToValueAtTime(2400, now + whistleDurationSec);

    // Vibrato on the whistle
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.setValueAtTime(35, now);
    const vibGain = this.ctx.createGain();
    vibGain.gain.setValueAtTime(80, now);
    vibrato.connect(vibGain);
    vibGain.connect(whistle.frequency);

    const whistleGain = this.ctx.createGain();
    whistleGain.gain.setValueAtTime(0.05, now);
    whistleGain.gain.linearRampToValueAtTime(0.24, now + whistleDurationSec * 0.7);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + whistleDurationSec);

    whistle.connect(whistleGain);
    whistleGain.connect(this.masterGain);

    whistle.start(now);
    vibrato.start(now);
    whistle.stop(now + whistleDurationSec);
    vibrato.stop(now + whistleDurationSec);

    // Aerial explosion after whistle
    setTimeout(() => {
      this.playAerialBurst('medium');
    }, whistleDurationSec * 1000);

    this.triggerHaptic([40, 60, 80]);
  }

  // Mortar Tube Launch Thump
  public playMortarThump() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Sky Burst Peony / Chrysanthemum Explosion
  public playAerialBurst(size: 'small' | 'medium' | 'grand' = 'medium') {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Distant thunderous boom
    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime( size === 'grand' ? 110 : 150, now);
    boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.4);

    const boomGain = this.ctx.createGain();
    const peak = size === 'grand' ? 0.7 : size === 'medium' ? 0.5 : 0.35;
    boomGain.gain.setValueAtTime(peak, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(now);
    boomOsc.stop(now + 1.0);

    // Cascading willow crackle trail
    if (size !== 'small') {
      const crackleCount = size === 'grand' ? 14 : 7;
      for (let i = 0; i < crackleCount; i++) {
        setTimeout(() => {
          this.playMicroSparkle(1800 + Math.random() * 1400);
        }, 150 + i * 70 + Math.random() * 60);
      }
    }

    this.triggerHaptic([70, 30, 90]);
  }

  // Interactive Touch Sparkler (Phuljhadi) crackle
  public playSparklerSpark() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.playMicroSparkle(3600);
  }
}

export const fireworkAudio = new FireworkAudioSynthesizer();
