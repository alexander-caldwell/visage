import { CHARTS, chartById, renderInto, defaultConfig, optionType,
         displayValue, appliesNow, REGISTRATION_BASE } from './preview.js';
import { bindTheme, bindResize } from './theme.js';

const params = new URLSearchParams(location.search);
const chart = chartById(params.get('id')) || CHARTS[0];

const tile = document.getElementById('tile');
const controls = document.getElementById('controls');
const tableSlot = document.getElementById('table');
const url = REGISTRATION_BASE + chart.id + '.js';

document.title = chart.name + ' — Visage';
document.getElementById('name').textContent = chart.name;
document.getElementById('id').textContent = 'id ' + chart.id;
document.getElementById('blurb').textContent = chart.blurb;
document.getElementById('url').textContent = url;

document.getElementById('copy').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  } catch {
    button.textContent = 'Select it and copy';
  }
});

let vis = null;
let config = null;
let rendering = false;

async function draw() {
  if (rendering) return;
  rendering = true;
  try {
    vis = await renderInto(tile, chart, config);
  } catch (err) {
    tile.classList.add('failed');
    tile.textContent = err.message;
  } finally {
    rendering = false;
  }
}

// A real control per option, so the panel does something rather than describing
// what it would do.
function buildControls() {
  controls.replaceChildren();

  Object.keys(vis.options || {}).forEach((key) => {
    const option = vis.options[key];
    const row = document.createElement('div');
    row.className = 'row';

    const label = document.createElement('label');
    label.setAttribute('for', 'opt-' + key);
    const name = document.createElement('span');
    name.textContent = option.label || key;

    // The control carries its own type and default, so there is no second copy
    // of the same list underneath it.
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = key + '  ·  ' + optionType(option);
    label.append(name, hint);

    const state = appliesNow(option, config);
    if (!state.active) {
      row.classList.add('inactive');
      const why = document.createElement('span');
      why.className = 'why';
      why.textContent = 'applies when ' + state.reason;
      label.appendChild(why);
    }

    let input;
    if (option.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!config[key];
      input.addEventListener('change', () => {
        config[key] = input.checked;
        draw().then(buildControls);
      });
    } else if (option.values) {
      input = document.createElement('select');
      option.values.forEach((entry) => {
        const text = Object.keys(entry)[0];
        const value = Object.values(entry)[0];
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        opt.selected = config[key] === value;
        input.appendChild(opt);
      });
      input.addEventListener('change', () => {
        config[key] = input.value;
        draw().then(buildControls);
      });
    } else if (option.display === 'color' || option.display === 'colors') {
      input = document.createElement('input');
      input.type = 'color';
      const current = Array.isArray(config[key]) ? config[key][0] : config[key];
      input.value = current || '#2a78d6';
      input.addEventListener('input', () => {
        config[key] = Array.isArray(option.default) ? [input.value] : input.value;
        draw();
      });
    } else if (option.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = config[key] ?? '';
      input.addEventListener('change', () => {
        config[key] = input.value === '' ? option.default : Number(input.value);
        draw();
      });
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = config[key] ?? '';
      input.placeholder = option.placeholder || '';
      input.addEventListener('change', () => {
        config[key] = input.value;
        draw();
      });
    }

    input.id = 'opt-' + key;
    input.disabled = !state.active;

    const field = document.createElement('div');
    field.className = 'field';
    const shown = document.createElement('span');
    shown.className = 'default';
    shown.textContent = 'default ' + displayValue(option, option.default);
    field.append(input, shown);

    row.append(label, field);
    controls.appendChild(row);
  });
}

document.getElementById('reset').addEventListener('click', () => {
  config = defaultConfig(vis);
  buildControls();
  draw();
});

async function start() {
  await draw();
  if (!vis) return;

  document.getElementById('shape').textContent =
    'needs: ' + (vis.data_shape || 'see the file');

  config = defaultConfig(vis);
  buildControls();

  // Use cases come from the chart file, so the page cannot disagree with it.
  if (vis.good_for && vis.good_for.length) {
    const heading = document.createElement('h2');
    heading.textContent = 'Good for';
    const list = document.createElement('ul');
    list.className = 'uses';
    vis.good_for.forEach((use) => {
      const item = document.createElement('li');
      item.textContent = use;
      list.appendChild(item);
    });
    tableSlot.replaceChildren(heading, list);
  }

  bindTheme(draw);
  bindResize(draw);
}

start();
