import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';

function phone() {
  const audios = [];
  let gesture = false;
  class PhoneAudio {
    constructor(src) { this.src = src; this.paused = true; this.allowed = false; this.volume = 1; this.playCalls = 0; this.loads = 0; audios.push(this); }
    play() {
      this.playCalls++;
      if (gesture) this.allowed = true;
      if (!this.allowed) { this.paused = true; return Promise.reject(Object.assign(new Error('Gesture required'), { name: 'NotAllowedError' })); }
      this.paused = false; return Promise.resolve();
    }
    pause() { this.paused = true; }
    load() { this.loads++; this.paused = true; this.error = null; }
    addEventListener() {}
  }
  const original = globalThis.Audio;
  globalThis.Audio = PhoneAudio;
  const sound = new Sound({ sound: true, volume: .8 });
  return { sound, audios, tap(fn = () => sound.unlock()) { gesture = true; try { fn(); } finally { gesture = false; } }, restore() { globalThis.Audio = original; } };
}
test('a tap unlocks the same BGM element used by the delayed battle start', async () => {
  const p = phone();
  try {
    p.sound.bgm('select'); await Promise.resolve();
    const music = p.sound.music;
    assert.equal(music.paused, true);
    p.tap(); assert.equal(music.paused, false);
    p.sound.bgm('opening'); p.sound.fadeOut(700); p.sound.tick(performance.now() + 1000);
    assert.equal(music.paused, true);
    p.sound.bgm('battle1'); await Promise.resolve();
    assert.equal(p.sound.music, music);
    assert.equal(music.src, 'sound/battle1.mp3'); assert.equal(music.paused, false);
    assert.equal(p.audios.filter(a => a.loop).length, 1);
  } finally { p.restore(); }
});
test('the next gesture recovers an interrupted BGM without resuming a pause menu', async () => {
  const p = phone();
  try {
    p.sound.bgm('battle1'); p.tap(); const music = p.sound.music;
    p.sound.pause(); p.tap(() => p.sound.unlock(false));
    assert.equal(music.paused, true);
    music.allowed = false; p.sound.resume(); await Promise.resolve();
    assert.equal(music.paused, true);
    p.tap(); assert.equal(music.paused, false);
    const calls = music.playCalls; p.tap(); assert.equal(music.playCalls, calls);
    music.pause(); music.error = { code: 2 }; p.tap();
    assert.equal(music.error, null); assert.equal(music.paused, false);
  } finally { p.restore(); }
});
test('digits preload once without playing voices, and mute or a completed fade stays silent', () => {
  const p = phone();
  try {
    p.sound.bgm('select'); p.tap();
    assert.equal(p.sound.voices.size, 10);
    for (const voice of p.sound.voices.values()) { assert.equal(voice.loads, 1); assert.equal(voice.playCalls, 0); }
    p.tap(); for (const voice of p.sound.voices.values()) assert.equal(voice.loads, 1);
    assert.equal(p.sound.voice('3'), p.sound.voices.get(3));
    p.sound.settings.sound = false; p.sound.update(); p.tap(); assert.equal(p.sound.music.paused, true);
    p.sound.settings.sound = true; p.tap(); p.sound.fadeOut(100); p.sound.tick(performance.now() + 500); p.tap();
    assert.equal(p.sound.music.paused, true);
  } finally { p.restore(); }
});
