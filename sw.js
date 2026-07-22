const CACHE_NAME = 'karuta-audio-v10';
const AUDIO_ASSETS = [
  './sound/0.mp3',
  './sound/1.mp3',
  './sound/2.mp3',
  './sound/3.mp3',
  './sound/4.mp3',
  './sound/5.mp3',
  './sound/6.mp3',
  './sound/7.mp3',
  './sound/8.mp3',
  './sound/9.mp3',
  './sound/q_0.mp3',
  './sound/q_1.mp3',
  './sound/q_2.mp3',
  './sound/q_3.mp3',
  './sound/q_4.mp3',
  './sound/q_5.mp3',
  './sound/q_6.mp3',
  './sound/q_7.mp3',
  './sound/q_8.mp3',
  './sound/q_9.mp3',
  './sound/voice.mp3',
  './sound/q_voice.mp3',
  './sound/character.mp3',
  './sound/correct.mp3',
  './sound/ng.mp3',
  './sound/start.mp3',
  './sound/roundcall.mp3',
  './sound/KO.mp3',
  './sound/timeup.mp3',
  './sound/perfect.mp3',
  './sound/win_lib.mp3',
  './sound/win_det.mp3',
  './sound/win_lily.mp3',
  './sound/win_prof.mp3',
  './sound/win_flib.mp3',
  './sound/win_enemy.mp3',
  './sound/victory.mp3',
  './sound/result.mp3',
  './sound/select.mp3',
  './sound/opening.mp3',
  './sound/battle1.mp3',
  './sound/battle2.mp3',
  './sound/ending.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(AUDIO_ASSETS.map(asset => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME && key.startsWith('karuta-audio-'))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin || !url.pathname.endsWith('.mp3')) return;
  if (event.request.headers.has('range')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});
