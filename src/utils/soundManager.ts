// Simple sound manager using Web Audio API for chess game sounds
class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.3;

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

  private createTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 1
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime
    );
    oscillator.type = type;

    // Envelope for smooth sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume,
      now + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private createClickSound(frequency: number, volume = 1) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Chain: oscillator -> filter -> gain -> destination
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a filtered click sound (more realistic)
    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime
    );
    oscillator.type = 'triangle';

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
    filter.Q.setValueAtTime(1, this.audioContext.currentTime);

    // Very short, sharp envelope for click
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      this.masterVolume * volume,
      now + 0.002
    );
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  async playMoveSound() {
    await this.initializeAudio();
    // Realistic piece placement sound - like wood on wood
    this.createClickSound(220, 0.8);
  }

  async playCaptureSound() {
    await this.initializeAudio();
    // Slightly sharper sound for captures - piece being taken
    this.createClickSound(180, 0.9);
    // Add a subtle second click for the capturing piece
    setTimeout(() => {
      this.createClickSound(240, 0.6);
    }, 40);
  }

  async playCheckSound() {
    await this.initializeAudio();
    // Distinctive but not jarring check sound
    this.createTone(440, 0.15, 'sine', 0.4); // A4 note
    setTimeout(() => {
      this.createTone(554, 0.1, 'sine', 0.3); // C#5 note
    }, 80);
  }

  async playPromotionSound() {
    await this.initializeAudio();
    // Pleasant ascending melody for promotion
    this.createTone(440, 0.12, 'sine', 0.3); // A4
    setTimeout(() => {
      this.createTone(523, 0.12, 'sine', 0.3); // C5
    }, 60);
    setTimeout(() => {
      this.createTone(659, 0.15, 'sine', 0.4); // E5
    }, 120);
  }

  async playPreMoveSound() {
    await this.initializeAudio();
    // Subtle, muted sound for pre-moves - different from regular moves
    this.createClickSound(160, 0.5);
  }

  async playErrorSound() {
    await this.initializeAudio();
    // Brief, low error tone - indicates invalid move
    this.createTone(200, 0.2, 'triangle', 0.4);
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}

export const soundManager = new SoundManager();
