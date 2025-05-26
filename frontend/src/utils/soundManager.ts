// Simple sound manager using Web Audio API for chess game sounds
class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.3;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 1) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    // Envelope for smooth sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  async playMoveSound() {
    await this.initializeAudio();
    // Gentle click sound - quick high to low frequency sweep
    this.createTone(800, 0.1, 'square', 0.5);
  }

  async playCaptureSound() {
    await this.initializeAudio();
    // More prominent sound for captures - chord-like effect
    this.createTone(600, 0.15, 'sawtooth', 0.6);
    setTimeout(() => {
      this.createTone(400, 0.1, 'triangle', 0.4);
    }, 50);
  }

  async playCheckSound() {
    await this.initializeAudio();
    // Alert sound for check - ascending tone
    this.createTone(880, 0.2, 'sine', 0.7);
    setTimeout(() => {
      this.createTone(1100, 0.15, 'sine', 0.5);
    }, 100);
  }

  async playPromotionSound() {
    await this.initializeAudio();
    // Triumphant sound for pawn promotion
    this.createTone(523, 0.15, 'sine', 0.6); // C5
    setTimeout(() => {
      this.createTone(659, 0.15, 'sine', 0.6); // E5
    }, 80);
    setTimeout(() => {
      this.createTone(784, 0.2, 'sine', 0.7); // G5
    }, 160);
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}

export const soundManager = new SoundManager();