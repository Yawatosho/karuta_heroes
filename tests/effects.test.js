import test from 'node:test';
import assert from 'node:assert/strict';
import { strikeGeometry, specialLooks } from '../src/effects.js';
import { players, enemies } from '../src/config.js';
test('card-to-life trajectories stay aligned under landscape and phone scaling',()=>{
 for(const scale of [1,.5,390/480]) {
  const arena={left:14,top:30,width:480*scale};
  const rect=(x,y,width,height)=>({left:14+x*scale,top:30+y*scale,width:width*scale,height:height*scale});
  const g=strikeGeometry(rect(32,420,120,96),rect(250,95,170,18),arena,480);
  assert.deepEqual(g.source,{x:92,y:468});assert.deepEqual(g.target,{x:335,y:104});
  assert.equal(g.left,32);assert.equal(g.top,420);assert.equal(g.width,120);assert.equal(g.height,96);
  assert.equal(g.path,'M 92 468 Q 92 194 335 104');
 }
});
test('every player and enemy has an artwork palette and portrait focus',()=>{
 for(const f of [...players,...enemies]){
  const look=specialLooks[f.id];assert.ok(look, f.id);assert.match(look.color,/^#[0-9a-f]{6}$/i);
  assert.ok(parseFloat(look.focus)>0&&parseFloat(look.focus)<100);
 }
});
