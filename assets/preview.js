// Shared machinery for the gallery: a thin stand-in for the globals Looker
// provides, the sample data, and helpers both pages use. Charts are loaded from
// this site's own directory, so the page always shows the files in this repo.

const CHART_SOURCE = './';

export const REGISTRATION_BASE =
  'https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@1/';

const field = (name, label, type, format) => ({
  name, label, label_short: label, type, value_format: format || null
});

const cell = (value, rendered) => ({ value, rendered, links: [] });

const CLIENT = field('clients.name', 'Client', 'string');
const MONTH = field('finance.month', 'Month', 'date_month');
const TICKET = field('support.ticket', 'Ticket', 'string');
const HOURS = field('delivery.hours_logged', 'Hours Logged', 'sum', '#,##0.0');
const BUDGET = field('delivery.hours_budgeted', 'Hours Budgeted', 'sum', '#,##0.0');
const REVENUE = field('finance.revenue_gbp', 'Revenue', 'sum', '£#,##0');
const DELIVERED = field('delivery.hours', 'Hours', 'sum', '#,##0');
const MARGIN = field('finance.margin_pct', 'Margin %', 'number', '0.0%');
const RESOLUTION = field('support.resolution_hours', 'Resolution Hours', 'number', '#,##0.0');

// Hours logged against hours budgeted: two measures of the same kind, which is
// what a dumbbell, a bullet bar and a grouped column all want.
const HOURS_VS_BUDGET = {
  fields: { dimension_like: [CLIENT], measure_like: [HOURS, BUDGET] },
  rows: [
    ['Northwind', 412.5, 380], ['Kestrel Group', 198, 240],
    ['Aldgate Retail', 605.3, 500], ['Pemberton', 88, 160],
    ['Saltmarsh Ltd', null, 120], ['Vantage Care', 331, 330]
  ].map(([name, a, b]) => ({
    'clients.name': cell(name, name),
    'delivery.hours_logged': a === null ? cell(null, '∅') : cell(a, a.toLocaleString()),
    'delivery.hours_budgeted': cell(b, b.toLocaleString())
  }))
};

// Revenue with a margin rate: one measure to size by, one to shade by.
const REVENUE_AND_MARGIN = {
  fields: { dimension_like: [CLIENT], measure_like: [REVENUE, MARGIN] },
  rows: [
    ['Northwind', 482300, 0.412], ['Kestrel Group', 311750, 0.287],
    ['Aldgate Retail', 268400, 0.331], ['Pemberton', 154900, 0.192],
    ['Vantage Care', 96250, null], ['Harbour Foods', 71400, 0.455],
    ['Two Rivers', 40120, 0.081], ['Brightwell', 22800, 0.503]
  ].map(([name, rev, margin]) => ({
    'clients.name': cell(name, name),
    'finance.revenue_gbp': cell(rev, '£' + Math.round(rev / 1000) + 'k'),
    'finance.margin_pct': margin === null
      ? cell(null, '∅') : cell(margin, (margin * 100).toFixed(1) + '%')
  }))
};

// Revenue and hours together: dividing one by the other gives a rate that means
// something, which is what the marimekko needs. Hours against budget would give
// it "budgeted per logged hour", which means nothing.
const REVENUE_AND_HOURS = {
  fields: { dimension_like: [CLIENT], measure_like: [REVENUE, DELIVERED] },
  rows: [
    ['Northwind', 524642, 4183], ['Kestrel Group', 476505, 2594],
    ['Aldgate Retail', 341100, 2060], ['Pemberton', 261926, 2161],
    ['Vantage Care', 254262, 1562], ['Harbour Foods', 161450, 882],
    ['Two Rivers', 82582, 428], ['Brightwell', 72540, 413]
  ].map(([name, rev, hrs]) => ({
    'clients.name': cell(name, name),
    'finance.revenue_gbp': cell(rev, '£' + rev.toLocaleString()),
    'delivery.hours': cell(hrs, hrs.toLocaleString())
  }))
};

// Twelve months by three clients: an ordered dimension plus a series.
const MONTHS = (() => {
  const series = {
    Northwind: [42, 45, 48, 52, 56, 54, 58, 63, 66, 71, 74, 78],
    'Kestrel Group': [31, 30, 33, 29, 34, 36, 35, 38, 37, 41, 40, 44],
    'Aldgate Retail': [18, 22, 19, 26, 24, 31, 29, 35, 33, 30, 36, 38]
  };
  const rows = [];
  for (let m = 0; m < 12; m++) {
    const label = String(m + 1).padStart(2, '0') + '/26';
    Object.keys(series).forEach((name) => {
      rows.push({
        'finance.month': cell('2026-' + String(m + 1).padStart(2, '0'), label),
        'clients.name': cell(name, name),
        'finance.revenue_gbp': cell(series[name][m] * 1000, '£' + series[name][m] + 'k')
      });
    });
  }
  return { fields: { dimension_like: [MONTH, CLIENT], measure_like: [REVENUE] }, rows };
})();

// One measure with a long tail, for a distribution.
const DURATIONS = (() => {
  const values = [2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 8, 9, 11, 12, 13, 14, 16, 18,
    19, 21, 23, 24, 27, 29, 31, 34, 38, 41, 44, 52, 58, 66, 74, 91, 118, 152, 214, 412];
  return {
    fields: { dimension_like: [TICKET], measure_like: [RESOLUTION] },
    rows: values.map((v, i) => ({
      'support.ticket': cell('T-' + (1000 + i), 'T-' + (1000 + i)),
      'support.resolution_hours': cell(v, v.toLocaleString())
    }))
  };
})();

// Descriptions say what the chart does with the data, in the chart's own terms.
export const CHARTS = [
  { id: 'treemap_dual', name: 'Treemap', data: REVENUE_AND_MARGIN,
    blurb: 'Every client as a box: bigger box, more revenue. Colour carries a ' +
      'second measure, so size and rate read at once, and both figures are ' +
      'printed inside the box.' },
  { id: 'marimekko', name: 'Marimekko', data: REVENUE_AND_HOURS,
    blurb: 'Column width is each client’s share of hours and height is revenue ' +
      'per hour, so a column’s area is its revenue. Wide and short means many ' +
      'hours at a low rate.' },
  { id: 'dumbbell', name: 'Dumbbell', data: HOURS_VS_BUDGET,
    blurb: 'Hours logged and hours budgeted on one row, joined by a line. The ' +
      'line length is the overrun, and the widest gap is labelled.' },
  { id: 'histogram', name: 'Histogram', data: DURATIONS,
    blurb: 'How one measure is spread: rows binned by value, with optional mean, ' +
      'median and percentile lines, and a choice of how to treat outliers.' },
  { id: 'line_series', name: 'Line', data: MONTHS,
    blurb: 'One line per client across twelve months. Hovering a month gives ' +
      'every series at once, rather than making you land on a 2px line.' },
  { id: 'stacked_area', name: 'Stacked Area', data: MONTHS,
    blurb: 'The same months stacked, so the total and the mix read together. ' +
      'Switches to share of total, where the axis runs 0 to 100%.' },
  { id: 'grouped_column', name: 'Grouped Column', data: HOURS_VS_BUDGET,
    blurb: 'A column per measure, grouped by client. Columns cap at 24px so a ' +
      'short query does not produce comically fat bars.' },
  { id: 'scatter_plot', name: 'Scatter', data: HOURS_VS_BUDGET,
    blurb: 'Two measures placing each client, one across and one up. Labels sit ' +
      'beside the dots and step aside when they would collide.' },
  { id: 'bullet_bar', name: 'Bullet Bar', data: HOURS_VS_BUDGET,
    blurb: 'A bar per client against a target marker, turning red past the ' +
      'target. The compact way to show actual against plan down a list.' }
];

export const chartById = (id) => CHARTS.find((c) => c.id === id);

// --- The stand-in for Looker ------------------------------------------------

let pending = null;

// Looker calls create() and updateAsync() with the visualisation as `this`, and
// provides these three on it. Without them a chart throws on its first line,
// where it clears stale errors.
const context = {
  clearErrors() { this._errors = []; },
  addError(err) {
    this._errors = this._errors || [];
    this._errors.push(err);
  },
  trigger() {}
};

window.looker = {
  plugins: {
    visualizations: {
      add(vis) {
        Object.keys(context).forEach((key) => {
          if (!(key in vis)) vis[key] = context[key];
        });
        pending = vis;
      }
    }
  }
};

window.LookerCharts = {
  Utils: {
    openDrillMenu() {},
    htmlForCell: (c) => (c && c.rendered != null ? String(c.rendered) : ''),
    textForCell: (c) => (c && c.rendered != null ? String(c.rendered) : ''),
    filterableValueForCell: (c) => (c ? c.value : null)
  }
};

const loaded = new Map();

// Each file registers into the same global, so loads are serialised.
let queue = Promise.resolve();

export function loadChart(id) {
  queue = queue.then(async () => {
    if (loaded.has(id)) return loaded.get(id);
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHART_SOURCE + id + '.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('could not load ' + id + '.js'));
      document.head.appendChild(script);
    });
    if (!pending) throw new Error(id + '.js registered no visualisation');
    loaded.set(id, pending);
    pending = null;
    return loaded.get(id);
  });
  return queue;
}

export function defaultConfig(vis) {
  const config = {};
  Object.keys(vis.options || {}).forEach((key) => {
    const option = vis.options[key];
    if ('default' in option) config[key] = option.default;
  });
  return config;
}

export async function renderInto(tile, chart, config) {
  tile.classList.remove('failed');
  tile.replaceChildren();

  const vis = await loadChart(chart.id);
  vis._errors = [];

  if (typeof vis.create === 'function') vis.create(tile, config || defaultConfig(vis));
  await new Promise((resolve) => {
    vis.updateAsync(chart.data.rows, tile, config || defaultConfig(vis),
      { fields: chart.data.fields }, { changed: {} }, resolve);
  });

  if (vis._errors && vis._errors.length) {
    tile.classList.add('failed');
    tile.replaceChildren();
    tile.textContent = vis._errors[0].title + ': ' + vis._errors[0].message;
  }
  return vis;
}

// The label a select shows for a stored value, so a default reads as the panel
// reads rather than as the value in the file.
export function displayValue(option, value) {
  let shown = Array.isArray(value) ? value[0] : value;
  if (option.values && typeof shown === 'string') {
    const match = option.values.find((v) => Object.values(v)[0] === shown);
    if (match) shown = Object.keys(match)[0];
  }
  if (shown === true) return 'on';
  if (shown === false) return 'off';
  if (shown === '' || shown === undefined || shown === null) return '—';
  return String(shown);
}

export function optionType(option) {
  if (option.values) return option.values.map((v) => Object.keys(v)[0]).join(' · ');
  if (option.display === 'color' || option.display === 'colors') return 'colour';
  return option.type === 'boolean' ? 'on / off' : option.type;
}

// The full control/type/default table, collapsed by default: it is worth having
// and too long to sit open.
export function optionsTable(vis) {
  const wrap = document.createElement('details');
  wrap.className = 'options-detail';

  const summary = document.createElement('summary');
  const count = Object.keys(vis.options || {}).length;
  summary.textContent = 'All ' + count + ' controls, with types and defaults';
  wrap.appendChild(summary);

  const table = document.createElement('table');
  table.className = 'options';
  table.innerHTML =
    '<thead><tr><th>Control</th><th>Type</th><th>Default</th></tr></thead>';
  const body = document.createElement('tbody');

  Object.keys(vis.options || {}).forEach((key) => {
    const option = vis.options[key];
    const row = document.createElement('tr');

    const label = document.createElement('td');
    label.textContent = option.label || key;
    const name = document.createElement('code');
    name.textContent = key;
    label.append(document.createElement('br'), name);

    const type = document.createElement('td');
    type.textContent = optionType(option);

    const value = document.createElement('td');
    value.textContent = displayValue(option, option.default);

    row.append(label, type, value);
    body.appendChild(row);
  });

  table.appendChild(body);
  wrap.appendChild(table);
  return wrap;
}
