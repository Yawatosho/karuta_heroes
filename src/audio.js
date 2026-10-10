/** Event-driven mixing; tick() follows the game's render clock, not its simulation. */
export class Sound {
  constructor(settings) {
    this.settings = settings; this.music = null; this.track = ''; this.voices = new Map();
    this.active = new Set(); this.cues = new Map(); this.speech = new Set();
    this.ducks = new Map(); this.gain = 1; this.lastMix = performance.now(); this.fade = null;
  }
  play(name, volume = .85, rate = 1) {
    if (!this.settings.sound) return;
    const audio = new Audio(`sound/${name}.mp3`);
    audio.playbackRate = rate;
    const duck = name === 'special' ? .22 : name === 'KO' || name === 'perfect' ? .3 : 1;
    this.active.add(audio); this.cues.set(audio, { name, volume });
    if (duck < 1) this.ducks.set(audio, duck);
    const finish = () => { this.active.delete(audio); this.cues.delete(audio); this.ducks.delete(audio); };
    audio.addEventListener('ended', finish, { once: true }); audio.addEventListener('error', finish, { once: true });
    this.tick(); audio.play().catch(finish); return audio;
  }
  digit(value) {
    if (!this.settings.sound) return;
    let audio = this.voices.get(value);
    if (!audio) {
      audio = new Audio(`sound/${value}.mp3`); audio.preload = 'auto'; this.voices.set(value, audio);
      const finish = () => { this.speech.delete(audio); this.ducks.delete(audio); };
      audio.addEventListener('ended', finish); audio.addEventListener('error', finish);
    }
    audio.currentTime = 0; audio.volume = this.settings.volume;
    this.speech.add(audio); this.ducks.set(audio, .58); this.tick();
    audio.play().catch(() => { this.speech.delete(audio); this.ducks.delete(audio); });
  }
  bgm(track) {
    this.fade = null;
    if (this.track === track && this.music) { this.update(); return; }
    this.music?.pause(); this.track = track; this.gain = 1; this.lastMix = performance.now();
    this.music = new Audio(`sound/${track}.mp3`); this.music.loop = true; this.tick();
    if (this.settings.sound) this.music.play().catch(() => {});
  }
  tick(now = performance.now()) {
    const dt = Math.max(0, now - this.lastMix); this.lastMix = now;
    const target = Math.min(1, ...this.ducks.values());
    // A fast attack leaves the SE transient clear; a slower release retains its tail.
    this.gain = target < this.gain ? target : Math.min(target, this.gain + dt / 380);
    for (const [audio, cue] of this.cues) {
      const priority = cue.name === 'special' && this.speech.size ? .28 : 1;
      audio.volume = Math.min(1, cue.volume * this.settings.volume * priority);
    }
    for (const audio of this.speech) audio.volume = this.settings.volume;
    if (this.music) {
      const fadeGain = this.fade ? Math.max(0, Math.min(1, 1 - (now - this.fade.began) / this.fade.duration)) : 1;
      const mixed = (this.track.startsWith('battle') ? .17 : .25) * this.settings.volume * this.gain;
      this.music.volume = this.fade ? Math.min(mixed, this.fade.start * fadeGain) : mixed;
      if (this.fade && fadeGain === 0) this.music.pause();
    }
  }
  fadeOut(ms = 800) { if (this.music) this.fade = { began: performance.now(), duration: Math.max(1, ms), start: this.music.volume }; }
  stopVoices() {
    this.active.forEach(a => a.pause()); this.active.clear(); this.cues.clear();
    this.voices.forEach(a => a.pause()); this.speech.clear(); this.ducks.clear();
    this.gain = 1; this.lastMix = performance.now(); this.tick();
  }
  pause() { this.music?.pause(); this.stopVoices(); }
  resume() { if (this.settings.sound && (!this.fade || this.music?.volume > 0)) this.music?.play().catch(() => {}); }
  update() { this.tick(); if (this.settings.sound) this.resume(); else this.pause(); }
}
