(function () {
  'use strict';

  const ROUND_TIME_MS = 15000;
  const EARLY_WINDOW_MS = 6000;
  const CPU_CLICK_ANIM_MS = 230;
  const SKILL_CUTIN_DURATION_MS = 1160;
  const CHARACTER_SELECT_SOUND_DELAY_MS = 500;
  const MAX_GAUGE = 100;
  const BASE_DAMAGE = 14;
  const OPPONENT_HIT_GAUGE = 18;
  const NDC_JSON_URL = 'https://raw.githubusercontent.com/Yawatosho/karuta/refs/heads/main/ndc.json';
  const LOCAL_NDC_JSON_URL = 'ndc.json';
  const NDC_CACHE_KEY = 'ndc_json_cache_v2';
  const SELECT_ASSET_VERSION = 'fighters89';
  const karutaAudio = window.karutaAudio || null;

  const PLAYERS = [
    {
      id: 'librarian',
      name: '司書さん',
      englishName: 'The Librarian',
      shortName: '司書',
      image: 'reference/司書.png',
      vsCode: 'lib',
      icon: 'character/librarian_icon.png',
      selectImage: 'character/librarian_select.png',
      cutin: 'cutin/cutin_lib.png',
      skillName: 'LIBRARY FREEDAM',
      skillEffect: '次の問題で正解の札が光る',
      skillType: 'revealNext',
      stats: { atk: 3, def: 3 },
      damageDealtMultiplier: 1,
      damageTakenMultiplier: 1,
      story: '少し天然で優しい大学図書館の司書。図書館のことが大好き。',
      winLine: '静かに、でも確実に勝利です。',
      loseLine: 'まだ、分類の棚は読み切れていませんね。'
    },
    {
      id: 'detective',
      name: '探偵さん',
      englishName: 'The Detective',
      shortName: '探偵',
      image: 'reference/探偵.png',
      vsCode: 'det',
      icon: 'character/detective_icon.png',
      selectImage: 'character/detective_select.png',
      cutin: 'cutin/cutin_det.png',
      skillName: '謎は全て解けたよ！',
      skillEffect: '使われない札を1枚除外する',
      skillType: 'removeDecoy',
      stats: { atk: 4, def: 2 },
      damageDealtMultiplier: 1.2,
      damageTakenMultiplier: 1.2,
      story: '明るく元気な大学生の探偵。司書さんと仲良し。',
      winLine: '謎は全て解けた。勝利の分類番号もね。',
      loseLine: 'むむ、次の事件では必ず見抜くよ。'
    },
    {
      id: 'lily',
      name: 'リリー',
      englishName: 'Lily',
      shortName: 'リリー',
      image: 'reference/リリー.png',
      vsCode: 'lily',
      icon: 'character/lily_icon.png',
      selectImage: 'character/lily_select.png',
      cutin: 'cutin/cutin_lily.png',
      skillName: 'みんな、お願いっ！',
      skillEffect: '次の2ターン、相手の解答権を封じる',
      skillType: 'skipCpu',
      stats: { atk: 2, def: 4 },
      damageDealtMultiplier: 0.8,
      damageTakenMultiplier: 0.8,
      story: '本の声を聞くことができる、明るく元気なひよっこ司書。',
      winLine: 'みんなの声が、正しい棚まで導いてくれました。',
      loseLine: '本の声を、もっとちゃんと聞けるようになります。'
    }
  ];

  const ENEMIES = [
    {
      id: 'wind',
      name: '風の目録使い',
      englishName: 'The Wind Cataloger',
      image: 'reference/風の目録使い.png',
      icon: 'character/enemy1_icon.png',
      cutin: 'cutin/cutin_enemy1.png',
      skillName: '風配列',
      skillType: 'shuffle',
      preset: { correctRate: 0.80, reactionMinMs: 3800, reactionMaxMs: 5900 },
      winLine: '風向きは、こちらにあります。',
      loseLine: '見事です。あなたの索引は迷わない。'
    },
    {
      id: 'magician',
      name: '分類の魔術師',
      englishName: 'The Classification Mage',
      image: 'reference/分類の魔術師.png',
      icon: 'character/enemy2_icon.png',
      cutin: 'cutin/cutin_enemy2.png',
      skillName: '十進幻術',
      skillType: 'decimalIllusion',
      preset: { correctRate: 0.90, reactionMinMs: 2100, reactionMaxMs: 3900 },
      winLine: '分類の妙、味わっていただけましたかな。',
      loseLine: 'その読み、魔術より鮮やかだ。'
    },
    {
      id: 'digital',
      name: 'デジタルライブラリアン',
      englishName: 'The Digital Librarian',
      image: 'reference/デジタルライブラリアン.png',
      icon: 'character/enemy3_icon.png',
      cutin: 'cutin/cutin_enemy3.png',
      skillName: 'グリッチ・インデックス',
      skillType: 'glitchIndex',
      preset: { correctRate: 0.95, reactionMinMs: 800, reactionMaxMs: 1900 },
      winLine: 'ショウリ ログヲ キロク シマシタ。',
      loseLine: 'データ コウシン。アナタハ ツヨイ。'
    },
    {
      id: 'supreme',
      name: '至高の司書',
      englishName: 'The Supreme Librarian',
      image: 'reference/至高の司書.png',
      icon: 'character/enemy4_icon.png',
      cutin: 'cutin/cutin_enemy4.png',
      skillName: 'Η ΑΛΗΘΕΙΑ ΕΛΕΥΘΕΡΩΣΕΙ ΥΜΑΣ',
      skillType: 'reverseRead',
      preset: { correctRate: 0.985, reactionMinMs: 540, reactionMaxMs: 1450 },
      winLine: '分類は宇宙、我はその座標を知る者。',
      loseLine: '汝の知の座標、確かに届いた。'
    }
  ];

  const DIFFICULTIES = {
    easy: { label: 'EASY', playerHp: 120, cpuSpeed: 1.16, cpuGauge: 0.86, cpuCorrectDelta: -0.04 },
    normal: { label: 'NORMAL', playerHp: 100, cpuSpeed: 1, cpuGauge: 1, cpuCorrectDelta: 0 },
    hard: { label: 'HARD', playerHp: 90, cpuSpeed: 0.86, cpuGauge: 1.18, cpuCorrectDelta: 0.025 }
  };

  const SELECT_TO_VS_FADE_MS = 1800;
  const SELECT_TO_VS_SWITCH_DELAY_MS = 1650;
  const VS_SCREEN_AUTO_START_MS = 3200;
  const ROUND_CALL_INTRO_DELAY_MS = 450;
  const ROUND_CALL_AUDIO_MS = 2200;
  const ROUND_CALL_FIGHT_LABEL_MS = 720;
  const ROUND_READING_DELAY_MS = 1000;
  const INTRO_READING_DELAY_MS = 1700;
  const KO_RESULT_DELAY_MS = 1400;
  const TIME_UP_RESULT_DELAY_MS = 1700;
  const PERFECT_RESULT_DELAY_MS = 1500;
  const TURNS_PER_BATTLE_ROUND = 10;
  const ROUNDS_TO_WIN = 2;
  const MAX_BATTLE_ROUNDS = 3;
  const ROUND_WIN_DISPLAY_MS = 2400;
  const DEFAULT_FIELD_SLOT_COUNT = 11;

  const DEV_TUNING_KEY = 'karutaDevTuning';
  const DEV_TUNING_VERSION = 1;
  const PRODUCTION_TUNING_URL = 'fighters_tuning.json';
  const ENDING_MD_URL = 'ending/ending.md';
  const DEFAULT_DEV_TUNING = buildDefaultDevTuning();
  let devTuning = cloneTuning(DEFAULT_DEV_TUNING);
  let productionTuning = null;
  let tuningSource = 'defaults';
  let tuningReady = Promise.resolve();
  let endingCache = null;
  let endingReady = null;

  const FALLBACK_CARDS = [
    { ndc: '000', subject: '総記' },
    { ndc: '010', subject: '図書館. 図書館情報学' },
    { ndc: '020', subject: '図書. 書誌学' },
    { ndc: '100', subject: '哲学' },
    { ndc: '200', subject: '歴史' },
    { ndc: '210', subject: '日本史' },
    { ndc: '289', subject: '個人伝記' },
    { ndc: '300', subject: '社会科学' },
    { ndc: '330', subject: '経済' },
    { ndc: '400', subject: '自然科学' },
    { ndc: '410', subject: '数学' },
    { ndc: '450', subject: '地球科学' },
    { ndc: '500', subject: '技術. 工学' },
    { ndc: '590', subject: '家政学. 生活科学' },
    { ndc: '600', subject: '産業' },
    { ndc: '700', subject: '芸術. 美術' },
    { ndc: '720', subject: '絵画' },
    { ndc: '800', subject: '言語' },
    { ndc: '900', subject: '文学' },
    { ndc: '913', subject: '小説. 物語' }
  ];

  const soundToggle = document.getElementById('soundToggle');
  const correctSound = document.getElementById('correctSound');
  const ngSound = document.getElementById('ngSound');
  const startSound = document.getElementById('startSound');
  const roundCallSound = document.getElementById('roundCallSound');
  const koSound = document.getElementById('koSound');
  const timeUpSound = document.getElementById('timeUpSound');
  const perfectSound = document.getElementById('perfectSound');
  const victorySound = document.getElementById('victorySound');
  const resultSound = document.getElementById('resultSound');
  const startButton = document.getElementById('startButton');
  const quitButton = document.getElementById('quitButton');
  const restartButton = document.getElementById('restartButton');
  const postButton = document.getElementById('postButton');
  const howToButton = document.getElementById('howToButton');
  const cpuLevelPanel = document.querySelector('.cpu-level-panel');
  const optionPanel = document.getElementById('optionPanel');
  const messageEl = document.getElementById('message');
  const scoreElPlayer = document.getElementById('scoreDisplayPlayer');
  const scoreElCPU = document.getElementById('scoreDisplayCPU');
  const comboEl = document.getElementById('comboDisplay');
  const timeEl = document.getElementById('timeDisplay');
  const karutaEl = document.getElementById('karuta');
  const cardGrid = document.getElementById('cardGrid');
  const readerPanel = document.querySelector('.reader-panel');
  const readingEl = document.getElementById('reading');
  const countdownEl = document.getElementById('countdownDisplay');
  const fxLayer = document.getElementById('fxLayer');
  const cpuCursorEl = document.getElementById('cpuCursor');
  const howToModal = document.getElementById('howToModal');
  const resultModal = document.getElementById('resultModal');
  const resultDisplayEl = document.getElementById('resultDisplay');
  const battleResultEl = document.getElementById('battleResult');
  const resultCardsEl = document.getElementById('resultCards');
  const resultTopButton = document.getElementById('resultTopButton');
  const digit1Num = document.querySelector('#digit1 .num');
  const digit2Num = document.querySelector('#digit2 .num');
  const digit3Num = document.querySelector('#digit3 .num');

  let soundEnabled = true;
  let storyRoot = null;
  let battleHud = null;
  let skillStrip = null;
  let fighterContinueButton = null;
  let fighterResultAction = null;
  let screen = 'title';
  let selectedDifficulty = 'normal';
  let selectedPlayer = PLAYERS[0];
  let stageIndex = 0;
  let currentEnemy = ENEMIES[0];
  let selectVsTransitionTimer = 0;
  let vsAutoStartTimer = 0;
  let characterSelectSoundTimer = 0;
  let allCardPool = [];
  let cards = [];
  let roundDeck = [];
  let decoyCard = null;
  let currentReadingCard = null;
  let round = 0;
  let battleRound = 1;
  let playerRoundWins = 0;
  let enemyRoundWins = 0;
  let roundId = 0;
  let playerHp = 100;
  let enemyHp = 100;
  let playerGauge = 0;
  let enemyGauge = 0;
  let playerCombo = 0;
  let enemyCombo = 0;
  let lastComboOwner = null;
  let roundStartTime = 0;
  let roundActive = false;
  let answered = false;
  let pendingReveal = false;
  let cpuSkipTurnsRemaining = 0;
  let playerDisabledThisRound = false;
  let cpuDisabledThisRound = false;
  let reverseReading = false;
  let reverseReadingRoundsLeft = 0;
  let reverseReadingQueuedRounds = 0;
  let supremeSkillUsed = false;
  let gameRunId = 0;
  let roundTimer = null;
  let roundResultTimeout = null;
  let battleFinishDelayTimer = 0;
  let roundWinDisplayTimer = 0;
  let timeDisplayInterval = null;
  let readingTimeouts = [];
  let countdownTimeouts = [];
  let pendingRoundMessage = null;
  let skillCutinTimer = 0;
  let skillCutinPauseTimer = 0;
  let battlePausedForCutin = false;
  let pausedRoundRemainingMs = 0;
  let comboCutinTimer = 0;
  let battleFinishing = false;
  let cpuActionTimer = null;
  let cpuClickTimer = null;
  let cpuActionScheduled = false;
  let cpuPlannedAt = 0;
  let cpuPlannedWait = 0;
  let digitSounds = new Map();

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function pad3(value) {
    return String(value).trim().padStart(3, '0');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function renderStatBar(label, value) {
    const normalized = clamp(Number(value) || 0, 0, 5);
    const percent = Math.round((normalized / 5) * 100);
    return `
      <div class="fighter-stat-row">
        <span>${esc(label)}</span>
        <div class="fighter-stat-track" aria-label="${esc(label)} ${normalized}/5">
          <i style="width:${percent}%"></i>
        </div>
      </div>`;
  }

  function versionedSelectAsset(src) {
    const joiner = String(src).includes('?') ? '&' : '?';
    return `${src}${joiner}v=${SELECT_ASSET_VERSION}`;
  }

  function getEndingPlayerIdFromHeader(header) {
    const normalized = String(header || '').replace(/\s/g, '').replace(/[：:]+$/, '');
    const matched = PLAYERS.find(player => normalized.includes(player.name.replace(/\s/g, '')));
    return matched?.id || null;
  }

  function parseEndingMarkdown(markdown) {
    const parsed = Object.fromEntries(PLAYERS.map(player => [player.id, {}]));
    let currentPlayerId = null;
    let currentScene = null;

    String(markdown || '').split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim();
      const characterMatch = line.match(/^#(?!#)\s*(.+)$/);
      if (characterMatch) {
        currentPlayerId = getEndingPlayerIdFromHeader(characterMatch[1]);
        currentScene = null;
        return;
      }

      const sceneMatch = line.match(/^##\s*場面\s*([0-9]+)/);
      if (sceneMatch) {
        if (!currentPlayerId) {
          currentScene = null;
          return;
        }
        const sceneKey = sceneMatch[1];
        if (parsed[currentPlayerId][sceneKey]) {
          currentScene = null;
          return;
        }
        parsed[currentPlayerId][sceneKey] = [];
        currentScene = sceneKey;
        return;
      }

      if (currentPlayerId && currentScene && line) {
        parsed[currentPlayerId][currentScene].push(line);
      }
    });

    return parsed;
  }

  async function fetchEndingData() {
    if (endingCache) return endingCache;
    if (!endingReady) {
      endingReady = (async () => {
        const url = new URL(ENDING_MD_URL, window.location.href);
        url.searchParams.set('v', SELECT_ASSET_VERSION);
        url.searchParams.set('t', Date.now().toString(36));
        const res = await fetch(url.href, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        endingCache = parseEndingMarkdown(await res.text());
        return endingCache;
      })().catch(error => {
        console.warn('[fighters] ending markdown unavailable.', error);
        endingCache = {};
        return endingCache;
      });
    }
    return endingReady;
  }

  function getEndingSceneLines(player, sceneNumber = 1) {
    const sceneKey = String(sceneNumber);
    const lines = endingCache?.[player?.id]?.[sceneKey];
    if (Array.isArray(lines) && lines.length) return lines;
    return [
      `${player?.name || 'ファイター'}は、すべての分類の試練を越えた。`,
      '知の闘技場に、静かな拍手が降り注ぐ。'
    ];
  }

  function renderEndingParagraphs(lines) {
    return lines.map(line => `<p>${esc(line)}</p>`).join('');
  }

  function cloneTuning(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildDefaultDevTuning() {
    return {
      version: DEV_TUNING_VERSION,
      enemies: Object.fromEntries(ENEMIES.map(enemy => [
        enemy.id,
        {
          reactionMinMs: enemy.preset.reactionMinMs,
          reactionMaxMs: enemy.preset.reactionMaxMs,
          mistakeRate: Number((1 - enemy.preset.correctRate).toFixed(3)),
          correctRate: enemy.preset.correctRate
        }
      ])),
      damage: {
        base: BASE_DAMAGE,
        comboStep: 4,
        max: 34
      },
      gauge: {
        correctBase: 28,
        fastBonus: 26,
        min: 18,
        max: 56,
        opponentHit: OPPONENT_HIT_GAUGE,
        playerMiss: 6,
        enemyMiss: 10
      },
      lines: Object.fromEntries(PLAYERS.map(player => [
        player.id,
        Object.fromEntries(ENEMIES.map(enemy => [
          enemy.id,
          {
            win: enemy.id === 'supreme' ? '知の座標は、あなたとともに次の棚へ。' : player.winLine,
            lose: player.loseLine
          }
        ]))
      ]))
    };
  }

  function isLocalDevTuningEnabled() {
    try {
      return new URLSearchParams(window.location.search).get('devTune') === '1';
    } catch (error) {
      return false;
    }
  }

  function readSavedDevTuning() {
    if (!isLocalDevTuningEnabled()) return null;
    try {
      const raw = localStorage.getItem(DEV_TUNING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('[fighters] dev tuning ignored.', error);
      return null;
    }
  }

  function numberOr(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
  }

  function stringOr(value, fallback) {
    return typeof value === 'string' ? value : fallback;
  }

  function normalizeDevTuning(raw) {
    const normalized = cloneTuning(DEFAULT_DEV_TUNING);
    if (!raw || typeof raw !== 'object') return normalized;

    ENEMIES.forEach(enemy => {
      const source = raw.enemies?.[enemy.id] || {};
      const target = normalized.enemies[enemy.id];
      target.reactionMinMs = Math.round(numberOr(source.reactionMinMs, target.reactionMinMs, 80, 20000));
      target.reactionMaxMs = Math.round(numberOr(source.reactionMaxMs, target.reactionMaxMs, 80, 20000));
      if (target.reactionMaxMs < target.reactionMinMs) {
        target.reactionMaxMs = target.reactionMinMs;
      }
      const correctRate = source.correctRate !== undefined
        ? numberOr(source.correctRate, target.correctRate, 0.05, 1)
        : 1 - numberOr(source.mistakeRate, target.mistakeRate, 0, 0.95);
      target.correctRate = Number(clamp(correctRate, 0.05, 1).toFixed(3));
      target.mistakeRate = Number(clamp(1 - target.correctRate, 0, 0.95).toFixed(3));
    });

    const damageSource = raw.damage || {};
    normalized.damage.base = Math.round(numberOr(damageSource.base, normalized.damage.base, 1, 200));
    normalized.damage.comboStep = Math.round(numberOr(damageSource.comboStep, normalized.damage.comboStep, 0, 100));
    normalized.damage.max = Math.round(numberOr(damageSource.max, normalized.damage.max, 1, 300));
    if (normalized.damage.max < normalized.damage.base) {
      normalized.damage.max = normalized.damage.base;
    }

    const gaugeSource = raw.gauge || {};
    normalized.gauge.correctBase = Math.round(numberOr(gaugeSource.correctBase, normalized.gauge.correctBase, 0, MAX_GAUGE));
    normalized.gauge.fastBonus = Math.round(numberOr(gaugeSource.fastBonus, normalized.gauge.fastBonus, 0, MAX_GAUGE));
    normalized.gauge.min = Math.round(numberOr(gaugeSource.min, normalized.gauge.min, 0, MAX_GAUGE));
    normalized.gauge.max = Math.round(numberOr(gaugeSource.max, normalized.gauge.max, 0, MAX_GAUGE));
    if (normalized.gauge.max < normalized.gauge.min) {
      normalized.gauge.max = normalized.gauge.min;
    }
    normalized.gauge.opponentHit = Math.round(numberOr(gaugeSource.opponentHit, normalized.gauge.opponentHit, 0, MAX_GAUGE));
    normalized.gauge.playerMiss = Math.round(numberOr(gaugeSource.playerMiss, normalized.gauge.playerMiss, 0, MAX_GAUGE));
    normalized.gauge.enemyMiss = Math.round(numberOr(gaugeSource.enemyMiss, normalized.gauge.enemyMiss, 0, MAX_GAUGE));

    PLAYERS.forEach(player => {
      ENEMIES.forEach(enemy => {
        const source = raw.lines?.[player.id]?.[enemy.id] || {};
        const target = normalized.lines[player.id][enemy.id];
        target.win = stringOr(source.win, target.win);
        target.lose = stringOr(source.lose, target.lose);
      });
    });

    return normalized;
  }

  function applyDevTuning(raw) {
    devTuning = normalizeDevTuning(raw);
    ENEMIES.forEach(enemy => {
      const tuned = devTuning.enemies[enemy.id];
      if (!tuned) return;
      enemy.preset = {
        ...enemy.preset,
        correctRate: tuned.correctRate,
        reactionMinMs: tuned.reactionMinMs,
        reactionMaxMs: tuned.reactionMaxMs
      };
    });
  }

  async function fetchProductionTuning() {
    try {
      const url = new URL(PRODUCTION_TUNING_URL, window.location.href);
      url.searchParams.set('v', SELECT_ASSET_VERSION);
      url.searchParams.set('t', Date.now().toString(36));
      const res = await fetch(url.href, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      console.warn('[fighters] production tuning unavailable, using built-in defaults.', error);
      return null;
    }
  }

  function applyResolvedTuning() {
    const savedTuning = readSavedDevTuning();
    if (savedTuning) {
      applyDevTuning(savedTuning);
      tuningSource = 'localStorage';
      return;
    }
    if (productionTuning) {
      applyDevTuning(productionTuning);
      tuningSource = 'production';
      return;
    }
    applyDevTuning(DEFAULT_DEV_TUNING);
    tuningSource = 'defaults';
  }

  async function loadInitialTuning() {
    productionTuning = await fetchProductionTuning();
    applyResolvedTuning();
  }

  function reloadDevTuning() {
    applyResolvedTuning();
    if (screen === 'battle') updateBattleHud();
  }

  function runAfterTuningReady(action) {
    return tuningReady
      .catch(error => {
        console.warn('[fighters] tuning load failed.', error);
      })
      .then(action);
  }

  function getBattleLine(outcome, isFinal) {
    if (outcome === 'win') {
      return devTuning.lines?.[selectedPlayer.id]?.[currentEnemy.id]?.win
        || (isFinal ? '知の座標は、あなたとともに次の棚へ。' : selectedPlayer.winLine || currentEnemy.loseLine);
    }
    if (outcome === 'lose') {
      return devTuning.lines?.[selectedPlayer.id]?.[currentEnemy.id]?.lose
        || selectedPlayer.loseLine
        || currentEnemy.winLine;
    }
    return '互いの分類は、まだ決着を許しません。';
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function pickUniqueByPrefix(list, desiredCount = 11, prefixLen = 2) {
    const picked = [];
    const used = new Set();
    for (const card of list) {
      const prefix = card.ndc.substring(0, prefixLen);
      if (!used.has(prefix)) {
        picked.push(card);
        used.add(prefix);
        if (picked.length >= desiredCount) break;
      }
    }
    if (picked.length < desiredCount) {
      for (const card of list) {
        if (!picked.includes(card)) {
          picked.push(card);
          if (picked.length >= desiredCount) break;
        }
      }
    }
    return picked;
  }

  function getSelectedVoiceVariant() {
    if (karutaAudio && typeof karutaAudio.getVoiceVariant === 'function') {
      return karutaAudio.getVoiceVariant();
    }
    const checked = document.querySelector('input[name="voiceVariant"]:checked');
    if (checked && checked.value === 'b') return 'b';
    try { return localStorage.getItem('karutaVoiceVariant') === 'b' ? 'b' : 'a'; } catch (e) { return 'a'; }
  }

  function getFallbackDigitSound(digit) {
    const normalized = Number(digit);
    if (!Number.isInteger(normalized) || normalized < 0 || normalized > 9) return null;
    const voiceVariant = getSelectedVoiceVariant();
    const key = `${voiceVariant}-${normalized}`;
    if (digitSounds.has(key)) return digitSounds.get(key);
    const audio = new Audio(voiceVariant === 'b' ? `sound/q_${normalized}.mp3` : `sound/${normalized}.mp3`);
    audio.preload = 'auto';
    digitSounds.set(key, audio);
    return audio;
  }

  async function prepareAudioForGameplay() {
    if (!soundEnabled || !karutaAudio) return;
    await karutaAudio.prepare();
  }

  function playFallbackAudio(audio, playbackRate = 1) {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  function playSoundEffect(name, playbackRate = 1) {
    if (!soundEnabled) return;
    if (karutaAudio && karutaAudio.playEffect(name, { playbackRate })) return;
    const fallbackMap = { correct: correctSound, character: characterSound, ng: ngSound, start: startSound, roundcall: roundCallSound, ko: koSound, timeup: timeUpSound, perfect: perfectSound, victory: victorySound, result: resultSound };
    playFallbackAudio(fallbackMap[name], playbackRate);
  }

  function playDigitSound(digit) {
    if (!soundEnabled) return;
    if (karutaAudio && karutaAudio.playDigit(digit)) return;
    const audio = getFallbackDigitSound(digit);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function playMusicTrack(name) {
    if (karutaAudio && typeof karutaAudio.playMusic === 'function') {
      karutaAudio.playMusic(name);
    }
  }

  function stopMusicTrack(options = {}) {
    if (karutaAudio && typeof karutaAudio.stopMusic === 'function') {
      karutaAudio.stopMusic(options);
    }
  }

  function getBattleMusicTrack() {
    return stageIndex >= 3 ? 'battle2' : 'battle1';
  }

  function clearSelectVsTransition(options = {}) {
    if (selectVsTransitionTimer) {
      clearTimeout(selectVsTransitionTimer);
      selectVsTransitionTimer = 0;
    }
    if (vsAutoStartTimer) {
      clearTimeout(vsAutoStartTimer);
      vsAutoStartTimer = 0;
    }
    if (!options.keepCharacterSound && characterSelectSoundTimer) {
      clearTimeout(characterSelectSoundTimer);
      characterSelectSoundTimer = 0;
    }
    storyRoot?.querySelector('.fighter-character-select.is-exiting-to-vs')?.classList.remove('is-exiting-to-vs');
  }

  function transitionFromSelectToVs() {
    clearSelectVsTransition();
    stopMusicTrack({ fadeMs: SELECT_TO_VS_FADE_MS });
    storyRoot?.querySelectorAll('button').forEach(button => {
      button.disabled = true;
    });
    requestAnimationFrame(() => {
      storyRoot?.querySelector('.fighter-character-select')?.classList.add('is-exiting-to-vs');
    });
    selectVsTransitionTimer = setTimeout(() => {
      selectVsTransitionTimer = 0;
      renderVsScreen({ musicAlreadyFading: true });
    }, SELECT_TO_VS_SWITCH_DELAY_MS);
  }

  function showModal(modal) {
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      if (!modal.open) modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
    if (modal === resultModal) clearResultModalBounds();
  }

  function syncResultModalBounds() {
    if (!resultModal) return;
    const shell = document.querySelector('.game-shell');
    if (!shell) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const stageLeft = rootStyle.getPropertyValue('--stage-left').trim();
    const stageTop = rootStyle.getPropertyValue('--stage-top').trim();
    const stageScale = Number(rootStyle.getPropertyValue('--stage-scale-runtime')) || 1;
    if (stageLeft && stageTop) {
      resultModal.style.position = 'fixed';
      resultModal.style.inset = 'auto';
      resultModal.style.left = stageLeft;
      resultModal.style.top = stageTop;
      resultModal.style.width = '1366px';
      resultModal.style.height = '768px';
      resultModal.style.maxWidth = 'none';
      resultModal.style.maxHeight = 'none';
      resultModal.style.margin = '0';
      resultModal.style.transform = `scale(${stageScale})`;
      resultModal.style.transformOrigin = 'top left';
      return;
    }
    const rect = shell.getBoundingClientRect();
    resultModal.style.position = 'fixed';
    resultModal.style.inset = 'auto';
    resultModal.style.left = `${rect.left}px`;
    resultModal.style.top = `${rect.top}px`;
    resultModal.style.width = `${rect.width}px`;
    resultModal.style.height = `${rect.height}px`;
    resultModal.style.maxWidth = 'none';
    resultModal.style.maxHeight = 'none';
    resultModal.style.margin = '0';
  }

  function clearResultModalBounds() {
    if (!resultModal) return;
    ['position', 'inset', 'left', 'top', 'width', 'height', 'max-width', 'max-height', 'margin', 'transform', 'transform-origin'].forEach(property => {
      resultModal.style.removeProperty(property);
    });
  }

  function setMessage(kind, main = '', sub = '') {
    if (!messageEl) return;
    messageEl.className = kind ? `msg-${kind}` : '';
    if (!main && !sub) {
      messageEl.innerHTML = '';
      return;
    }
    const mainHtml = main ? `<span class="msg-main">${esc(main)}</span>` : '';
    const subHtml = sub ? `<span class="msg-sub">${esc(sub)}</span>` : '';
    messageEl.innerHTML = `${mainHtml}${subHtml}`;
  }

  function setReadingHudVisible(visible) {
    if (!readingEl) return;
    readingEl.style.display = 'flex';
    readingEl.classList.toggle('is-hud-hidden', !visible);
  }

  function showSkillCutin(character, side = 'player') {
    if (!character?.cutin || !karutaEl) return;
    pauseBattleForSkillCutin(SKILL_CUTIN_DURATION_MS);
    karutaEl.querySelectorAll('.skill-cutin').forEach(cutin => cutin.remove());
    clearTimeout(skillCutinTimer);

    const cutin = document.createElement('div');
    const normalizedSide = side === 'enemy' ? 'enemy' : 'player';
    cutin.className = `skill-cutin ${normalizedSide}`;
    cutin.setAttribute('aria-hidden', 'true');
    cutin.innerHTML = `
      <div class="skill-cutin-frame">
        <img src="${esc(versionedSelectAsset(character.cutin))}" alt="">
      </div>`;
    karutaEl.appendChild(cutin);
    skillCutinTimer = setTimeout(() => {
      cutin.remove();
      if (skillCutinTimer) skillCutinTimer = 0;
    }, SKILL_CUTIN_DURATION_MS);
  }

  function pauseBattleForSkillCutin(durationMs) {
    if (!roundActive || answered || battleFinishing) return;
    if (!battlePausedForCutin) {
      const elapsed = Date.now() - roundStartTime;
      pausedRoundRemainingMs = clamp(ROUND_TIME_MS - elapsed, 0, ROUND_TIME_MS);
      battlePausedForCutin = true;
    }
    clearTimeout(roundTimer);
    clearInterval(timeDisplayInterval);
    pauseReadingTimeouts();
    clearCpuTimers();
    disableCardClicks();
    updateTimeDisplay(pausedRoundRemainingMs / 1000);
    clearTimeout(skillCutinPauseTimer);
    skillCutinPauseTimer = setTimeout(resumeBattleAfterSkillCutin, durationMs);
  }

  function resumeBattleAfterSkillCutin() {
    clearTimeout(skillCutinPauseTimer);
    skillCutinPauseTimer = 0;
    if (!battlePausedForCutin) return;
    battlePausedForCutin = false;
    if (!roundActive || answered || battleFinishing) return;

    const remainingMs = Math.max(0, pausedRoundRemainingMs);
    pausedRoundRemainingMs = 0;
    if (remainingMs <= 0) {
      roundTimeout();
      return;
    }

    roundStartTime = Date.now() - (ROUND_TIME_MS - remainingMs);
    roundTimer = setTimeout(roundTimeout, remainingMs);
    startTimeDisplayInterval();
    resumeReadingTimeouts();
    refreshPlayerCardInteractivity();
    maybeTriggerCpu(getCurrentPrefixLength());
  }

  function showComboCutin(owner, count) {
    if (!karutaEl || count < 2) return;
    karutaEl.querySelectorAll('.combo-cutin').forEach(cutin => cutin.remove());
    clearTimeout(comboCutinTimer);

    const side = owner === 'enemy' ? 'enemy' : 'player';
    const cutin = document.createElement('div');
    cutin.className = `combo-cutin ${side}`;
    cutin.setAttribute('aria-hidden', 'true');
    cutin.innerHTML = `
      <div class="combo-cutin-panel">
        <strong>${esc(count)} COMBO</strong>
      </div>`;
    karutaEl.appendChild(cutin);
    comboCutinTimer = setTimeout(() => {
      cutin.remove();
      if (comboCutinTimer) comboCutinTimer = 0;
    }, 980);
  }

  function pulseBody(className, duration = 420) {
    document.body.classList.remove(className);
    void document.body.offsetWidth;
    document.body.classList.add(className);
    setTimeout(() => document.body.classList.remove(className), duration);
  }

  function viewportPointToLocal(container, clientX, clientY) {
    if (!container) return { x: clientX, y: clientY };
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / (container.offsetWidth || rect.width || 1) || 1;
    const scaleY = rect.height / (container.offsetHeight || rect.height || 1) || scaleX;
    return {
      x: (clientX - rect.left) / scaleX,
      y: (clientY - rect.top) / scaleY
    };
  }

  function elementCenterInLocal(el, container) {
    const rect = el.getBoundingClientRect();
    return viewportPointToLocal(container, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function burstFromElement(el, color = '#d8a444', count = 18) {
    if (!el || !fxLayer) return;
    const { x, y } = elementCenterInLocal(el, fxLayer);
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      const angle = (Math.PI * 2 * i) / count;
      const distance = 42 + Math.random() * 74;
      spark.className = 'spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.color = color;
      spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
      fxLayer.appendChild(spark);
      setTimeout(() => spark.remove(), 760);
    }
  }

  function popText(text, el, color = '#d8a444') {
    if (!el || !fxLayer) return;
    const rect = el.getBoundingClientRect();
    const topLeft = viewportPointToLocal(fxLayer, rect.left, rect.top);
    const center = viewportPointToLocal(fxLayer, rect.left + rect.width / 2, rect.top + rect.height / 2);
    const label = document.createElement('span');
    label.className = 'pop-text';
    label.textContent = text;
    label.style.left = `${center.x - 44}px`;
    label.style.top = `${topLeft.y + 4}px`;
    label.style.color = color;
    fxLayer.appendChild(label);
    setTimeout(() => label.remove(), 920);
  }

  function ensureStoryUi() {
    if (storyRoot) return;
    const karuta = document.getElementById('karuta');
    const modeActions = document.querySelector('.mode-actions');

    storyRoot = document.createElement('section');
    storyRoot.id = 'fighterStory';
    storyRoot.className = 'fighter-story';
    storyRoot.setAttribute('aria-label', 'NDC Karuta Heroes');
    if (modeActions) modeActions.insertAdjacentElement('afterend', storyRoot);
    else if (karuta) karuta.prepend(storyRoot);

    battleHud = document.createElement('section');
    battleHud.id = 'fighterBattleHud';
    battleHud.className = 'fighter-battle-hud is-hidden';
    battleHud.setAttribute('aria-label', 'バトル状況');
    if (readerPanel) readerPanel.insertAdjacentElement('beforebegin', battleHud);

    skillStrip = document.createElement('section');
    skillStrip.id = 'fighterSkillStrip';
    skillStrip.className = 'fighter-skill-strip is-hidden';
    skillStrip.setAttribute('aria-label', '必殺技ゲージ');
    if (cardGrid) cardGrid.insertAdjacentElement('afterend', skillStrip);

    ensureResultButtons();
  }

  function ensureResultButtons() {
    const resultActions = document.querySelector('.result-actions');
    if (!resultActions || fighterContinueButton) return;
    fighterContinueButton = document.createElement('button');
    fighterContinueButton.id = 'fighterContinueButton';
    fighterContinueButton.type = 'button';
    fighterContinueButton.textContent = 'CONTINUE';
    fighterContinueButton.addEventListener('click', () => {
      if (typeof fighterResultAction === 'function') fighterResultAction();
    });
    resultActions.insertBefore(fighterContinueButton, resultTopButton || resultActions.firstChild);

    if (resultTopButton) {
      resultTopButton.textContent = 'TITLE';
      resultTopButton.addEventListener('click', () => {
        if (document.body.dataset.mode === 'cpu') {
          closeModal(resultModal);
          renderTitleScreen();
        }
      });
    }
  }

  function getVsImagePath(player, enemyIndex) {
    const enemyNumber = enemyIndex + 1;
    const code = player?.vsCode || 'lib';
    if (enemyNumber === 3 && code === 'det') return 'vs/vs3_det.png';
    return `vs/vs_${enemyNumber}_${code}.png`;
  }

  function getVictoryImagePath(player, enemyIndex, outcome) {
    const enemyNumber = enemyIndex + 1;
    if (outcome === 'lose') return `victory/win_enemy${enemyNumber}.png`;
    const code = player?.vsCode || 'lib';
    return `victory/win_${code}.png`;
  }

  function getRoundWinImagePath(outcome) {
    if (outcome === 'lose') return `round/round_enemy${stageIndex + 1}.png`;
    const code = selectedPlayer?.vsCode || 'lib';
    return `round/round_${code}.png`;
  }

  function getRoundWinSoundKey(outcome) {
    if (outcome === 'lose') return 'winEnemy';
    const code = selectedPlayer?.vsCode || 'lib';
    if (code === 'det') return 'winDet';
    if (code === 'lily') return 'winLily';
    return 'winLib';
  }

  function renderRoundMarkers(side) {
    const wins = side === 'enemy' ? enemyRoundWins : playerRoundWins;
    return `
      <div class="round-markers ${esc(side)}" aria-label="${esc(side === 'enemy' ? currentEnemy.name : selectedPlayer.name)} 獲得ラウンド ${wins}">
        ${Array.from({ length: ROUNDS_TO_WIN }, (_, index) => `<span class="${index < wins ? 'is-won' : ''}"></span>`).join('')}
      </div>`;
  }

  function getEndingImagePath(player, sceneNumber = 1) {
    const code = player?.vsCode || 'lib';
    return `ending/ending_${code}${sceneNumber}.png`;
  }

  function normalizeNdcCards(raw) {
    return (Array.isArray(raw) ? raw : [])
      .filter(d => d && typeof d.ndc !== 'undefined' && typeof d.subject === 'string')
      .map((d, i) => ({ ndc: pad3(d.ndc), subject: d.subject.trim(), used: false, index: i }));
  }

  async function fetchNdcCardSource(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`ndc.json fetch failed: HTTP ${res.status}`);
    return normalizeNdcCards(await res.json());
  }

  async function fetchAllCardsCached() {
    const cached = sessionStorage.getItem(NDC_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 30) return parsed;
      } catch (e) {}
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2600);
      const allCards = await fetchNdcCardSource(NDC_JSON_URL, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
      if (allCards.length >= 30) {
        sessionStorage.setItem(NDC_CACHE_KEY, JSON.stringify(allCards));
        return allCards;
      }
    } catch (error) {
      console.warn('[fighters] remote NDC data unavailable, trying bundled ndc.json.', error);
    }
    try {
      const allCards = await fetchNdcCardSource(LOCAL_NDC_JSON_URL, { cache: 'force-cache' });
      if (allCards.length >= 30) {
        sessionStorage.setItem(NDC_CACHE_KEY, JSON.stringify(allCards));
        return allCards;
      }
    } catch (error) {
      console.warn('[fighters] bundled NDC data unavailable, using fallback cards.', error);
    }
    return FALLBACK_CARDS.map((card, index) => ({ ...card, used: false, index }));
  }

  async function fetchCards() {
    const allCards = await fetchAllCardsCached();
    allCardPool = allCards;
    const pool = shuffle(allCards.slice());
    const selected = pickUniqueByPrefix(pool, 11, 2);
    selected.forEach((card, index) => { card.used = false; card.index = index; });
    return selected;
  }

  function createBattleCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card fighter-card';
    div.dataset.index = card.index;
    div.dataset.ndc = card.ndc;
    div.innerText = card.subject;
    div.setAttribute('role', 'button');
    div.tabIndex = 0;
    div.addEventListener('click', selectCard);
    div.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectCard({ currentTarget: div });
      }
    });
    return div;
  }

  function updateBattleCardElement(el, card, effectClass = '') {
    if (!el || !card) return;
    el.dataset.index = card.index;
    el.dataset.ndc = card.ndc;
    el.innerText = card.subject;
    el.style.display = '';
    el.style.visibility = '';
    el.style.pointerEvents = roundActive && !playerDisabledThisRound ? 'auto' : 'none';
    el.className = `card fighter-card${effectClass ? ` ${effectClass}` : ''}`;
  }

  function isHiddenCardElement(el) {
    return !el || el.style.visibility === 'hidden' || el.style.display === 'none';
  }

  function getDefaultSlotEmptyCardElements() {
    return Array.from(cardGrid.children)
      .slice(0, DEFAULT_FIELD_SLOT_COUNT)
      .filter(isHiddenCardElement);
  }

  function createOrReuseFieldCardElement(card, effectClass = '') {
    const reusable = getDefaultSlotEmptyCardElements()[0];
    if (reusable) {
      updateBattleCardElement(reusable, card, effectClass);
      return reusable;
    }

    const el = createBattleCardElement(card);
    if (effectClass) el.classList.add(effectClass);
    if (!roundActive) el.style.pointerEvents = 'none';
    return el;
  }

  function rearrangeVisibleFieldCards(extraVisibleEls = []) {
    if (!cardGrid) return;
    const allEls = Array.from(cardGrid.children);
    const visibleSet = new Set(allEls.filter(el => !isHiddenCardElement(el)));
    extraVisibleEls.forEach(el => {
      if (el) visibleSet.add(el);
    });
    const visibleEls = shuffle(Array.from(visibleSet));
    const hiddenEls = allEls.filter(el => !visibleSet.has(el));

    visibleEls.forEach(el => {
      el.style.display = '';
      cardGrid.appendChild(el);
    });
    hiddenEls.forEach(el => {
      el.style.visibility = 'hidden';
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
      cardGrid.appendChild(el);
    });
  }

  function registerFieldCard(source, extraClass = '') {
    const card = {
      ndc: pad3(source.ndc),
      subject: String(source.subject || '').trim(),
      used: false,
      index: cards.length,
      extraClass
    };
    cards.push(card);
    return card;
  }

  function showReaderPanel() {
    if (readerPanel) readerPanel.classList.remove('is-hidden');
  }

  function hideGameArea() {
    if (readerPanel) readerPanel.classList.add('is-hidden');
    if (cardGrid) cardGrid.style.display = 'none';
  }

  function setButtonVisible(button, visible, display = 'inline-block') {
    if (button) button.style.display = visible ? display : 'none';
  }

  function setTitleControls() {
    document.body.classList.remove('game-playing', 'fighter-flow', 'fighter-playing', 'fighter-result');
    document.body.classList.remove('fighter-selecting', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.add('fighter-title');
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    setButtonVisible(startButton, true);
    if (startButton) startButton.textContent = 'START';
    if (howToButton) howToButton.textContent = 'HOW TO PLAY';
    setButtonVisible(howToButton, true);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (cpuLevelPanel) cpuLevelPanel.style.display = 'none';
    if (optionPanel) optionPanel.style.display = 'none';
  }

  function setFlowControls() {
    document.body.classList.remove('game-playing', 'fighter-playing', 'fighter-result', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.add('fighter-flow');
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    setButtonVisible(startButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (optionPanel) optionPanel.style.display = 'none';
  }

  function setPlayingControls() {
    document.body.classList.remove('fighter-flow', 'fighter-result', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.add('game-playing', 'fighter-playing');
    if (storyRoot) storyRoot.hidden = true;
    if (battleHud) battleHud.classList.remove('is-hidden');
    if (skillStrip) skillStrip.classList.remove('is-hidden');
    showReaderPanel();
    setButtonVisible(startButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (cpuLevelPanel) cpuLevelPanel.style.display = 'none';
  }

  function setResultControls() {
    document.body.classList.remove('game-playing', 'fighter-flow', 'fighter-playing', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.add('fighter-result');
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    setButtonVisible(startButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
  }

  function renderTitleScreen() {
    ensureStoryUi();
    clearSelectVsTransition();
    stopMusicTrack();
    clearRoundTimers();
    cancelCountdown();
    hideCpuCursor();
    screen = 'title';
    currentEnemy = ENEMIES[stageIndex] || ENEMIES[0];
    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <div class="fighter-title-panel reference-title">
          <h1 class="fighter-title-main">NDC KARUTA HEROES</h1>
          <div class="difficulty-select" role="group" aria-label="難易度選択">
            ${Object.entries(DIFFICULTIES).map(([key, diff]) => `
              <button type="button" data-difficulty="${key}" class="${key === selectedDifficulty ? 'active' : ''}">
                <strong>${esc(diff.label)}</strong>
              </button>
            `).join('')}
          </div>
        </div>`;
    }
    setTitleControls();
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    bindDifficultyButtons();
  }

  function bindDifficultyButtons() {
    storyRoot?.querySelectorAll('[data-difficulty]').forEach(button => {
      button.addEventListener('click', () => {
        selectedDifficulty = button.dataset.difficulty || 'normal';
        storyRoot.querySelectorAll('[data-difficulty]').forEach(item => {
          item.classList.toggle('active', item.dataset.difficulty === selectedDifficulty);
        });
      });
    });
  }

  function renderCharacterSelect() {
    ensureStoryUi();
    const enteringSelect = screen !== 'select';
    clearSelectVsTransition({ keepCharacterSound: !enteringSelect });
    playMusicTrack('select');
    if (enteringSelect) {
      characterSelectSoundTimer = setTimeout(() => {
        characterSelectSoundTimer = 0;
        if (screen === 'select') playSoundEffect('character');
      }, CHARACTER_SELECT_SOUND_DELAY_MS);
    }
    screen = 'select';
    setFlowControls();
    document.body.classList.add('fighter-selecting');
    const previewPlayer = selectedPlayer || PLAYERS[0];
    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <div class="fighter-character-select reference-select">
          <div class="fighter-screen-head">
            <h2>SELECT FIGHTER</h2>
          </div>
          <div class="character-select-stage">
            <div class="character-full-art">
              <img src="${esc(versionedSelectAsset(previewPlayer.selectImage))}" alt="${esc(previewPlayer.name)}">
            </div>
            <section class="character-select-info" aria-live="polite">
              <h3>
                <span class="character-name-ja">${esc(previewPlayer.name)}</span>
                <span class="character-name-en">${esc(previewPlayer.englishName)}</span>
              </h3>
              <div class="character-special">
                <span>SPECIAL</span>
                <strong>${esc(previewPlayer.skillName)}</strong>
                <p>${esc(previewPlayer.skillEffect || '')}</p>
              </div>
              <div class="fighter-stat-panel" aria-label="能力値">
                <div class="fighter-stat-heading">
                  <span>STATUS</span>
                </div>
                ${renderStatBar('ATK', previewPlayer.stats?.atk)}
                ${renderStatBar('DEF', previewPlayer.stats?.def)}
              </div>
            </section>
          </div>
          <div class="character-icon-row" aria-label="キャラクターアイコン">
            ${PLAYERS.map(player => `
              <button type="button" class="${player.id === previewPlayer.id ? 'active' : ''}" data-preview-player="${esc(player.id)}" aria-label="${esc(player.name)}">
                <img src="${esc(versionedSelectAsset(player.icon))}" alt="">
              </button>
            `).join('')}
          </div>
          <p class="fighter-flow-actions character-select-actions">
            <button type="button" data-fighter-back>BACK</button>
            <button type="button" data-confirm-player="${esc(previewPlayer.id)}">FIGHT WITH THIS HERO</button>
          </p>
        </div>`;
    }
    storyRoot?.querySelector('[data-fighter-back]')?.addEventListener('click', renderTitleScreen);
    storyRoot?.querySelectorAll('[data-preview-player]').forEach(button => {
      button.addEventListener('click', () => {
        selectedPlayer = PLAYERS.find(player => player.id === button.dataset.previewPlayer) || PLAYERS[0];
        renderCharacterSelect();
      });
    });
    storyRoot?.querySelector('[data-confirm-player]')?.addEventListener('click', event => {
      selectedPlayer = PLAYERS.find(player => player.id === event.currentTarget.dataset.confirmPlayer) || PLAYERS[0];
      stageIndex = 0;
      transitionFromSelectToVs();
    });
  }

  function renderVsScreen(options = {}) {
    ensureStoryUi();
    clearSelectVsTransition();
    if (!options.musicAlreadyFading) stopMusicTrack();
    screen = 'vs';
    currentEnemy = ENEMIES[stageIndex] || ENEMIES[0];
    setFlowControls();
    document.body.classList.add('fighter-vs-ready');
    document.body.classList.remove('fighter-selecting');
    const vsImagePath = getVsImagePath(selectedPlayer, stageIndex);
    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <div class="fighter-vs-screen reference-vs-screen vs-art-screen" aria-label="STAGE ${stageIndex + 1}: ${esc(selectedPlayer.name)} VS ${esc(currentEnemy.name)}">
          <img class="vs-full-art" src="${esc(vsImagePath)}" alt="${esc(selectedPlayer.name)} VS ${esc(currentEnemy.name)}">
          <div class="vs-screen-meta" aria-hidden="true">STAGE ${stageIndex + 1} / ${ENEMIES.length}</div>
        </div>
        `;
    }
    playMusicTrack('vs');
    vsAutoStartTimer = setTimeout(() => {
      vsAutoStartTimer = 0;
      beginBattle();
    }, VS_SCREEN_AUTO_START_MS);
  }

  function renderEndingScreen() {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    setFlowControls();
    document.body.classList.add('fighter-ending');
    screen = 'ending';
    playMusicTrack('ending');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    if (resultDisplayEl) resultDisplayEl.style.display = 'none';
    if (battleResultEl) battleResultEl.innerHTML = '';

    const endingPlayer = selectedPlayer || PLAYERS[0];

    const renderLoading = () => {
      if (screen !== 'ending') return;
      if (!storyRoot) return;
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-ending-screen ending-scene-1 is-loading" aria-label="${esc(endingPlayer.name)} ENDING">
          <img class="ending-full-art" src="${esc(versionedSelectAsset(getEndingImagePath(endingPlayer, 1)))}" alt="${esc(endingPlayer.name)} ending">
          <div class="ending-message-window" aria-live="polite">
            <div class="ending-message-text">
              <p>${esc(endingPlayer.name)}のエンディングを読み込んでいます。</p>
            </div>
          </div>
        </section>`;
    };

    const renderScene = sceneNumber => {
      if (screen !== 'ending') return;
      if (!storyRoot) return;
      const hasNextScene = sceneNumber === 1;
      const imagePath = versionedSelectAsset(getEndingImagePath(endingPlayer, sceneNumber));
      const lines = getEndingSceneLines(endingPlayer, sceneNumber);
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-ending-screen ending-scene-${sceneNumber}" tabindex="0" aria-label="${esc(endingPlayer.name)} ENDING 場面${sceneNumber}">
          <img class="ending-full-art" src="${esc(imagePath)}" alt="${esc(endingPlayer.name)} ending scene ${sceneNumber}">
          <div class="ending-message-window" aria-live="polite">
            <div class="ending-message-text">
              ${renderEndingParagraphs(lines)}
              ${hasNextScene ? '<span class="ending-continue-caret" aria-hidden="true"></span>' : ''}
            </div>
          </div>
        </section>`;
      const screenEl = storyRoot.querySelector('.fighter-ending-screen');
      const advance = () => {
        if (screen !== 'ending') return;
        if (sceneNumber === 1) {
          renderScene(2);
          return;
        }
        renderEndingCredits();
      };
      screenEl?.addEventListener('click', advance);
      screenEl?.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        advance();
      });
      screenEl?.focus({ preventScroll: true });
    };

    storyRoot.hidden = false;
    renderLoading();
    fetchEndingData().then(() => {
      renderScene(1);
    });
  }

  function renderEndingCredits() {
    ensureStoryUi();
    clearSelectVsTransition();
    setFlowControls();
    document.body.classList.add('fighter-ending', 'fighter-credits');
    screen = 'endingCredits';
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();

    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-ending-screen ending-credit-screen" aria-label="CREDITS">
          <div class="ending-credit-viewport" aria-live="polite">
            <div class="ending-credit-roll">
            <h2>NDC Karuta Heroes</h2>
              <p>STORY</p>
              <strong>ChatGPT</strong>
              <p>ILLUSTRATION</p>
              <strong>ChatGPT</strong>
              <p>PROGRAMMING</p>
              <strong>Codex</strong>
              <p>BGM</p>
              <strong>Suno</strong>
              <p>SE/VOICE</p>
              <strong>効果音ラボ<br>ElevenLabs</strong>
              <p>NDC</p>
              <strong>日本図書館協会</strong>
              <p>PRODUCE</p>
              <strong>やわらか図書館学</strong>
            </div>
            <div class="ending-credit-final">
              <p>SPECIAL THANKS</p>
              <strong>すべての図書館を愛するプレイヤーへ</strong>
              <em>THANK YOU FOR PLAYING</em>
            </div>
          </div>
          <button type="button" data-ending-title>TITLE</button>
        </section>`;
      storyRoot.querySelector('[data-ending-title]')?.addEventListener('click', renderTitleScreen);
    }
  }

  function beginBattle() {
    ensureStoryUi();
    clearSelectVsTransition();
    closeModal(howToModal);
    closeModal(resultModal);
    const runId = ++gameRunId;
    currentEnemy = ENEMIES[stageIndex] || ENEMIES[0];
    playMusicTrack(getBattleMusicTrack());
    setPlayingControls();
    setMessage('ready', 'LOADOUT', currentEnemy.name);
    prepareAudioForGameplay().catch(() => false);
    fetchCards()
      .then(fetchedCards => {
        if (runId !== gameRunId) return;
        initBattle(fetchedCards, runId);
      })
      .catch(error => {
        console.error(error);
        if (runId !== gameRunId) return;
        setMessage('warning', 'LOAD FAILED', '');
        renderVsScreen();
      });
  }

  function initBattle(fetchedCards, runId = gameRunId) {
    screen = 'battle';
    cards = fetchedCards || [];
    playerRoundWins = 0;
    enemyRoundWins = 0;
    battleRound = 1;
    playerGauge = 0;
    enemyGauge = 0;
    if (resultDisplayEl) resultDisplayEl.style.display = 'none';
    if (battleResultEl) battleResultEl.innerHTML = '';
    startBattleRound(runId);
  }

  function dealBattleRoundCards() {
    const sourcePool = allCardPool.length ? allCardPool : (cards.length ? cards : FALLBACK_CARDS);
    const selected = pickUniqueByPrefix(shuffle(sourcePool.slice()), DEFAULT_FIELD_SLOT_COUNT, 2);
    cards = selected.map((card, index) => ({
      ...card,
      ndc: pad3(card.ndc),
      subject: String(card.subject || '').trim(),
      used: false,
      index
    }));
    roundDeck = cards.slice(0, TURNS_PER_BATTLE_ROUND);
    decoyCard = cards[TURNS_PER_BATTLE_ROUND] || null;

    cardGrid.innerHTML = '';
    cardGrid.style.display = 'grid';
    shuffle(cards.slice()).forEach(card => {
      cardGrid.appendChild(createBattleCardElement(card));
    });
  }

  function startBattleRound(runId = gameRunId) {
    if (runId !== gameRunId) return;
    screen = 'battle';
    battleFinishing = false;
    removeRoundWinScreen();
    hideCountdown();
    dealBattleRoundCards();

    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
    round = 0;
    roundId = 0;
    playerHp = difficulty.playerHp;
    enemyHp = 100;
    playerCombo = 0;
    enemyCombo = 0;
    lastComboOwner = null;
    pendingReveal = false;
    cpuSkipTurnsRemaining = 0;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    setReverseReading(false);
    supremeSkillUsed = false;
    roundActive = false;
    answered = false;
    resetDigits();
    resetTimeDisplay();
    updateComboDisplay();
    updateBattleHud();
    if (resultDisplayEl) resultDisplayEl.style.display = 'none';
    if (battleResultEl) battleResultEl.innerHTML = '';
    disableCardClicks();
    hideCpuCursor();
    setMessage('ready', `ROUND ${battleRound}`, currentEnemy.name);
    startCountdown(runId);
  }

  function resetDigits() {
    [digit1Num, digit2Num, digit3Num].forEach(num => {
      if (!num) return;
      num.textContent = '';
      num.style.transform = 'translateY(100%)';
      num.style.opacity = 0;
    });
  }

  function resetTimeDisplay() {
    updateTimeDisplay(ROUND_TIME_MS / 1000);
  }

  function updateTimeDisplay(remainingSeconds, totalSeconds = ROUND_TIME_MS / 1000) {
    const remaining = Math.max(0, remainingSeconds);
    const progress = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100));
    if (!timeEl) return;
    timeEl.textContent = `TIME: ${remaining.toFixed(1)} sec`;
    timeEl.style.setProperty('--time-progress', `${progress}%`);
    timeEl.classList.toggle('danger', remaining <= 5);
    const fightClock = document.getElementById('fightHudClock');
    if (fightClock) {
      fightClock.textContent = remaining.toFixed(1);
      fightClock.style.setProperty('--time-progress', `${progress}%`);
      fightClock.classList.toggle('danger', remaining <= 5);
    }
  }

  function startTimeDisplayInterval() {
    clearInterval(timeDisplayInterval);
    timeDisplayInterval = setInterval(() => {
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const remaining = Math.max(0, (ROUND_TIME_MS / 1000) - elapsed);
      updateTimeDisplay(remaining);
    }, 100);
  }

  function startCountdown(runId) {
    cancelCountdown();
    cancelReadingTimeouts();
    clearCpuTimers();
    setReadingHudVisible(false);
    showCountdownLabel('Prove Your Classification Skill', 'round-call-ready');
    setMessage('', '', '');
    countdownTimeouts.push(setTimeout(() => {
      if (runId !== gameRunId) return;
      playSoundEffect('roundcall');
    }, ROUND_CALL_INTRO_DELAY_MS));
    countdownTimeouts.push(setTimeout(() => {
      if (runId !== gameRunId) return;
      showCountdownLabel('FIGHT', 'round-call-fight');
      setMessage('', '', '');
      nextRound({ keepCountdown: true, deferMessage: true, deferReadingHud: true });
    }, ROUND_CALL_INTRO_DELAY_MS + ROUND_CALL_AUDIO_MS));
    countdownTimeouts.push(setTimeout(() => {
      if (runId !== gameRunId) return;
      hideCountdown();
      setReadingHudVisible(true);
      flushPendingRoundMessage();
    }, ROUND_CALL_INTRO_DELAY_MS + ROUND_CALL_AUDIO_MS + ROUND_CALL_FIGHT_LABEL_MS));
  }

  function showCountdownLabel(label, className = '') {
    if (!countdownEl) return;
    countdownEl.classList.remove('active', 'round-call', 'round-call-ready', 'round-call-fight', 'ko-call', 'time-up-call', 'perfect-call');
    void countdownEl.offsetWidth;
    countdownEl.textContent = label;
    countdownEl.classList.add('active', 'round-call');
    if (className) countdownEl.classList.add(className);
  }

  function hideCountdown() {
    if (!countdownEl) return;
    countdownEl.classList.remove('active', 'round-call', 'round-call-ready', 'round-call-fight', 'ko-call', 'time-up-call', 'perfect-call');
    countdownEl.textContent = '';
  }

  function cancelCountdown() {
    countdownTimeouts.forEach(timer => clearTimeout(timer));
    countdownTimeouts = [];
    pendingRoundMessage = null;
    hideCountdown();
  }

  function flushPendingRoundMessage() {
    if (!pendingRoundMessage) return;
    setMessage('round', pendingRoundMessage.main, pendingRoundMessage.sub);
    pendingRoundMessage = null;
  }

  function setReverseReading(active, roundsLeft = 0) {
    reverseReading = !!active;
    reverseReadingRoundsLeft = reverseReading ? Math.max(0, Number(roundsLeft) || 0) : 0;
    if (!reverseReading) reverseReadingQueuedRounds = 0;
    document.body.classList.toggle('fighter-reversed', reverseReading);
  }

  function advanceReverseReadingRound() {
    if (reverseReading && reverseReadingRoundsLeft > 0 && round > 0) {
      reverseReadingRoundsLeft -= 1;
      if (reverseReadingRoundsLeft <= 0) setReverseReading(false);
    }
    if (!reverseReading && reverseReadingQueuedRounds > 0) {
      const queuedRounds = reverseReadingQueuedRounds;
      reverseReadingQueuedRounds = 0;
      setReverseReading(true, queuedRounds);
    }
  }

  function nextRound(options = {}) {
    advanceReverseReadingRound();
    if (playerHp <= 0 || enemyHp <= 0 || round >= TURNS_PER_BATTLE_ROUND) {
      finishBattle();
      return;
    }

    clearRoundTimers();
    if (!options.keepCountdown) hideCountdown();
    resetDigits();
    clearCardHints();
    round++;
    roundId++;
    roundActive = true;
    answered = false;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    if (cpuCursorEl && cpuCursorEl.dataset) delete cpuCursorEl.dataset.initialVis;
    setReadingHudVisible(!options.deferReadingHud);
    enableCardClicks();
    currentReadingCard = roundDeck[round - 1];
    if (!currentReadingCard) {
      finishBattle();
      return;
    }
    currentReadingCard.used = true;

    let sub = `${currentEnemy.name}`;
    if (cpuSkipTurnsRemaining > 0) {
      cpuDisabledThisRound = true;
      cpuSkipTurnsRemaining = Math.max(0, cpuSkipTurnsRemaining - 1);
      sub = `${currentEnemy.name}はこのターンに参加できない`;
    }

    if (options.deferMessage) {
      pendingRoundMessage = { main: `TURN ${round}`, sub };
    } else {
      setMessage('round', `TURN ${round}`, sub);
    }
    roundStartTime = Date.now();
    roundTimer = setTimeout(roundTimeout, ROUND_TIME_MS);
    startTimeDisplayInterval();

    const readingDelay = options.deferReadingHud ? INTRO_READING_DELAY_MS : ROUND_READING_DELAY_MS;
    scheduleReadingTimeout(() => readDigits(currentReadingCard.ndc.toString()), readingDelay);
    maybeActivateEnemySkill();
    if (pendingReveal) {
      pendingReveal = false;
      scheduleReadingTimeout(revealCorrectCard, 420);
    }
    updateBattleHud();
  }

  function roundTimeout() {
    clearCpuTimers();
    if (!answered && roundActive) {
      roundActive = false;
      playerDisabledThisRound = false;
      cpuDisabledThisRound = false;
      playerCombo = 0;
      enemyCombo = 0;
      lastComboOwner = null;
      clearInterval(timeDisplayInterval);
      updateComboDisplay();
      updateTimeDisplay(0);
      setMessage('warning', 'TIME OUT', 'ダメージなし');
      roundResultTimeout = setTimeout(nextRound, 1500);
    }
  }

  function endRoundWithoutAnswer(main = 'NO ANSWER', sub = 'ダメージなし') {
    clearCpuTimers();
    roundActive = false;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    disableCardClicks();
    clearTimeout(roundTimer);
    cancelReadingTimeouts();
    clearInterval(timeDisplayInterval);
    timeEl.classList.remove('danger');
    playerCombo = 0;
    enemyCombo = 0;
    lastComboOwner = null;
    updateComboDisplay();
    setMessage('warning', main, sub);
    roundResultTimeout = setTimeout(nextRound, 1300);
  }

  function readDigits(ndc) {
    cancelReadingTimeouts();
    const digits = reverseReading ? ndc.split('').reverse() : ndc.split('');
    const targets = reverseReading ? [digit3Num, digit2Num, digit1Num] : [digit1Num, digit2Num, digit3Num];
    scheduleReadingTimeout(() => showDigit(targets[0], digits[0], 1), 0);
    scheduleReadingTimeout(() => showDigit(targets[1], digits[1], 2), 2000);
    scheduleReadingTimeout(() => showDigit(targets[2], digits[2], 3), 4000);
  }

  function showDigit(target, digit, prefixLen) {
    if (!target) return;
    target.textContent = digit;
    target.style.transform = 'translateY(0)';
    target.style.opacity = 1;
    playDigitSound(digit);
    maybeTriggerCpu(prefixLen);
  }

  function scheduleReadingTimeout(callback, delay) {
    const task = {
      callback,
      dueAt: Date.now() + delay,
      remaining: delay,
      active: true,
      timer: 0
    };
    task.timer = setTimeout(() => {
      task.active = false;
      task.remaining = 0;
      callback();
    }, delay);
    readingTimeouts.push(task);
    return task;
  }

  function pauseReadingTimeouts() {
    const now = Date.now();
    readingTimeouts.forEach(task => {
      if (!task?.active) return;
      clearTimeout(task.timer);
      task.timer = 0;
      task.remaining = Math.max(0, task.dueAt - now);
    });
  }

  function resumeReadingTimeouts() {
    readingTimeouts.forEach(task => {
      if (!task?.active || task.timer) return;
      task.dueAt = Date.now() + task.remaining;
      task.timer = setTimeout(() => {
        task.active = false;
        task.remaining = 0;
        task.callback();
      }, task.remaining);
    });
  }

  function cancelReadingTimeouts() {
    readingTimeouts.forEach(task => clearTimeout(task.timer));
    readingTimeouts = [];
  }

  function clearRoundTimers() {
    clearTimeout(roundTimer);
    clearTimeout(roundResultTimeout);
    clearTimeout(battleFinishDelayTimer);
    clearTimeout(roundWinDisplayTimer);
    clearTimeout(skillCutinTimer);
    clearTimeout(skillCutinPauseTimer);
    clearTimeout(comboCutinTimer);
    battleFinishDelayTimer = 0;
    roundWinDisplayTimer = 0;
    skillCutinTimer = 0;
    skillCutinPauseTimer = 0;
    battlePausedForCutin = false;
    pausedRoundRemainingMs = 0;
    comboCutinTimer = 0;
    clearInterval(timeDisplayInterval);
    cancelReadingTimeouts();
    clearCpuTimers();
    karutaEl?.querySelectorAll('.skill-cutin').forEach(cutin => cutin.remove());
    karutaEl?.querySelectorAll('.combo-cutin').forEach(cutin => cutin.remove());
    removeRoundWinScreen();
  }

  function removeRoundWinScreen() {
    karutaEl?.querySelectorAll('.round-win-screen').forEach(screenEl => screenEl.remove());
  }

  function disableCardClicks() {
    document.querySelectorAll('.card').forEach(card => { card.style.pointerEvents = 'none'; });
  }

  function refreshPlayerCardInteractivity() {
    document.querySelectorAll('.card').forEach(card => {
      const canPlayerAnswer = roundActive && !answered && !battlePausedForCutin && !playerDisabledThisRound && card.style.visibility !== 'hidden';
      card.style.pointerEvents = canPlayerAnswer ? 'auto' : 'none';
    });
  }

  function enableCardClicks() {
    refreshPlayerCardInteractivity();
  }

  function selectCard(e) {
    if (!roundActive || answered || battlePausedForCutin) return;
    const isCPU = !!(e && e.isCPU);
    if (isCPU ? cpuDisabledThisRound : playerDisabledThisRound) return;
    const hitCardEl = isCPU ? e.currentTarget : (getCardFromPointerEvent(e) || e.currentTarget);
    if (!hitCardEl || hitCardEl.style.visibility === 'hidden') return;

    const index = Number(hitCardEl.dataset.index);
    const selectedCard = cards[index];
    if (!selectedCard || !currentReadingCard) return;
    const elapsed = Date.now() - roundStartTime;

    if (selectedCard.ndc === currentReadingCard.ndc) {
      answered = true;
      handleCorrect(hitCardEl, isCPU, elapsed);
    } else {
      handleMiss(hitCardEl, isCPU);
    }
  }

  function handleCorrect(cardEl, isCPU, elapsed) {
    clearCpuTimers();
    roundActive = false;
    disableCardClicks();
    clearTimeout(roundTimer);
    cancelReadingTimeouts();
    clearInterval(timeDisplayInterval);
    timeEl.classList.remove('danger');

    const owner = isCPU ? 'enemy' : 'player';
    if (owner === 'player') {
      playerCombo = lastComboOwner === 'player' ? playerCombo + 1 : 1;
      enemyCombo = 0;
    } else {
      enemyCombo = lastComboOwner === 'enemy' ? enemyCombo + 1 : 1;
      playerCombo = 0;
    }
    lastComboOwner = owner;

    const combo = owner === 'player' ? playerCombo : enemyCombo;
    const baseDamage = calcDamage(combo);
    const damageMultiplier = isCPU
      ? (selectedPlayer.damageTakenMultiplier || 1)
      : (selectedPlayer.damageDealtMultiplier || 1);
    const damage = Math.max(1, Math.round(baseDamage * damageMultiplier));
    const gaugeGain = calcGaugeGain(elapsed);
    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;

    if (isCPU) {
      playerHp = clamp(playerHp - damage, 0, 999);
      enemyGauge = clamp(enemyGauge + Math.round(gaugeGain * difficulty.cpuGauge), 0, MAX_GAUGE);
      playerGauge = clamp(playerGauge + devTuning.gauge.opponentHit, 0, MAX_GAUGE);
    } else {
      enemyHp = clamp(enemyHp - damage, 0, 999);
      playerGauge = clamp(playerGauge + gaugeGain, 0, MAX_GAUGE);
      enemyGauge = clamp(enemyGauge + Math.round(devTuning.gauge.opponentHit * difficulty.cpuGauge), 0, MAX_GAUGE);
    }

    playSoundEffect('correct', Math.min(1.6, 1 + Math.max(0, combo - 1) * 0.08));
    if (combo >= 2) showComboCutin(owner, combo);
    pulseBody(isCPU ? 'cpu-hit-flash' : 'hit-flash');
    burstFromElement(cardEl, isCPU ? '#9d4f58' : '#d8a444', combo >= 2 ? 28 : 18);
    popText(isCPU ? `${damage} DMG` : `${damage} DMG`, cardEl, isCPU ? '#9d4f58' : '#d8a444');
    cardEl.classList.add(isCPU ? 'enemy-correct' : 'correct');
    setTimeout(() => {
      cardEl.style.visibility = 'hidden';
      cardEl.style.pointerEvents = 'none';
      if (isCPU) hideCpuCursor();
    }, 520);

    const actor = isCPU ? currentEnemy.name : selectedPlayer.name;
    const target = isCPU ? selectedPlayer.name : currentEnemy.name;
    setMessage(isCPU ? 'warning' : 'success', `${actor} HIT`, `${target}に${damage}ダメージ`);
    updateComboDisplay();
    updateBattleHud();

    if (playerHp <= 0 || enemyHp <= 0) {
      roundResultTimeout = setTimeout(finishBattle, 1300);
    } else {
      roundResultTimeout = setTimeout(nextRound, 1500);
    }
  }

  function handleMiss(cardEl, isCPU) {
    playSoundEffect('ng');
    clearCpuTimers();
    pulseBody('miss-flash');
    if (isCPU) {
      cpuDisabledThisRound = true;
      enemyCombo = 0;
      lastComboOwner = playerCombo > 0 ? 'player' : null;
      playerGauge = clamp(playerGauge + devTuning.gauge.enemyMiss, 0, MAX_GAUGE);
    } else {
      playerDisabledThisRound = true;
      playerCombo = 0;
      lastComboOwner = enemyCombo > 0 ? 'enemy' : null;
      playerGauge = clamp(playerGauge + devTuning.gauge.playerMiss, 0, MAX_GAUGE);
    }
    updateComboDisplay();
    updateBattleHud();
    refreshPlayerCardInteractivity();
    const actor = isCPU ? currentEnemy.name : selectedPlayer.name;
    setMessage('warning', isCPU ? `${currentEnemy.name} MISS` : 'MISS', `${actor}はこのターンの解答権を失った`);
    burstFromElement(cardEl, '#9d4f58', 10);
    popText(isCPU ? 'MISS' : 'MISS', cardEl, '#9d4f58');
    cardEl.classList.remove('shake');
    void cardEl.offsetWidth;
    cardEl.classList.add('shake');
    setTimeout(() => { cardEl.classList.remove('shake'); }, 300);
    if (isCPU) setTimeout(hideCpuCursor, 520);

    if (playerDisabledThisRound && cpuDisabledThisRound) {
      roundResultTimeout = setTimeout(() => {
        endRoundWithoutAnswer('NO ANSWER', '双方が解答権を失った');
      }, 720);
      return;
    }

    setTimeout(() => {
      if (!roundActive || answered) return;
      maybeTriggerCpu(getCurrentPrefixLength());
    }, 240);
  }

  function calcDamage(combo) {
    const damage = devTuning.damage;
    if (combo < 2) return damage.base;
    return clamp(damage.base + (combo - 1) * damage.comboStep, damage.base, damage.max);
  }

  function calcGaugeGain(elapsed) {
    const fastRatio = elapsed < EARLY_WINDOW_MS ? (EARLY_WINDOW_MS - elapsed) / EARLY_WINDOW_MS : 0;
    const gauge = devTuning.gauge;
    return clamp(Math.round(gauge.correctBase + fastRatio * gauge.fastBonus), gauge.min, gauge.max);
  }

  function updateComboDisplay() {
    if (!comboEl) return;
    const owner = lastComboOwner;
    const count = owner === 'player' ? playerCombo : owner === 'enemy' ? enemyCombo : 0;
    if (count >= 2) {
      const label = owner === 'enemy' ? currentEnemy.name : 'YOU';
      comboEl.innerHTML = `<span>${esc(label)} ${count} COMBO</span>`;
      requestAnimationFrame(() => {
        const span = comboEl.querySelector('span');
        if (span) span.classList.add('active');
      });
    } else {
      comboEl.innerHTML = '<span></span>';
    }
  }

  function updateBattleHud() {
    if (!battleHud || !skillStrip) return;
    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
    const playerMaxHp = difficulty.playerHp;
    const enemyMaxHp = 100;
    const enemySkillPending = currentEnemy.skillType === 'pending';
    const playerSkillReady = playerGauge >= MAX_GAUGE;
    const enemySkillReady = enemyGauge >= MAX_GAUGE && !enemySkillPending;
    const playerHpPercent = clamp((playerHp / playerMaxHp) * 100, 0, 100);
    const enemyHpPercent = clamp((enemyHp / enemyMaxHp) * 100, 0, 100);
    const playerIcon = versionedSelectAsset(selectedPlayer.icon || selectedPlayer.image);
    const enemyIcon = versionedSelectAsset(currentEnemy.icon || currentEnemy.image);

    battleHud.innerHTML = `
      <div class="fighter-combatant player" data-side="P1">
        <div class="fighter-portrait">
          <div class="fighter-face"><img src="${esc(playerIcon)}" alt="${esc(selectedPlayer.name)}"></div>
          ${renderRoundMarkers('player')}
        </div>
        <div class="fighter-bars">
          <div class="fighter-label"><span>P1</span><strong>${esc(selectedPlayer.name)}</strong><em>HP</em></div>
          <div class="hp-track"><span style="width:${playerHpPercent}%"></span></div>
        </div>
      </div>
      <div class="fight-clock">
        <span>STAGE ${stageIndex + 1} / ROUND ${battleRound}</span>
        <strong>TURN ${Math.min(round + (roundActive ? 0 : 1), TURNS_PER_BATTLE_ROUND)}</strong>
        <em id="fightHudClock">${(ROUND_TIME_MS / 1000).toFixed(1)}</em>
      </div>
      <div class="fighter-combatant enemy" data-side="P2">
        <div class="fighter-bars">
          <div class="fighter-label"><em>HP</em><strong>${esc(currentEnemy.name)}</strong><span>P2</span></div>
          <div class="hp-track enemy"><span style="width:${enemyHpPercent}%"></span></div>
        </div>
        <div class="fighter-portrait">
          <div class="fighter-face"><img src="${esc(enemyIcon)}" alt="${esc(currentEnemy.name)}"></div>
          ${renderRoundMarkers('enemy')}
        </div>
      </div>`;

    skillStrip.innerHTML = `
      <div class="skill-meter player ${playerSkillReady ? 'is-ready' : ''}">
        <div class="fighter-label"><span>SUPER</span><strong>${esc(selectedPlayer.skillName)}</strong><em>CHARGE</em></div>
        <div class="gauge-track"><span style="width:${playerGauge}%"></span></div>
      </div>
      <button id="fighterSkillButton" type="button" ${playerSkillReady ? '' : 'disabled'}>SPECIAL</button>
      <div class="skill-meter enemy ${enemySkillPending ? 'is-pending' : ''} ${enemySkillReady ? 'is-ready' : ''}">
        <div class="fighter-label"><em>CHARGE</em><strong>${esc(currentEnemy.skillName)}</strong><span>SUPER</span></div>
        <div class="gauge-track enemy"><span style="width:${enemyGauge}%"></span></div>
      </div>`;
    skillStrip.querySelector('#fighterSkillButton')?.addEventListener('click', usePlayerSkill);

    if (scoreElPlayer) scoreElPlayer.textContent = `${selectedPlayer.shortName}: HP ${playerHp}`;
    if (scoreElCPU) scoreElCPU.textContent = `${currentEnemy.name}: HP ${enemyHp}`;
  }

  function usePlayerSkill() {
    if (screen !== 'battle' || playerGauge < MAX_GAUGE || battlePausedForCutin || battleFinishing) return;
    let activated = false;
    if (selectedPlayer.skillType === 'revealNext') {
      pendingReveal = true;
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '次の問題で正解の札が光る');
      activated = true;
    } else if (selectedPlayer.skillType === 'removeDecoy') {
      const removed = removeDecoyCard();
      if (!removed) {
        setMessage('warning', selectedPlayer.skillName, '除外できる札がない');
        updateBattleHud();
        return;
      }
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '使われない札を除外した');
      activated = true;
    } else if (selectedPlayer.skillType === 'skipCpu') {
      cpuSkipTurnsRemaining = Math.max(cpuSkipTurnsRemaining, 2);
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '次の2ターン、相手の解答権を封じる');
      activated = true;
    }
    if (!activated) return;
    showSkillCutin(selectedPlayer, 'player');
    updateBattleHud();
  }

  function removeDecoyCard() {
    if (!decoyCard) return false;
    const el = document.querySelector(`.card[data-index="${decoyCard.index}"]`);
    if (!el || el.style.visibility === 'hidden') return false;
    el.classList.add('skill-removed');
    setTimeout(() => {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    }, 300);
    return true;
  }

  function revealCorrectCard() {
    const correctCardEl = document.querySelector(`.card[data-index="${currentReadingCard?.index}"]`);
    if (!correctCardEl || correctCardEl.style.visibility === 'hidden') return;
    correctCardEl.classList.add('skill-revealed');
    setMessage('success', selectedPlayer.skillName, '正解の札が示された');
  }

  function clearCardHints() {
    document.querySelectorAll('.skill-revealed, .skill-removed, .skill-added, .skill-glitched').forEach(card => {
      card.classList.remove('skill-revealed', 'skill-removed', 'skill-added', 'skill-glitched');
    });
  }

  function getVisibleCardElements() {
    return Array.from(cardGrid.children).filter(card => card.style.visibility !== 'hidden');
  }

  function getExistingNdcs() {
    return new Set(cards.map(card => pad3(card.ndc)));
  }

  function getRemainingRoundCards() {
    return roundDeck.slice(Math.max(0, round - 1)).filter(Boolean);
  }

  function pickCardsFromPool(count, options = {}) {
    const excluded = options.excluded || new Set();
    const forbiddenPrefixes = options.forbiddenPrefixes || new Set();
    const uniquePrefixes = options.uniquePrefixes !== false;
    const usedPrefixes = new Set(options.usedPrefixes || []);
    const picked = [];
    const pool = shuffle((allCardPool.length ? allCardPool : FALLBACK_CARDS).slice());

    for (const source of pool) {
      const ndc = pad3(source.ndc);
      const prefix = ndc.slice(0, 2);
      if (excluded.has(ndc) || forbiddenPrefixes.has(prefix)) continue;
      if (uniquePrefixes && usedPrefixes.has(prefix)) continue;
      picked.push(source);
      usedPrefixes.add(prefix);
      if (picked.length >= count) break;
    }

    return picked;
  }

  function addDecimalIllusionCards() {
    const visibleCount = getVisibleCardElements().length;
    const addCount = Math.min(3, Math.max(0, DEFAULT_FIELD_SLOT_COUNT - visibleCount));
    if (addCount <= 0) return 0;
    const protectedPrefixes = new Set(getRemainingRoundCards().map(card => pad3(card.ndc).slice(0, 2)));
    const picked = pickCardsFromPool(addCount, {
      excluded: getExistingNdcs(),
      forbiddenPrefixes: protectedPrefixes,
      uniquePrefixes: true
    });
    if (!picked.length) return 0;

    const addedEls = [];
    picked.forEach(source => {
      const card = registerFieldCard(source, 'skill-added');
      const el = createOrReuseFieldCardElement(card, 'skill-added');
      addedEls.push(el);
    });
    rearrangeVisibleFieldCards(addedEls);

    return picked.length;
  }

  function replaceFieldWithGlitchCards() {
    const visibleEls = getVisibleCardElements();
    const visibleCount = visibleEls.length;
    if (!visibleCount) return 0;

    const currentRoundIndex = Math.max(0, round - 1);
    const remainingRoundCount = Math.max(1, roundDeck.length - currentRoundIndex);
    const answerCount = Math.min(remainingRoundCount, visibleCount);
    const picked = pickCardsFromPool(visibleCount, {
      excluded: getExistingNdcs(),
      uniquePrefixes: true
    });
    if (picked.length < visibleCount) return 0;

    const newCards = picked.map(source => registerFieldCard(source, 'skill-glitched'));
    const answerCards = newCards.slice(0, answerCount);
    const decoyCards = newCards.slice(answerCount);
    answerCards.forEach((card, index) => {
      card.used = index === 0;
      roundDeck[currentRoundIndex + index] = card;
    });
    currentReadingCard = answerCards[0] || currentReadingCard;
    decoyCard = decoyCards[0] || null;

    shuffle(newCards.slice()).forEach((card, index) => {
      updateBattleCardElement(visibleEls[index], card, 'skill-glitched');
    });

    return visibleCount;
  }

  function maybeActivateEnemySkill() {
    if (enemyGauge < MAX_GAUGE) return;
    if (currentEnemy.skillType === 'shuffle') {
      enemyGauge = 0;
      shuffleVisibleCards();
      setMessage('warning', `${currentEnemy.name} 必殺技`, '場の札が並び替わった');
      showSkillCutin(currentEnemy, 'enemy');
      pulseBody('enemy-skill-flash', 760);
    } else if (currentEnemy.skillType === 'decimalIllusion') {
      const added = addDecimalIllusionCards();
      if (!added) return;
      enemyGauge = 0;
      setMessage('warning', currentEnemy.skillName, `幻の札が${added}枚増えた`);
      showSkillCutin(currentEnemy, 'enemy');
      pulseBody('enemy-skill-flash', 840);
    } else if (currentEnemy.skillType === 'glitchIndex') {
      const replaced = replaceFieldWithGlitchCards();
      if (!replaced) return;
      enemyGauge = 0;
      setMessage('warning', currentEnemy.skillName, `場の札${replaced}枚が入れ替わった`);
      showSkillCutin(currentEnemy, 'enemy');
      pulseBody('enemy-skill-flash', 900);
    } else if (currentEnemy.skillType === 'reverseRead' && !supremeSkillUsed) {
      enemyGauge = 0;
      supremeSkillUsed = true;
      reverseReadingQueuedRounds = 2;
      setMessage('warning', currentEnemy.skillName, '次の2ターン、読み上げが右から逆順になる');
      showSkillCutin(currentEnemy, 'enemy');
      pulseBody('enemy-skill-flash', 900);
    }
    updateBattleHud();
  }

  function shuffleVisibleCards() {
    const visible = Array.from(cardGrid.children).filter(card => card.style.visibility !== 'hidden');
    const hidden = Array.from(cardGrid.children).filter(card => card.style.visibility === 'hidden');
    shuffle(visible).concat(hidden).forEach(card => cardGrid.appendChild(card));
  }

  function getCardFromPointerEvent(e) {
    if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return null;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const card = hit && hit.closest ? hit.closest('.card') : null;
    return card && cardGrid.contains(card) ? card : null;
  }

  function getVisibleDigits(prefixLen) {
    const digits = [];
    const nums = reverseReading ? [digit3Num, digit2Num, digit1Num] : [digit1Num, digit2Num, digit3Num];
    if (prefixLen >= 1 && nums[0].textContent) digits.push(nums[0].textContent);
    if (prefixLen >= 2 && nums[1].textContent) digits.push(nums[1].textContent);
    if (prefixLen >= 3 && nums[2].textContent) digits.push(nums[2].textContent);
    return digits.join('');
  }

  function getUniqueCandidateByVisibleDigits(visibleDigits) {
    if (!visibleDigits) return null;
    const key = reverseReading ? visibleDigits.split('').reverse().join('') : visibleDigits;
    const candidates = Array.from(document.querySelectorAll('.card'))
      .filter(card => {
        if (card.style.visibility === 'hidden') return false;
        const ndc = String(card.dataset.ndc || '');
        return reverseReading ? ndc.endsWith(key) : ndc.startsWith(key);
      });
    return candidates.length === 1 ? candidates[0] : null;
  }

  function maybeTriggerCpu(prefixLen) {
    if (!roundActive || answered || cpuDisabledThisRound) return;
    const visibleDigits = getVisibleDigits(prefixLen);
    const targetEl = getUniqueCandidateByVisibleDigits(visibleDigits);
    if (targetEl) scheduleCpuActionToTarget(targetEl);
  }

  function getCurrentPrefixLength() {
    const nums = reverseReading ? [digit3Num, digit2Num, digit1Num] : [digit1Num, digit2Num, digit3Num];
    return nums.reduce((count, num) => count + (num.textContent ? 1 : 0), 0);
  }

  function calcSpeedFactor() {
    const visible = Array.from(document.querySelectorAll('.card')).filter(card => card.style.visibility !== 'hidden').length;
    let total = Number(cpuCursorEl?.dataset.initialVis || 0);
    if (!total || total < visible) {
      total = visible;
      if (cpuCursorEl?.dataset) cpuCursorEl.dataset.initialVis = String(total);
    }
    const denom = Math.max(1, total - 1);
    const progress = Math.max(0, Math.min(1, (visible - 1) / denom));
    return 0.1 + 0.9 * progress;
  }

  function scheduleCpuActionToTarget(targetEl) {
    if (!targetEl || targetEl.style.visibility === 'hidden') return;
    const thisRound = roundId;
    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
    const preset = currentEnemy.preset;
    let wait = Math.floor(randInt(preset.reactionMinMs, preset.reactionMaxMs) * calcSpeedFactor() * difficulty.cpuSpeed);
    const remaining = Array.from(document.querySelectorAll('.card')).filter(card => card.style.visibility !== 'hidden').length;
    if (remaining <= 3) wait = Math.floor(wait * 0.82);

    const now = Date.now();
    if (cpuActionScheduled) {
      const remainingPrev = Math.max(0, cpuPlannedWait - (now - cpuPlannedAt));
      if (wait >= remainingPrev) return;
      if (cpuActionTimer) clearTimeout(cpuActionTimer);
      if (cpuClickTimer) clearTimeout(cpuClickTimer);
    }

    cpuActionScheduled = true;
    cpuPlannedAt = now;
    cpuPlannedWait = wait;
    cpuActionTimer = setTimeout(() => {
      if (thisRound !== roundId || !roundActive || answered || cpuDisabledThisRound) return;
      let target = targetEl;
      const correctRate = clamp(preset.correctRate + difficulty.cpuCorrectDelta, 0.1, 0.995);
      if (Math.random() > correctRate) {
        const others = Array.from(document.querySelectorAll('.card'))
          .filter(card => card.style.visibility !== 'hidden' && card !== targetEl);
        if (others.length) target = others[Math.floor(Math.random() * others.length)];
      }
      if (!target || target.style.visibility === 'hidden') return;
      moveCpuCursorTo(target);
      cpuClickTimer = setTimeout(() => {
        if (thisRound !== roundId || !roundActive || answered || cpuDisabledThisRound) return;
        if (!target || target.style.visibility === 'hidden') return;
        cpuClick(target);
      }, CPU_CLICK_ANIM_MS);
    }, wait);
  }

  function clearCpuTimers() {
    if (cpuActionTimer) clearTimeout(cpuActionTimer);
    if (cpuClickTimer) clearTimeout(cpuClickTimer);
    cpuActionTimer = null;
    cpuClickTimer = null;
    cpuActionScheduled = false;
    cpuPlannedAt = 0;
    cpuPlannedWait = 0;
  }

  function placeCpuCursorAt(el) {
    if (!el || !cpuCursorEl) return;
    const karuta = document.getElementById('karuta');
    const { x, y } = elementCenterInLocal(el, karuta);
    cpuCursorEl.style.left = `${x}px`;
    cpuCursorEl.style.top = `${y}px`;
  }

  function moveCpuCursorTo(el) {
    if (!el || !cpuCursorEl) return;
    cpuCursorEl.style.display = 'block';
    requestAnimationFrame(() => placeCpuCursorAt(el));
  }

  function hideCpuCursor() {
    if (!cpuCursorEl) return;
    cpuCursorEl.style.display = 'none';
    cpuCursorEl.classList.remove('pulse');
    if (cpuCursorEl.dataset) delete cpuCursorEl.dataset.initialVis;
  }

  function cpuClick(el) {
    if (!el || el.style.visibility === 'hidden') return;
    if (!roundActive || answered) return;
    cpuCursorEl.classList.remove('pulse');
    void cpuCursorEl.offsetWidth;
    cpuCursorEl.classList.add('pulse');
    selectCard({ currentTarget: el, isCPU: true });
  }

  function determineOutcome() {
    if (round >= TURNS_PER_BATTLE_ROUND && playerHp > 0 && enemyHp > 0) {
      return playerHp >= enemyHp ? 'win' : 'lose';
    }
    if (enemyHp <= 0 && playerHp <= 0) return 'win';
    if (enemyHp <= 0) return 'win';
    if (playerHp <= 0) return 'lose';
    if (playerHp > enemyHp) return 'win';
    if (playerHp < enemyHp) return 'lose';
    return 'win';
  }

  function getMatchOutcome() {
    if (playerRoundWins >= enemyRoundWins) return 'win';
    return 'lose';
  }

  function awardBattleRound(outcome) {
    if (outcome === 'lose') enemyRoundWins = clamp(enemyRoundWins + 1, 0, ROUNDS_TO_WIN);
    else playerRoundWins = clamp(playerRoundWins + 1, 0, ROUNDS_TO_WIN);
    updateBattleHud();
  }

  function isMatchFinished() {
    return playerRoundWins >= ROUNDS_TO_WIN || enemyRoundWins >= ROUNDS_TO_WIN || battleRound >= MAX_BATTLE_ROUNDS;
  }

  function completeBattleRound(outcome) {
    hideCountdown();
    awardBattleRound(outcome);
    if (isMatchFinished()) {
      showBattleResult(getMatchOutcome());
      return;
    }
    showRoundWinScreen(outcome);
  }

  function showRoundWinScreen(outcome) {
    removeRoundWinScreen();
    setReadingHudVisible(false);
    cardGrid.style.display = 'none';
    setMessage('', '', '');
    const winnerName = outcome === 'lose' ? currentEnemy.name : selectedPlayer.name;
    const winnerDisplayName = outcome === 'lose' ? (currentEnemy.englishName || currentEnemy.name) : (selectedPlayer.englishName || selectedPlayer.name);
    const imagePath = versionedSelectAsset(getRoundWinImagePath(outcome));
    playSoundEffect(getRoundWinSoundKey(outcome));
    const roundScreen = document.createElement('section');
    roundScreen.className = `round-win-screen ${outcome === 'lose' ? 'enemy' : 'player'}`;
    roundScreen.setAttribute('aria-label', `ROUND ${battleRound} WIN: ${winnerName}`);
    roundScreen.innerHTML = `
      <div class="round-win-copy" aria-hidden="true">
        <span>ROUND ${battleRound}</span>
        <strong>${esc(winnerDisplayName)} WINS</strong>
      </div>
      <img src="${esc(imagePath)}" alt="${esc(winnerName)} round win">`;
    karutaEl?.appendChild(roundScreen);
    roundWinDisplayTimer = setTimeout(() => {
      roundWinDisplayTimer = 0;
      removeRoundWinScreen();
      battleRound = clamp(battleRound + 1, 1, MAX_BATTLE_ROUNDS);
      startBattleRound(gameRunId);
    }, ROUND_WIN_DISPLAY_MS);
  }

  function finishBattle() {
    if (battleFinishing) return;
    battleFinishing = true;
    clearRoundTimers();
    cancelCountdown();
    hideCpuCursor();
    roundActive = false;
    setReverseReading(false);
    disableCardClicks();
    timeEl.classList.remove('danger');

    const isKoFinish = playerHp <= 0 || enemyHp <= 0;
    const isPerfectFinish = enemyHp <= 0 && playerHp === (DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal).playerHp;
    if (isKoFinish) {
      playSoundEffect('ko');
      pulseBody('finish-flash', 900);
      setReadingHudVisible(false);
      setMessage('', '', '');
      showCountdownLabel('K.O.', 'ko-call');
      battleFinishDelayTimer = setTimeout(() => {
        battleFinishDelayTimer = 0;
        if (isPerfectFinish) {
          playSoundEffect('perfect');
          showCountdownLabel('PERFECT', 'perfect-call');
          battleFinishDelayTimer = setTimeout(() => {
            battleFinishDelayTimer = 0;
            completeBattleRound(determineOutcome());
          }, PERFECT_RESULT_DELAY_MS);
          return;
        }
        completeBattleRound(determineOutcome());
      }, KO_RESULT_DELAY_MS);
      return;
    }

    if (round >= TURNS_PER_BATTLE_ROUND && playerHp > 0 && enemyHp > 0) {
      playSoundEffect('timeup');
      pulseBody('finish-flash', 900);
      setReadingHudVisible(false);
      setMessage('', '', '');
      showCountdownLabel('TIME UP', 'time-up-call');
      battleFinishDelayTimer = setTimeout(() => {
        battleFinishDelayTimer = 0;
        completeBattleRound(determineOutcome());
      }, TIME_UP_RESULT_DELAY_MS);
      return;
    }

    completeBattleRound(determineOutcome());
  }

  function showBattleResult(outcomeOverride = null) {
    hideCountdown();
    pulseBody('finish-flash', 900);
    setReadingHudVisible(false);
    cardGrid.style.display = 'none';
    timeEl.classList.remove('danger');
    playerGauge = 0;
    enemyGauge = 0;
    setResultControls();

    const outcome = outcomeOverride || getMatchOutcome();
    const isFinal = outcome === 'win' && stageIndex >= ENEMIES.length - 1;
    playMusicTrack('victory');
    const resultMain = isFinal ? 'GAME CLEAR' : outcome === 'win' ? 'WINNER' : outcome === 'lose' ? 'DEFEATED' : 'DRAW';
    const resultImagePath = getVictoryImagePath(selectedPlayer, stageIndex, outcome);
    const resultAltName = outcome === 'lose' ? currentEnemy.name : selectedPlayer.name;
    const resultLine = getBattleLine(outcome, isFinal);
    setMessage(outcome === 'win' ? 'finish' : 'warning', resultMain, `${selectedPlayer.name} HP ${playerHp} / ${currentEnemy.name} HP ${enemyHp}`);
    if (battleResultEl) {
      battleResultEl.innerHTML = `
        <section class="reference-result-screen victory-art-screen outcome-${esc(outcome)} ${isFinal ? 'is-final' : ''}" aria-label="${esc(resultMain)}: ${esc(resultAltName)}">
          <img class="victory-full-art" src="${esc(resultImagePath)}" alt="${esc(resultMain)}: ${esc(resultAltName)}">
          <div class="victory-message-window" aria-live="polite">
            <p>${esc(resultLine)}</p>
          </div>
        </section>`;
    }
    displayUsedCards();
    if (resultDisplayEl) resultDisplayEl.style.display = 'flex';
    configureResultAction(outcome, isFinal);
    syncResultModalBounds();
    showModal(resultModal);
    requestAnimationFrame(syncResultModalBounds);
  }

  function configureResultAction(outcome, isFinal) {
    if (!fighterContinueButton) return;
    if (isFinal) {
      fighterContinueButton.textContent = 'ENDING';
      fighterResultAction = () => {
        closeModal(resultModal);
        renderEndingScreen();
      };
    } else if (outcome === 'win') {
      fighterContinueButton.textContent = 'NEXT BATTLE';
      fighterResultAction = () => {
        closeModal(resultModal);
        stageIndex = clamp(stageIndex + 1, 0, ENEMIES.length - 1);
        renderVsScreen();
      };
    } else {
      fighterContinueButton.textContent = 'CONTINUE';
      fighterResultAction = () => {
        closeModal(resultModal);
        renderVsScreen();
      };
    }
    fighterContinueButton.style.display = 'inline-block';
    if (resultTopButton) {
      resultTopButton.style.display = isFinal ? 'none' : 'inline-block';
      resultTopButton.textContent = 'TITLE';
    }
    if (postButton) postButton.style.display = 'none';
  }

  function displayUsedCards() {
    if (!resultCardsEl) return;
    const sortedCards = cards.slice().sort((a, b) => Number(a.ndc) - Number(b.ndc));
    let html = '<h2 class="resultheading">CARDS of THIS BATTLE</h2><ul class="cards2col">';
    sortedCards.forEach(card => {
      html += `<li><div class="highscore-entry"><span>${esc(card.ndc)} - ${esc(card.subject)}</span></div></li>`;
    });
    html += '</ul>';
    resultCardsEl.innerHTML = html;
  }

  function quitGame(playResetSound = false) {
    clearSelectVsTransition();
    stopMusicTrack();
    if (playResetSound) playSoundEffect('start');
    gameRunId++;
    clearRoundTimers();
    cancelCountdown();
    closeModal(resultModal);
    cards = [];
    roundDeck = [];
    currentReadingCard = null;
    round = 0;
    battleRound = 1;
    playerRoundWins = 0;
    enemyRoundWins = 0;
    playerGauge = 0;
    enemyGauge = 0;
    roundActive = false;
    answered = false;
    cpuSkipTurnsRemaining = 0;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    playerCombo = 0;
    enemyCombo = 0;
    lastComboOwner = null;
    updateComboDisplay();
    resetDigits();
    if (cardGrid) {
      cardGrid.innerHTML = '';
      cardGrid.style.display = 'none';
    }
    setReverseReading(false);
    setMessage('', '', '');
    hideCpuCursor();
    renderTitleScreen();
  }

  function resetGame() {
    closeModal(resultModal);
    beginBattle();
  }

  function showHowTo() {
    showModal(howToModal);
  }

  function postToX() {
    const text = `NDC Karuta Heroesで${currentEnemy.name}と対戦中！\n${window.location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (soundToggle) {
    soundToggle.addEventListener('change', e => {
      soundEnabled = e.target.checked;
      if (karutaAudio) karutaAudio.setEnabled(soundEnabled);
    });
  }

  startButton?.addEventListener('pointerdown', () => {
    if (screen === 'title') playMusicTrack('select');
  });

  window.karutaDevTuning = {
    storageKey: DEV_TUNING_KEY,
    version: DEV_TUNING_VERSION,
    productionUrl: PRODUCTION_TUNING_URL,
    getDefaults: () => cloneTuning(DEFAULT_DEV_TUNING),
    getCurrent: () => cloneTuning(devTuning),
    getSource: () => tuningSource,
    reload: reloadDevTuning
  };

  window.addEventListener('storage', event => {
    if (event.key === DEV_TUNING_KEY) reloadDevTuning();
  });

  window.addEventListener('resize', () => {
    if (resultModal?.open && document.querySelector('.victory-art-screen')) syncResultModalBounds();
  });

  window.karutaModes = window.karutaModes || {};
  window.karutaModes.cpu = {
    startGame: () => runAfterTuningReady(renderCharacterSelect),
    quitGame: () => quitGame(false),
    resetGame,
    postToX,
    showHowTo,
    refreshLanding: () => {
      if (document.body.dataset.mode === 'cpu') runAfterTuningReady(renderTitleScreen);
    }
  };

  tuningReady = loadInitialTuning();

  if (document.body.dataset.mode === 'cpu') {
    runAfterTuningReady(renderTitleScreen);
  }
})();
