import { players, enemies, difficulties } from './config.js';
import { CARDS, TUNING } from './data.js';

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function uniqueDeal(pool, count, random = Math.random, excluded = new Set(), forbidden = new Set()) {
  const seen = new Set(forbidden), result = [];
  for (const card of shuffle(pool, random)) {
    const prefix = card.ndc.slice(0, 2);
    if (excluded.has(card.ndc) || seen.has(prefix)) continue;
    seen.add(prefix); result.push({ ...card });
    if (result.length === count) break;
  }
  return result;
}
export const damageFor = combo => Math.min(TUNING.damage.max, TUNING.damage.base + Math.max(0, combo - 1) * TUNING.damage.comboStep);
export const gaugeFor = elapsed => clamp(Math.round(TUNING.gauge.correctBase + Math.max(0, 1 - elapsed / 6000) * TUNING.gauge.fastBonus), TUNING.gauge.min, TUNING.gauge.max);

/** A DOM-free simulation. All timings use this clock, including CPU and cut-in pauses. */
export class Battle {
  constructor({ player = players[0], stage = 0, difficulty = 'normal', mode = 'story', training = false, random = Math.random, onEvent = () => {} } = {}) {
    this.player = player; this.stage = stage; this.difficulty = difficulties[difficulty] || difficulties.normal;
    this.enemy = mode === 'versus' ? players[1] : enemies[stage]; this.mode = mode; this.training = training;
    this.random = random; this.onEvent = onEvent; this.round = 0; this.wins = [0, 0]; this.gauge = [0, 0]; this.paused = false;
    this.pool = CARDS.filter(c => difficulty !== 'easy' || mode === 'versus' || c.ndc.endsWith('0'));
    this.startRound();
  }
  emit(type, detail = {}) { this.onEvent({ type, ...detail }); }
  startRound() {
    this.round++; this.hp = [this.mode === 'versus' ? 100 : this.difficulty.playerHp, 100]; this.maxHp = [...this.hp];
    const deal = uniqueDeal(this.pool, 11, this.random);
    this.deck = deal.slice(0, 10); this.field = shuffle(deal, this.random); this.turn = 0; this.digits = ['', '', ''];
    this.combo = [0, 0]; this.lastOwner = -1; this.disabled = [false, false]; this.hints = []; this.reveal = 0; this.candidates = 0; this.skip = 0;
    this.rush = 0; this.rushActive = false; this.rushStreak = 0; this.reverse = 0; this.reverseActive = false; this.supremeUsed = false;
    this.cutin = null; this.phase = 'intro'; this.phaseTime = 3700; this.emit('round', { round: this.round });
  }
  beginTurn() {
    if (this.turn >= 10 || this.hp.some(h => h <= 0)) { this.endRound(); return; }
    this.turn++; this.target = this.deck[this.turn - 1]; this.phase = 'turn'; this.elapsed = 0; this.digits = ['', '', ''];
    this.readCount = 0; this.cpuAt = null; this.cpuCursor = null; this.cpuInitialVisible = 0; this.disabled = [false, this.training || this.skip > 0];
    if (this.skip > 0) this.skip--;
    this.reverseActive = this.reverse > 0; if (this.reverse > 0) this.reverse--;
    this.rushActive = this.rush > 0; if (this.rush > 0) this.rush--; else this.rushStreak = 0;
    this.hints = []; this.hintKind = '';
    // Enemy mutations happen before digit reading or hints, preserving a valid answer deck.
    if (this.mode === 'story' && !this.training && this.gauge[1] >= 100) this.enemySkill();
    if (this.reveal > 0) { this.hints = [this.target.ndc]; this.hintKind = 'correct'; this.reveal--; }
    if (this.candidates > 0) {
      const other = shuffle(this.field.filter(c => c && c.ndc !== this.target.ndc), this.random)[0];
      this.hints = [this.target.ndc, ...(other ? [other.ndc] : [])]; this.hintKind = 'candidate'; this.candidates--;
    }
    this.emit('turn');
  }
  step(dt) {
    if (this.paused || this.phase === 'matchOver' || this.phase === 'trainingEnd') return;
    // Small slices make simultaneous timeout / digit / CPU events deterministic after frame stalls.
    let left = Math.max(0, dt);
    while (left > 0) {
      const slice = Math.min(left, 20); left -= slice;
      if (this.cutin) { this.cutin.remaining -= slice; if (this.cutin.remaining <= 0) { this.cutin = null; this.emit('cutinEnd'); } continue; }
      if (this.phase !== 'turn') {
        this.phaseTime -= slice;
        if (this.phaseTime <= 0) {
          if (this.phase === 'intro' || this.phase === 'hit') this.beginTurn();
          else if (this.phase === 'roundOver') {
            this.phase = 'roundWinner'; this.phaseTime = 2300; this.emit('roundWinner', { owner: this.roundOwner });
          } else if (this.phase === 'roundWinner') {
            if (this.wins[this.roundOwner] >= 2) { this.phase = 'matchOver'; this.emit('matchOver', { owner: this.roundOwner }); }
            else this.startRound();
          }
        }
        continue;
      }
      this.elapsed += slice;
      while (this.readCount < 3 && this.elapsed >= 1000 + this.readCount * 2000) {
        const index = this.reverseActive ? 2 - this.readCount : this.readCount;
        this.digits[index] = this.target.ndc[index]; this.readCount++;
        this.emit('digit', { index, value: this.digits[index] }); this.planCpu();
      }
      if (this.cpuAt !== null && this.elapsed >= this.cpuAt && !this.disabled[1]) {
        if (!this.cpuCursor) {
          let card = this.target;
          const tune = TUNING.enemies[this.enemy.id];
          if (this.random() > clamp(tune.correctRate + this.difficulty.cpuCorrectDelta, .1, .995)) {
            card = shuffle(this.field.filter(c => c && c.ndc !== this.target.ndc), this.random)[0] || card;
          }
          this.cpuCursor = card.ndc; this.cpuAt = this.elapsed + 230; this.emit('cpuAim', { ndc: card.ndc });
        } else this.answer(this.field.findIndex(c => c?.ndc === this.cpuCursor), 1);
      }
      if (this.phase === 'turn' && this.elapsed >= 15000 && !this.training) this.noAnswer();
    }
  }
  planCpu() {
    if (this.mode === 'versus' || this.training || this.disabled[1]) return;
    const shown = this.reverseActive ? this.digits.filter(Boolean).join('') : this.digits.join('');
    const candidates = this.field.filter(c => c && (this.reverseActive ? c.ndc.endsWith(shown) : c.ndc.startsWith(shown)));
    if (candidates.length !== 1) return;
    const count = this.field.filter(Boolean).length, tune = TUNING.enemies[this.enemy.id];
    this.cpuInitialVisible = Math.max(this.cpuInitialVisible, count);
    const speed = .1 + .9 * (count - 1) / Math.max(1, this.cpuInitialVisible - 1);
    let delay = (tune.reactionMinMs + this.random() * (tune.reactionMaxMs - tune.reactionMinMs)) * speed * this.difficulty.cpuSpeed;
    if (count <= 3) delay *= .82;
    const at = this.elapsed + delay;
    if (this.cpuAt === null || at < this.cpuAt) { this.cpuAt = at; this.cpuCursor = null; }
  }
  answer(slot, owner = 0) {
    const card = this.field[slot];
    if (this.paused || this.phase !== 'turn' || this.cutin || this.disabled[owner] || !card) return false;
    if (card.ndc !== this.target.ndc) {
      if (!this.training) this.disabled[owner] = true;
      this.combo[owner] = 0; if (owner === 0) this.rushStreak = 0;
      if (owner === 1) { this.cpuAt = null; this.cpuCursor = null; }
      this.emit('miss', { owner, slot, ndc: card.ndc });
      if (this.disabled.every(Boolean)) this.noAnswer();
      return false;
    }
    if (this.training) { this.phase = 'trainingEnd'; this.emit('trainingComplete', { slot }); return true; }
    this.combo[owner] = this.lastOwner === owner && this.elapsed < 6050 ? this.combo[owner] + 1 : 1;
    this.combo[1 - owner] = 0; this.lastOwner = owner;
    let damage = damageFor(this.combo[owner]);
    if (this.mode === 'story') {
      damage *= owner === 0 ? this.player.damageDealtMultiplier : this.player.damageTakenMultiplier;
      if (owner === 0 && this.rushActive) { damage *= 1.3; this.rushStreak++; }
      if (owner === 1) this.rushStreak = 0;
    }
    damage = Math.max(1, Math.round(damage));
    if (owner === 0 && this.rushActive && this.rushStreak >= 3) damage = Math.max(damage, this.hp[1]);
    this.hp[1 - owner] = Math.max(0, this.hp[1 - owner] - damage);
    if (this.mode === 'story') {
      const gain = gaugeFor(this.elapsed);
      this.gauge[owner] = clamp(this.gauge[owner] + Math.round(gain * (owner === 1 ? this.difficulty.cpuGauge : 1)), 0, 100);
      this.gauge[1 - owner] = clamp(this.gauge[1 - owner] + Math.round(TUNING.gauge.opponentHit * (owner === 0 ? this.difficulty.cpuGauge : 1)), 0, 100);
    }
    this.field[slot] = null; this.cpuAt = null; this.cpuCursor = null; this.phase = 'hit'; this.phaseTime = 1500;
    this.emit('hit', { owner, slot, damage, combo: this.combo[owner], card });
    return true;
  }
  noAnswer() {
    this.cpuAt = null; this.cpuCursor = null; this.combo = [0, 0]; this.lastOwner = -1; this.rushStreak = 0;
    this.phase = 'hit'; this.phaseTime = 1500; this.emit('noAnswer');
  }
  special() {
    if (this.mode !== 'story' || this.training || this.phase !== 'turn' || this.paused || this.cutin || this.gauge[0] < 100) return false;
    switch (this.player.skillType) {
      case 'revealNext': this.reveal = 1; break;
      case 'removeDecoy': {
        const upcoming = new Set(this.deck.slice(this.turn - 1).map(c => c.ndc));
        const index = this.field.findIndex(c => c && !upcoming.has(c.ndc));
        if (index < 0) return false;
        this.field[index] = null; break;
      }
      case 'skipCpu': this.skip = 2; break;
      case 'revealTwoCandidatesNextTwo': this.candidates = 2; break;
      case 'fightingPowerRush': if (this.rush > 0 || this.rushActive) return false; this.rush = 3; this.rushStreak = 0; break;
      default: return false;
    }
    this.gauge[0] = 0; this.showCutin(0); return true;
  }
  showCutin(owner) {
    this.cutin = { owner, remaining: 1300 }; this.emit('cutin', { owner, fighter: owner === 0 ? this.player : this.enemy });
  }
  enemySkill() {
    const present = this.field.filter(Boolean), existing = new Set(this.field.filter(Boolean).map(c => c.ndc));
    switch (this.enemy.skillType) {
      case 'shuffle': this.field = [...shuffle(present, this.random), ...Array(11 - present.length).fill(null)]; break;
      case 'decimalIllusion': {
        const forbidden = new Set(this.deck.slice(this.turn - 1).map(c => c.ndc.slice(0, 2)));
        const count = Math.min(3, 11 - present.length); if (!count) return false;
        const extra = uniqueDeal(this.pool, count, this.random, existing, forbidden);
        this.field = [...shuffle([...present, ...extra], this.random), ...Array(11 - present.length - extra.length).fill(null)]; break;
      }
      case 'glitchIndex': {
        const deal = uniqueDeal(this.pool, present.length, this.random, existing);
        if (deal.length !== present.length) return false;
        const answers = deal.slice(0, 11 - this.turn);
        this.deck.splice(this.turn - 1, answers.length, ...answers); this.target = this.deck[this.turn - 1];
        this.field = [...shuffle(deal, this.random), ...Array(11 - deal.length).fill(null)]; break;
      }
      case 'reverseRead': if (this.supremeUsed) return false; this.reverse = 2; this.supremeUsed = true; break;
      default: return false;
    }
    this.gauge[1] = 0; this.showCutin(1); return true;
  }
  endRound() {
    this.roundOwner = this.hp[0] >= this.hp[1] ? 0 : 1; this.wins[this.roundOwner]++;
    this.perfect = this.hp[1] === 0 && this.hp[0] === this.maxHp[0];
    this.finishLabel = this.hp.some(h => h === 0) ? 'K.O.' : 'TIME UP';
    this.phase = 'roundOver'; this.phaseTime = this.perfect ? 3800 : 2400;
    this.emit('roundOver', { owner: this.roundOwner, label: this.finishLabel, perfect: this.perfect });
  }
}
