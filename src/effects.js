/** Decorative vocabulary shares the palettes already present in the artwork. */
export const specialLooks = {
  librarian: { motif: 'pages', color: '#73dcff', focus: '32%' },
  detective: { motif: 'reticle', color: '#ffe287', focus: '45%' },
  lily: { motif: 'stars', color: '#e5a0ff', focus: '38%' },
  professor: { motif: 'orbits', color: '#f0cca0', focus: '76%' },
  fightingLibrarian: { motif: 'shock', color: '#83caff', focus: '44%' },
  wind: { motif: 'wind', color: '#bce7b3', focus: '50%' },
  magician: { motif: 'orbits', color: '#d6a1ff', focus: '57%' },
  digital: { motif: 'scan', color: '#78efff', focus: '42%' },
  supreme: { motif: 'celestial', color: '#ffe2a4', focus: '52%' },
};
export function specialDecor(fighter) {
  const look = specialLooks[fighter.id] || specialLooks.librarian;
  return { ...look, html: `<div class="special-motif motif-${look.motif}" aria-hidden="true">${Array.from({length: 12}, (_, i) => `<i style="--n:${i};--row:${i%4};--col:${i%3};--pair:${i%2}"></i>`).join('')}</div>` };
}
/** Stage-local coordinates remain aligned when the arena is scaled for phones. */
export function strikeGeometry(card, life, arena, width) {
  const scale = arena.width / width;
  const source = { x: (card.left + card.width / 2 - arena.left) / scale, y: (card.top + card.height / 2 - arena.top) / scale };
  const target = { x: (life.left + life.width / 2 - arena.left) / scale, y: (life.top + life.height / 2 - arena.top) / scale };
  return { source, target, left: (card.left-arena.left)/scale, top: (card.top-arena.top)/scale, width: card.width/scale, height: card.height/scale,
    path: `M ${source.x} ${source.y} Q ${source.x} ${target.y + 90} ${target.x} ${target.y}` };
}
