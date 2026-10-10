import { players, enemies, difficulties } from './config.js';

export const SAVE_KEY = 'ndc_karuta_heroes2_v1';
const LEGACY_KEYS = {
  gallery: 'karutaGalleryProgressV1',
  story: 'karutaStoryProgressV1',
  tutorial: 'karutaTutorialProgressV1'
};
const isSaveRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const galleryAssetSets = {
  cutins: new Set([...players, ...enemies].map(f => f.cutin)),
  victories: new Set([...players.map(p => p.vsCode), ...enemies.map((_, i) => `enemy${i + 1}`)]
    .flatMap(code => [`victory/win_${code}.webp`, `round/round_${code}.webp`])),
  endings: new Set(['opening/op_common.webp', ...players.flatMap(p => [
    `opening/op_${p.vsCode}.webp`, `ending/ending_${p.vsCode}1.webp`, `ending/ending_${p.vsCode}2.webp`
  ])])
};
function readSaveRecord(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem(key) || 'null');
    return isSaveRecord(value) ? value : null;
  } catch { return null; }
}
function validSaveProgress(progress) {
  if (!isSaveRecord(progress) || !players.some(p => p.id === progress.player)
    || !Object.hasOwn(difficulties, progress.difficulty)
    || !Number.isInteger(progress.stage) || progress.stage < 0 || progress.stage >= enemies.length
    || !['opening', 'battle', 'ending'].includes(progress.phase)) return false;
  const limit = progress.phase === 'opening' ? 3 : 1;
  return Number.isInteger(progress.scene) && progress.scene >= 0 && progress.scene <= limit;
}
function legacyStoryProgress(story) {
  if (!story || story.version !== 1) return null;
  if (story.phase === 'ending' && ![1, 2].includes(story.endingSceneNumber)) return null;
  const scene = story.phase === 'opening' ? story.openingSceneIndex
    : story.phase === 'ending' ? story.endingSceneNumber - 1 : 0;
  const progress = { player: story.playerId, difficulty: story.difficulty,
    stage: story.stageIndex, phase: story.phase, scene };
  return validSaveProgress(progress) ? progress : null;
}
function legacyAssetPath(value) {
  if (typeof value !== 'string') return '';
  // Both orientations represent the same gallery unlock in the new game.
  return value.split(/[?#]/)[0].replace(/^\.\//, '').replace(/\.png$/i, '.webp')
    .replace(/_tate(?=\.webp$)/, '').replace(/^(victory|ending)_tate\//, '$1/');
}

/** Import once from the same browser origin; never modify any legacy key. */
export function loadSave(storage, defaults) {
  const currentSave = readSaveRecord(storage, SAVE_KEY);
  const saved = { ...defaults, ...currentSave,
    settings: { ...defaults.settings, ...(isSaveRecord(currentSave?.settings) ? currentSave.settings : {}) },
    unlocked: [...new Set(Array.isArray(currentSave?.unlocked) ? currentSave.unlocked.filter(x => typeof x === 'string') : [])],
    artworks: [...new Set(Array.isArray(currentSave?.artworks) ? currentSave.artworks.filter(x => Number.isInteger(x) && x >= 1 && x <= 25) : [])]
  };
  saved.settings.volume = Number.isFinite(saved.settings.volume) ? Math.max(0, Math.min(1, saved.settings.volume)) : defaults.settings.volume;
  if (!validSaveProgress(saved.progress)) {
    // Older saves from this new edition can omit the scene counter.
    const withScene = isSaveRecord(saved.progress) ? { ...saved.progress, scene: 0 } : null;
    saved.progress = validSaveProgress(withScene) ? withScene : null;
  }
  if (saved.legacyImported === true) return saved;

  const gallery = readSaveRecord(storage, LEGACY_KEYS.gallery);
  const story = legacyStoryProgress(readSaveRecord(storage, LEGACY_KEYS.story));
  const tutorial = readSaveRecord(storage, LEGACY_KEYS.tutorial);
  const hasGallery = gallery && ['cutins', 'victories', 'endings', 'artworks'].some(key => Array.isArray(gallery[key]));
  const hasTutorial = tutorial?.version === 1;
  if (!hasGallery && !story && !hasTutorial) return saved;

  for (const [category, allowed] of Object.entries(galleryAssetSets)) {
    for (const value of Array.isArray(gallery?.[category]) ? gallery[category] : []) {
      const path = legacyAssetPath(value);
      if (allowed.has(path) && !saved.unlocked.includes(path)) saved.unlocked.push(path);
    }
  }
  for (const value of Array.isArray(gallery?.artworks) ? gallery.artworks : []) {
    const match = /^artwork\/artwork(\d{2})\.webp$/.exec(legacyAssetPath(value));
    const number = match ? Number(match[1]) : 0;
    if (number >= 1 && number <= 25 && !saved.artworks.includes(number)) saved.artworks.push(number);
  }
  // A completed new-edition story has progress=null: do not resurrect an old run.
  if (!currentSave && story) saved.progress = story;
  saved.tutorialSeen = saved.tutorialSeen === true || (hasTutorial && tutorial.completed === true);
  saved.legacyImported = true;
  try { storage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* Retry on the next launch if saving is unavailable. */ }
  return saved;
}
