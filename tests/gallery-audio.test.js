import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { portraitAsset } from '../src/layout.js';

const appSource = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const audioSource = fs.readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
function handler(name) {
  const start = appSource.indexOf(`function ${name}(`);
  const rest = appSource.slice(start);
  const end = rest.slice(1).search(/^function /m);
  return end < 0 ? rest : rest.slice(0, end + 1);
}
function fixture(artwork = false) {
  const audios = [], listeners = {};
  class Audio {
    constructor(src) { this.src = src; this.loop = false; this.paused = true; this.currentTime = 0; this.events = {}; audios.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener(name, callback) { this.events[name] = callback; }
  }
  const focus = { focus() {} };
  const modal = { innerHTML: '', get children() { return this.innerHTML ? [{}] : []; }, querySelector() { return focus; } };
  const document = { hidden: false, activeElement: focus, addEventListener(name, callback) { listeners[name] = callback; } };
  const context = vm.createContext({ Audio, document, modal, performance: { now: () => 0 }, clearInterval,
    current: 'gallery', battle: null, modalPreviousFocus: null, modalPausesAudio: true, lastFrame: 0,
    updateHud() {}, portraitAsset, esc: value => value, galleryItems: () => [{ path: 'artwork/artwork01.webp', label: 'ARTWORK 01', ...(artwork ? {number: 1} : {}) }],
  });
  vm.runInContext(audioSource.replace('export class', 'class') + '\nconst sound = new Sound({sound:true, volume:.8});', context);
  vm.runInContext(['artwork','showModal','closeModal','viewArt'].map(handler).join('\n'), context);
  const visibilityStart = appSource.indexOf("document.addEventListener('visibilitychange'");
  vm.runInContext(appSource.slice(visibilityStart, appSource.indexOf('function frame(', visibilityStart)), context);
  vm.runInContext("sound.bgm('select'); viewArt(0);", context);
  return { audios, modal, context, document, visibility: listeners.visibilitychange };
}

test('enlarging a gallery image keeps the current BGM and its playback position', () => {
  const {audios, context} = fixture();
  const music = audios[0]; music.currentTime = 42;
  assert.equal(music.paused, false); assert.equal(music.loop, true); assert.equal(audios.length, 1);
  vm.runInContext('closeModal(); viewArt(0);', context);
  assert.equal(audios.length, 1); assert.equal(music.currentTime, 42); assert.equal(music.paused, false);
});
test('artwork plays one non-looping effect alongside BGM and stops it on close', () => {
  const {audios, context} = fixture(true);
  assert.equal(audios[0].src, 'sound/select.mp3'); assert.equal(audios[0].paused, false);
  assert.equal(audios[1].src, 'sound/artwork.mp3'); assert.equal(audios[1].loop, false);
  vm.runInContext('closeModal();', context);
  assert.equal(audios[1].paused, true); assert.equal(audios[0].paused, false);
  vm.runInContext('viewArt(0);', context);
  assert.equal(audios.length, 3); assert.equal(audios[2].loop, false); assert.equal(audios[1].paused, true);
});
test('BGM resumes when returning to a tab with an enlarged image still open', () => {
  const {audios, document, visibility, modal} = fixture(true);
  document.hidden = true; visibility();
  assert.equal(audios[0].paused, true); assert.equal(audios[1].paused, true);
  document.hidden = false; visibility();
  assert.equal(audios[0].paused, false); assert.equal(audios[1].paused, true); assert.equal(modal.children.length, 1);
});
test('battle pause dialogs still freeze both the game and music', () => {
  const {audios, context, document, visibility} = fixture();
  vm.runInContext("closeModal(); current='battle'; battle={paused:false}; showModal('PAUSE');", context);
  assert.equal(audios[0].paused, true); assert.equal(context.battle.paused, true);
  document.hidden = true; visibility(); document.hidden = false; visibility();
  assert.equal(audios[0].paused, true);
  vm.runInContext('closeModal();', context);
  assert.equal(context.battle.paused, false); assert.equal(audios[0].paused, false);
});
