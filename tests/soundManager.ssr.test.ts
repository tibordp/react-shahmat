// @vitest-environment node
import { describe, it, expect } from 'vitest';

/**
 * The package entry re-exports soundManager, so importing this module must be
 * safe in environments without `window` (SSR, Node test runners). It must not
 * construct an AudioContext at import time, and playback must degrade to a
 * silent no-op rather than throwing.
 */
describe('soundManager under SSR (no window)', () => {
  it('imports without touching browser globals', async () => {
    expect(typeof window).toBe('undefined');
    const mod = await import('../src/utils/soundManager');
    expect(mod.soundManager).toBeDefined();
    expect(mod.SoundManager).toBeDefined();
  });

  it('play methods resolve as no-ops instead of throwing', async () => {
    const { soundManager } = await import('../src/utils/soundManager');
    await expect(soundManager.playMove()).resolves.toBeUndefined();
    await expect(soundManager.playCapture()).resolves.toBeUndefined();
    soundManager.setVolume(0.5);
  });
});
