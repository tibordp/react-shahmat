const opusUrl = new URL('./sounds/chess_sfx.ogg', import.meta.url).href;
const mp3Url  = new URL('./sounds/chess_sfx.mp3',  import.meta.url).href;
const jsonUrl = new URL('./sounds/chess_sfx.json', import.meta.url).href;

type Spritemap = Record<string, { start: number; end: number; loop?: boolean }>;
type Cue = keyof Spritemap & string;

export class SoundManager {
  private ctx = new (window.AudioContext ||
                     (window as any).webkitAudioContext)();
  private buffer: AudioBuffer | null = null;
  private map: Spritemap = {};
  private masterVol = 0.8;
  private ready: Promise<void> | null = null;

  /* ------------------ public API (unchanged names) ---------------------- */

  setVolume(v: number) { this.masterVol = Math.max(0, Math.min(1, v)); }

  async playMove()      { await this.play('Move'); }
  async playPreMove()   { await this.play('PreMove'); }
  async playCapture()   { await this.play('Capture'); }
  async playCheck()     { await this.play('Check'); }
  async playPromotion() { await this.play('Promotion'); }
  async playError()     { await this.play('Error'); }
  async playCheckmate() { await this.play('Win'); }
  async playDraw()      { await this.play('Draw'); }
  async playGameStart() { await this.play('GameStart'); }

  /* ------------------ core logic --------------------------------------- */

  async ensureReady() {
    if (!this.ready) this.ready = this.loadAssets();
    await this.ready;
  }

  private async loadAssets() {
    // load map & audio in parallel
    const [mapJson, audioBuf] = await Promise.all([
      fetch(jsonUrl).then(r => r.json()),
      fetch(this.selectAudioUrl())
        .then(r => r.arrayBuffer())
        .then(ab => this.ctx.decodeAudioData(ab))
    ]);
    this.map = mapJson.spritemap;
    this.buffer = audioBuf;
  }

  private selectAudioUrl() {
    return new Audio().canPlayType('audio/ogg; codecs="opus"') ? opusUrl : mp3Url;
  }

  private async play(name: Cue) {
    await this.ensureReady();

    if (this.ctx.state === 'suspended') await this.ctx.resume();

    const cue = this.map[name];
    if (!cue) { console.warn(`Unknown sound '${name}'`); return; }

    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = this.masterVol;

    src.buffer = this.buffer!;
    src.connect(gain).connect(this.ctx.destination);

    const offset = cue.start
    const dur    = (cue.end - cue.start);

    src.start(0, offset, dur);
  }
}
export const soundManager =  new SoundManager();
