import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/analytics.js', import.meta.url), 'utf8');
function setup(href) {
  const scripts = [];
  const window = { location: { href } };
  const context = vm.createContext({ window, URL, document: {
    createElement: () => ({}), head: { appendChild: script => scripts.push(script) }
  } });
  vm.runInContext(source, context);
  return { window, scripts, context };
}
test('published game uses the original ID and emits one clean pageview', () => {
  for (const path of ['/karuta_heroes/', '/karuta_heroes/index.html']) {
    const { window, scripts, context } = setup(`https://yawatosho.github.io${path}?test=private#gallery`);
    const commands = window.dataLayer.map(command => Array.from(command));
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-J6NS8CCNWN');
    assert.equal(scripts[0].async, true);
    assert.equal(commands[1][1], 'G-J6NS8CCNWN');
    assert.equal(commands[1][2].send_page_view, false);
    const views = commands.filter(command => command[1] === 'page_view');
    assert.equal(views.length, 1);
    assert.equal(views[0][2].page_location, `https://yawatosho.github.io${path}`);
    assert.equal(views[0][2].page_title, 'NDC Karuta Heroes');
    assert.equal(views[0][2].game_mode, 'fighters');
    vm.runInContext(source, context);
    assert.equal(scripts.length, 1);
    assert.equal(window.dataLayer.length, 3);
  }
});
test('local, offline and preview pages do not load or send analytics', () => {
  for (const href of [
    'http://127.0.0.1:4176/', 'http://localhost:4176/',
    'file:///game/offline.html', 'https://yawatosho.github.io/karuta_heroes/offline.html',
    'https://yawatosho.github.io/karuta_heroes/preview/review.html',
    'https://yawatosho.github.io/karuta_heroes2/', 'https://example.com/karuta_heroes/'
  ]) {
    const { window, scripts } = setup(href);
    assert.equal(scripts.length, 0, href);
    assert.equal(window.dataLayer, undefined, href);
    assert.equal(window.gtag, undefined, href);
  }
});
