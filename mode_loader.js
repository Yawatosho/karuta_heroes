(function () {
  const MODE_STORAGE_KEY = 'karutaSelectedMode';
  const GAME_CONFIG = {
    script: 'fighters_game.js',
    title: 'NDC Karuta Heroes',
    description: 'NDCを読み解き、札を取り、4人の強敵を倒すストーリー対戦カルタ。',
    ogDescription: '分類コードを読み解き、NDC Karuta Heroesの頂点へ。',
    label: 'NDC Karuta Heroes',
    rules: [
      ['1. キャラクターを選ぶ', '5人のキャラクターから1人を選び、4人の敵に順番に挑みます。'],
      ['2. 札で攻撃する', '3桁のNDCが順に表示されます。対応する分類カードを相手より先に選ぶとダメージを与えます。'],
      ['3. 2ラウンド先取', '1回の読み上げをTURN、10TURNを1ROUNDとして、先に2ROUNDを取った方が勝利です。']
    ]
  };
  const FIXED_STAGE_WIDTH = 1366;
  const FIXED_STAGE_HEIGHT = 768;

  function updateFixedStageScale() {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth || FIXED_STAGE_WIDTH;
    const height = viewport?.height || window.innerHeight || FIXED_STAGE_HEIGHT;
    const scale = Math.min(width / FIXED_STAGE_WIDTH, height / FIXED_STAGE_HEIGHT);
    const left = (width - FIXED_STAGE_WIDTH * scale) / 2 + (viewport?.offsetLeft || 0);
    const top = (height - FIXED_STAGE_HEIGHT * scale) / 2 + (viewport?.offsetTop || 0);
    const hasCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const isTouchDevice = (navigator.maxTouchPoints || 0) > 0 || hasCoarsePointer;
    const isNarrowPortraitViewport = width <= 540 && height >= width;
    const isSmartphoneStage = isNarrowPortraitViewport || (isTouchDevice && Math.min(width, height) <= 540);
    const isPortraitStage = isSmartphoneStage && height >= width;
    document.documentElement.style.setProperty('--stage-scale-runtime', String(scale));
    document.documentElement.style.setProperty('--stage-left', `${left}px`);
    document.documentElement.style.setProperty('--stage-top', `${top}px`);
    document.body?.classList.toggle('fighter-smartphone', isSmartphoneStage);
    document.body?.classList.toggle('fighter-portrait-stage', isPortraitStage);
  }

  function setupFixedStageScale() {
    updateFixedStageScale();
    window.addEventListener('resize', updateFixedStageScale, { passive: true });
    window.addEventListener('orientationchange', updateFixedStageScale, { passive: true });
    window.visualViewport?.addEventListener('resize', updateFixedStageScale, { passive: true });
  }

  function trackPageView() {
    if (typeof window.gtag !== 'function') return;
    const pageUrl = new URL(window.location.href);
    pageUrl.hash = '';
    pageUrl.search = '';
    window.gtag('event', 'page_view', {
      page_title: GAME_CONFIG.title,
      page_location: pageUrl.href,
      page_path: window.location.pathname,
      game_mode: 'fighters'
    });
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showNativeModal(modal) {
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      if (!modal.open) modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  function closeNativeModal(modal) {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  function applyGameConfig() {
    document.body.dataset.mode = 'cpu';
    document.documentElement.dataset.theme = 'light';
    try {
      sessionStorage.setItem(MODE_STORAGE_KEY, 'cpu');
      localStorage.setItem('karutaTheme', 'light');
    } catch (e) {}

    document.title = GAME_CONFIG.title;
    setMeta('meta[name="description"]', 'content', GAME_CONFIG.description);
    setMeta('meta[property="og:title"]', 'content', GAME_CONFIG.title);
    setMeta('meta[property="og:description"]', 'content', GAME_CONFIG.ogDescription);
    setMeta('meta[name="twitter:title"]', 'content', GAME_CONFIG.title);
    setMeta('meta[name="twitter:description"]', 'content', GAME_CONFIG.ogDescription);

    const shell = document.querySelector('.game-shell');
    if (shell) {
      shell.classList.add('cpu-shell');
      shell.setAttribute('aria-label', GAME_CONFIG.label);
    }

    GAME_CONFIG.rules.forEach(([title, text], index) => {
      const number = index + 1;
      setText(`ruleTitle${number}`, title);
      setText(`ruleText${number}`, text);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${src}?v=fighters160`;
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  const modeReady = loadScript(GAME_CONFIG.script).then(() => window.karutaModes || {});

  function getGameApi() {
    return window.karutaModes && window.karutaModes.cpu;
  }

  function runGame(actionName, fallback) {
    modeReady.then(() => {
      const api = getGameApi();
      if (api && typeof api[actionName] === 'function') {
        api[actionName]();
      } else if (typeof fallback === 'function') {
        fallback();
      }
    }).catch(error => {
      console.error('[mode_loader] game script load failed:', error);
    });
  }

  document.getElementById('startButton')?.addEventListener('click', () => runGame('startGame'));
  document.getElementById('galleryButton')?.addEventListener('click', () => runGame('showGallery'));
  document.getElementById('patchNoteButton')?.addEventListener('click', () => runGame('showPatchNotes'));
  document.getElementById('howToButton')?.addEventListener('click', () => runGame('showHowTo', () => showNativeModal(document.getElementById('howToModal'))));
  document.getElementById('quitButton')?.addEventListener('click', () => runGame('quitGame'));
  document.getElementById('restartButton')?.addEventListener('click', () => runGame('resetGame'));
  document.getElementById('postButton')?.addEventListener('click', () => runGame('postToX'));

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      closeNativeModal(document.getElementById(button.dataset.closeModal));
    });
  });

  setupFixedStageScale();
  applyGameConfig();
  modeReady
    .then(() => {
      const api = getGameApi();
      if (api && typeof api.refreshLanding === 'function') api.refreshLanding();
    })
    .catch(error => {
      console.error('[mode_loader] game refresh failed:', error);
    });
  trackPageView();
})();
