import { CHARTS, renderInto } from './preview.js';
import { bindTheme, bindResize } from './theme.js';

const grid = document.getElementById('grid');
const search = document.getElementById('search');
const result = document.getElementById('result');

// One card per chart, built once. Re-rendering redraws the chart into the tile
// it already has, rather than rebuilding the page.
const cards = CHARTS.map((chart) => {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = 'chart.html?id=' + encodeURIComponent(chart.id);

  const tile = document.createElement('div');
  tile.className = 'tile';

  const body = document.createElement('div');
  body.className = 'body';

  const name = document.createElement('h3');
  name.textContent = chart.name;

  const shape = document.createElement('span');
  shape.className = 'shape';
  shape.textContent = 'needs: …';

  const blurb = document.createElement('p');
  blurb.textContent = chart.blurb;

  body.append(name, shape, blurb);
  card.append(tile, body);
  grid.appendChild(card);

  return { chart, card, tile, shape, blurb };
});

let rendering = false;

// A resize part-way through a pass would otherwise interleave two sets of
// renders into the same tiles.
async function renderAll() {
  if (rendering) return;
  rendering = true;
  try {
    for (const item of cards) {
      if (item.card.hidden) continue;
      try {
        const vis = await renderInto(item.tile, item.chart);
        item.shape.textContent = 'needs: ' + (vis.data_shape || 'see the chart page');
      } catch (err) {
        item.tile.classList.add('failed');
        item.tile.textContent = err.message;
      }
    }
  } finally {
    rendering = false;
  }
}

function filter() {
  const term = search.value.trim().toLowerCase();
  let shown = 0;

  cards.forEach((item) => {
    const haystack = [
      item.chart.name, item.chart.id, item.chart.blurb, item.shape.textContent
    ].join(' ').toLowerCase();
    const match = !term || haystack.includes(term);
    item.card.hidden = !match;
    if (match) shown++;
  });

  result.textContent = term
    ? shown + (shown === 1 ? ' chart matches' : ' charts match')
    : '';

  // A card hidden during the first pass has an empty tile, so draw what is now
  // visible.
  renderAll();
}

search.addEventListener('input', filter);
bindTheme(renderAll);
bindResize(renderAll);

// A chart sizes itself to its tile when it draws. Cards render one after
// another, so the page grows, a scrollbar appears, and every tile narrows by a
// few pixels after the earlier charts have already drawn: their labels then sit
// a hair outside the tile. Watch each tile and redraw the ones that moved.
if (window.ResizeObserver) {
  const widths = new WeakMap();
  let settle = null;

  const observer = new ResizeObserver((entries) => {
    let moved = false;
    entries.forEach((entry) => {
      const width = Math.round(entry.contentRect.width);
      const previous = widths.get(entry.target);
      if (previous !== undefined && Math.abs(previous - width) > 2) moved = true;
      widths.set(entry.target, width);
    });
    if (!moved) return;
    clearTimeout(settle);
    settle = setTimeout(renderAll, 200);
  });

  cards.forEach((item) => observer.observe(item.tile));
}

renderAll();
