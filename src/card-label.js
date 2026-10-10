const wordSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;
const labelEscape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Keep short classification phrases intact; longer phrases break only at word boundaries. */
export function classificationTerms(text) {
  const chunks = text.match(/[^．。，、：:]+[．。，、：:]*|[．。，、：:]+/gu) || [text];
  return chunks.flatMap(chunk => {
    if (chunk.length <= 8) return [chunk];
    const words = wordSegmenter ? [...wordSegmenter.segment(chunk)].map(s => s.segment)
      : chunk.match(/[A-Za-z0-9]+|[ァ-ヺー]+|[一-龯々]+|[ぁ-ゖ]+|./gu);
    const terms = []; let pending = '';
    for (const word of words) {
      // Punctuation and particles remain attached, so a line cannot begin with them.
      const attached = /^[．。，、：:・\s］）＞】]+$/u.test(word) || /^[のにをとやへがはで]+$/u.test(word);
      if (pending && !attached && pending.length + word.length > 8) { terms.push(pending); pending = ''; }
      pending += word;
    }
    if (pending) terms.push(pending);
    return terms;
  });
}

export function classificationParts(subject) {
  const divider = subject.indexOf('--');
  if (divider >= 0) return { main: subject.slice(0, divider), detail: subject.slice(divider + 2) };
  const colon = subject.search(/[：:]/u);
  return colon >= 0 ? { main: subject.slice(0, colon + 1), detail: subject.slice(colon + 1) } : { main: subject, detail: '' };
}
function classificationLine(text) {
  const output = [];
  for (let run of text.split(/([［（＜【][^］）＞】]*[］）＞】])/u).filter(Boolean)) {
    // A separator after an annotation belongs to that annotation's closing word.
    const leading = run.match(/^[．。，、：:]+/u)?.[0];
    if (leading && output.length) {
      output[output.length-1] = output.at(-1).replace(/((?:<\/span>)+)$/, `${labelEscape(leading)}$1`);
      run = run.slice(leading.length); if (!run) continue;
    }
    const note = /^[［（＜【]/u.test(run);
    const terms = classificationTerms(run).map(term => `<span class="subject-term">${labelEscape(term)}</span>`).join('<wbr>');
    output.push(note ? `<span class="subject-note">${terms}</span>` : terms);
  }
  return output.join('<wbr>');
}
export function cardLabel(subject) {
  const {main, detail} = classificationParts(subject);
  return `<span class="subject-main">${classificationLine(main)}</span>${detail ? `<span class="subject-detail">${classificationLine(detail)}</span>` : ''}`;
}

/** Fit to the actual card, after insertion. Existing labels need no work on ordinary turns. */
export function fitCardLabels(grid, force = false) {
  if (!grid) return;
  for (const card of grid.children) {
    if (!card.dataset.ndc || (!force && card.dataset.labelFit !== 'pending')) continue;
    const label = card.querySelector('.card-subject'); if (!label) continue;
    label.style.removeProperty('font-size');
    const style = getComputedStyle(card), height = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const maximum = parseFloat(getComputedStyle(label).fontSize);
    for (let size = maximum; size >= 12; size -= .5) {
      label.style.fontSize = `${size}px`;
      if (label.scrollHeight <= height + 1 && label.scrollWidth <= label.clientWidth + 1) break;
    }
    card.dataset.labelFit = 'done';
  }
}
