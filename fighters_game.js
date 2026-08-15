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
  const FIGHTING_POWER_RUSH_TURNS = 3;
  const FIGHTING_POWER_RUSH_MULTIPLIER = 1.3;
  const DIGIT_READING_COMPLETE_MS = 1050;
  const NDC_JSON_URL = 'https://raw.githubusercontent.com/Yawatosho/karuta/refs/heads/main/ndc.json';
  const LOCAL_NDC_JSON_URL = 'ndc.json';
  const NDC_CACHE_KEY = 'ndc_json_cache_v2';
  const SELECT_ASSET_VERSION = 'fighters135';
  const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');
  const karutaAudio = window.karutaAudio || null;

  // ---------------------------------------------------------------------------
  // Configuration and static data
  // ---------------------------------------------------------------------------
  const fightersConfig = window.karutaFightersConfig;
  if (!fightersConfig) throw new Error("fighters_config.js must be loaded before fighters_game.js");

  const PLAYERS = fightersConfig.players;
  const ENEMIES = fightersConfig.enemies;
  const DIFFICULTIES = fightersConfig.difficulties;

  const SELECT_TO_OPENING_FADE_MS = 1800;
  const SELECT_TO_OPENING_SWITCH_DELAY_MS = 1650;
  const OPENING_TO_VS_HOLD_MS = 1100;
  const OPENING_TO_VS_FADE_MS = 720;
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
  const TWO_PLAYER_CONTROL_ORDER = fightersConfig.twoPlayer.controlOrder;
  const TWO_PLAYER_CONTROL_TYPES = fightersConfig.twoPlayer.controlTypes;
  const TWO_PLAYER_KEYBOARD_LAYOUTS = fightersConfig.twoPlayer.keyboardLayouts;
  const TWO_PLAYER_VICTORY_LINES = fightersConfig.twoPlayer.victoryLines;

  const DEV_TUNING_KEY = 'karutaDevTuning';
  const DEV_TUNING_VERSION = 1;
  const PRODUCTION_TUNING_URL = 'fighters_tuning.json';
  const ENDING_MD_URL = 'ending/ending.md';
  const GALLERY_STORAGE_KEY = 'karutaGalleryProgressV1';
  const STORY_PROGRESS_STORAGE_KEY = 'karutaStoryProgressV1';
  const STORY_PROGRESS_VERSION = 1;
  const STORY_PROGRESS_PHASES = new Set(['opening', 'battle', 'ending']);
  const TUTORIAL_STORAGE_KEY = 'karutaTutorialProgressV1';
  const TUTORIAL_PROGRESS_VERSION = 1;
  const GALLERY_TABS = ['cutins', 'victories', 'endings', 'artworks', 'sounds'];
  const ARTWORK_ITEMS = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const asset = `artwork/artwork${number}.webp`;
    return { id: asset, label: `ARTWORK ${number}`, asset };
  });
  const GALLERY_SOUND_GROUPS = [
    {
      label: 'BGM',
      items: [
        ['select', 'SELECT'], ['opening', 'OPENING'], ['battle1', 'BATTLE 1'],
        ['battle2', 'BATTLE 2'], ['victory', 'VICTORY'], ['ending', 'ENDING']
      ].map(([id, label]) => ({ kind: 'music', id, label }))
    }
  ];
  const OPENING_COMMON_SCENES = [
    {
      lines: [
        '世界には、あらゆる知識を分類し、',
        '求める情報へ誰よりも早く辿り着く者たちがいる。',
        '人は彼らを――「分類の達人（マスター・オブ・クラシフィケーション）」と呼ぶ。',
        'その頂点を決める、年に一度の知の祭典。'
      ]
    },
    {
      lines: [
        { text: '「日本十進分類カルタ大会」', emphasis: true }
      ]
    },
    {
      lines: [
        '風のような速さ。',
        'すべてを見抜く知識。',
        'そして、一瞬の判断力。',
        '世界中の司書たちが集う中、',
        '今年もまた、新たな挑戦者が大会の扉を開く。'
      ]
    }
  ];
  const OPENING_CHARACTER_SCENES = {
    librarian: [
      '利用者の質問に答え、本棚の間を歩き、必要な知識へと案内する。それが司書さんのいつもの仕事だった。',
      'ある日、彼女のもとに一通の大会招待状が届く。',
      'そこは、世界中の「分類の達人」が集う、年に一度の大舞台。',
      '「私より、ふさわしい方がいるような気もしますが……」',
      'しばらく考えた彼女は、書架に並ぶ本を見渡した。',
      '「もっと本のことを知れるなら」――小さな決意とともに、司書さんの挑戦が始まった。'
    ],
    detective: [
      '大学図書館に通う、明るく元気な学生探偵。',
      'ある日、彼女は図書館で一枚の招待状を発見する。',
      '「世界中の分類の達人が集まる大会……？」',
      '難事件の気配を感じた探偵さんは、にやりと笑った。',
      '「つまり、最後まで勝ち残れば、何かがわかるってことだね！」',
      '事件かどうかは、まだ誰にもわからない。'
    ],
    lily: [
      '本の声を聞くことができる、ひよっこ司書のリリー。',
      '書架を整理していた彼女の耳に、一冊の本から小さな声が届いた。',
      '――大会へ行って。そこで、きっと何かが見つかる。',
      '「わたしにできるかな……？」',
      '不安を抱えながらも、リリーは笑顔で一歩を踏み出す。',
      '「うん。やってみなくちゃ、わからないよね！」'
    ],
    professor: [
      '大学で物理学を研究する教授。',
      '研究室には、分類しきれないほどの資料と、返却期限の近い本が積み上がっていた。',
      '大会の案内を読んだ彼女は、少し考えてから眼鏡を上げる。',
      '「知識を整理することも、立派な研究の一部です」',
      'そして、ひとつだけ付け加えた。',
      '「もちろん、参加するからには優勝を目指します」'
    ],
    fightingLibrarian: [
      '図書館とゲームを愛する、格闘系司書。',
      '彼が目指しているのは、誰もが楽しみながら図書館を知ることのできる場所だった。',
      '日本十進分類カルタ大会の知らせを聞くと、彼は楽しそうに腕をまくる。',
      '「分類とカルタと真剣勝負。これは盛り上がりそうですね！」',
      '勝利の先に、新しい図書館イベントの姿を思い描きながら。'
    ]
  };
  const DEFAULT_DEV_TUNING = buildDefaultDevTuning();
  let devTuning = cloneTuning(DEFAULT_DEV_TUNING);
  let productionTuning = null;
  let tuningSource = 'defaults';
  let tuningReady = Promise.resolve();
  let endingCache = null;
  let endingReady = null;

  const FALLBACK_CARDS = fightersConfig.fallbackCards;
  const PATCH_NOTES = Array.isArray(fightersConfig.patchNotes) ? fightersConfig.patchNotes : [];

  // ---------------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------------
  const soundToggle = document.getElementById('soundToggle');
  const correctSound = document.getElementById('correctSound');
  const ngSound = document.getElementById('ngSound');
  const startSound = document.getElementById('startSound');
  const roundCallSound = document.getElementById('roundCallSound');
  const koSound = document.getElementById('koSound');
  const timeUpSound = document.getElementById('timeUpSound');
  const perfectSound = document.getElementById('perfectSound');
  const winLibSound = document.getElementById('winLibSound');
  const winDetSound = document.getElementById('winDetSound');
  const winLilySound = document.getElementById('winLilySound');
  const winProfSound = document.getElementById('winProfSound');
  const winFlibSound = document.getElementById('winFlibSound');
  const winEnemySound = document.getElementById('winEnemySound');
  const victorySound = document.getElementById('victorySound');
  const resultSound = document.getElementById('resultSound');
  const artworkSound = document.getElementById('artworkSound');
  const continueButton = document.getElementById('continueButton');
  const continueButtonDetail = document.getElementById('continueButtonDetail');
  const startButton = document.getElementById('startButton');
  const twoPlayerButton = document.getElementById('twoPlayerButton');
  const galleryButton = document.getElementById('galleryButton');
  const patchNoteButton = document.getElementById('patchNoteButton');
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

  // ---------------------------------------------------------------------------
  // Runtime state
  // ---------------------------------------------------------------------------
  let soundEnabled = true;
  let storyRoot = null;
  let battleHud = null;
  let skillStrip = null;
  let fighterContinueButton = null;
  let fighterResultAction = null;
  let screen = 'title';
  let playMode = 'story';
  let twoPlayerControls = { player: 'mouse', enemy: 'keyboardA' };
  let selectedDifficulty = 'normal';
  let selectedPlayer = PLAYERS[0];
  let stageIndex = 0;
  let currentEnemy = ENEMIES[0];
  let debugPlayerIndex = 0;
  let debugView = 'ending';
  let debugSceneNumber = 1;
  let debugEnemyIndex = 0;
  let debugScreenLaunchActive = false;
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
  let fighterIconStates = { player: 'default', enemy: 'default' };
  let playerCombo = 0;
  let enemyCombo = 0;
  let lastComboOwner = null;
  let comboContinuationWindowOpen = false;
  let roundStartTime = 0;
  let roundActive = false;
  let answered = false;
  let pendingReveal = false;
  let twoCandidateRevealTurnsRemaining = 0;
  let cpuSkipTurnsRemaining = 0;
  let fightingPowerRushQueued = false;
  let fightingPowerRushTurnsRemaining = 0;
  let fightingPowerRushStreak = 0;
  let fightingPowerRushActiveThisTurn = false;
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
  let galleryProgress = readGalleryProgress();
  let galleryEqualizerTimer = 0;
  let galleryEqualizerLevels = Array(12).fill(0);
  let tutorialActive = false;
  let tutorialAwaitingAnswer = false;
  let tutorialReplayRequested = false;
  let tutorialReturnToHowTo = false;
  let tutorialRunId = 0;
  let skillTutorialToastTimer = 0;
  let skillTutorialToastPlayerId = null;

  // ---------------------------------------------------------------------------
  // Shared helpers and input mapping
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function pad3(value) {
    return String(value).trim().padStart(3, '0');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isTwoPlayerMode() {
    return playMode === 'twoPlayer';
  }

  function removeStoryProgress() {
    try { localStorage.removeItem(STORY_PROGRESS_STORAGE_KEY); } catch (e) {}
  }

  function readStoryProgress() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORY_PROGRESS_STORAGE_KEY) || 'null');
    } catch (e) {
      removeStoryProgress();
      return null;
    }

    const player = PLAYERS.find(candidate => candidate.id === saved?.playerId);
    const difficultyExists = Object.prototype.hasOwnProperty.call(DIFFICULTIES, saved?.difficulty);
    const stageIsValid = Number.isInteger(saved?.stageIndex)
      && saved.stageIndex >= 0
      && saved.stageIndex < ENEMIES.length;
    const phaseIsValid = STORY_PROGRESS_PHASES.has(saved?.phase);
    const openingSceneIsValid = saved?.phase !== 'opening'
      || (Number.isInteger(saved.openingSceneIndex)
        && saved.openingSceneIndex >= 0
        && saved.openingSceneIndex <= OPENING_COMMON_SCENES.length);
    const endingSceneIsValid = saved?.phase !== 'ending'
      || saved.endingSceneNumber === 1
      || saved.endingSceneNumber === 2;

    if (saved?.version !== STORY_PROGRESS_VERSION || !player || !difficultyExists
      || !stageIsValid || !phaseIsValid || !openingSceneIsValid || !endingSceneIsValid) {
      if (saved) removeStoryProgress();
      return null;
    }

    return {
      version: STORY_PROGRESS_VERSION,
      playerId: player.id,
      difficulty: saved.difficulty,
      stageIndex: saved.stageIndex,
      phase: saved.phase,
      openingSceneIndex: saved.phase === 'opening' ? saved.openingSceneIndex : 0,
      endingSceneNumber: saved.phase === 'ending' ? saved.endingSceneNumber : 1,
      updatedAt: Number(saved.updatedAt) || 0
    };
  }

  function writeStoryProgress(phase, options = {}) {
    if (DEBUG_MODE || debugScreenLaunchActive || isTwoPlayerMode()) return;
    const player = selectedPlayer || PLAYERS[0];
    const difficulty = Object.prototype.hasOwnProperty.call(DIFFICULTIES, selectedDifficulty)
      ? selectedDifficulty
      : 'normal';
    const nextProgress = {
      version: STORY_PROGRESS_VERSION,
      playerId: player.id,
      difficulty,
      stageIndex: clamp(
        Number.isInteger(options.stageIndex) ? options.stageIndex : stageIndex,
        0,
        ENEMIES.length - 1
      ),
      phase,
      openingSceneIndex: clamp(
        Number.isInteger(options.openingSceneIndex) ? options.openingSceneIndex : 0,
        0,
        OPENING_COMMON_SCENES.length
      ),
      endingSceneNumber: options.endingSceneNumber === 2 ? 2 : 1,
      updatedAt: Date.now()
    };
    try { localStorage.setItem(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(nextProgress)); } catch (e) {}
  }

  function getStoryProgressLabel(progress) {
    const player = PLAYERS.find(candidate => candidate.id === progress.playerId) || PLAYERS[0];
    const difficulty = DIFFICULTIES[progress.difficulty] || DIFFICULTIES.normal;
    const location = progress.phase === 'opening'
      ? 'OPENING'
      : progress.phase === 'ending'
        ? `ENDING ${progress.endingSceneNumber}`
        : `STAGE ${progress.stageIndex + 1}`;
    return `${player.name} / ${location} / ${difficulty.label}`;
  }

  function updateContinueTitleButton() {
    if (!continueButton) return;
    const progress = readStoryProgress();
    continueButton.hidden = !progress;
    setButtonVisible(continueButton, !!progress, 'grid');
    if (!progress) return;
    const detail = getStoryProgressLabel(progress);
    if (continueButtonDetail) continueButtonDetail.textContent = detail;
    continueButton.setAttribute('aria-label', `CONTINUE: ${detail}`);
  }

  function continueStory() {
    const progress = readStoryProgress();
    if (!progress) {
      renderTitleScreen();
      return;
    }
    playMode = 'story';
    selectedPlayer = PLAYERS.find(player => player.id === progress.playerId) || PLAYERS[0];
    selectedDifficulty = progress.difficulty;
    stageIndex = progress.stageIndex;
    currentEnemy = ENEMIES[stageIndex] || ENEMIES[0];
    if (progress.phase === 'opening') {
      renderOpeningScreen(progress.openingSceneIndex);
    } else if (progress.phase === 'ending') {
      renderEndingScreen(progress.endingSceneNumber);
    } else {
      renderVsScreen();
    }
  }

  function createEmptyTutorialProgress() {
    return { version: TUTORIAL_PROGRESS_VERSION, completed: false, skillSeen: [] };
  }

  function readTutorialProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || 'null');
      if (!saved || saved.version !== TUTORIAL_PROGRESS_VERSION) return createEmptyTutorialProgress();
      return {
        version: TUTORIAL_PROGRESS_VERSION,
        completed: saved.completed === true,
        skillSeen: Array.isArray(saved.skillSeen)
          ? [...new Set(saved.skillSeen.filter(id => PLAYERS.some(player => player.id === id)))]
          : []
      };
    } catch (e) {
      return createEmptyTutorialProgress();
    }
  }

  function writeTutorialProgress(progress) {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  function markTutorialCompleted() {
    const progress = readTutorialProgress();
    progress.completed = true;
    writeTutorialProgress(progress);
  }

  function markSkillTutorialSeen(playerId) {
    if (!playerId) return;
    const progress = readTutorialProgress();
    if (progress.skillSeen.includes(playerId)) return;
    progress.skillSeen.push(playerId);
    writeTutorialProgress(progress);
  }

  function shouldStartBattleTutorial() {
    if (DEBUG_MODE || debugScreenLaunchActive || isTwoPlayerMode()) return false;
    if (tutorialReplayRequested) return true;
    return stageIndex === 0 && battleRound === 1 && !readTutorialProgress().completed;
  }

  function createEmptyGalleryProgress() {
    return { cutins: [], victories: [], endings: [], artworks: [] };
  }

  function readGalleryProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(GALLERY_STORAGE_KEY) || '{}');
      const empty = createEmptyGalleryProgress();
      Object.keys(empty).forEach(category => {
        empty[category] = Array.isArray(saved[category])
          ? [...new Set(saved[category]
              .filter(value => typeof value === 'string')
              .map(normalizeGalleryAssetId))]
          : [];
      });
      return empty;
    } catch (e) {
      return createEmptyGalleryProgress();
    }
  }

  function normalizeGalleryAssetId(value) {
    const assetId = String(value || '').split('?')[0];
    return assetId.replace(/\.png$/i, '.webp');
  }

  function unlockGalleryAsset(category, assetPath) {
    if (!galleryProgress[category]) return;
    const id = normalizeGalleryAssetId(assetPath);
    if (!id || galleryProgress[category].includes(id)) return;
    galleryProgress[category].push(id);
    try { localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleryProgress)); } catch (e) {}
  }

  function isGalleryAssetUnlocked(category, assetPath) {
    return !!galleryProgress[category]?.includes(normalizeGalleryAssetId(assetPath));
  }

  function unlockRandomArtwork() {
    galleryProgress = readGalleryProgress();
    const lockedItems = ARTWORK_ITEMS.filter(item => !isGalleryAssetUnlocked('artworks', item.asset));
    if (!lockedItems.length) return null;
    const item = lockedItems[Math.floor(Math.random() * lockedItems.length)];
    unlockGalleryAsset('artworks', item.asset);
    return item;
  }

  function getGalleryImageItems(category) {
    if (category === 'cutins') {
      return [
        ...PLAYERS.map(player => ({ id: player.cutin, label: player.name, asset: player.cutin })),
        ...ENEMIES.map(enemy => ({ id: enemy.cutin, label: enemy.name, asset: enemy.cutin }))
      ];
    }
    if (category === 'victories') {
      return [
        ...PLAYERS.map(player => {
          const asset = getVictoryImagePath(player, 0, 'win');
          return { id: asset, label: `${player.name} WIN`, asset };
        }),
        ...ENEMIES.map((enemy, index) => {
          const asset = getVictoryImagePath(PLAYERS[0], index, 'lose');
          return { id: asset, label: `${enemy.name} WIN`, asset };
        }),
        ...PLAYERS.map(player => {
          const asset = `round/round_${player.vsCode || 'lib'}.webp`;
          return { id: asset, label: `${player.name} ROUND WIN`, asset };
        }),
        ...ENEMIES.map((enemy, index) => {
          const asset = `round/round_enemy${index + 1}.webp`;
          return { id: asset, label: `${enemy.name} ROUND WIN`, asset };
        })
      ];
    }
    if (category === 'endings') {
      const commonOpeningAsset = getOpeningImagePath(PLAYERS[0], true);
      const openingItems = [
        {
          id: commonOpeningAsset,
          label: 'OPENING / PROLOGUE',
          asset: commonOpeningAsset,
          kind: 'opening'
        },
        ...PLAYERS.map(player => {
          const asset = getOpeningImagePath(player, false);
          return { id: asset, label: `${player.name} OPENING`, asset, kind: 'opening', player };
        })
      ];
      const endingItems = PLAYERS.flatMap(player => [1, 2].map(sceneNumber => {
        const asset = getEndingImagePath(player, sceneNumber);
        return { id: asset, label: `${player.name} ENDING ${sceneNumber}`, asset, kind: 'ending', player, sceneNumber };
      }));
      return [...openingItems, ...endingItems];
    }
    if (category === 'artworks') return ARTWORK_ITEMS;
    return [];
  }

  function isEasyStoryCardRestrictionActive() {
    return !isTwoPlayerMode() && selectedDifficulty === 'easy';
  }

  function hasZeroOnesDigit(card) {
    return pad3(card?.ndc || '').endsWith('0');
  }

  function getBattleCardSourcePool(sourcePool) {
    const pool = Array.isArray(sourcePool) ? sourcePool : [];
    return isEasyStoryCardRestrictionActive() ? pool.filter(hasZeroOnesDigit) : pool;
  }

  function getTwoPlayerOne() {
    return PLAYERS[0];
  }

  function getTwoPlayerTwo() {
    return PLAYERS[1];
  }

  function getPlayerMaxHp() {
    if (isTwoPlayerMode()) return 100;
    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
    return difficulty.playerHp;
  }

  function isSmartphoneOnlyViewport() {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth || 0;
    const height = viewport?.height || window.innerHeight || 0;
    const shortSide = Math.min(width || 0, height || 0);
    const longSide = Math.max(width || 0, height || 0);
    const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const finePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    const touchDevice = (navigator.maxTouchPoints || 0) > 0 || coarsePointer;
    const mobileUserAgent = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || '');
    const compactTouchViewport = touchDevice && (shortSide <= 620 || longSide <= 940);
    const likelyNoPhysicalKeyboard = touchDevice && coarsePointer && !finePointer;
    return document.body.classList.contains('fighter-smartphone')
      || mobileUserAgent
      || compactTouchViewport
      || likelyNoPhysicalKeyboard;
  }

  function getOtherTwoPlayerSide(side) {
    return side === 'enemy' ? 'player' : 'enemy';
  }

  function getControlLabel(controlId) {
    return TWO_PLAYER_CONTROL_TYPES[controlId]?.label || controlId;
  }

  function getControlShortLabel(controlId) {
    return TWO_PLAYER_CONTROL_TYPES[controlId]?.shortLabel || controlId;
  }

  function normalizeKeyboardKey(key) {
    if (key === '￥') return '¥';
    return String(key || '').toLowerCase();
  }

  function getKeyboardSlotFromEvent(controlId, event) {
    const layout = TWO_PLAYER_KEYBOARD_LAYOUTS[controlId];
    if (!layout || !event) return -1;
    const key = normalizeKeyboardKey(event.key);
    return layout.findIndex(item => {
      const keyMatch = item.keys.some(candidate => normalizeKeyboardKey(candidate) === key);
      const codeMatch = item.codes.includes(event.code);
      return keyMatch || codeMatch;
    });
  }

  function isSpaceKeyEvent(event) {
    return event?.key === ' ' || event?.key === 'Spacebar' || event?.code === 'Space';
  }

  function getKeyboardSlotLabel(controlId, slotIndex) {
    return TWO_PLAYER_KEYBOARD_LAYOUTS[controlId]?.[slotIndex]?.label || '';
  }

  function getMouseAnswerOwner() {
    if (!isTwoPlayerMode()) return 'player';
    if (twoPlayerControls.player === 'mouse') return 'player';
    if (twoPlayerControls.enemy === 'mouse') return 'enemy';
    return null;
  }

  function isPointerCardEvent(event) {
    return !!event && typeof event.clientX === 'number' && typeof event.clientY === 'number';
  }

  function resolveAnswerOwner(event) {
    if (event?.owner === 'enemy' || event?.isCPU) return 'enemy';
    if (event?.owner === 'player') return 'player';
    if (isTwoPlayerMode() && isPointerCardEvent(event)) return getMouseAnswerOwner();
    return 'player';
  }

  function isOwnerDisabled(owner) {
    return owner === 'enemy' ? cpuDisabledThisRound : playerDisabledThisRound;
  }

  function canMouseOwnerInteract() {
    const owner = getMouseAnswerOwner();
    if (!owner) return false;
    return roundActive && !answered && !battlePausedForCutin && !isOwnerDisabled(owner);
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

  function renderControlLineArt(controlId) {
    if (controlId === 'mouse') {
      return `
        <div class="control-line-art mouse-art" aria-hidden="true">
          <span class="mouse-body"><i></i></span>
          <span class="mouse-cord"></span>
        </div>`;
    }
    const layout = TWO_PLAYER_KEYBOARD_LAYOUTS[controlId] || [];
    return `
      <div class="control-line-art keyboard-art" aria-hidden="true">
        <span class="keyboard-row">
          ${layout.slice(0, 6).map(key => `<i>${esc(key.label)}</i>`).join('')}
        </span>
        <span class="keyboard-row is-offset">
          ${layout.slice(6).map(key => `<i>${esc(key.label)}</i>`).join('')}
        </span>
      </div>`;
  }

  function renderKeyboardMap(controlId, sideLabel = '') {
    const layout = TWO_PLAYER_KEYBOARD_LAYOUTS[controlId];
    if (!layout) {
      return '<p class="control-map-note">札をクリック</p>';
    }
    const renderKey = (item, index) => `
      <span class="control-map-key">
        <b>${esc(item.label)}</b>
        <small>${esc(sideLabel)}${index + 1}</small>
      </span>`;
    return `
      <div class="control-key-map" aria-label="${esc(getControlLabel(controlId))} キー対応">
        <div class="control-map-row">${layout.slice(0, 6).map(renderKey).join('')}</div>
        <div class="control-map-row is-offset">${layout.slice(6).map((item, index) => renderKey(item, index + 6)).join('')}</div>
      </div>`;
  }

  function renderControlOptionButton(side, controlId) {
    const otherSide = getOtherTwoPlayerSide(side);
    const isActive = twoPlayerControls[side] === controlId;
    const isTaken = twoPlayerControls[otherSide] === controlId;
    const disabled = isTaken && !isActive;
    const sideLabel = side === 'enemy' ? 'P2-' : 'P1-';
    return `
      <button type="button"
        class="two-player-control-option ${isActive ? 'is-active' : ''}"
        data-assign-side="${esc(side)}"
        data-control-option="${esc(controlId)}"
        ${disabled ? 'disabled' : ''}
        aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="control-option-head">
          <strong>${esc(getControlLabel(controlId))}</strong>
          ${disabled ? '<em>使用中</em>' : isActive ? '<em>選択中</em>' : '<em>選択</em>'}
        </span>
        ${renderControlLineArt(controlId)}
        ${controlId === 'mouse'
          ? '<p class="control-map-note">札をクリック</p>'
          : renderKeyboardMap(controlId, sideLabel)}
      </button>`;
  }

  function renderTwoPlayerCardKeyBadges(slotIndex) {
    if (!isTwoPlayerMode()) return '';
    const badges = [];
    const p1Label = getKeyboardSlotLabel(twoPlayerControls.player, slotIndex);
    const p2Label = getKeyboardSlotLabel(twoPlayerControls.enemy, slotIndex);
    if (p1Label) badges.push(`<span class="card-key-badge p1"><b>P1</b>${esc(p1Label)}</span>`);
    if (p2Label) badges.push(`<span class="card-key-badge p2"><b>P2</b>${esc(p2Label)}</span>`);
    return badges.length ? `<span class="card-key-badges">${badges.join('')}</span>` : '';
  }

  function renderCardFace(card, slotIndex = -1) {
    const keyBadges = slotIndex >= 0 ? renderTwoPlayerCardKeyBadges(slotIndex) : '';
    return `<span class="card-subject">${esc(card.subject)}</span>${keyBadges}`;
  }

  function versionedSelectAsset(src) {
    const joiner = String(src).includes('?') ? '&' : '?';
    return `${src}${joiner}v=${SELECT_ASSET_VERSION}`;
  }

  function getFighterIconVariant(src, state) {
    const source = String(src || '');
    if (!source || !state || state === 'default') return source;
    const suffix = state === 'get' ? 'get' : state === 'damage' ? 'damage' : '';
    if (!suffix) return source;
    return source.replace(/_icon(\.[^./?#]+)([?#].*)?$/, `_icon_${suffix}$1$2`);
  }

  function getFighterIconForSide(side) {
    const character = side === 'enemy' ? currentEnemy : selectedPlayer;
    const baseIcon = character?.icon || character?.image || '';
    if (!baseIcon) return '';
    return versionedSelectAsset(getFighterIconVariant(baseIcon, fighterIconStates[side]));
  }

  function resetFighterIconStates() {
    fighterIconStates = { player: 'default', enemy: 'default' };
  }

  function setFighterIconStatesForCardTake(owner) {
    fighterIconStates = owner === 'enemy'
      ? { player: 'damage', enemy: 'get' }
      : { player: 'get', enemy: 'damage' };
  }

  function setFighterIconStateForMiss(owner) {
    fighterIconStates = { ...fighterIconStates, [owner]: 'damage' };
  }

  function getEndingPlayerIdFromHeader(header) {
    const normalized = String(header || '').replace(/\s/g, '').replace(/[：:]+$/, '');
    const matched = PLAYERS.find(player => normalized.includes(player.name.replace(/\s/g, '')));
    return matched?.id || null;
  }

  // ---------------------------------------------------------------------------
  // Ending and tuning data
  // ---------------------------------------------------------------------------
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

  function pickRandomLine(lines, fallback = '') {
    if (!Array.isArray(lines) || !lines.length) return fallback;
    return lines[randInt(0, lines.length - 1)] || fallback;
  }

  function getBattleLine(outcome, isFinal) {
    if (isTwoPlayerMode()) {
      if (outcome === 'lose') {
        return pickRandomLine(TWO_PLAYER_VICTORY_LINES.enemy, '探偵さんが分類の謎を先に解き明かしました。');
      }
      return pickRandomLine(TWO_PLAYER_VICTORY_LINES.player, '司書さんが静かに分類の棚を制しました。');
    }
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

  function formatVictoryLineForViewport(line) {
    const value = String(line || '');
    if (!document.body.classList.contains('fighter-smartphone')) return value;
    return value.replace(/[ \t]*[\r\n]+[ \t]*/g, '');
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

  // ---------------------------------------------------------------------------
  // Audio facade and visual effects
  // ---------------------------------------------------------------------------
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
    const fallbackMap = {
      correct: correctSound,
      character: characterSound,
      ng: ngSound,
      start: startSound,
      roundcall: roundCallSound,
      ko: koSound,
      timeup: timeUpSound,
      perfect: perfectSound,
      winLib: winLibSound,
      winDet: winDetSound,
      winLily: winLilySound,
      winProf: winProfSound,
      winFlib: winFlibSound,
      winEnemy: winEnemySound,
      victory: victorySound,
      result: resultSound,
      artwork: artworkSound
    };
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

  function transitionFromSelectToOpening() {
    clearSelectVsTransition();
    stopMusicTrack({ fadeMs: SELECT_TO_OPENING_FADE_MS });
    storyRoot?.querySelectorAll('button').forEach(button => {
      button.disabled = true;
    });
    requestAnimationFrame(() => {
      storyRoot?.querySelector('.fighter-character-select')?.classList.add('is-exiting-to-vs');
    });
    selectVsTransitionTimer = setTimeout(() => {
      selectVsTransitionTimer = 0;
      renderOpeningScreen();
    }, SELECT_TO_OPENING_SWITCH_DELAY_MS);
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
    if (document.body.classList.contains('fighter-portrait-stage')) {
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
      resultModal.style.transform = 'none';
      resultModal.style.transformOrigin = 'center';
      return;
    }
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
    unlockGalleryAsset('cutins', character.cutin);
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

  // ---------------------------------------------------------------------------
  // Screen rendering and UI lifecycle
  // ---------------------------------------------------------------------------
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
    if (isTwoPlayerMode()) return 'vs/vs.webp';
    const enemyNumber = enemyIndex + 1;
    const code = player?.vsCode || 'lib';
    const usePortraitAsset = document.body.classList.contains('fighter-smartphone')
      && document.body.classList.contains('fighter-portrait-stage');
    if (usePortraitAsset) return `vs_tate/vs_${enemyNumber}_${code}_tate.webp`;
    if (enemyNumber === 3 && code === 'det') return 'vs/vs3_det.webp';
    return `vs/vs_${enemyNumber}_${code}.webp`;
  }

  function getOpeningImagePath(player, useCommonImage = false) {
    const code = useCommonImage ? 'common' : (player?.vsCode || 'lib');
    const usePortraitAsset = document.body.classList.contains('fighter-smartphone')
      && document.body.classList.contains('fighter-portrait-stage');
    const suffix = usePortraitAsset ? '_tate' : '';
    return `opening/op_${code}${suffix}.webp`;
  }

  function getVictoryImagePath(player, enemyIndex, outcome) {
    const usePortraitAsset = document.body.classList.contains('fighter-smartphone')
      && document.body.classList.contains('fighter-portrait-stage');
    const assetDir = usePortraitAsset ? 'victory_tate' : 'victory';
    const assetSuffix = usePortraitAsset ? '_tate' : '';
    if (isTwoPlayerMode()) {
      const winner = outcome === 'lose' ? getTwoPlayerTwo() : getTwoPlayerOne();
      return `${assetDir}/win_${winner?.vsCode || 'lib'}${assetSuffix}.webp`;
    }
    const enemyNumber = enemyIndex + 1;
    if (outcome === 'lose') return `${assetDir}/win_enemy${enemyNumber}${assetSuffix}.webp`;
    const code = player?.vsCode || 'lib';
    return `${assetDir}/win_${code}${assetSuffix}.webp`;
  }

  function getRoundWinImagePath(outcome) {
    if (isTwoPlayerMode()) {
      const winner = outcome === 'lose' ? getTwoPlayerTwo() : getTwoPlayerOne();
      return `round/round_${winner?.vsCode || 'lib'}.webp`;
    }
    if (outcome === 'lose') return `round/round_enemy${stageIndex + 1}.webp`;
    const code = selectedPlayer?.vsCode || 'lib';
    return `round/round_${code}.webp`;
  }

  function getRoundWinSoundKey(outcome) {
    if (isTwoPlayerMode()) {
      return outcome === 'lose' ? 'winDet' : 'winLib';
    }
    if (outcome === 'lose') return 'winEnemy';
    const code = selectedPlayer?.vsCode || 'lib';
    if (code === 'det') return 'winDet';
    if (code === 'lily') return 'winLily';
    if (code === 'prof') return 'winProf';
    if (code === 'flib') return 'winFlib';
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
    const usePortraitAsset = document.body.classList.contains('fighter-smartphone')
      && document.body.classList.contains('fighter-portrait-stage');
    if (usePortraitAsset) return `ending_tate/ending_${code}${sceneNumber}_tate.webp`;
    return `ending/ending_${code}${sceneNumber}.webp`;
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
    const pool = shuffle(getBattleCardSourcePool(allCards).slice());
    const selected = pickUniqueByPrefix(pool, 11, 2);
    selected.forEach((card, index) => { card.used = false; card.index = index; });
    return selected;
  }

  function createBattleCardElement(card, slotIndex = -1) {
    const div = document.createElement('div');
    div.className = 'card fighter-card';
    div.dataset.index = card.index;
    div.dataset.ndc = card.ndc;
    if (slotIndex >= 0) div.dataset.slot = String(slotIndex);
    div.innerHTML = renderCardFace(card, slotIndex);
    div.setAttribute('role', 'button');
    div.tabIndex = 0;
    div.addEventListener('click', selectCard);
    div.addEventListener('keydown', ev => {
      if (isTwoPlayerMode()) return;
      if (ev.key === 'Enter') {
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
    const slotIndex = Number(el.dataset.slot);
    el.innerHTML = renderCardFace(card, Number.isFinite(slotIndex) ? slotIndex : -1);
    el.style.display = '';
    el.style.visibility = '';
    el.style.pointerEvents = canMouseOwnerInteract() ? 'auto' : 'none';
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

  function updateTwoPlayerTitleButtonState() {
    if (!twoPlayerButton) return;
    const unavailable = isSmartphoneOnlyViewport();
    twoPlayerButton.disabled = unavailable;
    twoPlayerButton.textContent = unavailable ? '2P BATTLE PC ONLY' : '2P BATTLE';
    twoPlayerButton.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    twoPlayerButton.setAttribute('aria-label', unavailable ? '2P BATTLEはPCとキーボード接続時のみ選択できます' : '2P BATTLE');
    twoPlayerButton.title = unavailable ? '2P BATTLEはPCとキーボード接続時のみ選択できます' : '';
  }

  function setTitleControls() {
    stopGalleryEqualizerMonitor();
    document.body.classList.remove('game-playing', 'fighter-flow', 'fighter-playing', 'fighter-result');
    document.body.classList.remove('fighter-selecting', 'fighter-opening', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.remove('fighter-two-player', 'fighter-two-player-setup', 'fighter-gallery', 'fighter-patch-notes', 'fighter-how-to', 'fighter-debug', 'fighter-debug-live', 'fighter-artwork-unlock');
    document.body.classList.add('fighter-title');
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    updateContinueTitleButton();
    setButtonVisible(startButton, true);
    setButtonVisible(twoPlayerButton, true);
    setButtonVisible(galleryButton, true);
    setButtonVisible(patchNoteButton, true);
    if (startButton) {
      startButton.textContent = 'STORY MODE';
      startButton.setAttribute('aria-label', 'STORY MODE');
    }
    updateTwoPlayerTitleButtonState();
    if (galleryButton) galleryButton.setAttribute('aria-label', 'GALLERY');
    if (patchNoteButton) patchNoteButton.setAttribute('aria-label', 'PATCH NOTE');
    if (howToButton) {
      howToButton.textContent = 'HELP';
      howToButton.setAttribute('aria-label', 'HELP');
    }
    setButtonVisible(howToButton, true);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (cpuLevelPanel) cpuLevelPanel.style.display = 'none';
    if (optionPanel) optionPanel.style.display = 'none';
  }

  function setFlowControls() {
    stopGalleryEqualizerMonitor();
    document.body.classList.remove('game-playing', 'fighter-playing', 'fighter-result', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-opening', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.remove('fighter-two-player', 'fighter-two-player-setup', 'fighter-gallery', 'fighter-patch-notes', 'fighter-how-to', 'fighter-debug', 'fighter-debug-live', 'fighter-artwork-unlock');
    document.body.classList.add('fighter-flow');
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    setButtonVisible(continueButton, false);
    setButtonVisible(startButton, false);
    setButtonVisible(twoPlayerButton, false);
    setButtonVisible(galleryButton, false);
    setButtonVisible(patchNoteButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (optionPanel) optionPanel.style.display = 'none';
  }

  function setPlayingControls() {
    document.body.classList.remove('fighter-flow', 'fighter-result', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-opening', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.remove('fighter-two-player-setup', 'fighter-gallery', 'fighter-patch-notes', 'fighter-how-to', 'fighter-debug', 'fighter-debug-live', 'fighter-artwork-unlock');
    document.body.classList.add('game-playing', 'fighter-playing');
    document.body.classList.toggle('fighter-two-player', isTwoPlayerMode());
    if (storyRoot) storyRoot.hidden = true;
    if (battleHud) battleHud.classList.remove('is-hidden');
    if (skillStrip) skillStrip.classList.toggle('is-hidden', isTwoPlayerMode());
    showReaderPanel();
    setButtonVisible(continueButton, false);
    setButtonVisible(startButton, false);
    setButtonVisible(twoPlayerButton, false);
    setButtonVisible(galleryButton, false);
    setButtonVisible(patchNoteButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
    if (cpuLevelPanel) cpuLevelPanel.style.display = 'none';
  }

  function setResultControls() {
    document.body.classList.remove('game-playing', 'fighter-flow', 'fighter-playing', 'fighter-title');
    document.body.classList.remove('fighter-selecting', 'fighter-opening', 'fighter-vs-ready', 'fighter-ending', 'fighter-credits');
    document.body.classList.remove('fighter-two-player-setup', 'fighter-gallery', 'fighter-patch-notes', 'fighter-how-to', 'fighter-debug', 'fighter-debug-live', 'fighter-artwork-unlock');
    document.body.classList.add('fighter-result');
    document.body.classList.toggle('fighter-two-player', isTwoPlayerMode());
    hideGameArea();
    if (battleHud) battleHud.classList.add('is-hidden');
    if (skillStrip) skillStrip.classList.add('is-hidden');
    setButtonVisible(continueButton, false);
    setButtonVisible(startButton, false);
    setButtonVisible(twoPlayerButton, false);
    setButtonVisible(galleryButton, false);
    setButtonVisible(patchNoteButton, false);
    setButtonVisible(howToButton, false);
    setButtonVisible(quitButton, false);
    setButtonVisible(restartButton, false);
    setButtonVisible(postButton, false);
  }

  function renderTitleScreen() {
    ensureStoryUi();
    playMode = 'story';
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
          <div class="title-crest" aria-hidden="true">
            <span>NDC</span>
            <i>000 — 999</i>
          </div>
          <div class="title-lockup">
            <p class="title-kicker">NIPPON DECIMAL CLASSIFICATION × KARUTA BATTLE</p>
            <h1 class="fighter-title-main">
              <span>NDC KARUTA</span>
              <strong>HEROES</strong>
            </h1>
            <div class="title-classification-rule" aria-hidden="true">
              <span>000</span><i></i><span>999</span>
            </div>
          </div>
        </div>`;
    }
    setTitleControls();
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
  }

  function getDebugPreview(player) {
    if (debugView === 'ending') {
      return {
        title: `${player.name} / ENDING SCENE ${debugSceneNumber}`,
        image: getEndingImagePath(player, debugSceneNumber),
        lines: getEndingSceneLines(player, debugSceneNumber)
      };
    }

    if (debugView === 'defeat') {
      const enemy = ENEMIES[debugEnemyIndex] || ENEMIES[0];
      return {
        title: `${player.name} / DEFEAT VS ${enemy.name}`,
        image: getVictoryImagePath(player, debugEnemyIndex, 'lose'),
        lines: [getBattleLine('lose', false)]
      };
    }

    const enemy = ENEMIES[debugEnemyIndex] || ENEMIES[0];
    return {
      title: `${player.name} / VICTORY VS ${enemy.name}`,
      image: getVictoryImagePath(player, debugEnemyIndex, 'win'),
      lines: [getBattleLine('win', debugEnemyIndex >= ENEMIES.length - 1)]
    };
  }

  function renderDebugBattleResult(outcome) {
    const isDefeat = outcome === 'lose';
    debugScreenLaunchActive = true;
    playMode = 'story';
    selectedPlayer = PLAYERS[debugPlayerIndex] || PLAYERS[0];
    stageIndex = debugEnemyIndex;
    currentEnemy = ENEMIES[stageIndex] || ENEMIES[0];
    playerHp = isDefeat ? 0 : getPlayerMaxHp();
    enemyHp = isDefeat ? 100 : 0;
    cards = FALLBACK_CARDS.slice(0, DEFAULT_FIELD_SLOT_COUNT).map((card, index) => ({
      ...card,
      index,
      used: true
    }));
    screen = 'debugResult';
    showBattleResult(outcome);
    document.body.classList.add('fighter-debug-live');

    if (fighterContinueButton) {
      fighterContinueButton.textContent = 'BACK TO DEBUG MODE';
      fighterContinueButton.style.display = 'inline-block';
      fighterResultAction = () => {
        closeModal(resultModal);
        renderDebugScreen();
      };
    }
    if (resultTopButton) resultTopButton.style.display = 'none';
    if (postButton) postButton.style.display = 'none';
  }

  async function renderDebugScreen() {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    debugScreenLaunchActive = false;
    screen = 'debug';
    playMode = 'story';
    setFlowControls();
    document.body.classList.add('fighter-debug');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    stopMusicTrack();

    if (debugView === 'ending') await fetchEndingData();
    if (screen !== 'debug' || !storyRoot) return;

    debugPlayerIndex = clamp(debugPlayerIndex, 0, PLAYERS.length - 1);
    debugEnemyIndex = clamp(debugEnemyIndex, 0, ENEMIES.length - 1);
    const player = PLAYERS[debugPlayerIndex] || PLAYERS[0];
    selectedPlayer = player;
    stageIndex = debugEnemyIndex;
    currentEnemy = ENEMIES[debugEnemyIndex] || ENEMIES[0];
    const preview = getDebugPreview(player);

    storyRoot.hidden = false;
    storyRoot.innerHTML = `
      <section class="fighter-debug-screen" aria-label="DEBUG MODE">
        <header class="debug-header">
          <div>
            <span>DEVELOPMENT PREVIEW</span>
            <h2>DEBUG MODE</h2>
          </div>
          <code>?debug=1</code>
        </header>
        <div class="debug-workspace">
          <aside class="debug-controls" aria-label="デバッグ項目">
            <section>
              <h3>CHARACTER</h3>
              <div class="debug-character-list">
                ${PLAYERS.map((item, index) => `
                  <button type="button" data-debug-player="${index}" class="${index === debugPlayerIndex ? 'active' : ''}">
                    <img src="${esc(versionedSelectAsset(item.icon))}" alt="">
                    <span><strong>${esc(item.name)}</strong><small>${esc(item.englishName || item.name)}</small></span>
                  </button>`).join('')}
              </div>
            </section>
            <section>
              <h3>SCREEN</h3>
              <div class="debug-screen-tabs">
                ${[
                  ['ending', 'ENDING'],
                  ['victory', 'VICTORY'],
                  ['defeat', 'DEFEAT']
                ].map(([id, label]) => `
                  <button type="button" data-debug-view="${id}" class="${id === debugView ? 'active' : ''}">${label}</button>`).join('')}
              </div>
            </section>
            ${debugView === 'ending' ? `
              <section>
                <h3>SCENE</h3>
                <div class="debug-sub-options">
                  ${[1, 2].map(sceneNumber => `
                    <button type="button" data-debug-scene="${sceneNumber}" class="${sceneNumber === debugSceneNumber ? 'active' : ''}">SCENE ${sceneNumber}</button>`).join('')}
                </div>
              </section>` : ''}
            ${debugView !== 'ending' ? `
              <section>
                <h3>OPPONENT</h3>
                <div class="debug-opponent-list">
                  ${ENEMIES.map((enemy, index) => `
                    <button type="button" data-debug-enemy="${index}" class="${index === debugEnemyIndex ? 'active' : ''}">
                      <span>STAGE ${index + 1}</span>${esc(enemy.name)}
                    </button>`).join('')}
                </div>
              </section>` : ''}
          </aside>
          <main class="debug-preview">
            <div class="debug-preview-heading">
              <span>SELECTED SCREEN</span>
              <strong>${esc(preview.title)}</strong>
            </div>
            <div class="debug-preview-stage">
              <img src="${esc(versionedSelectAsset(preview.image))}" alt="${esc(preview.title)}">
              <div class="debug-preview-message">${renderEndingParagraphs(preview.lines)}</div>
            </div>
            <button type="button" class="debug-open-screen" data-debug-open>OPEN ACTUAL GAME SCREEN</button>
            <p class="debug-asset-path">${esc(preview.image)}</p>
          </main>
        </div>
        <footer class="debug-actions">
          <p>通常画面には表示されない開発確認用メニューです。</p>
          <button type="button" data-debug-exit>EXIT DEBUG MODE</button>
        </footer>
      </section>`;

    storyRoot.querySelectorAll('[data-debug-player]').forEach(button => {
      button.addEventListener('click', () => {
        debugPlayerIndex = Number(button.dataset.debugPlayer) || 0;
        renderDebugScreen();
      });
    });
    storyRoot.querySelectorAll('[data-debug-view]').forEach(button => {
      button.addEventListener('click', () => {
        debugView = button.dataset.debugView || 'ending';
        renderDebugScreen();
      });
    });
    storyRoot.querySelectorAll('[data-debug-scene]').forEach(button => {
      button.addEventListener('click', () => {
        debugSceneNumber = Number(button.dataset.debugScene) || 1;
        renderDebugScreen();
      });
    });
    storyRoot.querySelectorAll('[data-debug-enemy]').forEach(button => {
      button.addEventListener('click', () => {
        debugEnemyIndex = Number(button.dataset.debugEnemy) || 0;
        renderDebugScreen();
      });
    });
    storyRoot.querySelector('[data-debug-open]')?.addEventListener('click', () => {
      if (debugView === 'ending') {
        debugScreenLaunchActive = true;
        renderEndingScreen(debugSceneNumber);
        return;
      }
      renderDebugBattleResult(debugView === 'defeat' ? 'lose' : 'win');
    });
    storyRoot.querySelector('[data-debug-exit]')?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('debug');
      window.location.assign(url.href);
    });
  }

  function getGalleryTabLabel(tab) {
    return ({ cutins: 'CUT-IN', victories: 'VICTORY', endings: 'OPENING / ENDING', artworks: 'ARTWORK', sounds: 'SOUND TEST' })[tab] || tab;
  }

  function renderHowToScreen() {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    screen = 'howTo';
    setFlowControls();
    document.body.classList.add('fighter-how-to');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    playMusicTrack('select');

    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="how-to-screen" aria-label="HELP">
          <header class="how-to-header">
            <div>
              <span>KNOWLEDGE ARENA GUIDE</span>
              <h2>HELP</h2>
            </div>
            <p>CLASSIFICATION BATTLE</p>
          </header>

          <div class="how-to-content">
            <section class="how-to-prologue">
              <div>
                <span>WELCOME, CHALLENGER</span>
                <h3>分類を読み解き、知識の札で道を切り拓け。</h3>
                <p>ここは、あらゆる本の知識が力へと変わる「分類闘技場」。読み上げられるNDCを見極め、正しい分類札を相手より早くつかみ取ろう。</p>
              </div>
              <div class="how-to-crest" aria-hidden="true">
                <strong>NDC</strong>
                <span>000 — 999</span>
              </div>
            </section>

            <section class="how-to-steps" aria-label="バトルの進め方">
              <article class="how-to-step">
                <span class="how-to-step-number">01</span>
                <div><small>CHOOSE YOUR CHARACTER</small><h3>キャラクターを選ぶ</h3></div>
                <p>5人のキャラクターから一人を選択。攻撃・防御・SPECIALは、それぞれ異なる。</p>
              </article>
              <article class="how-to-step">
                <span class="how-to-step-number">02</span>
                <div><small>READ THE CODE</small><h3>NDCを読む</h3></div>
                <p>順に現れる3桁の分類記号を読み、対応する本の分類を見極めよう。</p>
              </article>
              <article class="how-to-step">
                <span class="how-to-step-number">03</span>
                <div><small>TAKE THE CARD</small><h3>分類札を取る</h3></div>
                <p>正解の札を相手より先に取れば攻撃成功。素早い正解と連続成功が力になる。</p>
              </article>
              <article class="how-to-step">
                <span class="how-to-step-number">04</span>
                <div><small>CLAIM THE CROWN</small><h3>2ROUNDを制す</h3></div>
                <p>1回の出題が1TURN、10TURNで1ROUND。先に2ROUNDを取れば勝利だ。</p>
              </article>
            </section>

            <section class="how-to-battle-guide">
              <div class="how-to-flow" aria-label="攻撃の流れ">
                <div><small>READ</small><strong>3-DIGIT NDC</strong><span>分類記号を読む</span></div>
                <i aria-hidden="true">›</i>
                <div><small>SELECT</small><strong>CATEGORY CARD</strong><span>対応する札を取る</span></div>
                <i aria-hidden="true">›</i>
                <div><small>ATTACK</small><strong>DEAL DAMAGE</strong><span>知識を力に変える</span></div>
              </div>
              <aside class="how-to-special">
                <span>SPECIAL</span>
                <div><strong>ゲージが満ちた時、キャラクターの切り札が目覚める。</strong><p>キャラクター固有の能力で、勝負の流れを引き寄せよう。</p></div>
              </aside>
            </section>

            <section class="how-to-analytics" aria-labelledby="analyticsNoticeTitle">
              <span>PRIVACY</span>
              <div>
                <h3 id="analyticsNoticeTitle">Google Analyticsについて</h3>
                <p>本ゲームでは、利用状況の把握と改善のためGoogle Analyticsを使用しています。Cookie等を利用し、アクセス状況、セッション、概算地域、ブラウザ・端末情報などがGoogleへ送信されます。本ゲームから氏名・メールアドレスなど、個人を直接特定する情報を送信することはありません。収集されたデータはGoogleの規約とプライバシーポリシーに基づいて処理されます。</p>
                <p>計測を無効にしたい場合は、Googleが提供するオプトアウトアドオンをご利用ください。</p>
              </div>
              <nav aria-label="Google Analytics関連情報">
                <a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noopener noreferrer">GOOGLE PRIVACY POLICY</a>
                <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer">OPT-OUT ADD-ON</a>
              </nav>
            </section>
          </div>

          <footer class="how-to-actions">
            <p><span>TIP</span> 難易度はキャラクター選択画面で変更できます。</p>
            <div class="how-to-action-buttons">
              <button type="button" data-how-to-tutorial>${readTutorialProgress().completed ? 'PLAY TUTORIAL AGAIN' : 'PLAY TUTORIAL'}</button>
              <button type="button" data-how-to-back>BACK TO TITLE</button>
            </div>
          </footer>
        </section>`;
    }

    storyRoot?.querySelector('[data-how-to-back]')?.addEventListener('click', renderTitleScreen);
    storyRoot?.querySelector('[data-how-to-tutorial]')?.addEventListener('click', startTutorialReplay);
  }

  function renderPatchNotesScreen() {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    screen = 'patchNotes';
    setFlowControls();
    document.body.classList.add('fighter-patch-notes');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    playMusicTrack('select');

    const history = PATCH_NOTES.length
      ? PATCH_NOTES.map(note => `
          <article class="patch-note-entry">
            <time datetime="${esc(note.isoDate || '')}">${esc(note.date || '')}</time>
            <ul>
              ${(Array.isArray(note.items) ? note.items : []).map(item => `<li>${esc(item)}</li>`).join('')}
            </ul>
          </article>`).join('')
      : '<p class="patch-note-empty">更新履歴はまだありません。</p>';

    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="patch-note-screen" aria-label="PATCH NOTE">
          <header class="patch-note-header">
            <div>
              <span>UPDATE HISTORY</span>
              <h2>PATCH NOTE</h2>
            </div>
            <p>VERSION ARCHIVE</p>
          </header>
          <div class="patch-note-content">
            <div class="patch-note-list">${history}</div>
          </div>
          <footer class="patch-note-actions">
            <button type="button" data-patch-note-back>BACK TO TITLE</button>
          </footer>
        </section>`;
    }

    storyRoot?.querySelector('[data-patch-note-back]')?.addEventListener('click', renderTitleScreen);
  }

  function renderGalleryImageGrid(category) {
    return getGalleryImageItems(category).map(item => {
      const unlocked = isGalleryAssetUnlocked(category, item.asset);
      return `
        <button type="button" class="gallery-card ${unlocked ? 'is-unlocked' : 'is-locked'}"
          ${unlocked ? `data-gallery-item="${esc(item.id)}"` : 'disabled'}
          aria-label="${esc(unlocked ? item.label : '未解放')}">
          <span class="gallery-card-visual">
            ${unlocked
              ? `<img src="${esc(versionedSelectAsset(item.asset))}" alt="${esc(item.label)}">`
              : '<span class="gallery-lock" aria-hidden="true">？</span>'}
          </span>
          <strong>${esc(unlocked ? item.label : 'LOCKED')}</strong>
        </button>`;
    }).join('');
  }

  function renderGallerySoundGroups() {
    return GALLERY_SOUND_GROUPS.map(group => `
      <section class="gallery-sound-group">
        <h3>${esc(group.label)}</h3>
        <div class="gallery-sound-buttons">
          ${group.items.map(item => `
            <button type="button" data-gallery-sound-kind="${esc(item.kind)}" data-gallery-sound-id="${esc(item.id)}">
              ${esc(item.label)}
            </button>`).join('')}
        </div>
      </section>`).join('');
  }

  function playGallerySound(kind, id, label) {
    if (!karutaAudio) return;
    karutaAudio.prepare().catch(() => false);
    if (kind !== 'music') return;
    karutaAudio.playMusic(id);
    updateGalleryEqualizer();
    const status = storyRoot?.querySelector('[data-gallery-sound-status]');
    if (status) status.textContent = `NOW PLAYING: ${label}`;
  }

  function updateGalleryEqualizer() {
    const equalizer = storyRoot?.querySelector('[data-gallery-equalizer]');
    if (!equalizer) return false;
    const musicState = karutaAudio?.getMusicState?.();
    const isPlaying = !!musicState?.name && !musicState.paused;
    const frequencyBands = isPlaying
      ? karutaAudio?.getMusicFrequencyBands?.(12) || Array(12).fill(0)
      : Array(12).fill(0);
    const bars = equalizer.querySelectorAll('i');

    galleryEqualizerLevels = galleryEqualizerLevels.map((previous, index) => {
      const target = Number(frequencyBands[index]) || 0;
      const response = target > previous ? 0.48 : 0.14;
      const next = previous + (target - previous) * response;
      const displayedLevel = isPlaying ? Math.max(0.08, Math.min(1, next)) : 0.08;
      const bar = bars[index];
      if (bar) bar.style.setProperty('--eq-level', String(displayedLevel));
      return isPlaying ? next : 0;
    });

    equalizer.classList.toggle('is-playing', isPlaying);
    return true;
  }

  function runGalleryEqualizerFrame() {
    if (!updateGalleryEqualizer()) {
      galleryEqualizerTimer = 0;
      return;
    }
    galleryEqualizerTimer = requestAnimationFrame(runGalleryEqualizerFrame);
  }

  function startGalleryEqualizerMonitor() {
    stopGalleryEqualizerMonitor();
    galleryEqualizerLevels = Array(12).fill(0);
    runGalleryEqualizerFrame();
  }

  function stopGalleryEqualizerMonitor() {
    if (galleryEqualizerTimer) cancelAnimationFrame(galleryEqualizerTimer);
    galleryEqualizerTimer = 0;
    galleryEqualizerLevels = Array(12).fill(0);
  }

  function renderGalleryScreen(activeTab = 'cutins') {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    galleryProgress = readGalleryProgress();
    const tab = GALLERY_TABS.includes(activeTab) ? activeTab : 'cutins';
    screen = 'gallery';
    setFlowControls();
    document.body.classList.add('fighter-gallery');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    if (tab === 'sounds') stopMusicTrack();
    else playMusicTrack('select');

    const imageItems = tab === 'sounds' ? [] : getGalleryImageItems(tab);
    const unlockedCount = imageItems.filter(item => isGalleryAssetUnlocked(tab, item.asset)).length;
    const summary = tab === 'sounds' ? 'BGM COLLECTION' : `${unlockedCount} / ${imageItems.length} UNLOCKED`;

    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-gallery-screen" aria-label="GALLERY">
          <header class="gallery-header">
            <div>
              <span>COLLECTION</span>
              <h2>GALLERY</h2>
            </div>
            <p>${esc(summary)}</p>
          </header>
          <nav class="gallery-tabs" aria-label="ギャラリー種別">
            ${GALLERY_TABS.map(tabId => `
              <button type="button" data-gallery-tab="${tabId}" class="${tabId === tab ? 'active' : ''}">
                ${esc(getGalleryTabLabel(tabId))}
              </button>`).join('')}
          </nav>
          <div class="gallery-content ${tab === 'sounds' ? 'is-sound-test' : ''}">
            ${tab === 'sounds'
              ? `<div class="gallery-sound-test">
                  ${renderGallerySoundGroups()}
                  <div class="gallery-sound-footer">
                    <div class="gallery-sound-now-playing">
                      <div class="gallery-equalizer" data-gallery-equalizer aria-hidden="true">
                        ${Array.from({ length: 12 }, () => '<i></i>').join('')}
                      </div>
                      <p data-gallery-sound-status>SELECT A TRACK</p>
                    </div>
                    <button type="button" data-gallery-sound-stop>STOP</button>
                  </div>
                </div>`
              : `<div class="gallery-grid">${renderGalleryImageGrid(tab)}</div>`}
          </div>
          <footer class="gallery-actions">
            <button type="button" data-gallery-back>BACK TO TITLE</button>
          </footer>
        </section>`;
    }

    storyRoot?.querySelectorAll('[data-gallery-tab]').forEach(button => {
      button.addEventListener('click', () => renderGalleryScreen(button.dataset.galleryTab));
    });
    storyRoot?.querySelectorAll('[data-gallery-item]').forEach(button => {
      button.addEventListener('click', () => renderGalleryViewer(tab, button.dataset.galleryItem));
    });
    storyRoot?.querySelectorAll('[data-gallery-sound-kind]').forEach(button => {
      button.addEventListener('click', () => {
        playGallerySound(button.dataset.gallerySoundKind, button.dataset.gallerySoundId, button.textContent.trim());
      });
    });
    storyRoot?.querySelector('[data-gallery-sound-stop]')?.addEventListener('click', () => {
      stopMusicTrack();
      updateGalleryEqualizer();
      const status = storyRoot?.querySelector('[data-gallery-sound-status]');
      if (status) status.textContent = 'STOPPED';
    });
    storyRoot?.querySelector('[data-gallery-back]')?.addEventListener('click', renderTitleScreen);
    if (tab === 'sounds') startGalleryEqualizerMonitor();
  }

  async function renderGalleryViewer(category, itemId) {
    const item = getGalleryImageItems(category).find(entry => entry.id === itemId);
    if (!item || !isGalleryAssetUnlocked(category, item.asset)) {
      renderGalleryScreen(category);
      return;
    }
    screen = 'galleryViewer';
    setFlowControls();
    document.body.classList.add('fighter-gallery');
    const showsEndingText = category === 'endings' && item.kind === 'ending';
    if (showsEndingText) await fetchEndingData();
    if (screen !== 'galleryViewer') return;
    const endingLines = showsEndingText
      ? getEndingSceneLines(item.player, item.sceneNumber)
      : [];
    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="gallery-viewer" aria-label="${esc(item.label)}">
          <div class="gallery-viewer-art">
            <img src="${esc(versionedSelectAsset(item.asset))}" alt="${esc(item.label)}">
            ${showsEndingText
              ? `<div class="gallery-ending-message"><div>${renderEndingParagraphs(endingLines)}</div></div>`
              : ''}
          </div>
          <div class="gallery-viewer-bar">
            <strong>${esc(item.label)}</strong>
            <button type="button" data-gallery-viewer-back>BACK TO GALLERY</button>
          </div>
        </section>`;
    }
    storyRoot?.querySelector('[data-gallery-viewer-back]')?.addEventListener('click', () => renderGalleryScreen(category));
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

  function renderTwoPlayerSetup() {
    ensureStoryUi();
    if (isSmartphoneOnlyViewport()) {
      updateTwoPlayerTitleButtonState();
      renderTitleScreen();
      return;
    }

    playMode = 'twoPlayer';
    selectedPlayer = getTwoPlayerOne();
    currentEnemy = getTwoPlayerTwo();
    stageIndex = 0;
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    playMusicTrack('select');
    screen = 'twoPlayerSetup';
    setFlowControls();
    document.body.classList.add('fighter-two-player', 'fighter-two-player-setup');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();

    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="two-player-setup-screen" aria-label="2P対戦設定">
          <div class="fighter-screen-head">
            <h2>2P BATTLE SETTINGS</h2>
          </div>
          <div class="two-player-fixed-fighters" aria-label="使用キャラクター">
            <article class="two-player-fighter-card p1">
              <span>P1</span>
              <img src="${esc(versionedSelectAsset(getTwoPlayerOne().icon))}" alt="${esc(getTwoPlayerOne().name)}">
              <strong>${esc(getTwoPlayerOne().name)}</strong>
            </article>
            <div class="two-player-vs-mark">VS</div>
            <article class="two-player-fighter-card p2">
              <span>P2</span>
              <img src="${esc(versionedSelectAsset(getTwoPlayerTwo().icon))}" alt="${esc(getTwoPlayerTwo().name)}">
              <strong>${esc(getTwoPlayerTwo().name)}</strong>
            </article>
          </div>
          <div class="two-player-control-grid">
            <section class="two-player-control-panel">
              <h3><span>1P</span>${esc(getTwoPlayerOne().name)}</h3>
              <div class="two-player-control-options">
                ${TWO_PLAYER_CONTROL_ORDER.map(controlId => renderControlOptionButton('player', controlId)).join('')}
              </div>
            </section>
            <section class="two-player-control-panel is-p2">
              <h3><span>2P</span>${esc(getTwoPlayerTwo().name)}</h3>
              <div class="two-player-control-options">
                ${TWO_PLAYER_CONTROL_ORDER.map(controlId => renderControlOptionButton('enemy', controlId)).join('')}
              </div>
            </section>
          </div>
          <p class="fighter-flow-actions two-player-setup-actions">
            <button type="button" data-two-player-back>BACK</button>
            <button type="button" data-two-player-start>START BATTLE</button>
          </p>
        </section>`;
    }

    bindTwoPlayerSetupControls();
  }

  function bindTwoPlayerSetupControls() {
    storyRoot?.querySelectorAll('[data-control-option]').forEach(button => {
      button.addEventListener('click', event => {
        const side = event.currentTarget.dataset.assignSide;
        const controlId = event.currentTarget.dataset.controlOption;
        if (!side || !controlId || event.currentTarget.disabled) return;
        twoPlayerControls = { ...twoPlayerControls, [side]: controlId };
        renderTwoPlayerSetup();
      });
    });
    storyRoot?.querySelector('[data-two-player-back]')?.addEventListener('click', renderTitleScreen);
    storyRoot?.querySelector('[data-two-player-start]')?.addEventListener('click', () => {
      if (twoPlayerControls.player === twoPlayerControls.enemy) return;
      selectedPlayer = getTwoPlayerOne();
      currentEnemy = getTwoPlayerTwo();
      stageIndex = 0;
      renderVsScreen();
    });
  }

  function renderCharacterSelect() {
    ensureStoryUi();
    playMode = 'story';
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
          <div class="character-select-lower">
            <div class="character-roster-panel">
              <span class="character-roster-label">FIGHTER</span>
              <div class="character-icon-row" aria-label="キャラクターアイコン">
                ${PLAYERS.map(player => `
                  <button type="button" class="${player.id === previewPlayer.id ? 'active' : ''}" data-preview-player="${esc(player.id)}" aria-label="${esc(player.name)}">
                    <img src="${esc(versionedSelectAsset(player.icon))}" alt="">
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="character-difficulty-panel">
              <span class="character-difficulty-label">DIFFICULTY</span>
              <div class="difficulty-select" role="group" aria-label="CPU難易度選択">
                ${Object.entries(DIFFICULTIES).map(([key, diff]) => `
                  <button type="button" data-difficulty="${key}" class="${key === selectedDifficulty ? 'active' : ''}">
                    <strong>${esc(diff.label)}</strong>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
          <p class="fighter-flow-actions character-select-actions">
            <button type="button" data-fighter-back>BACK</button>
            <button type="button" data-confirm-player="${esc(previewPlayer.id)}">FIGHT WITH THIS HERO</button>
          </p>
        </div>`;
      const specialPanel = storyRoot.querySelector('.character-special');
      const specialDescription = specialPanel?.querySelector('p');
      if (specialPanel && specialDescription) {
        const descriptionStyle = getComputedStyle(specialDescription);
        const lineHeight = Number.parseFloat(descriptionStyle.lineHeight) || 0;
        const isMultiline = lineHeight > 0 && specialDescription.scrollHeight > lineHeight * 1.5;
        specialPanel.classList.toggle('is-description-multiline', isMultiline);
      }
    }
    storyRoot?.querySelector('[data-fighter-back]')?.addEventListener('click', renderTitleScreen);
    bindDifficultyButtons();
    storyRoot?.querySelectorAll('[data-preview-player]').forEach(button => {
      button.addEventListener('click', () => {
        selectedPlayer = PLAYERS.find(player => player.id === button.dataset.previewPlayer) || PLAYERS[0];
        renderCharacterSelect();
      });
    });
    storyRoot?.querySelector('[data-confirm-player]')?.addEventListener('click', event => {
      selectedPlayer = PLAYERS.find(player => player.id === event.currentTarget.dataset.confirmPlayer) || PLAYERS[0];
      stageIndex = 0;
      writeStoryProgress('opening', { stageIndex: 0, openingSceneIndex: 0 });
      transitionFromSelectToOpening();
    });
  }

  function renderOpeningParagraphs(lines) {
    return lines.map(line => {
      const item = typeof line === 'string' ? { text: line, emphasis: false } : line;
      return `<p class="${item?.emphasis ? 'is-emphasis' : ''}">${esc(item?.text || '')}</p>`;
    }).join('');
  }

  function renderOpeningScreen(startSceneIndex = 0) {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    setFlowControls();
    document.body.classList.add('fighter-opening');
    document.body.classList.remove('fighter-selecting');
    screen = 'opening';
    currentEnemy = ENEMIES[0];
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    playMusicTrack('opening');

    const openingPlayer = selectedPlayer || PLAYERS[0];
    const characterLines = OPENING_CHARACTER_SCENES[openingPlayer.id]
      || OPENING_CHARACTER_SCENES.librarian;
    const scenes = [
      ...OPENING_COMMON_SCENES.map(scene => ({ ...scene, common: true })),
      {
        lines: characterLines,
        common: false,
        character: true
      }
    ];

    const finishOpening = (screenEl, options = {}) => {
      if (screen !== 'opening' || screenEl?.classList.contains('is-finishing')) return;
      const linger = options.linger !== false;
      screenEl?.classList.add('is-finishing');
      screenEl?.querySelectorAll('button').forEach(button => { button.disabled = true; });

      const beginVsTransition = () => {
        if (screen !== 'opening') return;
        screenEl?.classList.add('is-leaving');
        stopMusicTrack({ fadeMs: OPENING_TO_VS_FADE_MS });
        selectVsTransitionTimer = setTimeout(() => {
          selectVsTransitionTimer = 0;
          renderVsScreen({ musicAlreadyFading: true });
        }, OPENING_TO_VS_FADE_MS);
      };

      if (linger) {
        selectVsTransitionTimer = setTimeout(beginVsTransition, OPENING_TO_VS_HOLD_MS);
      } else {
        beginVsTransition();
      }
    };

    const renderScene = sceneIndex => {
      if (screen !== 'opening' || !storyRoot) return;
      const boundedIndex = Math.max(0, Math.min(scenes.length - 1, sceneIndex));
      writeStoryProgress('opening', { stageIndex: 0, openingSceneIndex: boundedIndex });
      const scene = scenes[boundedIndex];
      const openingAssetPath = getOpeningImagePath(openingPlayer, scene.common);
      unlockGalleryAsset('endings', openingAssetPath);
      const imagePath = versionedSelectAsset(openingAssetPath);
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-opening-screen opening-scene-${boundedIndex + 1} ${scene.character ? 'opening-scene-character' : 'opening-scene-common'}" tabindex="0" aria-label="OPENING DEMO ${boundedIndex + 1} / ${scenes.length}">
          <img class="opening-full-art" src="${esc(imagePath)}" alt="${esc(scene.common ? '日本十進分類カルタ大会' : openingPlayer.name)} opening scene">
          <button type="button" class="opening-skip-button" data-opening-skip>SKIP</button>
          <div class="opening-message-window">
            <div class="opening-message-text">
              ${renderOpeningParagraphs(scene.lines)}
              <span class="opening-continue-caret" aria-hidden="true"></span>
            </div>
          </div>
        </section>`;

      const screenEl = storyRoot.querySelector('.fighter-opening-screen');
      const advance = () => {
        if (screen !== 'opening') return;
        if (boundedIndex < scenes.length - 1) {
          renderScene(boundedIndex + 1);
          return;
        }
        finishOpening(screenEl);
      };
      screenEl?.addEventListener('click', advance);
      screenEl?.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finishOpening(screenEl, { linger: false });
          return;
        }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        advance();
      });
      storyRoot.querySelector('[data-opening-skip]')?.addEventListener('click', event => {
        event.stopPropagation();
        finishOpening(screenEl, { linger: false });
      });
      screenEl?.focus({ preventScroll: true });
    };

    renderScene(startSceneIndex);
  }

  function renderVsScreen(options = {}) {
    ensureStoryUi();
    clearSelectVsTransition();
    if (!options.musicAlreadyFading) stopMusicTrack();
    screen = 'vs';
    currentEnemy = isTwoPlayerMode() ? getTwoPlayerTwo() : (ENEMIES[stageIndex] || ENEMIES[0]);
    writeStoryProgress('battle');
    setFlowControls();
    document.body.classList.toggle('fighter-two-player', isTwoPlayerMode());
    document.body.classList.add('fighter-vs-ready');
    document.body.classList.remove('fighter-selecting');
    const vsImagePath = getVsImagePath(selectedPlayer, stageIndex);
    if (storyRoot) {
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <div class="fighter-vs-screen reference-vs-screen vs-art-screen" aria-label="${isTwoPlayerMode() ? '2P BATTLE' : `STAGE ${stageIndex + 1}`}: ${esc(selectedPlayer.name)} VS ${esc(currentEnemy.name)}">
          <img class="vs-full-art" src="${esc(vsImagePath)}" alt="${esc(selectedPlayer.name)} VS ${esc(currentEnemy.name)}">
          <div class="vs-screen-meta" aria-hidden="true">${isTwoPlayerMode() ? '2P BATTLE' : `STAGE ${stageIndex + 1} / ${ENEMIES.length}`}</div>
        </div>
        `;
    }
    playMusicTrack('vs');
    vsAutoStartTimer = setTimeout(() => {
      vsAutoStartTimer = 0;
      beginBattle();
    }, VS_SCREEN_AUTO_START_MS);
  }

  function renderEndingScreen(startSceneNumber = 1) {
    ensureStoryUi();
    clearSelectVsTransition();
    clearRoundTimers();
    cancelCountdown();
    closeModal(howToModal);
    closeModal(resultModal);
    hideCpuCursor();
    setFlowControls();
    document.body.classList.add('fighter-ending');
    if (debugScreenLaunchActive) document.body.classList.add('fighter-debug-live');
    screen = 'ending';
    playMusicTrack('ending');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();
    if (resultDisplayEl) resultDisplayEl.style.display = 'none';
    if (battleResultEl) battleResultEl.innerHTML = '';

    const endingPlayer = selectedPlayer || PLAYERS[0];
    const firstSceneNumber = startSceneNumber === 2 ? 2 : 1;

    const renderLoading = () => {
      if (screen !== 'ending') return;
      if (!storyRoot) return;
      storyRoot.hidden = false;
      storyRoot.innerHTML = `
        <section class="fighter-ending-screen ending-scene-${firstSceneNumber} is-loading" aria-label="${esc(endingPlayer.name)} ENDING">
          <img class="ending-full-art" src="${esc(versionedSelectAsset(getEndingImagePath(endingPlayer, firstSceneNumber)))}" alt="${esc(endingPlayer.name)} ending">
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
      writeStoryProgress('ending', { endingSceneNumber: sceneNumber });
      const hasNextScene = sceneNumber === 1;
      const endingAssetPath = getEndingImagePath(endingPlayer, sceneNumber);
      unlockGalleryAsset('endings', endingAssetPath);
      const imagePath = versionedSelectAsset(endingAssetPath);
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
          ${debugScreenLaunchActive ? '<button type="button" class="debug-live-back" data-debug-live-back>BACK TO DEBUG MODE</button>' : ''}
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
      storyRoot.querySelector('[data-debug-live-back]')?.addEventListener('click', event => {
        event.stopPropagation();
        renderDebugScreen();
      });
      screenEl?.focus({ preventScroll: true });
    };

    storyRoot.hidden = false;
    renderLoading();
    fetchEndingData().then(() => {
      renderScene(firstSceneNumber);
    });
  }

  function renderEndingCredits() {
    ensureStoryUi();
    clearSelectVsTransition();
    setFlowControls();
    document.body.classList.add('fighter-ending', 'fighter-credits');
    if (debugScreenLaunchActive) document.body.classList.add('fighter-debug-live');
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
              <div class="ending-credit-entry"><p>STORY</p><strong>ChatGPT</strong></div>
              <div class="ending-credit-entry"><p>ILLUSTRATION</p><strong>ChatGPT</strong></div>
              <div class="ending-credit-entry"><p>PROGRAMMING</p><strong>Codex</strong></div>
              <div class="ending-credit-entry"><p>BGM</p><strong>Suno</strong></div>
              <div class="ending-credit-entry">
                <p>SE/VOICE</p>
                <strong>効果音ラボ</strong>
                <strong>ElevenLabs</strong>
              </div>
              <div class="ending-credit-entry"><p>NDC</p><strong>日本図書館協会</strong></div>
              <div class="ending-credit-entry ending-credit-thanks">
                <p>SPECIAL THANKS</p>
                <strong>格闘系司書</strong>
                <strong>すべての図書館を愛するプレイヤーへ</strong>
              </div>
            </div>
            <div class="ending-credit-final">
              <div class="ending-credit-entry">
                <p>PRODUCE</p>
                <strong>やわらか図書館学</strong>
              </div>
              <em>THANK YOU FOR PLAYING</em>
            </div>
          </div>
          <button type="button" data-ending-next>NEXT</button>
        </section>`;
      storyRoot.querySelector('[data-ending-next]')?.addEventListener('click', renderArtworkUnlockScreen);
    }
  }

  function renderArtworkUnlockScreen() {
    const returnToDebug = debugScreenLaunchActive;
    const unlockedArtwork = unlockRandomArtwork();
    if (!DEBUG_MODE && !returnToDebug && !isTwoPlayerMode()) removeStoryProgress();
    if (!unlockedArtwork) {
      if (returnToDebug) renderDebugScreen();
      else renderTitleScreen();
      return;
    }
    ensureStoryUi();
    clearSelectVsTransition();
    setFlowControls();
    document.body.classList.add('fighter-artwork-unlock');
    if (returnToDebug) document.body.classList.add('fighter-debug-live');
    screen = 'artworkUnlock';
    stopMusicTrack({ fadeMs: 320 });
    playSoundEffect('artwork');
    setMessage('', '', '');
    resetDigits();
    resetTimeDisplay();

    if (!storyRoot) return;
    storyRoot.hidden = false;
    storyRoot.innerHTML = `
      <section class="artwork-unlock-screen" aria-label="ARTWORK COLLECTION">
        <header class="artwork-unlock-header">
          <span>COLLECTION UPDATE</span>
          <h2>NEW ARTWORK</h2>
        </header>
        <div class="artwork-unlock-stage">
          <figure class="artwork-unlock-visual">
            <img src="${esc(versionedSelectAsset(unlockedArtwork.asset))}" alt="${esc(unlockedArtwork.label)}">
            <figcaption>${esc(unlockedArtwork.label)}</figcaption>
          </figure>
          <div class="artwork-unlock-message" aria-live="polite">
            <span>UNLOCKED</span>
            <h3>新しいアートワークを獲得しました</h3>
            <p>獲得したアートワークは、GALLERYのARTWORKカテゴリーでいつでも閲覧できます。</p>
          </div>
        </div>
        <footer class="artwork-unlock-actions">
          <button type="button" data-artwork-unlock-close>${returnToDebug ? 'BACK TO DEBUG MODE' : 'TITLE'}</button>
        </footer>
      </section>`;
    storyRoot.querySelector('[data-artwork-unlock-close]')?.addEventListener(
      'click',
      returnToDebug ? renderDebugScreen : renderTitleScreen
    );
  }

  function removeTutorialOverlay() {
    karutaEl?.querySelectorAll('.battle-tutorial-overlay, .battle-tutorial-coach').forEach(element => element.remove());
  }

  function removeSkillTutorialToast(markSeen = false) {
    if (skillTutorialToastTimer) clearTimeout(skillTutorialToastTimer);
    skillTutorialToastTimer = 0;
    if (markSeen && skillTutorialToastPlayerId) markSkillTutorialSeen(skillTutorialToastPlayerId);
    skillTutorialToastPlayerId = null;
    karutaEl?.querySelectorAll('.skill-tutorial-toast').forEach(element => element.remove());
  }

  function startInteractiveTutorial(runId = gameRunId) {
    tutorialActive = true;
    tutorialAwaitingAnswer = false;
    tutorialRunId = runId;
    roundActive = false;
    answered = false;
    disableCardClicks();
    hideCpuCursor();
    setReadingHudVisible(false);
    document.body.classList.add('fighter-tutorial');
    removeTutorialOverlay();

    const overlay = document.createElement('section');
    overlay.className = 'battle-tutorial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '初回プレイチュートリアル');
    overlay.innerHTML = `
      <div class="battle-tutorial-panel">
        <span class="battle-tutorial-kicker">CLASSIFICATION TRAINING</span>
        <strong class="battle-tutorial-step">STEP 1 / 3</strong>
        <h2>読み上げられるNDCを見極めよう</h2>
        <p>NDCは、本の内容を表す3桁の分類記号。数字が順番に現れたら、対応する分類札を選んでください。</p>
        <div class="battle-tutorial-example" aria-label="NDCの例">
          <span>5</span><span>4</span><span>7</span><i>→</i><strong>電気工学</strong>
        </div>
        <p class="battle-tutorial-note">この練習中は相手が札を取りません。落ち着いて挑戦できます。</p>
        <div class="battle-tutorial-actions">
          <button type="button" data-tutorial-skip>SKIP</button>
          <button type="button" data-tutorial-begin>TRY IT</button>
        </div>
      </div>`;
    karutaEl?.appendChild(overlay);
    overlay.querySelector('[data-tutorial-skip]')?.addEventListener('click', () => finishInteractiveTutorial(true));
    overlay.querySelector('[data-tutorial-begin]')?.addEventListener('click', startTutorialTrial);
    overlay.querySelector('[data-tutorial-begin]')?.focus({ preventScroll: true });
  }

  function startTutorialTrial() {
    if (!tutorialActive || tutorialRunId !== gameRunId) return;
    removeTutorialOverlay();
    tutorialAwaitingAnswer = true;
    round = 1;
    roundId = 1;
    currentReadingCard = roundDeck[0] || cards[0];
    if (!currentReadingCard) {
      finishInteractiveTutorial(true);
      return;
    }
    currentReadingCard.used = true;
    roundActive = true;
    answered = false;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = true;
    comboContinuationWindowOpen = true;
    roundStartTime = Date.now();
    resetDigits();
    setReadingHudVisible(true);
    enableCardClicks();
    updateBattleHud();
    setMessage('ready', 'TRAINING', '読み上げられるNDCと同じ分類札を選ぼう');

    const coach = document.createElement('aside');
    coach.className = 'battle-tutorial-coach';
    coach.setAttribute('aria-live', 'polite');
    coach.innerHTML = `
      <span>STEP 2 / 3</span>
      <strong>正しい分類札を取ってください</strong>
      <p data-tutorial-feedback>数字は2秒ごとに1桁ずつ読み上げられます。</p>
      <button type="button" data-tutorial-skip>SKIP</button>`;
    karutaEl?.appendChild(coach);
    coach.querySelector('[data-tutorial-skip]')?.addEventListener('click', () => finishInteractiveTutorial(true));
    readDigits(String(currentReadingCard.ndc));
  }

  function resolveTutorialCardSelection(cardEl, selectedCard) {
    if (!tutorialAwaitingAnswer || !currentReadingCard) return;
    if (selectedCard.ndc !== currentReadingCard.ndc) {
      playSoundEffect('ng');
      cardEl.classList.remove('shake');
      void cardEl.offsetWidth;
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 300);
      const feedback = karutaEl?.querySelector('[data-tutorial-feedback]');
      if (feedback) feedback.textContent = 'その札ではありません。数字と分類を確認して、もう一度選びましょう。';
      return;
    }

    tutorialAwaitingAnswer = false;
    roundActive = false;
    answered = true;
    disableCardClicks();
    cancelReadingTimeouts();
    playSoundEffect('correct');
    cardEl.classList.add('correct');
    setMessage('success', 'CORRECT', '分類札を見つけました');
    removeTutorialOverlay();

    const overlay = document.createElement('section');
    overlay.className = 'battle-tutorial-overlay is-complete';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'チュートリアル完了');
    overlay.innerHTML = `
      <div class="battle-tutorial-panel">
        <span class="battle-tutorial-kicker">CLASSIFICATION TRAINING</span>
        <strong class="battle-tutorial-step">STEP 3 / 3</strong>
        <h2>正解です。知識を連撃へつなげよう</h2>
        <p>3桁目が読み終わる前に正解すると、次のTURNへコンボをつなげられます。連続正解するほどダメージも上昇します。</p>
        <div class="battle-tutorial-special">
          <span>SPECIAL</span>
          <p>攻防でゲージが最大になると必殺技が使用可能。PCではSPACE、スマートフォンではSPECIALボタンで発動できます。</p>
        </div>
        <div class="battle-tutorial-actions single">
          <button type="button" data-tutorial-complete>${tutorialReturnToHowTo ? 'BACK TO GUIDE' : 'START BATTLE'}</button>
        </div>
      </div>`;
    karutaEl?.appendChild(overlay);
    overlay.querySelector('[data-tutorial-complete]')?.addEventListener('click', () => finishInteractiveTutorial(false));
    overlay.querySelector('[data-tutorial-complete]')?.focus({ preventScroll: true });
  }

  function finishInteractiveTutorial(skipped = false) {
    if (!tutorialActive) return;
    const runId = tutorialRunId;
    const returnToGuide = tutorialReturnToHowTo;
    markTutorialCompleted();
    tutorialActive = false;
    tutorialAwaitingAnswer = false;
    tutorialReplayRequested = false;
    tutorialReturnToHowTo = false;
    roundActive = false;
    answered = false;
    document.body.classList.remove('fighter-tutorial');
    removeTutorialOverlay();
    cancelReadingTimeouts();
    disableCardClicks();
    if (returnToGuide) {
      renderHowToScreen();
      return;
    }
    if (runId === gameRunId) startBattleRound(runId, { skipTutorial: true, skipped });
  }

  function startTutorialReplay() {
    tutorialReplayRequested = true;
    tutorialReturnToHowTo = true;
    playMode = 'story';
    stageIndex = 0;
    currentEnemy = ENEMIES[0];
    beginBattle();
  }

  function maybeShowSkillTutorial() {
    if (screen !== 'battle' || tutorialActive || isTwoPlayerMode() || playerGauge < MAX_GAUGE) return;
    if (karutaEl?.querySelector('.skill-tutorial-toast')) return;
    const progress = readTutorialProgress();
    if (!selectedPlayer?.id || progress.skillSeen.includes(selectedPlayer.id)) return;
    removeSkillTutorialToast();
    skillTutorialToastPlayerId = selectedPlayer.id;
    const toast = document.createElement('aside');
    toast.className = 'skill-tutorial-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <button type="button" aria-label="必殺技の説明を閉じる" data-skill-tutorial-close>×</button>
      <span>SPECIAL READY</span>
      <strong>${esc(selectedPlayer.skillName)}</strong>
      <p>ゲージが最大になりました。PCではSPACE、スマートフォンではSPECIALボタンで発動できます。</p>`;
    karutaEl?.appendChild(toast);
    toast.querySelector('[data-skill-tutorial-close]')?.addEventListener('click', () => removeSkillTutorialToast(true));
    skillTutorialToastTimer = setTimeout(() => removeSkillTutorialToast(true), 6500);
  }

  // ---------------------------------------------------------------------------
  // Battle setup and turn loop
  // ---------------------------------------------------------------------------
  function beginBattle() {
    ensureStoryUi();
    clearSelectVsTransition();
    closeModal(howToModal);
    closeModal(resultModal);
    const runId = ++gameRunId;
    currentEnemy = isTwoPlayerMode() ? getTwoPlayerTwo() : (ENEMIES[stageIndex] || ENEMIES[0]);
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
    const sourcePool = getBattleCardSourcePool(allCardPool.length ? allCardPool : (cards.length ? cards : FALLBACK_CARDS));
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
    shuffle(cards.slice()).forEach((card, slotIndex) => {
      cardGrid.appendChild(createBattleCardElement(card, slotIndex));
    });
  }

  function startBattleRound(runId = gameRunId, options = {}) {
    if (runId !== gameRunId) return;
    screen = 'battle';
    battleFinishing = false;
    removeRoundWinScreen();
    hideCountdown();
    dealBattleRoundCards();

    round = 0;
    roundId = 0;
    playerHp = getPlayerMaxHp();
    enemyHp = 100;
    playerCombo = 0;
    enemyCombo = 0;
    lastComboOwner = null;
    comboContinuationWindowOpen = false;
    resetFighterIconStates();
    pendingReveal = false;
    twoCandidateRevealTurnsRemaining = 0;
    cpuSkipTurnsRemaining = 0;
    resetFightingPowerRush();
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
    if (!options.skipTutorial && shouldStartBattleTutorial()) {
      startInteractiveTutorial(runId);
      return;
    }
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

  function resetFightingPowerRush() {
    fightingPowerRushQueued = false;
    fightingPowerRushTurnsRemaining = 0;
    fightingPowerRushStreak = 0;
    fightingPowerRushActiveThisTurn = false;
  }

  function isFightingPowerRushInProgress() {
    return selectedPlayer?.skillType === 'fightingPowerRush'
      && (fightingPowerRushQueued || fightingPowerRushTurnsRemaining > 0 || fightingPowerRushActiveThisTurn);
  }

  function advanceFightingPowerRushTurn() {
    fightingPowerRushActiveThisTurn = false;
    if (selectedPlayer?.skillType !== 'fightingPowerRush') {
      resetFightingPowerRush();
      return;
    }
    if (fightingPowerRushQueued) {
      fightingPowerRushQueued = false;
      fightingPowerRushTurnsRemaining = FIGHTING_POWER_RUSH_TURNS;
      fightingPowerRushStreak = 0;
    }
    if (fightingPowerRushTurnsRemaining > 0) {
      fightingPowerRushActiveThisTurn = true;
      fightingPowerRushTurnsRemaining -= 1;
      return;
    }
    fightingPowerRushStreak = 0;
  }

  function breakFightingPowerRushStreak() {
    if (fightingPowerRushActiveThisTurn) fightingPowerRushStreak = 0;
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
    advanceFightingPowerRushTurn();
    roundActive = true;
    answered = false;
    comboContinuationWindowOpen = true;
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    resetFighterIconStates();
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
    if (twoCandidateRevealTurnsRemaining > 0) {
      twoCandidateRevealTurnsRemaining = Math.max(0, twoCandidateRevealTurnsRemaining - 1);
      scheduleReadingTimeout(revealTwoCandidateCards, 420);
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
      breakFightingPowerRushStreak();
      resetFighterIconStates();
      clearInterval(timeDisplayInterval);
      updateComboDisplay();
      updateBattleHud();
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
    breakFightingPowerRushStreak();
    resetFighterIconStates();
    updateComboDisplay();
    updateBattleHud();
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
    if (prefixLen === 3) {
      scheduleReadingTimeout(() => {
        comboContinuationWindowOpen = false;
      }, DIGIT_READING_COMPLETE_MS);
    }
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
    removeSkillTutorialToast();
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
      const canPlayerAnswer = canMouseOwnerInteract() && card.style.visibility !== 'hidden';
      card.style.pointerEvents = canPlayerAnswer ? 'auto' : 'none';
    });
  }

  function enableCardClicks() {
    refreshPlayerCardInteractivity();
  }

  // ---------------------------------------------------------------------------
  // Player actions, damage, gauges and skills
  // ---------------------------------------------------------------------------
  function selectCard(e) {
    if (!roundActive || answered || battlePausedForCutin) return;
    const owner = resolveAnswerOwner(e);
    if (!owner) return;
    const isCPU = owner === 'enemy';
    if (isOwnerDisabled(owner)) return;
    const hitCardEl = isCPU ? e.currentTarget : (getCardFromPointerEvent(e) || e.currentTarget);
    if (!hitCardEl || hitCardEl.style.visibility === 'hidden') return;

    const index = Number(hitCardEl.dataset.index);
    const selectedCard = cards[index];
    if (!selectedCard || !currentReadingCard) return;
    if (tutorialAwaitingAnswer) {
      if (!isCPU) resolveTutorialCardSelection(hitCardEl, selectedCard);
      return;
    }
    const elapsed = Date.now() - roundStartTime;

    if (selectedCard.ndc === currentReadingCard.ndc) {
      answered = true;
      handleCorrect(hitCardEl, isCPU, elapsed);
    } else {
      handleMiss(hitCardEl, isCPU);
    }
  }

  function getFieldCardElementBySlot(slotIndex) {
    if (!cardGrid || slotIndex < 0) return null;
    return cardGrid.children[slotIndex] || null;
  }

  function selectFieldSlotForOwner(slotIndex, owner) {
    const cardEl = getFieldCardElementBySlot(slotIndex);
    if (!cardEl || cardEl.style.visibility === 'hidden') return false;
    selectCard({ currentTarget: cardEl, owner });
    return true;
  }

  function handleBattleKeydown(event) {
    if (screen !== 'battle' || event.repeat) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const tagName = target?.tagName;
    if (target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

    if (!isTwoPlayerMode()) {
      if (isSpaceKeyEvent(event)) {
        event.preventDefault();
        usePlayerSkill();
        return;
      }

      const playerSlot = getKeyboardSlotFromEvent('keyboardA', event);
      if (playerSlot >= 0) {
        event.preventDefault();
        selectFieldSlotForOwner(playerSlot, 'player');
      }
      return;
    }

    const p1Slot = getKeyboardSlotFromEvent(twoPlayerControls.player, event);
    if (p1Slot >= 0) {
      event.preventDefault();
      selectFieldSlotForOwner(p1Slot, 'player');
      return;
    }

    const p2Slot = getKeyboardSlotFromEvent(twoPlayerControls.enemy, event);
    if (p2Slot >= 0) {
      event.preventDefault();
      selectFieldSlotForOwner(p2Slot, 'enemy');
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
    const continuesCombo = comboContinuationWindowOpen && lastComboOwner === owner;
    if (owner === 'player') {
      playerCombo = continuesCombo ? playerCombo + 1 : 1;
      enemyCombo = 0;
    } else {
      enemyCombo = continuesCombo ? enemyCombo + 1 : 1;
      playerCombo = 0;
    }
    lastComboOwner = owner;
    setFighterIconStatesForCardTake(owner);

    const combo = owner === 'player' ? playerCombo : enemyCombo;
    const fightingPowerRushHit = !isCPU && fightingPowerRushActiveThisTurn;
    if (fightingPowerRushHit) {
      fightingPowerRushStreak += 1;
    } else if (isCPU) {
      breakFightingPowerRushStreak();
    }
    const fightingPowerRushKo = fightingPowerRushHit
      && fightingPowerRushStreak >= FIGHTING_POWER_RUSH_TURNS;
    const baseDamage = calcDamage(combo);
    const damageMultiplier = isTwoPlayerMode()
      ? 1
      : isCPU
      ? (selectedPlayer.damageTakenMultiplier || 1)
      : (selectedPlayer.damageDealtMultiplier || 1)
        * (fightingPowerRushHit ? FIGHTING_POWER_RUSH_MULTIPLIER : 1);
    let damage = Math.max(1, Math.round(baseDamage * damageMultiplier));
    if (fightingPowerRushKo) damage = Math.max(damage, enemyHp);
    const gaugeGain = calcGaugeGain(elapsed);
    const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;

    if (isCPU) {
      playerHp = clamp(playerHp - damage, 0, 999);
      if (!isTwoPlayerMode()) {
        enemyGauge = clamp(enemyGauge + Math.round(gaugeGain * difficulty.cpuGauge), 0, MAX_GAUGE);
        playerGauge = clamp(playerGauge + devTuning.gauge.opponentHit, 0, MAX_GAUGE);
      }
    } else {
      enemyHp = clamp(enemyHp - damage, 0, 999);
      if (!isTwoPlayerMode()) {
        playerGauge = clamp(playerGauge + gaugeGain, 0, MAX_GAUGE);
        enemyGauge = clamp(enemyGauge + Math.round(devTuning.gauge.opponentHit * difficulty.cpuGauge), 0, MAX_GAUGE);
      }
    }

    playSoundEffect('correct', Math.min(1.6, 1 + Math.max(0, combo - 1) * 0.08));
    if (combo >= 2) showComboCutin(owner, combo);
    pulseBody(isCPU ? 'cpu-hit-flash' : 'hit-flash');
    burstFromElement(cardEl, isCPU ? '#9d4f58' : '#d8a444', combo >= 2 ? 28 : 18);
    popText(fightingPowerRushKo ? 'K.O.' : `${damage} DMG`, cardEl, isCPU ? '#9d4f58' : '#d8a444');
    cardEl.classList.add(isCPU ? 'enemy-correct' : 'correct');
    setTimeout(() => {
      cardEl.style.visibility = 'hidden';
      cardEl.style.pointerEvents = 'none';
      if (isCPU) hideCpuCursor();
    }, 520);

    const actor = isCPU ? currentEnemy.name : selectedPlayer.name;
    const target = isCPU ? selectedPlayer.name : currentEnemy.name;
    setMessage(
      isCPU ? 'warning' : 'success',
      fightingPowerRushKo ? selectedPlayer.skillName : `${actor} HIT`,
      fightingPowerRushKo
        ? '3ターン連続正解！相手の体力を0にした'
        : `${target}に${damage}ダメージ`
    );
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
      if (!isTwoPlayerMode()) playerGauge = clamp(playerGauge + devTuning.gauge.enemyMiss, 0, MAX_GAUGE);
    } else {
      playerDisabledThisRound = true;
      playerCombo = 0;
      breakFightingPowerRushStreak();
      lastComboOwner = enemyCombo > 0 ? 'enemy' : null;
      if (!isTwoPlayerMode()) playerGauge = clamp(playerGauge + devTuning.gauge.playerMiss, 0, MAX_GAUGE);
    }
    setFighterIconStateForMiss(isCPU ? 'enemy' : 'player');
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
    const playerMaxHp = getPlayerMaxHp();
    const enemyMaxHp = 100;
    const enemySkillPending = currentEnemy.skillType === 'pending';
    const fightingPowerRushInProgress = isFightingPowerRushInProgress();
    const playerSkillReady = playerGauge >= MAX_GAUGE && !fightingPowerRushInProgress;
    const playerSkillStatus = fightingPowerRushInProgress
      ? fightingPowerRushQueued
        ? 'NEXT TURN'
        : `POWER ${fightingPowerRushStreak}/${FIGHTING_POWER_RUSH_TURNS}`
      : 'CHARGE';
    const enemySkillReady = enemyGauge >= MAX_GAUGE && !enemySkillPending;
    const playerHpPercent = clamp((playerHp / playerMaxHp) * 100, 0, 100);
    const enemyHpPercent = clamp((enemyHp / enemyMaxHp) * 100, 0, 100);
    const playerIcon = getFighterIconForSide('player');
    const enemyIcon = getFighterIconForSide('enemy');

    battleHud.innerHTML = `
      <div class="fighter-combatant player" data-side="P1">
        <div class="fighter-portrait">
          <div class="fighter-face"><img src="${esc(playerIcon)}" alt="${esc(selectedPlayer.name)}"></div>
          ${renderRoundMarkers('player')}
        </div>
        <div class="fighter-bars">
          <div class="fighter-label"><span>P1</span><strong>${esc(selectedPlayer.name)}</strong><em>${isTwoPlayerMode() ? esc(getControlShortLabel(twoPlayerControls.player)) : 'HP'}</em></div>
          <div class="hp-track"><span style="width:${playerHpPercent}%"></span></div>
        </div>
      </div>
      <div class="fight-clock">
        <span>${isTwoPlayerMode() ? '2P BATTLE' : `STAGE ${stageIndex + 1}`} / ROUND ${battleRound}</span>
        <strong>TURN ${Math.min(round + (roundActive ? 0 : 1), TURNS_PER_BATTLE_ROUND)}</strong>
        <em id="fightHudClock">${(ROUND_TIME_MS / 1000).toFixed(1)}</em>
      </div>
      <div class="fighter-combatant enemy" data-side="P2">
        <div class="fighter-bars">
          <div class="fighter-label"><em>${isTwoPlayerMode() ? esc(getControlShortLabel(twoPlayerControls.enemy)) : 'HP'}</em><strong>${esc(currentEnemy.name)}</strong><span>P2</span></div>
          <div class="hp-track enemy"><span style="width:${enemyHpPercent}%"></span></div>
        </div>
        <div class="fighter-portrait">
          <div class="fighter-face"><img src="${esc(enemyIcon)}" alt="${esc(currentEnemy.name)}"></div>
          ${renderRoundMarkers('enemy')}
        </div>
      </div>`;

    if (isTwoPlayerMode()) {
      playerGauge = 0;
      enemyGauge = 0;
      skillStrip.innerHTML = '';
      skillStrip.classList.add('is-hidden');
      skillStrip.classList.remove('is-two-player-controls');
      if (scoreElPlayer) scoreElPlayer.textContent = `${selectedPlayer.shortName}: HP ${playerHp}`;
      if (scoreElCPU) scoreElCPU.textContent = `${currentEnemy.shortName || currentEnemy.name}: HP ${enemyHp}`;
      return;
    }

    skillStrip.classList.remove('is-hidden');
    skillStrip.innerHTML = `
      <div class="skill-meter player ${playerSkillReady ? 'is-ready' : ''} ${fightingPowerRushInProgress ? 'is-active' : ''}">
        <div class="fighter-label"><span>SUPER</span><strong>${esc(selectedPlayer.skillName)}</strong><em>${esc(playerSkillStatus)}</em></div>
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
    maybeShowSkillTutorial();
  }

  function usePlayerSkill() {
    if (isTwoPlayerMode()) return;
    if (screen !== 'battle' || playerGauge < MAX_GAUGE || battlePausedForCutin || battleFinishing) return;
    removeSkillTutorialToast(true);
    let activated = false;
    if (selectedPlayer.skillType === 'revealNext') {
      pendingReveal = true;
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '次の問題で正解の札が光る');
      activated = true;
    } else if (selectedPlayer.skillType === 'revealTwoCandidatesNextTwo') {
      twoCandidateRevealTurnsRemaining = Math.max(twoCandidateRevealTurnsRemaining, 2);
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '次の2ターン、正解候補が2枚光る');
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
    } else if (selectedPlayer.skillType === 'fightingPowerRush') {
      if (isFightingPowerRushInProgress()) {
        setMessage('warning', selectedPlayer.skillName, '攻撃力上昇の効果が続いている');
        updateBattleHud();
        return;
      }
      fightingPowerRushQueued = true;
      fightingPowerRushStreak = 0;
      playerGauge = 0;
      setMessage('success', selectedPlayer.skillName, '次のターンから3ターン、攻撃力上昇');
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

  function revealTwoCandidateCards() {
    const correctCardEl = document.querySelector(`.card[data-index="${currentReadingCard?.index}"]`);
    if (!correctCardEl || correctCardEl.style.visibility === 'hidden') return;

    const decoyCandidates = getVisibleCardElements().filter(card => card !== correctCardEl);
    const decoyCardEl = shuffle(decoyCandidates)[0];
    const candidateCards = decoyCardEl ? [correctCardEl, decoyCardEl] : [correctCardEl];
    candidateCards.forEach(card => card.classList.add('skill-candidate'));
    setMessage(
      'success',
      selectedPlayer.skillName,
      decoyCardEl ? '正解候補が2枚示された' : '残った正解候補が示された'
    );
  }

  function clearCardHints() {
    document.querySelectorAll('.skill-revealed, .skill-candidate, .skill-removed, .skill-added, .skill-glitched').forEach(card => {
      card.classList.remove('skill-revealed', 'skill-candidate', 'skill-removed', 'skill-added', 'skill-glitched');
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
    const pool = shuffle(getBattleCardSourcePool(allCardPool.length ? allCardPool : FALLBACK_CARDS).slice());

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

  // ---------------------------------------------------------------------------
  // Enemy skills and CPU behavior
  // ---------------------------------------------------------------------------
  function maybeActivateEnemySkill() {
    if (isTwoPlayerMode()) return;
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
    if (isTwoPlayerMode()) return;
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
    const roundWinAssetPath = getRoundWinImagePath(outcome);
    unlockGalleryAsset('victories', roundWinAssetPath);
    const imagePath = versionedSelectAsset(roundWinAssetPath);
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

  // ---------------------------------------------------------------------------
  // Round resolution, results and reset
  // ---------------------------------------------------------------------------
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
    const isPerfectFinish = enemyHp <= 0 && playerHp === getPlayerMaxHp();
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
    const isFinal = !isTwoPlayerMode() && outcome === 'win' && stageIndex >= ENEMIES.length - 1;
    if (!isTwoPlayerMode()) {
      if (isFinal) {
        writeStoryProgress('ending', { endingSceneNumber: 1 });
      } else if (outcome === 'win') {
        writeStoryProgress('battle', { stageIndex: stageIndex + 1 });
      } else {
        writeStoryProgress('battle');
      }
    }
    playMusicTrack('victory');
    const resultMain = isTwoPlayerMode()
      ? (outcome === 'lose' ? '2P WIN' : '1P WIN')
      : isFinal ? 'GAME CLEAR' : outcome === 'win' ? 'WINNER' : outcome === 'lose' ? 'DEFEATED' : 'DRAW';
    const resultImagePath = getVictoryImagePath(selectedPlayer, stageIndex, outcome);
    unlockGalleryAsset('victories', resultImagePath);
    const resultCharacter = outcome === 'lose'
      ? (isTwoPlayerMode() ? getTwoPlayerTwo() : currentEnemy)
      : (isTwoPlayerMode() ? getTwoPlayerOne() : selectedPlayer);
    const resultAltName = outcome === 'lose' ? currentEnemy.name : selectedPlayer.name;
    const resultLine = formatVictoryLineForViewport(getBattleLine(outcome, isFinal));
    setMessage(outcome === 'win' ? 'finish' : 'warning', resultMain, `${selectedPlayer.name} HP ${playerHp} / ${currentEnemy.name} HP ${enemyHp}`);
    if (battleResultEl) {
      battleResultEl.innerHTML = `
        <section class="reference-result-screen victory-art-screen outcome-${esc(outcome)} ${isFinal ? 'is-final' : ''} ${isTwoPlayerMode() ? 'two-player-result' : ''}" data-result-character="${esc(resultCharacter?.id || selectedPlayer?.id || '')}" aria-label="${esc(resultMain)}: ${esc(resultAltName)}">
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
    if (isTwoPlayerMode()) {
      fighterContinueButton.textContent = 'REMATCH';
      fighterResultAction = () => {
        closeModal(resultModal);
        beginBattle();
      };
    } else if (isFinal) {
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
    pendingReveal = false;
    twoCandidateRevealTurnsRemaining = 0;
    cpuSkipTurnsRemaining = 0;
    resetFightingPowerRush();
    playerDisabledThisRound = false;
    cpuDisabledThisRound = false;
    playerCombo = 0;
    enemyCombo = 0;
    lastComboOwner = null;
    resetFighterIconStates();
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
    renderHowToScreen();
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

  continueButton?.addEventListener('click', () => runAfterTuningReady(continueStory));
  twoPlayerButton?.addEventListener('click', () => runAfterTuningReady(renderTwoPlayerSetup));
  document.addEventListener('keydown', handleBattleKeydown);

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
    if (event.key === STORY_PROGRESS_STORAGE_KEY && screen === 'title') updateContinueTitleButton();
  });

  window.addEventListener('resize', () => {
    if (screen === 'title') updateTwoPlayerTitleButtonState();
    if (resultModal?.open && document.querySelector('.victory-art-screen')) syncResultModalBounds();
  });

  // ---------------------------------------------------------------------------
  // Public API consumed by mode_loader.js
  // ---------------------------------------------------------------------------
  window.karutaModes = window.karutaModes || {};
  window.karutaModes.cpu = {
    startGame: () => runAfterTuningReady(renderCharacterSelect),
    showGallery: () => runAfterTuningReady(() => renderGalleryScreen('cutins')),
    showPatchNotes: () => runAfterTuningReady(renderPatchNotesScreen),
    quitGame: () => quitGame(false),
    resetGame,
    postToX,
    showHowTo,
    refreshLanding: () => {
      if (document.body.dataset.mode === 'cpu') {
        runAfterTuningReady(DEBUG_MODE ? renderDebugScreen : renderTitleScreen);
      }
    }
  };

  tuningReady = loadInitialTuning();

  if (document.body.dataset.mode === 'cpu') {
    runAfterTuningReady(DEBUG_MODE ? renderDebugScreen : renderTitleScreen);
  }
})();
