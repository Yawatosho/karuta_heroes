import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
function mixer() {
  let now = 0; const audios = [];
  class Audio {
    constructor(src) { this.src=src; this.currentTime=0; this.paused=true; this.events={}; audios.push(this); }
    play() { this.paused=false; return Promise.resolve(); }
    pause() { this.paused=true; }
    addEventListener(type, fn) { this.events[type]=fn; }
    end() { this.paused=true; this.events.ended?.(); }
    fail() { this.paused=true; this.events.error?.(); }
  }
  const context = vm.createContext({ Audio, performance:{now:()=>now} });
  vm.runInContext(source.replace('export class','class')+'\nthis.sound = new Sound({sound:true, volume:.8});',context);
  const sound=context.sound;
  return {sound,audios,advance(ms){now+=ms;sound.tick(now);}};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} !== ${b}`);
test('special ducks BGM without restarting it and releases smoothly after the SE tail ends',()=>{
  const {sound,audios,advance}=mixer(); sound.bgm('battle1');const music=audios[0];music.currentTime=42;
  const special=sound.play('special');close(music.volume,.17*.8*.22);
  assert.equal(special.src,'sound/special.mp3');assert.equal(music.paused,false);assert.equal(music.currentTime,42);
  advance(1300);close(music.volume,.17*.8*.22);
  special.end();advance(100);assert.ok(music.volume>.17*.8*.22&&music.volume<.17*.8);
  advance(400);close(music.volume,.17*.8);assert.equal(music.currentTime,42);
});
test('spoken digits take priority over the special tail, which recovers without being cut off',()=>{
  const {sound,audios,advance}=mixer();sound.bgm('battle1');const special=sound.play('special');sound.digit(3);
  const voice=audios.at(-1);close(voice.volume,.8);close(special.volume,.85*.8*.28);
  assert.equal(special.paused,false);voice.end();advance(16);close(special.volume,.85*.8);
  special.end();advance(400);close(audios[0].volume,.17*.8);
});
test('overlapping announcers retain the strongest duck until both have ended',()=>{
  const {sound,audios,advance}=mixer();sound.bgm('battle2');const ko=sound.play('KO'), perfect=sound.play('perfect');
  ko.end();advance(200);close(audios[0].volume,.17*.8*.3);
  perfect.end();advance(400);close(audios[0].volume,.17*.8);
});
test('pause, mute and screen cleanup remove all speech and duck state',()=>{
  const {sound,audios,advance}=mixer();sound.bgm('battle1');const special=sound.play('special');sound.digit(2);sound.pause();
  assert.equal(audios.every(a=>a.paused),true);assert.equal(sound.ducks.size,0);assert.equal(sound.active.size,0);
  sound.resume();advance(16);assert.equal(audios[0].paused,false);close(audios[0].volume,.17*.8);
  assert.equal(special.paused,true);sound.play('special');sound.settings.sound=false;sound.update();
  assert.equal(audios.every(a=>a.paused),true);assert.equal(sound.ducks.size,0);
  sound.settings.sound=true;sound.update();close(audios[0].volume,.17*.8);
});
test('a failed SE cannot leave BGM quiet and track changes preserve settings',()=>{
  const {sound,audios,advance}=mixer();sound.bgm('battle1');const special=sound.play('special');special.fail();advance(400);
  close(audios[0].volume,.17*.8);sound.stopVoices();sound.bgm('victory');close(audios.at(-1).volume,.25*.8);
  sound.settings.volume=.3;sound.update();close(audios.at(-1).volume,.25*.3);
});
test('fade-out keeps decreasing during duck release and cannot resume at zero',()=>{
  const {sound,audios,advance}=mixer();sound.bgm('battle1');const special=sound.play('special');sound.fadeOut(700);
  const start=audios[0].volume;special.end();advance(100);assert.ok(audios[0].volume<start);
  const first=audios[0].volume;advance(100);assert.ok(audios[0].volume<first);
  advance(500);advance(400);close(audios[0].volume,0);assert.equal(audios[0].paused,true);
  sound.resume();assert.equal(audios[0].paused,true);sound.bgm('opening');assert.equal(audios.at(-1).paused,false);
  close(audios.at(-1).volume,.25*.8);
});
