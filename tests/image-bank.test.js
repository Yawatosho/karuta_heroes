import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ImageBank, battleArtPaths } from '../src/image-bank.js';
import { players, enemies } from '../src/config.js';
import { Battle } from '../src/engine.js';

function fixture() {
  const images = [], timers = new Map(); let nextTimer = 0;
  class MockImage {
    constructor() { this.naturalWidth = 0; this.decodeCalls = 0; images.push(this); }
    load() { this.naturalWidth = 1672; this.onload(); }
    decode() { this.decodeCalls++; return new Promise((resolve, reject) => { this.decoded = resolve; this.badDecode = reject; }); }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const bank = new ImageBank({ makeImage: () => new MockImage(), setTimer: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimer: id => timers.delete(id) });
  return { bank, images, timers };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
test('default timer wrappers do not pass the image bank as the native browser receiver', () => {
  const calls = [];
  const nativeTimer = function (...args) {
    assert.equal(this, undefined);
    calls.push(args); return 1;
  };
  const source = fs.readFileSync(new URL('../src/image-bank.js', import.meta.url), 'utf8').replaceAll('export ', '');
  const context = vm.createContext({ setTimeout: nativeTimer, clearTimeout: nativeTimer });
  vm.runInContext(`${source}\nconst bank = new ImageBank(); bank.setTimer(() => {}, 8000); bank.clearTimer(1);`, context);
  assert.equal(calls.length, 2);
});
test('concurrent warmup and presentation share a decoded image and wait for decode', async () => {
  const { bank, images, timers } = fixture(); bank.retain(['cutin/cutin_lib.webp']);
  const pending = bank.ensure('cutin/cutin_lib.webp');
  assert.equal(images.length, 1); assert.equal(bank.peek('cutin/cutin_lib.webp'), null);
  images[0].load(); await flush(); assert.equal(images[0].decodeCalls, 1);
  assert.equal(bank.peek('cutin/cutin_lib.webp'), null);
  images[0].decoded(); assert.equal(await pending, images[0]);
  assert.equal(bank.peek('cutin/cutin_lib.webp'), images[0]);
  assert.equal(await bank.ensure('cutin/cutin_lib.webp'), images[0]); assert.equal(images.length, 1); assert.equal(timers.size, 0);
});
test('transient image errors retry and a failed image resolves to a bounded fallback', async () => {
  const { bank, images, timers } = fixture(); const pending = bank.ensure('round/round_lib.webp');
  images[0].onerror(); await flush(); assert.equal(images.length, 2);
  assert.match(images[1].src, /image-retry=1$/);
  images[1].load(); await flush(); images[1].badDecode(new Error('Decode failed'));
  assert.equal(await pending, null); assert.equal(timers.size, 0);
  bank.ensure('round/round_lib.webp'); assert.equal(images.length, 3);
  images[2].onerror(); await flush(); images[3].onerror(); await flush();
});
test('timeouts cannot strand the game and finished old-match images are not retained', async () => {
  const { bank, images, timers } = fixture(); const pending = bank.ensure('slow.webp');
  [...timers.values()][0](); await flush(); assert.equal(images.length, 2);
  [...timers.values()][0](); assert.equal(await pending, null); assert.equal(timers.size, 0);
  bank.retain(['old.webp']); const old = bank.ensure('old.webp'); bank.retain(['new.webp']);
  images[2].load(); await flush(); images[2].decoded(); await old;
  assert.equal(bank.peek('old.webp'), null);
  images[3].load(); await flush(); images[3].decoded(); await bank.ensure('new.webp');
  assert.equal(bank.entries.size, 1);
});
test('all current-match image sets use existing assets and versus only loads round artwork', () => {
  for (const player of players) for (let stage = 0; stage < enemies.length; stage++) {
    const paths = battleArtPaths(player, enemies[stage], 'story', stage);
    assert.equal(paths.length, 4); for (const path of paths) assert.ok(fs.existsSync(path), path);
  }
  assert.deepEqual(battleArtPaths(players[0], players[1], 'versus', 0), ['round/round_lib.webp', 'round/round_det.webp']);
});
test('image preparation preserves every millisecond of special and round-winner display', () => {
  const b = new Battle(); b.beginTurn(); b.gauge[0] = 100;
  b.onEvent = e => { if (e.type === 'cutin') b.presentationPending = true; };
  b.special(); const elapsed = b.elapsed, digits = [...b.digits]; b.step(10000);
  assert.equal(b.cutin.remaining, 1300); assert.equal(b.elapsed, elapsed); assert.deepEqual(b.digits, digits);
  b.presentationPending = false; b.paused = true; b.step(1000); assert.equal(b.cutin.remaining, 1300);
  b.paused = false; b.step(1300); assert.equal(b.cutin, null);
  b.hp[1] = 0; b.endRound(); const before = b.phaseTime;
  b.onEvent = e => { if (e.type === 'roundWinner') b.presentationPending = true; };
  b.step(before + 1000); assert.equal(b.phase, 'roundWinner'); assert.equal(b.phaseTime, 2300);
  b.step(10000); assert.equal(b.phaseTime, 2300);
  b.presentationPending = false; b.step(2280); assert.equal(b.phase, 'roundWinner');
  b.step(20); assert.equal(b.round, 2);
});
