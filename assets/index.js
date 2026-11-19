import { CHARTS, loadChart, renderInto, shortShape } from './preview.js?v=2';
import { bindTheme, bindResize } from './theme.js?v=2';

const families = document.getElementById('families');
const search = document.getElementById('search');
const result = document.getElementById('result');

// The families from docs/roadmap.md, in its order.
const FAMILIES = [
  ['comparison', 'Comparison', 'How do these categories differ?', 'compare'],
  ['distribution', 'Distribution', 'How is this measure spread?'],
  ['part_to_whole', 'Part to Whole', 'What is this total made of?'],
  ['time', 'Time', 'What happened over this period?'],
  ['relationship', 'Relationship', 'Do these two measures move together?'],
  ['flow', 'Flow', 'How does volume move between states?'],
  ['grid', 'Grid', 'What are the actual numbers, cell by cell?'],
  ['single_value', 'Single Value', 'What is this number, and is it good?']
];

function words(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

const sections = new Map(FAMILIES
  .filter(([key]) => CHARTS.some((chart) => chart.family === key))
  .map(([key, label, question, alias = '']) => {
    const section = document.createElement('details');
    section.className = 'family';
    section.open = true;
    const summary = document.createElement('summary');
    const title = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = label;
    const ask = document.createElement('span');
    ask.className = 'question';
    ask.textContent = question;
    const grid = document.createElement('div');
    grid.className = 'grid';

    title.append(heading, ask);
    summary.appendChild(title);
    section.append(summary, grid);
    families.appendChild(section);
    return [key, { section, grid, searchText: [key, label, alias].join(' ') }];
  }));

const cards = CHARTS.map((chart) => {
  const family = sections.get(chart.family);
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

  const caption = document.createElement('p');
  caption.textContent = chart.caption;

  body.append(name, shape, caption);
  card.append(tile, body);
  family.grid.appendChild(card);

  const searchText = [chart.name, chart.id, family.searchText, chart.caption, chart.blurb].join(' ');
  return { chart, family, card, tile, shape, searchText, tokens: words(searchText) };
});

let rendering = false;
let redraw = false;

async function renderAll() {
  if (rendering) {
    redraw = true;
    return;
  }
  rendering = true;
  try {
    do {
      redraw = false;
      for (const item of cards) {
        if (!item.ready || item.card.hidden || !item.family.section.open) continue;
        try {
          await renderInto(item.tile, item.chart);
        } catch (err) {
          item.tile.classList.add('failed');
          item.tile.textContent = err.message;
        }
      }
    } while (redraw);
  } finally {
    rendering = false;
  }
}

let browseState = null;

function filter() {
  const terms = words(search.value);
  const searching = terms.length > 0;
  if (searching && !browseState) {
    browseState = new Map([...sections.values()].map(({ section }) => [section, section.open]));
  }

  let shown = 0;
  const matchingSections = new Set();
  for (const item of cards) {
    const match = terms.every((term) => item.tokens.some((token) =>
      /^\d+$/.test(term) ? token === term : token.startsWith(term)));
    item.card.hidden = !match;
    if (match) {
      shown++;
      matchingSections.add(item.family.section);
    }
  }

  for (const { section } of sections.values()) {
    section.hidden = !matchingSections.has(section);
    if (searching && !section.hidden) section.open = true;
    if (!searching && browseState) section.open = browseState.get(section);
  }

  if (!searching) browseState = null;
  result.textContent = searching
    ? shown + (shown === 1 ? ' chart matches' : ' charts match')
    : '';
  renderAll();
}

search.addEventListener('input', filter);
bindTheme(renderAll);
bindResize(renderAll);

for (const { section } of sections.values()) {
  section.addEventListener('toggle', () => {
    if (section.open && !section.hidden) renderAll();
  });
}

// A change in card width can happen independently of a window resize.
if (window.ResizeObserver) {
  const widths = new WeakMap();
  let settle = null;

  const observer = new ResizeObserver((entries) => {
    let moved = false;
    for (const { target, contentRect } of entries) {
      const width = Math.round(contentRect.width);
      if (!width) continue;
      const previous = widths.get(target);
      if (previous !== undefined && Math.abs(previous - width) > 2) moved = true;
      widths.set(target, width);
    }
    if (!moved) return;
    clearTimeout(settle);
    settle = setTimeout(renderAll, 200);
  });

  cards.forEach((item) => observer.observe(item.tile));
}

// Index chart metadata even if its section is closed or hidden by a search.
await Promise.all(cards.map(async (item) => {
  try {
    const vis = await loadChart(item.chart.id);
    item.shape.textContent = 'needs: ' + (shortShape(vis.data_shape) || 'see the chart page');
    item.shape.title = vis.data_shape || '';
    item.tokens = words([item.searchText, vis.data_shape, (vis.good_for || []).join(' ')].join(' '));
    item.ready = true;
  } catch (err) {
    item.shape.textContent = 'needs: see the chart page';
    item.tile.classList.add('failed');
    item.tile.textContent = err.message;
  }
}));
filter();
