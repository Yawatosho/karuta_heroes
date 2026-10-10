/** Keep a readable portrait arena and the original landscape arena. */
export function arenaLayout(width, height) {
  const portrait = width < height && width <= 900;
  const arenaWidth = portrait ? 480 : 1366;
  const arenaHeight = portrait ? Math.max(800, Math.min(1120, Math.round(height * 480 / width))) : 768;
  return { portrait, width: arenaWidth, height: arenaHeight, scale: Math.min(width / arenaWidth, height / arenaHeight) };
}

/** Paths match the original game's dedicated portrait illustrations. */
export function portraitAsset(path) {
  if (/^opening\/op_(common|lib|det|lily|prof|flib)\.webp$/.test(path)) return path.replace('.webp', '_tate.webp');
  if (/^vs\/vs_[1-4]_(lib|det|lily|prof|flib)\.webp$/.test(path)) return path.replace('vs/', 'vs_tate/').replace('.webp', '_tate.webp');
  if (/^victory\/win_(lib|det|lily|prof|flib|enemy[1-4])\.webp$/.test(path)) return path.replace('victory/', 'victory_tate/').replace('.webp', '_tate.webp');
  if (/^ending\/ending_(lib|det|lily|prof|flib)[12]\.webp$/.test(path)) return path.replace('ending/', 'ending_tate/').replace('.webp', '_tate.webp');
  return null;
}
