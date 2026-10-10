/** Retain only this match's decoded artwork, rather than every fighter's art. */
export class ImageBank {
  constructor({ makeImage = () => new Image(), timeout = 8000, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) } = {}) {
    this.entries = new Map(); this.makeImage = makeImage; this.timeout = timeout; this.setTimer = setTimer; this.clearTimer = clearTimer;
  }
  retain(paths) {
    const keep = new Set(paths);
    for (const path of this.entries.keys()) if (!keep.has(path)) this.entries.delete(path);
    for (const path of keep) this.ensure(path);
  }
  peek(path) { return this.entries.get(path)?.image || null; }
  ensure(path) {
    if (this.entries.has(path)) return this.entries.get(path).promise;
    const entry = { image: null, promise: null };
    this.entries.set(path, entry);
    entry.promise = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          entry.image = await this.attempt(attempt ? `${path}${path.includes('?') ? '&' : '?'}image-retry=1` : path);
          return entry.image;
        } catch { /* Retry once, then let the presentation use its fighter icon. */ }
      }
      if (this.entries.get(path) === entry) this.entries.delete(path);
      return null;
    })();
    return entry.promise;
  }
  attempt(path) {
    return new Promise((resolve, reject) => {
      const image = this.makeImage(); image.decoding = 'async';
      let settled = false;
      const finish = error => {
        if (settled) return; settled = true;
        this.clearTimer(timer); image.onload = null; image.onerror = null;
        if (error) { image.removeAttribute?.('src'); reject(error); } else resolve(image);
      };
      const timer = this.setTimer(() => finish(new Error('Image load timeout')), this.timeout);
      image.onerror = () => finish(new Error('Image load failed'));
      image.onload = () => {
        if (!image.naturalWidth) { finish(new Error('Empty image')); return; }
        Promise.resolve().then(() => image.decode?.()).then(() => finish(), finish);
      };
      image.src = path;
    });
  }
}
export function battleArtPaths(player, enemy, mode, stage) {
  const enemyCode = mode === 'story' ? `enemy${stage + 1}` : enemy.vsCode;
  return [...(mode === 'story' ? [player.cutin, enemy.cutin] : []),
    `round/round_${player.vsCode}.webp`, `round/round_${enemyCode}.webp`];
}
