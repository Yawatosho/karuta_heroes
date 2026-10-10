import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
function fixture() {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const shown = [], sounds = [], root = { innerHTML: '', classList: { toggle() {} } };
  const fallback = { removeAttribute() {}, classList: { add(name) { fallback.kind = name; } } };
  const context = vm.createContext({ battle: { paused: false, presentationPending: false }, current: 'battle',
    overlaySignature: 'cutin-0', overlayLoad: null, overlayCue: null, document: { hidden: false },
    battleImages: { peek: () => null, ensure: () => pending }, sound: { play: name => sounds.push(name) },
    $: selector => selector === '#core-overlay' ? root : { cloneNode: () => fallback },
  });
  vm.runInContext(source.slice(source.indexOf('function playOverlayCue()'), source.indexOf('function syncOverlay()')), context);
  context.mount = image => shown.push(image);
  vm.runInContext("showBattleArt('cutin/cutin_lib.webp', 0, 'cutin-0', mount, 'special');", context);
  return { context, resolve, shown, sounds, root, fallback };
}
test('timed artwork and its SE wait together until the decoded image is available', async () => {
  const f = fixture(); assert.equal(f.context.battle.presentationPending, true); assert.equal(f.sounds.length, 0);
  assert.match(f.root.innerHTML, /画像を準備/);
  const image = { ready: true }; f.resolve(image); await Promise.resolve();
  assert.equal(f.shown[0], image); assert.equal(f.context.battle.presentationPending, false); assert.deepEqual(f.sounds, ['special']);
});
test('a late image cannot overwrite a title/menu after leaving the battle', async () => {
  const f = fixture(); vm.runInContext("current='title'; overlayLoad=null; battle.presentationPending=false;", f.context);
  f.resolve({ ready: true }); await Promise.resolve();
  assert.equal(f.shown.length, 0); assert.equal(f.sounds.length, 0);
});
test('a failed image falls back without a frozen game, and a paused menu delays its SE', async () => {
  const f = fixture(); f.context.battle.paused = true; f.resolve(null); await Promise.resolve();
  assert.equal(f.shown[0], f.fallback); assert.equal(f.fallback.kind, 'art-fallback');
  assert.equal(f.context.battle.presentationPending, false); assert.equal(f.context.battle.paused, true); assert.equal(f.sounds.length, 0);
  f.context.battle.paused = false; vm.runInContext('playOverlayCue(); playOverlayCue();', f.context);
  assert.deepEqual(f.sounds, ['special']);
});
