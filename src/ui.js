/** Reconcile the field by card identity. Ordinary turns leave its DOM untouched. */
export function syncField(grid, field, createCard, updateCard) {
  const previous = Array.from(grid.children);
  const byNdc = new Map(previous.filter(node => node.dataset.ndc).map(node => [node.dataset.ndc, node]));
  const used = new Set();
  const next = field.map((card, slot) => {
    let node = card ? byNdc.get(card.ndc) : previous[slot];
    if (!node || used.has(node) || (!card && field.some(c => c?.ndc === node.dataset.ndc))) node = createCard(card, slot);
    used.add(node); updateCard(node, card, slot); return node;
  });
  if (next.length !== previous.length || next.some((node, slot) => node !== previous[slot])) grid.replaceChildren(...next);
  return next;
}
