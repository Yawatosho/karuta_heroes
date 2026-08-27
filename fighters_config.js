(function () {
  'use strict';

  // Characters shown in STORY MODE. Add new playable characters here.
  const players = [
    {
      id: 'librarian',
      name: '司書さん',
      englishName: 'The Librarian',
      shortName: '司書',
      image: 'character/librarian_icon.webp',
      vsCode: 'lib',
      icon: 'character/librarian_icon.webp',
      selectImage: 'character/librarian_select.webp',
      cutin: 'cutin/cutin_lib.webp',
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
      image: 'character/detective_icon.webp',
      vsCode: 'det',
      icon: 'character/detective_icon.webp',
      selectImage: 'character/detective_select.webp',
      cutin: 'cutin/cutin_det.webp',
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
      image: 'character/lily_icon.webp',
      vsCode: 'lily',
      icon: 'character/lily_icon.webp',
      selectImage: 'character/lily_select.webp',
      cutin: 'cutin/cutin_lily.webp',
      skillName: 'みんな、お願いっ！',
      skillEffect: '次の2ターン、相手の解答権を封じる',
      skillType: 'skipCpu',
      stats: { atk: 2, def: 4 },
      damageDealtMultiplier: 0.8,
      damageTakenMultiplier: 0.8,
      story: '本の声を聞くことができる、明るく元気なひよっこ司書。',
      winLine: 'みんなの声が、正しい棚まで導いてくれました。',
      loseLine: '本の声を、もっとちゃんと聞けるようになります。'
    },
    {
      id: 'professor',
      name: '教授',
      englishName: 'The Professor',
      shortName: '教授',
      image: 'character/prof_icon.webp',
      vsCode: 'prof',
      icon: 'character/prof_icon.webp',
      selectImage: 'character/professor_select.webp',
      cutin: 'cutin/cutin_prof.webp',
      skillName: 'SCHRÖDINGER SELECTION',
      skillEffect: '次の２ターン、正解候補のカードが2枚光る',
      skillType: 'revealTwoCandidatesNextTwo',
      stats: { atk: 3, def: 3 },
      damageDealtMultiplier: 1,
      damageTakenMultiplier: 1,
      story: '物理学を専門とする、穏やかで知的な大学教授。学生からの信頼も厚い。',
      winLine: '理論どおりですね。良い実験結果です。',
      loseLine: '興味深い結果です。仮説を組み直しましょう。'
    },
    {
      id: 'fightingLibrarian',
      name: '格闘系司書',
      englishName: 'FIGHTING LIBRARIAN',
      shortName: '格闘系司書',
      image: 'character/flib_select.webp',
      vsCode: 'flib',
      icon: 'character/flib_icon.webp',
      selectImage: 'character/flib_select.webp',
      cutin: 'cutin/cutin_flib.webp',
      skillName: '格闘系スペシャル',
      skillEffect: '次のターンから3ターン攻撃力が上がる。3ターン連続正解すると…？',
      skillType: 'fightingPowerRush',
      stats: { atk: 4, def: 2 },
      damageDealtMultiplier: 1.2,
      damageTakenMultiplier: 1.2,
      story: '体を動かすことと楽しい図書館イベントが大好きな、元気いっぱいの司書。',
      winLine: '楽しく体を動かせば、分類だって自然に身につきます！',
      loseLine: 'いい運動になりました！次はもっと早く札を取りますよ！'
    }
  ];

  // STORY MODE opponents, ordered by stage.
  const enemies = [
    {
      id: 'wind',
      name: '風の目録使い',
      englishName: 'The Wind Cataloger',
      image: 'character/enemy1_icon.webp',
      icon: 'character/enemy1_icon.webp',
      cutin: 'cutin/cutin_enemy1.webp',
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
      image: 'character/enemy2_icon.webp',
      icon: 'character/enemy2_icon.webp',
      cutin: 'cutin/cutin_enemy2.webp',
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
      image: 'character/enemy3_icon.webp',
      icon: 'character/enemy3_icon.webp',
      cutin: 'cutin/cutin_enemy3.webp',
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
      image: 'character/enemy4_icon.webp',
      icon: 'character/enemy4_icon.webp',
      cutin: 'cutin/cutin_enemy4.webp',
      skillName: 'Η ΑΛΗΘΕΙΑ ΕΛΕΥΘΕΡΩΣΕΙ ΥΜΑΣ',
      skillType: 'reverseRead',
      preset: { correctRate: 0.985, reactionMinMs: 540, reactionMaxMs: 1450 },
      winLine: '分類は宇宙、我はその座標を知る者。',
      loseLine: '汝の知の座標、確かに届いた。'
    }
  ];

  const difficulties = {
    easy: { label: 'EASY', playerHp: 120, cpuSpeed: 1.16, cpuGauge: 0.86, cpuCorrectDelta: -0.04 },
    normal: { label: 'NORMAL', playerHp: 100, cpuSpeed: 1, cpuGauge: 1, cpuCorrectDelta: 0 },
    hard: { label: 'HARD', playerHp: 90, cpuSpeed: 0.86, cpuGauge: 1.18, cpuCorrectDelta: 0.025 }
  };

  const twoPlayer = {
    controlOrder: ['mouse', 'keyboardA', 'keyboardB'],
    controlTypes: {
      mouse: { label: 'マウス', shortLabel: 'MOUSE' },
      keyboardA: { label: 'キーボードA', shortLabel: 'KEY A' },
      keyboardB: { label: 'キーボードB', shortLabel: 'KEY B' }
    },
    keyboardLayouts: {
      keyboardA: [
        { label: '1', keys: ['1'], codes: ['Digit1'] },
        { label: '2', keys: ['2'], codes: ['Digit2'] },
        { label: '3', keys: ['3'], codes: ['Digit3'] },
        { label: '4', keys: ['4'], codes: ['Digit4'] },
        { label: '5', keys: ['5'], codes: ['Digit5'] },
        { label: '6', keys: ['6'], codes: ['Digit6'] },
        { label: 'Q', keys: ['q'], codes: ['KeyQ'] },
        { label: 'W', keys: ['w'], codes: ['KeyW'] },
        { label: 'E', keys: ['e'], codes: ['KeyE'] },
        { label: 'R', keys: ['r'], codes: ['KeyR'] },
        { label: 'T', keys: ['t'], codes: ['KeyT'] }
      ],
      keyboardB: [
        { label: '8', keys: ['8'], codes: ['Digit8'] },
        { label: '9', keys: ['9'], codes: ['Digit9'] },
        { label: '0', keys: ['0'], codes: ['Digit0'] },
        { label: '-', keys: ['-'], codes: ['Minus'] },
        { label: '^', keys: ['^'], codes: ['Equal'] },
        { label: '¥', keys: ['¥', '￥', '\\'], codes: ['IntlYen', 'Backslash'] },
        { label: 'I', keys: ['i'], codes: ['KeyI'] },
        { label: 'O', keys: ['o'], codes: ['KeyO'] },
        { label: 'P', keys: ['p'], codes: ['KeyP'] },
        { label: '@', keys: ['@'], codes: ['BracketLeft', 'Quote'] },
        { label: '[', keys: ['['], codes: ['BracketRight'] }
      ]
    },
    victoryLines: {
      player: [
        'ふふ、今日は私のほうが少しだけ早く本を見つけられましたね',
        '推理中の本も、返却期限だけは忘れないでくださいね',
        '探偵さんと勝負すると、いつもの図書館が少し冒険みたいですね'
      ],
      enemy: [
        'やった、司書さんに勝てたなら今日の調査は大成功です',
        '司書さんのおすすめ本で鍛えた推理力、ちゃんと役に立ちました',
        '事件解決、ついでに勝利もいただきました'
      ]
    }
  };

  const fallbackCards = [
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

  // Public update history. Add the newest entry to the beginning of this array.
  const patchNotes = [
    {
      date: '2026.08.27',
      isoDate: '2026-08-27',
      items: [
        '「GALLERY」の「ARTWORK」に新たなアートワークを追加しました'
      ]
    },
    {
      date: '2026.08.15',
      isoDate: '2026-08-15',
      items: [
        '「STORY MODE」クリア時にアートワークを獲得できるコレクション機能を追加しました'
      ]
    },
    {
      date: '2026.07.23',
      isoDate: '2026-07-23',
      items: [
        '「STORY MODE」の進行状況を自動保存し、タイトルから再開できる「CONTINUE」機能を追加しました',
        '初回バトルで基本操作を学べるチュートリアルを追加し、「HELP」から再体験できるようにしました'
      ]
    },
    {
      date: '2026.07.22',
      isoDate: '2026-07-22',
      items: [
        '「STORY MODE」に、各ファイターの物語へつながるオープニングデモを追加しました',
        '新たなプレイアブルキャラクター「格闘系司書」を追加しました'
      ]
    },
    {
      date: '2026.07.19',
      isoDate: '2026-07-19',
      items: [
        'これまでに出会った演出や楽曲を鑑賞できる「GALLERY MODE」を追加しました',
        '新たなプレイアブルキャラクター「教授」を追加しました'
      ]
    },
    {
      date: '2026.06.12',
      isoDate: '2026-06-12',
      items: ['NDC KARUTA HEROESをリリースしました']
    }
  ];

  window.karutaFightersConfig = {
    players,
    enemies,
    difficulties,
    twoPlayer,
    fallbackCards,
    patchNotes
  };
})();
