const defaultOpusUrl = new URL('./sounds/chess_sfx.ogg', import.meta.url).href;
const defaultMp3Url = new URL('./sounds/chess_sfx.mp3', import.meta.url).href;
const defaultJsonUrl = new URL('./sounds/chess_sfx.json', import.meta.url).href;

type Spritemap = Record<string, { start: number; end: number; loop?: boolean }>;
type Cue = keyof Spritemap & string;

export interface SoundManagerOptions {
  /** URL to OGG audio sprite */
  ogg?: string;
  /** URL to MP3 audio sprite (fallback) */
  mp3?: string;
  /** URL to JSON spritemap */
  map?: string;
}

export class SoundManager {
  private ctx = new (window.AudioContext ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Safari legacy API
    (window as any).webkitAudioContext)();
  private buffer: AudioBuffer | null = null;
  private spriteMap: Spritemap = {};
  private masterVol = 0.8;
  private ready: Promise<void> | null = null;
  private opusUrl: string;
  private mp3Url: string;
  private jsonUrl: string;

  constructor(options?: SoundManagerOptions) {
    this.opusUrl = options?.ogg ?? defaultOpusUrl;
    this.mp3Url = options?.mp3 ?? defaultMp3Url;
    this.jsonUrl = options?.map ?? defaultJsonUrl;
  }

  /* ------------------ public API ----------------------------------------- */

  setVolume(v: number) {
    this.masterVol = Math.max(0, Math.min(1, v));
  }

  async playMove() {
    await this.play('Move');
  }
  async playPreMove() {
    await this.play('PreMove');
  }
  async playCapture() {
    await this.play('Capture');
  }
  async playCheck() {
    await this.play('Check');
  }
  async playPromotion() {
    await this.play('Promotion');
  }
  async playError() {
    await this.play('Error');
  }
  async playCheckmate() {
    await this.play('Win');
  }
  async playDraw() {
    await this.play('Draw');
  }
  async playGameStart() {
    await this.play('GameStart');
  }

  /* ------------------ core logic ----------------------------------------- */

  async ensureReady() {
    if (!this.ready) this.ready = this.loadAssets();
    await this.ready;
  }

  private async loadAssets() {
    const [mapJson, audioBuf] = await Promise.all([
      fetch(this.jsonUrl).then(r => r.json()),
      fetch(this.selectAudioUrl())
        .then(r => r.arrayBuffer())
        .then(ab => this.ctx.decodeAudioData(ab)),
    ]);
    this.spriteMap = mapJson.spritemap;
    this.buffer = audioBuf;
  }

  private selectAudioUrl() {
    return new Audio().canPlayType('audio/ogg; codecs="opus"')
      ? this.opusUrl
      : this.mp3Url;
  }

  private async play(name: Cue) {
    await this.ensureReady();

    if (this.ctx.state === 'suspended') await this.ctx.resume();

    const cue = this.spriteMap[name];
    if (!cue) {
      console.warn(`Unknown sound '${name}'`);
      return;
    }

    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = this.masterVol;

    src.buffer = this.buffer!;
    src.connect(gain).connect(this.ctx.destination);

    const offset = cue.start;
    const dur = cue.end - cue.start;

    src.start(0, offset, dur);
  }
}

export const soundManager = new SoundManager();
