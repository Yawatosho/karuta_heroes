import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaLayout, portraitAsset } from '../src/layout.js';
test('portrait phones fit the full arena and keep cards and buttons touchable', () => {
  for (const [width,height] of [[320,568],[360,640],[390,844],[430,932]]) {
    const layout=arenaLayout(width,height);
    assert.equal(layout.portrait,true);
    assert.ok(layout.width*layout.scale<=width);
    assert.ok(layout.height*layout.scale<=height);
    const cardHeight=(layout.height-286-204-30)/4;
    assert.ok(cardHeight*layout.scale>=44);
    assert.ok(66*layout.scale>=44);
  }
});
test('rotation returns to the original landscape arena without changing gameplay', () => {
  const layout=arenaLayout(844,390);
  assert.equal(layout.portrait,false);assert.equal(layout.width,1366);assert.equal(layout.height,768);
  assert.ok(layout.width*layout.scale<=844);assert.ok(layout.height*layout.scale<=390);
});

test('all native portrait illustration categories resolve within this folder', () => {
  assert.equal(portraitAsset('opening/op_common.webp'),'opening/op_common_tate.webp');
  for (const code of ['lib','det','lily','prof','flib']) {
    assert.equal(portraitAsset(`opening/op_${code}.webp`),`opening/op_${code}_tate.webp`);
    assert.equal(portraitAsset(`victory/win_${code}.webp`),`victory_tate/win_${code}_tate.webp`);
    for (let n=1;n<=4;n++) assert.equal(portraitAsset(`vs/vs_${n}_${code}.webp`),`vs_tate/vs_${n}_${code}_tate.webp`);
    for (let n=1;n<=2;n++) assert.equal(portraitAsset(`ending/ending_${code}${n}.webp`),`ending_tate/ending_${code}${n}_tate.webp`);
  }
  for (let n=1;n<=4;n++) assert.equal(portraitAsset(`victory/win_enemy${n}.webp`),`victory_tate/win_enemy${n}_tate.webp`);
  assert.equal(portraitAsset('round/round_lib.webp'),null);
  assert.equal(portraitAsset('cutin/lib.webp'),null);
});
