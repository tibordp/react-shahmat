// Professional chess sound manager using Web Audio API
// Designed to create realistic, cohesive sounds that evoke a quality wooden chess set
class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.4;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private async initializeAudio() {
    if (!this.audioContext) return;

    // Resume audio context if suspended (required by browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Create a dedicated reverb convolver for each sound to avoid conflicts
  private createReverb() {
    if (!this.audioContext) return null;

    const convolver = this.audioContext.createConvolver();

    // Create impulse response for a subtle room reverb
    const length = this.audioContext.sampleRate * 0.3; // 300ms reverb
    const impulse = this.audioContext.createBuffer(
      2,
      length,
      this.audioContext.sampleRate
    );

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 1.2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // Create realistic wooden piece sound with multiple harmonics and resonance
  private createWoodSound(
    baseFreq: number,
    duration: number,
    volume = 1,
    sharpness = 1,
    withReverb = true
  ) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const compressor = this.audioContext.createDynamicsCompressor();

    // Create multiple oscillators for realistic wood resonance
    const oscillators: OscillatorNode[] = [];
    const harmonics = [1, 2.1, 3.8, 5.2]; // Realistic wood resonance frequencies
    const harmonicVolumes = [1, 0.4, 0.2, 0.1];

    harmonics.forEach((harmonic, index) => {
      const osc = this.audioContext!.createOscillator();
      const oscGain = this.audioContext!.createGain();

      osc.frequency.setValueAtTime(baseFreq * harmonic, now);
      osc.type = index === 0 ? 'triangle' : 'sine';

      // Different decay rates for different harmonics
      const harmonicDuration = duration * (1 - index * 0.15);
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(
        harmonicVolumes[index] * 0.3,
        now + 0.001
      );
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + harmonicDuration);

      osc.connect(oscGain);
      oscGain.connect(filter);
      oscillators.push(osc);

      osc.start(now);
      osc.stop(now + harmonicDuration);

      // Clean up oscillator and gain node after sound finishes
      osc.addEventListener('ended', () => {
        try {
          osc.disconnect();
          oscGain.disconnect();
        } catch (e) {
          // Node may already be disconnected
        }
      });
    });

    // High-quality filtering for wood-like timbre
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 + sharpness * 400, now);
    filter.Q.setValueAtTime(0.8, now);

    // Compression for professional sound
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(3, now);
    compressor.ratio.setValueAtTime(3, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.1, now);

    // Audio chain with optional reverb
    filter.connect(compressor);
    compressor.connect(gainNode);

    if (withReverb) {
      const convolver = this.createReverb();
      if (convolver) {
        const dryGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();

        dryGain.gain.setValueAtTime(0.8, now);
        wetGain.gain.setValueAtTime(0.2, now);

        gainNode.connect(dryGain);
        gainNode.connect(convolver);
        convolver.connect(wetGain);

        dryGain.connect(this.audioContext.destination);
        wetGain.connect(this.audioContext.destination);

        // Clean up reverb nodes after sound finishes
        setTimeout(
          () => {
            try {
              convolver.disconnect();
              dryGain.disconnect();
              wetGain.disconnect();
            } catch (e) {
              // Nodes may already be disconnected
            }
          },
          (duration + 0.1) * 1000
        );
      } else {
        gainNode.connect(this.audioContext.destination);
      }
    } else {
      gainNode.connect(this.audioContext.destination);
    }

    // Master volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume,
      now + 0.005
    );
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Clean up main audio nodes after sound finishes
    setTimeout(
      () => {
        try {
          filter.disconnect();
          compressor.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Nodes may already be disconnected
        }
      },
      (duration + 0.1) * 1000
    );
  }

  // Create sharp click sound for piece placement/capture
  private createClickSound(
    baseFreq: number,
    duration: number,
    volume = 1,
    sharpness = 1
  ) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Create noise for the click attack
    const bufferSize = this.audioContext.sampleRate * 0.05; // 50ms of noise
    const noiseBuffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3 * volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noise.connect(noiseGain);
    noiseGain.connect(filter);

    // Add a brief tonal component for pitch definition
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.type = 'triangle';

    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.4 * volume, now + 0.001);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.3);

    osc.connect(oscGain);
    oscGain.connect(filter);

    // Sharp filtering for crisp attack
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200 + sharpness * 300, now);
    filter.Q.setValueAtTime(0.5, now);

    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Sharp attack, quick decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume,
      now + 0.001
    );
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + 0.05);
    osc.start(now);
    osc.stop(now + duration);

    // Clean up
    noise.addEventListener('ended', () => {
      try {
        noise.disconnect();
        noiseGain.disconnect();
      } catch (e) {}
    });

    osc.addEventListener('ended', () => {
      try {
        osc.disconnect();
        oscGain.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (e) {}
    });
  }

  // Create musical tone with warm, classical sound
  private createMusicalTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 1,
    attack = 0.02,
    decay = 0.1
  ) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Warm, classical tone shaping
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 3, now);
    filter.Q.setValueAtTime(0.5, now);

    oscillator.connect(filter);
    filter.connect(gainNode);

    const convolver = this.createReverb();
    if (convolver) {
      const dryGain = this.audioContext.createGain();
      const wetGain = this.audioContext.createGain();

      dryGain.gain.setValueAtTime(0.7, now);
      wetGain.gain.setValueAtTime(0.3, now);

      gainNode.connect(dryGain);
      gainNode.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(this.audioContext.destination);
      wetGain.connect(this.audioContext.destination);

      // Clean up reverb nodes after sound finishes
      setTimeout(
        () => {
          try {
            convolver.disconnect();
            dryGain.disconnect();
            wetGain.disconnect();
          } catch (e) {
            // Nodes may already be disconnected
          }
        },
        (duration + 0.1) * 1000
      );
    } else {
      gainNode.connect(this.audioContext.destination);
    }

    // ADSR envelope for musical phrasing
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume,
      now + attack
    );
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume * 0.7,
      now + attack + decay
    );
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    // Clean up musical tone nodes after sound finishes
    oscillator.addEventListener('ended', () => {
      try {
        oscillator.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Nodes may already be disconnected
      }
    });
  }

  async playMoveSound() {
    await this.initializeAudio();
    // Sharp, crisp piece placement click
    this.createClickSound(800, 0.15, 0.8, 1.0);
  }

  async playCaptureSound() {
    await this.initializeAudio();
    // Double click: piece being taken + capturing piece placement
    this.createClickSound(1200, 0.12, 1.0, 2.0); // Sharp impact
    setTimeout(() => {
      this.createClickSound(600, 0.18, 0.7, 0.8); // Settling click
    }, 80);
  }

  async playCheckSound() {
    await this.initializeAudio();
    // Elegant warning - ascending perfect fifth interval (classical and dignified)
    this.createMusicalTone(349.23, 0.4, 'sine', 0.6, 0.03, 0.05); // F4
    setTimeout(() => {
      this.createMusicalTone(523.25, 0.5, 'sine', 0.7, 0.02, 0.08); // C5
    }, 200);
  }

  async playPromotionSound() {
    await this.initializeAudio();
    // Triumphant major triad arpeggiation - celebration of achievement
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 - E4 - G4 - C5 (C major)
    const timings = [0, 150, 300, 450];
    const durations = [0.5, 0.5, 0.6, 0.8];

    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.createMusicalTone(freq, durations[index], 'sine', 0.6, 0.02, 0.1);
      }, timings[index]);
    });
  }

  async playPreMoveSound() {
    await this.initializeAudio();
    // Subtle placeholder sound - softer wood tone for tentative moves
    this.createWoodSound(140, 0.2, 0.5, 0.6, false);
  }

  async playErrorSound() {
    await this.initializeAudio();
    // Gentle but clear negative feedback - minor second dissonance resolving down
    this.createMusicalTone(440, 0.25, 'sine', 0.4, 0.01, 0.05); // A4
    setTimeout(() => {
      this.createMusicalTone(392, 0.35, 'sine', 0.5, 0.01, 0.08); // G4
    }, 100);
  }

  async playCheckmateSound() {
    await this.initializeAudio();
    // Dramatic but dignified game conclusion - simple descending progression
    const chordProgression = [
      { freq: 440, duration: 0.5 }, // A4
      { freq: 349.23, duration: 0.5 }, // F4
      { freq: 293.66, duration: 0.6 }, // D4
      { freq: 220, duration: 0.8 }, // A3
    ];

    chordProgression.forEach((note, index) => {
      setTimeout(() => {
        this.createMusicalTone(
          note.freq,
          note.duration,
          'sine',
          0.6,
          0.05,
          0.15
        );
      }, index * 350);
    });
  }

  async playDrawSound() {
    await this.initializeAudio();
    // Peaceful resolution - stable perfect fifth held with gentle fade
    this.createMusicalTone(220, 1.5, 'sine', 0.6, 0.1, 0.3); // A3
    setTimeout(() => {
      this.createMusicalTone(329.63, 1.5, 'sine', 0.5, 0.1, 0.3); // E4
    }, 100);
  }

  async playGameStartSound() {
    await this.initializeAudio();
    // Optional: Welcoming upward major scale snippet
    const scale = [261.63, 293.66, 329.63]; // C4 - D4 - E4
    scale.forEach((freq, index) => {
      setTimeout(() => {
        this.createMusicalTone(freq, 0.25, 'sine', 0.4, 0.02, 0.05);
      }, index * 120);
    });
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}
// @ts-ignore
window.soundManager = new SoundManager(); // For global access in browser console
export const soundManager = new SoundManager();
