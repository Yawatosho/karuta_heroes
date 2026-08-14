(function () {
  'use strict';

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const EFFECT_SOURCES = {
    correct: 'sound/correct.mp3',
    character: 'sound/character.mp3',
    ng: 'sound/ng.mp3',
    start: 'sound/start.mp3',
    roundcall: 'sound/roundcall.mp3',
    ko: 'sound/KO.mp3',
    timeup: 'sound/timeup.mp3',
    perfect: 'sound/perfect.mp3',
    winLib: 'sound/win_lib.mp3',
    winDet: 'sound/win_det.mp3',
    winLily: 'sound/win_lily.mp3',
    winProf: 'sound/win_prof.mp3',
    winFlib: 'sound/win_flib.mp3',
    winEnemy: 'sound/win_enemy.mp3',
    victory: 'sound/victory.mp3',
    result: 'sound/result.mp3',
    artwork: 'sound/artwork.mp3'
  };
  const DIGIT_SOURCES = Array.from({ length: 10 }, (_, digit) => ({
    [`digitA${digit}`]: `sound/${digit}.mp3`,
    [`digitB${digit}`]: `sound/q_${digit}.mp3`
  })).reduce((map, entry) => Object.assign(map, entry), {});
  const VOICE_SAMPLE_SOURCES = {
    voiceA: 'sound/voice.mp3',
    voiceB: 'sound/q_voice.mp3'
  };
  const MUSIC_SOURCES = {
    select: 'sound/select.mp3',
    opening: 'sound/opening.mp3',
    vs: 'sound/vs.mp3',
    battle1: 'sound/battle1.mp3',
    battle2: 'sound/battle2.mp3',
    victory: 'sound/victory.mp3',
    ending: 'sound/ending.mp3'
  };
  const MUSIC_VOLUMES = {
    select: 0.38,
    opening: 0.42,
    vs: 0.42,
    battle1: 0.22,
    battle2: 0.22,
    victory: 0.48,
    ending: 0.42
  };
  const MUSIC_LOOPS = {
    opening: false,
    vs: false,
    victory: false
  };
  const SOURCES = { ...EFFECT_SOURCES, ...DIGIT_SOURCES, ...VOICE_SAMPLE_SOURCES };
  const EFFECT_ELEMENT_IDS = {
    correct: 'correctSound',
    character: 'characterSound',
    ng: 'ngSound',
    start: 'startSound',
    roundcall: 'roundCallSound',
    ko: 'koSound',
    timeup: 'timeUpSound',
    perfect: 'perfectSound',
    winLib: 'winLibSound',
    winDet: 'winDetSound',
    winLily: 'winLilySound',
    winProf: 'winProfSound',
    winFlib: 'winFlibSound',
    winEnemy: 'winEnemySound',
    victory: 'victorySound',
    result: 'resultSound',
    artwork: 'artworkSound'
  };

  let audioContext = null;
  let enabled = true;
  let preparePromise = null;
  const VOICE_STORAGE_KEY = 'karutaVoiceVariant';
  let voiceVariant = getInitialVoiceVariant();
  const buffers = new Map();
  const loading = new Map();
  const fallbackAudios = new Map();
  let musicAudio = null;
  let musicSourceNode = null;
  let musicAnalyser = null;
  let musicFrequencyData = null;
  let musicAnalysisAttempted = false;
  let currentMusicName = null;
  let currentMusicVolume = 0;
  let musicFadeFrame = 0;

  function normalizeVoiceVariant(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'b' || normalized === 'voiceb' || normalized === 'voice-b' ? 'b' : 'a';
  }

  function getInitialVoiceVariant() {
    try {
      return normalizeVoiceVariant(localStorage.getItem(VOICE_STORAGE_KEY));
    } catch (e) {
      return 'a';
    }
  }

  function getDigitKey(digit, variant = voiceVariant) {
    const normalized = Number(digit);
    if (!Number.isInteger(normalized) || normalized < 0 || normalized > 9) return null;
    return `digit${variant === 'b' ? 'B' : 'A'}${normalized}`;
  }

  function getDigitKeys(variant = voiceVariant) {
    return Array.from({ length: 10 }, (_, digit) => getDigitKey(digit, variant));
  }

  function getVoiceSampleKey(variant = voiceVariant) {
    return variant === 'b' ? 'voiceB' : 'voiceA';
  }

  function syncVoiceControls() {
    document.documentElement.dataset.voiceVariant = voiceVariant;
    document.querySelectorAll('input[name="voiceVariant"]').forEach(input => {
      input.checked = normalizeVoiceVariant(input.value) === voiceVariant;
    });
  }

  function getToggleEnabled() {
    const toggle = document.getElementById('soundToggle');
    return !toggle || toggle.checked;
  }

  function isEnabled() {
    return enabled && getToggleEnabled();
  }

  function getAudioContext() {
    if (!AudioContextCtor) return null;
    if (!audioContext) {
      try {
        audioContext = new AudioContextCtor();
      } catch (e) {
        return null;
      }
    }
    return audioContext;
  }

  async function resumeAudioContext() {
    const context = getAudioContext();
    if (!context) return null;
    if (context.state === 'suspended') {
      await context.resume();
    }
    return context;
  }

  function decodeAudioData(context, arrayBuffer) {
    return new Promise((resolve, reject) => {
      const result = context.decodeAudioData(arrayBuffer, resolve, reject);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
    });
  }

  async function loadBuffer(key) {
    if (buffers.has(key)) return buffers.get(key);
    if (loading.has(key)) return loading.get(key);

    const src = SOURCES[key];
    const context = getAudioContext();
    if (!src || !context) return null;

    const request = fetch(src, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`audio load failed: ${src}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => decodeAudioData(context, arrayBuffer))
      .then(buffer => {
        buffers.set(key, buffer);
        return buffer;
      })
      .finally(() => {
        loading.delete(key);
      });

    loading.set(key, request);
    return request;
  }

  function warmHtmlAudioElements() {
    Object.entries(EFFECT_ELEMENT_IDS).forEach(([key, id]) => {
      const audio = document.getElementById(id);
      if (!audio) return;
      const src = EFFECT_SOURCES[key];
      if (src && !audio.currentSrc && !audio.getAttribute('src')) {
        audio.src = src;
      }
      audio.preload = 'auto';
      try { audio.load(); } catch (e) {}
    });
  }

  function prepare(keys = Object.keys(SOURCES)) {
    preparePromise = (async () => {
      if (!isEnabled()) return false;
      try {
        await resumeAudioContext();
      } catch (e) {
        getAudioContext();
      }
      warmHtmlAudioElements();
      await Promise.allSettled(keys.map(key => loadBuffer(key)));
      return true;
    })();
    return preparePromise;
  }

  function getFallbackAudio(key) {
    const effectId = EFFECT_ELEMENT_IDS[key];
    if (effectId) {
      const element = document.getElementById(effectId);
      if (element) return element;
    }

    if (!fallbackAudios.has(key)) {
      const src = SOURCES[key];
      if (!src) return null;
      const audio = new Audio(src);
      audio.preload = 'auto';
      fallbackAudios.set(key, audio);
    }
    return fallbackAudios.get(key);
  }

  function playFallback(key, playbackRate = 1) {
    const audio = getFallbackAudio(key);
    if (!audio) return false;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      audio.play().catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function playBuffer(key, options = {}) {
    if (!isEnabled()) return false;

    const playbackRate = options.playbackRate || 1;
    const delaySeconds = options.delaySeconds || 0;
    const volume = options.volume || 1;
    const context = getAudioContext();
    const buffer = buffers.get(key);

    if (!context || !buffer) {
      loadBuffer(key).catch(() => {});
      return playFallback(key, playbackRate);
    }

    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.value = volume;
    source.connect(gain).connect(context.destination);
    source.start(context.currentTime + delaySeconds);
    return true;
  }

  function playEffect(name, options = {}) {
    return playBuffer(name, options);
  }

  function playDigit(digit, options = {}) {
    const normalized = Number(digit);
    if (!Number.isInteger(normalized) || normalized < 0 || normalized > 9) return false;
    const variant = normalizeVoiceVariant(options.voice || voiceVariant);
    return playBuffer(getDigitKey(normalized, variant), options);
  }

  function clampVolume(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(1, parsed));
  }

  function getMusicAudio() {
    if (!musicAudio) {
      musicAudio = new Audio();
      musicAudio.loop = true;
      musicAudio.preload = 'auto';
      musicAudio.addEventListener('ended', () => {
        currentMusicName = null;
        currentMusicVolume = 0;
      });
    }
    return musicAudio;
  }

  function ensureMusicAnalysisGraph(audio = getMusicAudio()) {
    const context = getAudioContext();
    if (!context || !audio) return null;
    if (musicAnalyser) return musicAnalyser;
    if (musicAnalysisAttempted) return null;
    musicAnalysisAttempted = true;
    let sourceNode = null;
    try {
      sourceNode = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      sourceNode.connect(analyser);
      analyser.connect(context.destination);
      musicSourceNode = sourceNode;
      musicAnalyser = analyser;
      musicFrequencyData = new Uint8Array(analyser.frequencyBinCount);
      return musicAnalyser;
    } catch (error) {
      console.warn('[karutaAudio] music analyser unavailable:', error);
      try { sourceNode?.connect(context.destination); } catch (e) {}
      musicSourceNode = null;
      musicAnalyser = null;
      musicFrequencyData = null;
      return null;
    }
  }

  function getMusicFrequencyBands(bandCount = 12) {
    const count = Math.max(1, Math.min(32, Math.floor(Number(bandCount) || 12)));
    const empty = Array(count).fill(0);
    if (!currentMusicName || !musicAudio || musicAudio.paused) return empty;
    const analyser = ensureMusicAnalysisGraph(musicAudio);
    const context = audioContext;
    if (!analyser || !context || !musicFrequencyData) return empty;

    analyser.getByteFrequencyData(musicFrequencyData);
    const nyquist = context.sampleRate / 2;
    const minFrequency = 55;
    const maxFrequency = Math.min(14000, nyquist);
    const values = [];

    for (let band = 0; band < count; band++) {
      const lowRatio = band / count;
      const highRatio = (band + 1) / count;
      const lowFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, lowRatio);
      const highFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, highRatio);
      const startBin = Math.max(1, Math.floor((lowFrequency / nyquist) * musicFrequencyData.length));
      const endBin = Math.max(startBin + 1, Math.ceil((highFrequency / nyquist) * musicFrequencyData.length));
      let sum = 0;
      let peak = 0;
      let samples = 0;

      for (let bin = startBin; bin < Math.min(endBin, musicFrequencyData.length); bin++) {
        const magnitude = musicFrequencyData[bin];
        sum += magnitude;
        peak = Math.max(peak, magnitude);
        samples++;
      }

      const average = samples ? sum / samples : 0;
      const combined = (average * 0.58 + peak * 0.42) / 255;
      values.push(Math.max(0, Math.min(1, Math.pow(combined, 0.72) * 1.16)));
    }
    return values;
  }

  function cancelMusicFade() {
    if (!musicFadeFrame) return;
    cancelAnimationFrame(musicFadeFrame);
    musicFadeFrame = 0;
  }

  function playMusic(name, options = {}) {
    const src = MUSIC_SOURCES[name];
    if (!src) return false;

    const volume = clampVolume(options.volume, MUSIC_VOLUMES[name] ?? 0.25);
    const audio = getMusicAudio();
    ensureMusicAnalysisGraph(audio);
    resumeAudioContext().catch(() => {});
    const changed = currentMusicName !== name || !audio.src || !audio.currentSrc.includes(src);
    cancelMusicFade();
    currentMusicName = name;
    currentMusicVolume = volume;

    audio.loop = options.loop ?? MUSIC_LOOPS[name] ?? true;
    audio.volume = volume;
    if (changed) {
      audio.pause();
      audio.src = src;
      audio.currentTime = 0;
      try { audio.load(); } catch (e) {}
    }

    if (!isEnabled()) return false;
    audio.play().catch(error => {
      if (currentMusicName === name) {
        currentMusicName = null;
        currentMusicVolume = 0;
      }
      console.warn('[karutaAudio] music playback failed:', error);
    });
    return true;
  }

  function stopMusic(options = {}) {
    const fadeMs = Math.max(0, Number(options.fadeMs) || 0);
    const shouldReset = options.reset !== false;
    currentMusicName = null;
    currentMusicVolume = 0;
    if (!musicAudio) return;
    cancelMusicFade();

    if (fadeMs > 0 && !musicAudio.paused) {
      const audio = musicAudio;
      const startVolume = audio.volume;
      const startedAt = Date.now();
      const step = () => {
        const progress = Math.min(1, (Date.now() - startedAt) / fadeMs);
        audio.volume = startVolume * (1 - progress);
        if (progress < 1) {
          musicFadeFrame = requestAnimationFrame(step);
          return;
        }
        musicFadeFrame = 0;
        audio.pause();
        if (shouldReset) {
          try { audio.currentTime = 0; } catch (e) {}
        }
        audio.volume = startVolume;
      };
      musicFadeFrame = requestAnimationFrame(step);
      return;
    }

    musicAudio.pause();
    if (shouldReset) {
      try { musicAudio.currentTime = 0; } catch (e) {}
    }
  }

  function getMusicState() {
    return {
      name: currentMusicName,
      volume: currentMusicVolume,
      paused: !musicAudio || musicAudio.paused,
      src: musicAudio?.currentSrc || musicAudio?.src || ''
    };
  }

  function setVoiceVariant(value, options = {}) {
    const nextVariant = normalizeVoiceVariant(value);
    const changed = nextVariant !== voiceVariant;
    voiceVariant = nextVariant;
    try { localStorage.setItem(VOICE_STORAGE_KEY, voiceVariant); } catch (e) {}
    syncVoiceControls();
    if (enabled) prepare([...getDigitKeys(), getVoiceSampleKey()]).catch(() => {});
    if (options.preview && changed) {
      resumeAudioContext()
        .then(() => playBuffer(getVoiceSampleKey()))
        .catch(() => playFallback(getVoiceSampleKey()));
    }
  }

  function getVoiceVariant() {
    return voiceVariant;
  }

  function setEnabled(value) {
    enabled = !!value;
    if (enabled) {
      prepare().catch(() => {});
      if (currentMusicName) playMusic(currentMusicName, { volume: currentMusicVolume });
    } else if (musicAudio) {
      musicAudio.pause();
    }
  }

  function registerAudioCacheWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=bgm6').catch(() => {});
    });
  }

  document.getElementById('soundToggle')?.addEventListener('change', event => {
    setEnabled(event.target.checked);
  });

  document.querySelectorAll('input[name="voiceVariant"]').forEach(input => {
    input.addEventListener('change', event => {
      if (event.target.checked) setVoiceVariant(event.target.value, { preview: true });
    });
  });

  window.karutaAudio = {
    prepare,
    playEffect,
    playDigit,
    playMusic,
    stopMusic,
    getMusicState,
    getMusicFrequencyBands,
    setEnabled,
    setVoiceVariant,
    getVoiceVariant,
    isEnabled,
    get ready() {
      return preparePromise;
    }
  };
  document.documentElement.dataset.audioManager = 'ready';
  syncVoiceControls();

  preparePromise = prepare([...getDigitKeys(), 'voiceA', 'voiceB'])
    .catch(() => false);
  registerAudioCacheWorker();
})();
