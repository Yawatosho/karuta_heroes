import { players, enemies, difficulties, twoPlayer, VERSION } from './config.js';
import { Battle, shuffle } from './engine.js';
import { TUNING } from './data.js';
import { OPENING_COMMON_SCENES, OPENING_CHARACTER_SCENES, ENDINGS } from './story.js';
import { Sound } from './audio.js?v=20261010-readable-cards';
import { specialDecor, strikeGeometry } from './effects.js?v=20261010-readable-cards';
import { cardLabel, fitCardLabels } from './card-label.js?v=20261010-readable-cards';
import { syncField } from './ui.js';
import { arenaLayout, portraitAsset } from './layout.js';
import { loadSave, SAVE_KEY } from './save.js?v=20261010-legacy-save';

const $ = (s, root = document) => root.querySelector(s);
// Reuse icons within a session, but fetch replacements on the next page load.
const iconRevision = Date.now().toString(36);
function iconAsset(path) { return `${path}?v=${iconRevision}`; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const screen = $('#screen'), stage = $('#stage'), effects = $('#effects'), modal = $('#modal');
const defaults = { settings: { sound: true, volume: .8, motion: !matchMedia('(prefers-reduced-motion: reduce)').matches }, unlocked: [], artworks: [], progress: null, tutorialSeen: false };
let saveStorage = null;
try { saveStorage = localStorage; } catch { /* The game remains playable without browser storage. */ }
let saved = loadSave(saveStorage, defaults);
let saveWarning = false;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { if (!saveWarning) { toast('このブラウザでは保存できません。現在のプレイは続けられます。'); saveWarning = true; } } }
const sound = new Sound(saved.settings);
let current = 'title', hero = players[0], difficulty = 'normal', mode = 'story', stageIndex = 0, storyScene = 0, battle = null;
let controls = ['mouse', 'keyboardA'], galleryTab = 'cutin', reward = null;
let timers = new Set(), overlaySignature = '', toastTimer = 0, lastFrame = performance.now(), modalPausesAudio = true;
let particleList = [], modalPreviousFocus = null;
const ctx = $('#particles').getContext('2d');
function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; }
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('show'); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3200); }
function saveProgress(phase, extra = {}) { if (mode !== 'story') return; saved.progress = { player: hero.id, difficulty, stage: stageIndex, phase, scene: storyScene, ...extra }; persist(); }
function unlock(path) { if (!saved.unlocked.includes(path)) { saved.unlocked.push(path); persist(); } }
function artwork(path, className, alt, lazy = false) {
  const portrait = portraitAsset(path);
  const image = `<img class="${className}" src="${esc(path)}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''}>`;
  return portrait ? `<picture class="responsive-art"><source media="(orientation: portrait) and (max-width: 900px)" srcset="${esc(portrait)}">${image}</picture>` : image;
}
function top(kicker, title) { return `<header class="screen-top"><div class="eyebrow">${kicker}</div><h1 class="section-title">${title}</h1></header>`; }
function setScreen(name, html) {
  timers.forEach(clearTimeout); timers.clear(); sound.stopVoices(); effects.innerHTML = ''; modal.innerHTML = ''; modalPausesAudio = true; particleList = [];
  stage.classList.remove('screen-impact', 'finish-impact'); stage.scrollTop = 0; stage.scrollLeft = 0; current = name; document.body.dataset.screen = name; screen.innerHTML = html; screen.classList.remove('page-enter'); void screen.offsetWidth; screen.classList.add('page-enter');
  overlaySignature = ''; $('#announcer').textContent = '';
  if (name !== 'battle') battle = null;
  if (name !== 'title' && name !== 'battle') later(() => screen.querySelector('button:not(:disabled)')?.focus({ preventScroll: true }), 400);
}
function wipe(fn) { const el = $('#transition'); el.classList.remove('wipe'); void el.offsetWidth; el.classList.add('wipe'); later(fn, saved.settings.motion ? 240 : 0); }
function applySettings() { document.body.classList.toggle('reduced-motion', !saved.settings.motion); $('#sound-toggle').textContent = saved.settings.sound ? 'SOUND ON' : 'SOUND OFF'; $('#sound-toggle').setAttribute('aria-pressed', String(saved.settings.sound)); sound.update(); }
function resize() {
  const viewport = $('#viewport'), padding = getComputedStyle(viewport);
  const width = viewport.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
  const height = viewport.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
  const layout = arenaLayout(Math.max(1,width), Math.max(1,height));
  document.body.classList.toggle('portrait', layout.portrait);
  document.body.classList.toggle('compact-portrait', layout.portrait && layout.height < 920);
  stage.style.width = `${layout.width}px`; stage.style.height = `${layout.height}px`;
  stage.style.transform = `scale(${layout.scale})`;
  const canvas = $('#particles');
  if (canvas.width !== layout.width || canvas.height !== layout.height) { canvas.width = layout.width; canvas.height = layout.height; particleList = []; }
  fitCardLabels($('.card-grid'), true);
}
window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize); resize(); applySettings();
function title() {
  setScreen('title', `<section class="title-scene ${saved.progress ? 'has-progress' : ''}"><h1 class="sr-only">NDC KARUTA HEROES</h1><div class="title-art"><img src="image/ogp.png" width="1672" height="941" alt="壁に描かれたタイトルと4人の英雄" fetchpriority="high"></div><div class="title-dock">${saved.progress ? `<button class="btn continue-title" data-action="continue">CONTINUE → ${esc(players.find(p => p.id === saved.progress.player).name)} / ${saved.progress.phase === 'ending' ? 'ENDING' : `STAGE ${saved.progress.stage + 1}`}</button>` : ''}<div class="title-menu"><button class="btn gold primary" data-action="story">STORY MODE</button><button class="btn secondary" data-action="versus">2P BATTLE</button><button class="btn secondary" data-action="gallery">GALLERY</button></div><footer class="title-footer"><div class="title-credits"><span>NDC9：日本図書館協会 / 作成：やわらか図書館学</span><a class="title-site-link" href="https://yawatosho.github.io/" target="_blank" rel="noopener noreferrer">YAWATOSHO GAMES</a></div><button class="btn title-help" data-action="help" aria-label="遊び方">?</button></footer></div></section>`);
  sound.bgm('select');
}
function stats(name, value) { return `<div class="stat">${name}${Array.from({length:5}, (_,i) => `<i class="${i < value ? 'on' : ''}"></i>`).join('')}</div>`; }
function select() {
  mode = 'story';
  setScreen('select', `<div class="magic-circle"></div><div class="ghost-name">${esc(hero.englishName)}</div><img class="select-portrait" src="${hero.selectImage}" alt="${esc(hero.name)}"><div class="select-shadow"></div>${top('CHOOSE YOUR CHAMPION', 'SELECT <em>FIGHTER</em>')}<section class="select-info"><div class="fighter-number">0${players.indexOf(hero)+1} / HERO FILE</div><h2 class="fighter-name">${hero.name}</h2><div class="fighter-english">${hero.englishName}</div><div class="fighter-skill"><small>SPECIAL ART</small><strong>${hero.skillName}</strong><p>${hero.skillEffect}</p></div><div class="stats">${stats('ATK',hero.stats.atk)}${stats('DEF',hero.stats.def)}</div></section><div class="fighter-roster" role="group" aria-label="ファイター選択">${players.map(p => `<button class="roster-icon ${p === hero ? 'active' : ''}" data-action="hero" data-id="${p.id}" aria-label="${p.name}" aria-pressed="${p === hero}"><img src="${iconAsset(p.icon)}" alt="">${p === hero ? '<span class="p1-tag">P1</span>' : ''}</button>`).join('')}</div><div class="difficulty" role="group" aria-label="難易度"><span>DIFFICULTY</span>${Object.entries(difficulties).map(([id,d]) => `<button class="${difficulty === id ? 'active' : ''}" data-action="difficulty" data-id="${id}" aria-pressed="${difficulty === id}">${d.label}</button>`).join('')}</div><div class="bottom-nav select-bottom"><div><button class="btn" data-action="title">← BACK</button><span class="bottom-note">5 HEROES / 4 STAGES / FIRST TO 2 ROUNDS</span></div><button class="btn gold" data-action="launch">FIGHT WITH THIS HERO →</button></div>`);
  for (const fighter of players) { const preload = new Image(); preload.src = fighter.selectImage; }
  sound.bgm('select');
}
function updateDifficulty() {
  for (const button of screen.querySelectorAll('.difficulty button')) {
    const active = button.dataset.id === difficulty;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
}
function updateSelect() {
  if (current !== 'select') return;
  $('.ghost-name').textContent = hero.englishName;
  $('.select-info').innerHTML = `<div class="fighter-number">0${players.indexOf(hero)+1} / HERO FILE</div><h2 class="fighter-name">${hero.name}</h2><div class="fighter-english">${hero.englishName}</div><div class="fighter-skill"><small>SPECIAL ART</small><strong>${hero.skillName}</strong><p>${hero.skillEffect}</p></div><div class="stats">${stats('ATK',hero.stats.atk)}${stats('DEF',hero.stats.def)}</div>`;
  for (const button of screen.querySelectorAll('.roster-icon')) {
    const active = button.dataset.id === hero.id;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    if (active && !button.querySelector('.p1-tag')) button.insertAdjacentHTML('beforeend', '<span class="p1-tag">P1</span>');
    if (!active) button.querySelector('.p1-tag')?.remove();
  }
  const chosen = hero, image = new Image();
  const swap = () => {
    if (current !== 'select' || hero !== chosen) return;
    const portrait = $('.select-portrait'); portrait.src = chosen.selectImage; portrait.alt = chosen.name;
    if (saved.settings.motion) portrait.animate([{opacity:.55,translate:'18px 0'},{opacity:1,translate:'0 0'}],{duration:220,easing:'ease-out'});
  };
  image.onload = swap; image.src = chosen.selectImage;
  if (image.complete && image.naturalWidth) { image.onload = null; swap(); }
}
function opening(index = 0) {
  storyScene = Math.max(0, Math.min(3, index));
  const common = storyScene < 3, path = `opening/op_${common ? 'common' : hero.vsCode}.webp`;
  const lines = common ? OPENING_COMMON_SCENES[storyScene].lines : OPENING_CHARACTER_SCENES[hero.id]; unlock(path); saveProgress('opening');
  const caption = `<div class="eyebrow">PROLOGUE / ${common ? 'THE TOURNAMENT' : hero.englishName.toUpperCase()}</div>${lines.map(l => `<p>${esc(typeof l === 'string' ? l : l.text)}</p>`).join('')}`;
  if (current === 'opening') {
    // Keep the artwork node, shade and controls mounted across story pages.
    const art = $('.cinema-art');
    if (art.getAttribute('src') !== path) art.src = path;
    const source = art.parentElement.querySelector('source'), portrait = portraitAsset(path);
    if (source && source.getAttribute('srcset') !== portrait) source.srcset = portrait;
    $('.cinema-caption').innerHTML = caption;
    $('.cinema-caption').scrollTop = 0;
    $('.cinema-bottom small').textContent = `${storyScene + 1} / 4`;
    return;
  }
  setScreen('opening', `${artwork(path, 'cinema-art', '大会へ向かう物語')}<div class="cinema-shade"></div><section class="cinema-caption">${caption}</section><div class="cinema-bottom"><button class="btn small" data-action="skip-story">SKIP PROLOGUE</button><small>${storyScene + 1} / 4</small><button class="btn gold small" data-action="next-story">NEXT →</button></div>`);
  const preload = new Image(); const nextPath = `opening/op_${hero.vsCode}.webp`;
  preload.src = document.body.classList.contains('portrait') ? portraitAsset(nextPath) : nextPath;
  sound.bgm('opening');
}
function versus() {
  mode = 'versus'; hero = players[0]; stageIndex = 0;
  const controlPanel = (owner, fighter) => `<section class="setup-panel"><div class="setup-fighter"><img src="${iconAsset(fighter.icon)}" alt=""><div><small>PLAYER ${owner+1}</small><h3>${fighter.name}</h3><span class="fighter-english">${fighter.englishName}</span></div></div><div class="control-options" aria-label="P${owner+1}の操作方法">${twoPlayer.controlOrder.map(id => `<button class="${controls[owner] === id ? 'active' : ''}" ${controls[1-owner] === id ? 'disabled' : ''} data-action="control" data-owner="${owner}" data-id="${id}">${twoPlayer.controlTypes[id].label}</button>`).join('')}</div>${controls[owner] === 'mouse' ? '<p>場札をクリック・タップして回答します。<br>同じ端末で、キーボードの相手と対戦できます。</p>' : `<div class="keyboard-map">${twoPlayer.keyboardLayouts[controls[owner]].map(k => `<kbd>${k.label}</kbd>`).join('')}</div>`}<p>体力100・必殺技なし。先に2ラウンドを取れば勝利。</p></section>`;
  setScreen('setup', `${top('LOCAL VERSUS / SAME DEVICE', '2P <em>BATTLE</em>')}<div class="content-area"><div class="setup-sides">${controlPanel(0,players[0])}${controlPanel(1,players[1])}</div></div><div class="bottom-nav"><button class="btn" data-action="title">← BACK</button><span class="bottom-note">同じ操作方法を2人で使用することはできません</span><button class="btn gold" data-action="start-versus">START BATTLE →</button></div>`); sound.bgm('select');
}
function vs() {
  const path = `vs/vs_${stageIndex + 1}_${hero.vsCode}.webp`;
  if (mode === 'versus') { beginBattle(); return; }
  saveProgress('battle');
  setScreen('vs', `${artwork(path, 'cinema-art', `${hero.name} VS ${enemies[stageIndex].name}`)}<div class="vs-stage">STAGE 0${stageIndex+1} / ${difficulty.toUpperCase()} / FIRST TO 2</div><div class="vs-bar"><i></i></div><button class="btn small vs-skip" data-action="skip-vs">SKIP →</button>`);
  sound.fadeOut(700); sound.play('vs'); later(beginBattle, 4800);
  const preload = new Image(); preload.src = iconAsset(enemies[stageIndex].icon);
}
function guide() {
  setScreen('guide', `${top('HOW TO PLAY / CLASSIFICATION BATTLE', 'BATTLE <em>GUIDE</em>')}<div class="content-area"><div class="guide-grid"><section class="guide-block"><div class="step">01</div><h3>番号を聞く</h3><p>NDCは本の内容を表す3桁の分類記号。2秒ごとに1桁ずつ読み上げられます。</p><div class="guide-example"><b>547</b><span>→ 電気工学</span></div><p>場札には分類名のみが表示されます。音と数字から、対応する札を見つけよう。</p></section><section class="guide-block"><div class="step">02</div><h3>札を取って、連撃</h3><p>相手より先に正しい札を取るとダメージ。3桁目の読み上げ完了前の連続正解でコンボが増えます。</p><div class="guide-example"><b>2</b><span>HIT COMBO / DAMAGE UP</span></div><p>お手つきすると、そのターンの解答権を失います。双方が誤答するとダメージなし。</p></section><section class="guide-block"><div class="step">03</div><h3>必殺技で逆転</h3><p>速い正解ほどSUPERゲージが上昇。満タンになったらSPACEかSPECIALボタンで発動！</p><div class="guide-example"><b>2</b><span>ROUNDS TO WIN</span></div><p>1ターン15秒、1ラウンド10ターン。体力0または残り体力で決着。2ラウンド先取で勝利。</p></section></div><div class="guide-controls"><p><b>操作</b>　札：クリック／タップ／上段 1–6・下段 Q W E R T　　必殺技：SPACE　　一時停止：ESC</p><p><b>EASY</b>　1の位が0の分類だけで練習できます。</p></div></div><div class="bottom-nav"><button class="btn" data-action="title">← BACK</button><span class="bottom-note">残り体力が同じ場合はP1の勝利。SUPERゲージはラウンド間で引き継ぎ。</span><button class="btn gold" data-action="training">TRY TRAINING →</button></div>`); sound.bgm('select');
}
function beginBattle(training = false) {
  // First story battle doubles as the original game's interactive tutorial.
  const train = training === true || (mode === 'story' && !saved.tutorialSeen);
  battle = new Battle({ player: hero, stage: stageIndex, difficulty, mode, training: train });
  battle.onEvent = onBattleEvent; renderBattle(); sound.bgm(stageIndex === 3 ? 'battle2' : 'battle1');
  if (!train) saveProgress('battle');
  sound.play('roundcall'); syncOverlay(); lastFrame = performance.now();
}
function face(f, owner) {
  const name = esc(f.englishName.toUpperCase());
  const controlsLabel = mode === 'versus' ? twoPlayer.controlTypes[controls[owner]].shortLabel : '';
  return `<div class="combatant ${owner ? 'right' : ''}" id="fighter-${owner}"><div class="face"><img id="face-${owner}" src="${iconAsset(f.icon)}" alt="${f.name}"></div><div class="life-panel"><div class="combatant-name">${owner ? `<span>${mode === 'versus' ? 'P2' : 'CPU'}</span><b>${name}</b>` : `<b>${name}</b><span>P1</span>`}</div><div class="life-track" role="progressbar" aria-label="${f.name}の体力" id="life-${owner}"><div class="life-trail"></div><div class="life-fill"></div></div><div class="combatant-meta"><div class="round-markers">${[0,1].map(() => '<i></i>').join('')}</div><span>${controlsLabel}</span></div></div></div>`;
}
function superPanel(owner) { return `<div class="super-panel ${owner ? 'right' : ''}"><div class="super-info"><div class="super-label"><strong>SUPER</strong><span id="gauge-label-${owner}">CHARGE</span></div><div class="super-track" role="progressbar" aria-label="${owner ? '敵' : 'プレイヤー'}の必殺技ゲージ" id="gauge-${owner}"><i class="super-fill"></i></div></div>${owner ? '' : '<div><button class="special-btn" id="special-btn" data-action="special" disabled>SPECIAL</button><div class="special-key">SPACE / TAP</div></div>'}</div>`; }
function renderBattle() {
  const b = battle;
  setScreen('battle', `<div class="battle-floor"></div><img class="battle-bg-fighter left" src="${hero.selectImage}" alt=""><img class="battle-bg-fighter right" src="${iconAsset(b.enemy.icon)}" alt=""><div class="battle-hud">${face(hero,0)}<div class="clock"><small id="stage-round"></small><strong id="clock"><span>1</span><span>5</span><span class="clock-dot">.</span><span>0</span></strong><span id="turn-label"></span></div>${face(b.enemy,1)}</div><div class="reading"><div class="reading-label">NDC / READ THE CODE <span id="reverse-label"></span></div><div class="digits">${[0,1,2].map(i=>`<div class="digit" id="digit-${i}"></div>`).join('')}</div></div><div class="turn-progress">${Array.from({length:10},()=>'<i></i>').join('')}</div><div class="card-grid" aria-label="分類札"></div><div class="battle-message" role="status"><b>READY</b><span>数字から分類札を見極めよう</span></div><div class="super-row ${b.training ? 'training' : ''}">${mode === 'story' && !b.training ? superPanel(0)+superPanel(1) : `<div class="bottom-note">${mode === 'versus' ? `P1: ${twoPlayer.controlTypes[controls[0]].shortLabel} / P2: ${twoPlayer.controlTypes[controls[1]].shortLabel} ・ 必殺技なし` : '上段 1–6 / 下段 Q W E R T'} ・ ESCで一時停止</div>`}</div>${b.training ? '<aside class="battle-training"><b>TRAINING / 01</b>数字に対応する分類札を取ろう。<br>練習中は相手が札を取りません。<br>間違えても、もう一度挑戦できます。<button class="btn small" data-action="skip-training">SKIP TRAINING</button></aside>' : ''}<div id="core-overlay"></div>`);
  renderCards({ deal: true }); updateHud();
}
function keyLabel(owner, slot) { const type = mode === 'versus' ? controls[owner] : owner === 0 ? 'keyboardA' : 'mouse'; return twoPlayer.keyboardLayouts[type]?.[slot]?.label || ''; }
function createCard(card, slot) {
  const node = document.createElement('button'); node.type = 'button'; node.className = 'card';
  if (card) node.classList.add('deal');
  return node;
}
function updateCard(node, card, slot) {
  const changed = node.dataset.ndc !== (card?.ndc || ''), wasHint = node.classList.contains('hint');
  node.dataset.slot = slot; node.style.setProperty('--i',slot);
  node.classList.toggle('empty', !card); node.classList.remove('cpu-aim','miss','hint','correct');
  if (!card) { node.dataset.ndc = ''; node.disabled = true; node.setAttribute('aria-hidden','true'); return; }
  node.removeAttribute('aria-hidden'); node.dataset.action = 'card'; node.dataset.ndc = card.ndc;
  node.setAttribute('aria-label',card.subject);
  if (changed) {
    node.dataset.labelFit = 'pending';
    node.innerHTML = `<span class="card-subject">${cardLabel(card.subject)}</span><span class="key-badge"></span>${mode === 'versus' ? '<span class="key-badge p2"></span>' : ''}`;
  }
  const p1 = node.querySelector('.key-badge'), p2 = node.querySelector('.key-badge.p2');
  p1.textContent = keyLabel(0,slot) ? `${mode === 'versus' ? 'P1 ' : ''}${keyLabel(0,slot)}` : '';
  if (p2) p2.textContent = keyLabel(1,slot) ? `P2 ${keyLabel(1,slot)}` : '';
  if (battle.hints.includes(card.ndc)) { node.classList.add('hint'); node.classList.toggle('correct',battle.hintKind === 'correct'); }
  if (wasHint !== node.classList.contains('hint')) node.dataset.labelFit = 'pending';
}
function renderCards({ deal = false } = {}) {
  if (!battle || current !== 'battle') return;
  const grid = $('.card-grid');
  if (deal) grid.replaceChildren();
  else for (const node of grid.children) node.classList.remove('deal');
  syncField(grid, battle.field, createCard, updateCard);
  fitCardLabels(grid);
}
function message(main, sub) { const el = $('.battle-message'); if (el) { el.innerHTML = `<b>${esc(main)}</b><span>${esc(sub)}</span>`; $('#announcer').textContent = `${main} ${sub}`; } }
function updateHud() {
  const b = battle; if (!b || current !== 'battle') return;
  $('#stage-round').textContent = b.training ? 'TRAINING' : mode === 'versus' ? `ROUND ${b.round}` : `ST ${stageIndex+1} / RD ${b.round}`;
  $('#turn-label').textContent = `TURN ${Math.max(1,b.turn)} / 10`;
  for (let owner = 0; owner < 2; owner++) {
    const life = $(`#life-${owner}`), percent = b.hp[owner] / b.maxHp[owner] * 100;
    life.setAttribute('aria-valuenow',b.hp[owner]); life.setAttribute('aria-valuemin',0); life.setAttribute('aria-valuemax',b.maxHp[owner]);
    life.querySelector('.life-fill').style.width = `${Math.max(0,percent-1)}%`; life.querySelector('.life-trail').style.width = `${Math.max(0,percent-1)}%`;
    $(`#fighter-${owner}`).classList.toggle('locked',b.disabled[owner]);
    $(`#fighter-${owner} .round-markers`).innerHTML = [0,1].map(i=>`<i class="${i < b.wins[owner] ? 'won' : ''}"></i>`).join('');
    const gauge = $(`#gauge-${owner}`);
    if (gauge) { gauge.setAttribute('aria-valuenow', b.gauge[owner]); gauge.setAttribute('aria-valuemin',0); gauge.setAttribute('aria-valuemax',100); gauge.querySelector('i').style.width = `${b.gauge[owner]}%`; $(`#gauge-label-${owner}`).textContent = b.gauge[owner] >= 100 ? 'READY' : owner === 0 && b.rushActive ? `POWER ${b.rushStreak}/3` : 'CHARGE'; }
  }
  const special = $('#special-btn'); if (special) { const ready = b.gauge[0] >= 100 && !(b.rushActive || b.rush > 0); special.disabled = !ready || b.phase !== 'turn' || !!b.cutin || b.paused; special.classList.toggle('ready',ready); }
  [...$('.turn-progress').children].forEach((el,i) => el.className = i < b.turn-1 ? 'past' : i === b.turn-1 ? 'current' : '');
  $('.reading').classList.toggle('reverse',b.reverseActive); $('#reverse-label').textContent = b.reverseActive ? '← REVERSE' : '';
  $('.reading').style.visibility = b.phase === 'intro' ? 'hidden' : 'visible';
  [...$('.card-grid').children].forEach((el,i) => { if(el.tagName === 'BUTTON') { const owner = mode === 'versus' ? controls.indexOf('mouse') : 0; el.disabled = b.phase !== 'turn' || b.paused || !!b.cutin || owner < 0 || b.disabled[owner]; } });
}
function fighterIcon(owner, state = '') { const f = owner ? battle.enemy : hero; return iconAsset(f.icon.replace('.webp',state ? `_${state}.webp` : '.webp')); }
function syncOverlay() {
  const b = battle, root = $('#core-overlay'); if (!b || !root) return;
  let sig = b.phase;
  if (b.cutin) sig = `cutin-${b.cutin.owner}`;
  else if (b.phase === 'intro') sig = b.phaseTime > 1700 ? 'round-call' : 'fight-call';
  else if (b.phase === 'roundOver') sig = b.perfect && b.phaseTime < 1600 ? 'perfect' : b.finishLabel;
  if (sig === overlaySignature) return; overlaySignature = sig;
  root.innerHTML = '';
  if (sig.startsWith('cutin-')) {
    const owner = b.cutin.owner, f = owner ? b.enemy : hero, look = specialDecor(f);
    root.innerHTML = `<div class="cutin cinematic-special ${owner ? 'enemy' : ''}" style="--special-color:${look.color};--art-focus:${look.focus}">${look.html}<div class="special-entry" aria-hidden="true"></div><img src="${f.cutin}" alt=""><div class="cutin-caption"><small>${owner ? 'CPU' : 'PLAYER 1'} / SPECIAL ART</small>${f.skillName}</div></div>`;
  } else if (sig === 'round-call') root.innerHTML = `<div class="fight-call"><small>PROVE YOUR CLASSIFICATION SKILL</small><b>${b.training ? 'TRAINING' : `ROUND ${b.round}`}</b></div>`;
  else if (sig === 'fight-call') root.innerHTML = '<div class="fight-call"><small>KNOWLEDGE IS YOUR WEAPON</small><b>FIGHT</b></div>';
  else if (b.phase === 'roundOver') {
    const label = sig === 'perfect' ? 'PERFECT' : b.finishLabel;
    root.innerHTML = `<div class="fight-call ${sig === 'perfect' ? 'perfect' : sig === 'K.O.' ? 'ko' : 'timeup'}">${sig === 'K.O.' ? '<div class="ko-strike" aria-hidden="true"></div>' : ''}<small>${sig === 'perfect' ? 'FLAWLESS CLASSIFICATION' : `ROUND ${b.round} FINISH`}</small><b>${label}</b></div>`;
    if (sig === 'perfect') sound.play('perfect');
  } else if (b.phase === 'roundWinner') {
    const f = b.roundOwner ? b.enemy : hero, code = b.roundOwner && mode === 'story' ? `enemy${stageIndex+1}` : f.vsCode;
    const path = `round/round_${code}.webp`; unlock(path);
    root.innerHTML = `<div class="round-winner"><img class="round-winner-backdrop" src="${path}" alt=""><img class="round-winner-art" src="${path}" alt="${f.name}のラウンド勝利"><div class="round-winner-text"><small>ROUND ${b.round}</small>${f.englishName.toUpperCase()}<span>WINS</span></div></div>`;
  }
}
function addEffect(html, duration = 1000) { const e = document.createElement('div'); e.innerHTML = html; while (e.firstChild) { const child = e.firstChild; effects.appendChild(child); later(()=>child.remove(),duration); } }
function burst(slot, owner, combo, finishing = false) {
  const card = $('.card-grid').children[slot], life = $(`#life-${1-owner}`);
  if (!saved.settings.motion) return;
  const g = strikeGeometry(card.getBoundingClientRect(), life.getBoundingClientRect(), stage.getBoundingClientRect(), stage.clientWidth);
  const color = finishing || combo >= 3 ? '#ffe1a0' : owner ? '#ff8498' : '#b0edff';
  const ghost = card.cloneNode(true);
  ghost.removeAttribute('id'); ghost.removeAttribute('data-action'); ghost.removeAttribute('data-slot'); ghost.removeAttribute('data-ndc');
  ghost.className = 'card pickup-ghost'; ghost.disabled = true; ghost.tabIndex = -1; ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style, { left:`${g.left}px`, top:`${g.top}px`, width:`${g.width}px`, height:`${g.height}px`, '--strike-color':color });
  effects.appendChild(ghost); later(()=>ghost.remove(),550);
  addEffect(`<svg class="strike-flight ${finishing ? 'final' : combo >= 3 ? 'combo' : ''}" viewBox="0 0 ${stage.clientWidth} ${stage.clientHeight}" style="--strike-color:${color}" aria-hidden="true"><path d="${g.path}" pathLength="100"/></svg><div class="impact-spark ${finishing ? 'final' : ''}" style="left:${g.target.x}px;top:${g.target.y}px;--strike-color:${color}"></div>`,800);
  addEffect(`<div class="hit-ring ${owner ? 'enemy' : ''}" style="left:${g.source.x}px;top:${g.source.y}px"></div>`,500);
  const count = finishing ? 48 : combo >= 3 ? 30 : 16;
  for(let i=0;i<count;i++) { const angle=Math.random()*Math.PI*2, speed=60+Math.random()*(finishing?430:220); particleList.push({x:g.source.x,y:g.source.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.25+Math.random()*.35,max:.6,color,size:1+Math.random()*2}); }
  later(()=>{
    life.classList.remove('life-struck'); void life.offsetWidth; life.classList.add('life-struck');
    later(()=>life.classList.remove('life-struck'),450);
    if(combo >= 3 || finishing) { stage.classList.remove('screen-impact','finish-impact'); void stage.offsetWidth; stage.classList.add(finishing?'finish-impact':'screen-impact'); }
    if(finishing) addEffect(`<div class="finish-focus" style="--finish-x:${g.target.x}px;--finish-y:${g.target.y}px"></div><div class="finish-burst" style="left:${g.target.x}px;top:${g.target.y}px">${Array.from({length:12},(_,i)=>`<i style="--n:${i}"></i>`).join('')}</div>`,1100);
  },180);
}
function onBattleEvent(e) {
  if (!battle || current !== 'battle') return;
  const b = battle;
  if (e.type === 'digit') { const el = $(`#digit-${e.index}`); el.textContent = e.value; el.classList.add('revealed'); sound.digit(e.value); }
  else if (e.type === 'turn' || e.type === 'round') {
    renderCards({ deal: e.type === 'round' }); [0,1,2].forEach(i=>{ $(`#digit-${i}`).textContent=''; $(`#digit-${i}`).classList.remove('revealed'); });
    [0,1].forEach(i=>$(`#face-${i}`).src=fighterIcon(i));
    message(b.reverseActive ? 'REVERSE' : `TURN ${b.turn || 1}`, b.disabled[1] && !b.training ? '相手はこのターン解答できない' : b.rushActive ? 'POWER RUSH — 3連続正解でK.O.!' : '番号に対応する分類札を取れ');
    if(e.type === 'round') sound.play('roundcall');
  } else if (e.type === 'cpuAim') {
    const slot = b.field.findIndex(c=>c?.ndc===e.ndc); if(slot>=0) $('.card-grid').children[slot]?.classList.add('cpu-aim');
  } else if (e.type === 'miss') {
    sound.play('ng'); const el = $('.card-grid').children[e.slot]; el.classList.remove('miss'); void el.offsetWidth; el.classList.add('miss');
    $(`#face-${e.owner}`).src=fighterIcon(e.owner,'damage');
    message('MISS', b.training ? '違う分類です。数字を見て、もう一度挑戦しよう' : `${e.owner ? b.enemy.name : hero.name}はこのターン解答できない`);
  } else if (e.type === 'hit') {
    burst(e.slot,e.owner,e.combo,b.hp[1-e.owner] === 0); sound.play('correct', e.combo >= 3 ? .95 : .85, 1 + Math.min(4,Math.max(0,e.combo-1)) * .025);
    const el=$('.card-grid').children[e.slot]; el.classList.add('empty');
    $(`#face-${e.owner}`).src=fighterIcon(e.owner,'get'); $(`#face-${1-e.owner}`).src=fighterIcon(1-e.owner,'damage');
    message(e.owner ? 'CPU STRIKE' : 'GOOD HIT', `${e.card.ndc} / ${e.card.subject} — ${e.damage} DAMAGE`);
    addEffect(`<div class="damage-pop ${e.owner === 0 ? 'enemy' : ''}">−${e.damage}</div>`,900);
    if(e.combo>=2) { effects.querySelectorAll('.combo-pop').forEach(el=>el.remove()); addEffect(`<div class="combo-pop ${e.owner ? 'right' : ''}"><b>${e.combo}</b><span>HIT COMBO</span><small>${e.damage} DAMAGE</small></div>`,1400); }
  } else if(e.type === 'cutin') { unlock(e.fighter.cutin); renderCards(); sound.stopVoices(); sound.play('special'); message('SPECIAL ART',e.fighter.skillName); }
  else if(e.type === 'noAnswer') message('NO ANSWER','ダメージなし。次のターンへ');
  else if(e.type === 'roundOver') { sound.stopVoices(); sound.play(e.label === 'K.O.' ? 'KO' : 'timeup'); }
  else if(e.type === 'roundWinner') sound.play(`win_${e.owner && mode === 'story' ? 'enemy' : (e.owner ? b.enemy.vsCode : hero.vsCode)}`);
  else if(e.type === 'matchOver') { result(e.owner,b.wins); return; }
  else if(e.type === 'trainingComplete') {
    sound.play('correct'); $('.card-grid').children[e.slot].classList.add('hint','correct');
    showModal(`<h2>GOOD HIT!</h2><p>正解です。早めの連続正解でコンボが増え、ダメージも上昇します。SUPERゲージが満タンになったら、SPACEかSPECIALで必殺技を発動しましょう。</p><div class="modal-actions"><button class="btn gold" data-action="finish-training">${mode === 'training' ? 'BACK TO GUIDE' : 'START BATTLE →'}</button></div>`,false);
  }
  updateHud(); syncOverlay();
}
function result(owner, wins) {
  const won = owner === 0, f = won ? hero : mode === 'versus' ? players[1] : enemies[stageIndex];
  const code = won || mode === 'versus' ? f.vsCode : `enemy${stageIndex+1}`, path = `victory/win_${code}.webp`; unlock(path); reward = null;
  const line = mode === 'versus' ? twoPlayer.victoryLines[won?'player':'enemy'][Math.floor(Math.random()*3)] : TUNING.lines[hero.id]?.[enemies[stageIndex].id]?.[won?'win':'lose'];
  if (won && mode === 'story') {
    if(stageIndex===3) { saveProgress('ending',{scene:0}); const locked = Array.from({length:25},(_,i)=>i+1).filter(n=>!saved.artworks.includes(n)); reward = shuffle(locked)[0] || null; if(reward) {saved.artworks.push(reward);persist();} }
    else saveProgress('battle',{stage:stageIndex+1});
  }
  setScreen('result', `${artwork(path, 'result-art', `${f.name}の勝利`)}<h1 class="sr-only">${f.name}の勝利。ラウンドスコア ${wins[0]} 対 ${wins[1]}</h1><div class="result-quote"><span>${esc(line || f.winLine)}</span></div>${reward ? `<div class="result-reward">✦ NEW ARTWORK UNLOCKED — No. ${String(reward).padStart(2,'0')}</div>` : ''}<div class="result-actions">${mode === 'versus' ? '<button class="btn" data-action="title">TITLE</button><button class="btn gold" data-action="rematch">REMATCH →</button>' : won ? `<button class="btn gold" data-action="${stageIndex === 3 ? 'ending' : 'next-stage'}">${stageIndex === 3 ? 'ENDING →' : 'NEXT STAGE →'}</button>` : '<button class="btn" data-action="title">TITLE</button><button class="btn gold" data-action="retry">CONTINUE →</button>'}</div>`); sound.bgm('victory');
}
function ending(index = 0) {
  storyScene = Math.max(0,Math.min(1,index)); const path=`ending/ending_${hero.vsCode}${storyScene+1}.webp`; unlock(path); saveProgress('ending');
  setScreen('ending', `${artwork(path, 'cinema-art', `${hero.name}のエンディング`)}<div class="cinema-shade"></div><section class="cinema-caption"><div class="eyebrow">EPILOGUE / ${hero.englishName.toUpperCase()}</div>${(ENDINGS[hero.name]?.[String(storyScene+1)] || []).map(l=>`<p>${esc(l)}</p>`).join('')}</section><div class="cinema-bottom"><small>${storyScene+1} / 2 — THE STORY CONTINUES</small><button class="btn gold small" data-action="next-ending">${storyScene ? 'CREDITS →' : 'NEXT →'}</button></div>`); sound.bgm('ending');
}
function credits() {
  saved.progress=null;persist();
  setScreen('credits', `<div class="credits-window"><div class="credits-roll"><h2>NDC KARUTA HEROES</h2>${[['STORY','ChatGPT'],['ILLUSTRATION','ChatGPT'],['PROGRAMMING','Codex'],['BGM','Suno'],['SE / VOICE','効果音ラボ・ElevenLabs'],['NDC','日本図書館協会'],['PRODUCE','やわらか図書館学']].map(([k,v])=>`<p><small>${k}</small>${v}</p>`).join('')}</div></div><div class="bottom-nav"><button class="btn" data-action="title">TITLE</button><button class="btn small" data-action="credits-end">SKIP ROLL →</button></div>`); sound.bgm('ending'); later(creditsEnd, 38000);
}
function creditsEnd() { if(current!=='credits')return; $('.credits-window')?.remove(); screen.insertAdjacentHTML('beforeend','<div class="credits-end"><div class="eyebrow" style="justify-content:center">SPECIAL THANKS</div><p>すべての図書館を愛するプレイヤーへ</p><h2>THANK YOU FOR PLAYING</h2></div>'); $('[data-action="credits-end"]')?.remove(); }
const tracks = [['select','CHARACTER SELECT'],['opening','PROLOGUE'],['battle1','BATTLE / I–III'],['battle2','THE FINAL BATTLE'],['victory','VICTORY'],['ending','EPILOGUE']];
function galleryItems() {
  if(galleryTab === 'cutin') return [...players,...enemies].map(f=>({path:f.cutin,label:f.name}));
  if(galleryTab === 'victory') return [...players,...enemies].flatMap(f=>{const code=f.vsCode || `enemy${enemies.indexOf(f)+1}`;return [{path:`victory/win_${code}.webp`,label:`${f.name} / WIN`},{path:`round/round_${code}.webp`,label:`${f.name} / ROUND`}];});
  if(galleryTab === 'story') return [{path:'opening/op_common.webp',label:'PROLOGUE'},...players.flatMap(f=>[{path:`opening/op_${f.vsCode}.webp`,label:`${f.name} / OPENING`},...[1,2].map(n=>({path:`ending/ending_${f.vsCode}${n}.webp`,label:`${f.name} / ENDING ${n}`,lines:ENDINGS[f.name]?.[String(n)]}))])];
  if(galleryTab === 'artwork') return Array.from({length:25},(_,i)=>({path:`artwork/artwork${String(i+1).padStart(2,'0')}.webp`,label:`ARTWORK ${String(i+1).padStart(2,'0')}`,number:i+1}));
  return [];
}
function gallery() {
  const items=galleryItems(), isOpen=i=>i.number?saved.artworks.includes(i.number):saved.unlocked.includes(i.path);
  setScreen('gallery', `${top('ARCHIVE / YOUR JOURNEY', 'HEROES <em>GALLERY</em>')}<div class="gallery-tabs" role="group" aria-label="ギャラリー分類">${[['cutin','SPECIAL ART'],['victory','VICTORY'],['story','STORY'],['artwork','ARTWORK'],['sound','SOUND TEST']].map(([id,name])=>`<button class="${galleryTab===id?'active':''}" data-action="gallery-tab" data-id="${id}" aria-pressed="${galleryTab===id}">${name}</button>`).join('')}</div><div class="content-area"><div class="gallery-grid">${galleryTab==='sound'?tracks.map(([id,name])=>`<button class="gallery-item sound-item" data-action="track" data-id="${id}"><small>ORIGINAL SOUNDTRACK</small><b>♫ ${id.toUpperCase()}</b><span>${name}</span></button>`).join(''):items.map((item,i)=>`<button class="gallery-item ${isOpen(item)?'':'locked'}" ${isOpen(item)?`data-action="view-art" data-index="${i}"`:'disabled'}>${isOpen(item)?artwork(item.path, '', item.label, true):'<div class="lock">◇ LOCKED</div>'}<span>${item.label}</span></button>`).join('')}</div></div><div class="bottom-nav"><button class="btn" data-action="title">← BACK</button><span class="bottom-note">見た演出を記録。STORYクリアで新しいアートワークを獲得。</span><span class="bottom-note">${galleryTab==='sound'?`${tracks.length} TRACKS`:`${items.filter(isOpen).length} / ${items.length} UNLOCKED`}</span></div>`); sound.bgm('select');
}
function showModal(html, dismissible = true, pauseAudio = true) {
  modalPreviousFocus = document.activeElement; modalPausesAudio = pauseAudio; if(battle) battle.paused=true; if(pauseAudio) sound.pause(); else sound.stopVoices();
  modal.innerHTML=`<div class="modal-shade"><section class="modal-panel" role="dialog" aria-modal="true" aria-label="${current==='battle'?'バトルメニュー':'設定'}">${dismissible?'<button class="modal-close" data-action="close-modal" aria-label="閉じる">×</button>':''}${html}</section></div>`;
  modal.querySelector('button,input')?.focus({preventScroll:true}); updateHud();
}
function closeModal() { if(current==='gallery')sound.stopVoices(); modal.innerHTML=''; modalPausesAudio=true; if(battle)battle.paused=document.hidden; if(!document.hidden)sound.resume(); modalPreviousFocus?.focus?.({preventScroll:true}); updateHud(); }
function analyticsNotice() {
  const active = window.karutaAnalyticsEnabled === true;
  return `<details class="privacy-notice"><summary>アクセス解析について</summary><p>${active ? '本ゲームでは、利用状況の把握と改善のためGoogle Analyticsを使用しています。Cookie等を利用し、アクセス状況、セッション、概算地域、ブラウザ・端末情報などがGoogleへ送信されます。ゲームから氏名・メールアドレスやセーブデータを送信することはありません。' : 'このローカル版・確認用画面ではアクセス解析を行いません。公開版では、利用状況の把握と改善のためGoogle Analyticsを使用します。'}進行状況とギャラリーの開放状況は、このブラウザ内に保存されます。</p><p>公開版の計測にはGoogleの規約とプライバシーポリシーが適用されます。計測を無効にしたい場合は、Googleのオプトアウトアドオンをご利用ください。</p><p><a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noopener noreferrer">Googleのプライバシーポリシー</a> · <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer">オプトアウト</a></p></details>`;
}
function settings() {
  showModal(`<h2>${current==='battle'?'PAUSE':'SETTINGS'}</h2><div class="settings-row"><span>サウンド</span><button data-action="sound">${saved.settings.sound?'ON':'OFF'}</button></div><label class="settings-row"><span>音量</span><input type="range" min="0" max="1" step="0.05" value="${saved.settings.volume}" aria-label="音量"></label><div class="settings-row"><span>画面揺れ・エフェクト <small> / REDUCED MOTION</small></span><button data-action="motion">${saved.settings.motion?'ON':'OFF'}</button></div><p>${current==='battle'?'ゲームは一時停止しています。必殺技の演出中も、読み上げとCPUは停止します。':'進行状況とギャラリーは、このブラウザに自動保存されます。'}</p>${analyticsNotice()}<div class="modal-actions">${current==='battle'?'<button class="btn" data-action="quit">TITLE</button>':''}<button class="btn gold" data-action="close-modal">${current==='battle'?'RESUME →':'CLOSE'}</button></div>`);
}
function continueStory() {
  const p=saved.progress;if(!p)return;hero=players.find(h=>h.id===p.player);difficulty=p.difficulty;stageIndex=p.stage;mode='story';
  if(p.phase==='ending')ending(p.scene||0);else if(p.phase==='opening')opening(p.scene||0);else vs();
}
function training() { mode='training';hero=players[0];stageIndex=0;difficulty='normal';beginBattle(true); }
function finishTraining() {
  const guideOnly=mode==='training';saved.tutorialSeen=true;persist();closeModal();if(guideOnly)guide();else beginBattle(false);
}
function viewArt(index) {
  const item=galleryItems()[index];if(!item)return;
  showModal('', true, false);modal.innerHTML=`<div class="modal-shade"><section class="gallery-view" role="dialog" aria-modal="true" aria-label="${item.label}">${artwork(item.path, '', item.label)}${item.lines?`<div class="ending-lines">${item.lines.map(l=>`<div>${esc(l)}</div>`).join('')}</div>`:''}<div class="gallery-view-footer"><span>${item.label}</span><button class="btn small" data-action="close-modal">CLOSE ×</button></div></section></div>`;
  modal.querySelector('button').focus();if(item.number)sound.play('artwork');
}
async function fullscreen() { try { if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen(); } catch { toast('全画面に対応していないブラウザです。通常表示でプレイできます。'); } }
document.addEventListener('click', event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action;
  if(action==='card'){ if(modal.children.length)return;const owner=mode==='versus'?controls.indexOf('mouse'):0;if(owner>=0)battle?.answer(Number(el.dataset.slot),owner);return; }
  if(action==='special'){battle?.special();updateHud();return;}
  if(action==='sound'){saved.settings.sound=!saved.settings.sound;persist();applySettings();if(modal.children.length)settings();return;}
  if(action==='motion'){saved.settings.motion=!saved.settings.motion;persist();applySettings();settings();return;}
  if(action==='fullscreen'){fullscreen();return;}
  if(action==='settings'){settings();return;}
  if(action==='close-modal'){closeModal();return;}
  if(action==='title'||action==='quit'){closeModal();wipe(title);return;}
  if(action==='story'){wipe(()=>{select();later(()=>sound.play('character'),500);});}
  else if(action==='hero'){hero=players.find(p=>p.id===el.dataset.id)||hero;updateSelect();}
  else if(action==='difficulty'){difficulty=el.dataset.id;updateDifficulty();}
  else if(action==='launch'){stageIndex=0;storyScene=0;mode='story';sound.fadeOut();wipe(()=>opening());}
  else if(action==='next-story'){if(storyScene<3)opening(storyScene+1);else wipe(vs);}
  else if(action==='skip-story')wipe(vs);
  else if(action==='skip-vs')beginBattle();
  else if(action==='versus')wipe(versus);
  else if(action==='control'){controls[Number(el.dataset.owner)]=el.dataset.id;versus();}
  else if(action==='start-versus'||action==='rematch')wipe(()=>beginBattle(false));
  else if(action==='help')wipe(guide);
  else if(action==='training')wipe(training);
  else if(action==='finish-training'||action==='skip-training')finishTraining();
  else if(action==='retry')wipe(vs);
  else if(action==='next-stage'){stageIndex++;wipe(vs);}
  else if(action==='ending')wipe(()=>ending());
  else if(action==='next-ending'){if(storyScene===0)ending(1);else credits();}
  else if(action==='credits-end')creditsEnd();
  else if(action==='gallery')wipe(gallery);
  else if(action==='gallery-tab'){galleryTab=el.dataset.id;gallery();}
  else if(action==='view-art')viewArt(Number(el.dataset.index));
  else if(action==='track'){sound.bgm(el.dataset.id);toast(`♫ ${el.dataset.id.toUpperCase()}`);}
  else if(action==='continue')wipe(continueStory);
});
document.addEventListener('input',event=>{if(event.target.matches('input[type="range"]')){saved.settings.volume=Number(event.target.value);persist();sound.update();if(battle)sound.pause();}});
document.addEventListener('keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;
  if(modal.children.length){
    if(event.key==='Escape' && modal.querySelector('[data-action="close-modal"]')){event.preventDefault();closeModal();}
    if(event.key==='Tab'){const list=[...modal.querySelectorAll('button:not(:disabled),input,a[href]')];if(list.length){const first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}return;
  }
  if(current==='battle' && battle){
    if(event.key==='Escape'){event.preventDefault();settings();return;}
    if(event.code==='Space'){event.preventDefault();battle.special();updateHud();return;}
    for(let owner=0;owner<2;owner++){
      if(owner===1&&mode!=='versus')continue;
      const layout=twoPlayer.keyboardLayouts[mode==='versus'?controls[owner]:'keyboardA'];
      const slot=layout?.findIndex(k=>k.codes.includes(event.code)||k.keys.includes(event.key.toLowerCase()));
      if(slot>=0){event.preventDefault();battle.answer(slot,owner);return;}
    }
  }else if(current==='select' && ['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();hero=players[(players.indexOf(hero)+(event.key==='ArrowRight'?1:4))%5];updateSelect();}
});
document.addEventListener('visibilitychange',()=>{
  lastFrame=performance.now();if(document.hidden){sound.pause();if(battle){battle.paused=true;if(!modal.children.length)settings();}}
  else if(!modal.children.length || !modalPausesAudio)sound.resume();
});
function frame(now){
  const dt=Math.min(1000,Math.max(0,now-lastFrame));lastFrame=now;
  if(battle&&current==='battle'){
    battle.step(dt);if(battle){const clock=$('#clock'), timeText=battle.phase==='turn'?Math.max(0,(15000-battle.elapsed)/1000).toFixed(1).padStart(4,'0'):'15.0';if(clock.textContent!==timeText)[...clock.children].forEach((digit,i)=>{if(digit.textContent!==timeText[i])digit.textContent=timeText[i];});clock.classList.toggle('danger',battle.phase==='turn'&&battle.elapsed>12000);syncOverlay();}
  }
  sound.tick(now);
  ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);
  if(saved.settings.motion){
    particleList=particleList.filter(p=>p.life>0);for(const p of particleList){const s=dt/1000;p.life-=s;p.x+=p.vx*s;p.y+=p.vy*s;p.vy+=350*s;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size*3,p.size);}
    ctx.globalAlpha=1;
    if(current==='title'||current==='select'){ctx.fillStyle='#e5c87c';for(let i=0;i<23;i++){const x=(i*149.3+now*.003*(i%3+1))%stage.clientWidth,y=stage.clientHeight-((i*61+now*.012)%(stage.clientHeight+12));ctx.globalAlpha=.15+.2*Math.sin(now*.0008+i)**2;ctx.fillRect(x,y,1.5,1.5);}ctx.globalAlpha=1;}
  }
  requestAnimationFrame(frame);
}
title();requestAnimationFrame(frame);
// A deliberate read-only diagnostic snapshot for reproducible browser QA.
window.karutaHeroes = Object.freeze({ version:VERSION, snapshot:()=>({screen:current,mode,stage:stageIndex,hero:hero.id,phase:battle?.phase,turn:battle?.turn,round:battle?.round,hp:battle?[...battle.hp]:null,wins:battle?[...battle.wins]:null,paused:battle?.paused}) });
