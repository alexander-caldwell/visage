// The gallery renders each chart exactly as Looker does: a thin stand-in for
// the globals Looker provides, then create() and updateAsync() with sample
// data. Options are read off the registered object, so this page cannot drift
// from what the charts actually offer.

const BASE = 'https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@1/';

const field = (name, label, type, format) => ({
  name, label, label_short: label, type, value_format: format || null
});

const CLIENT = field('clients.name', 'Client', 'string');
const MONTH = field('finance.month', 'Month', 'date_month');
const HOURS = field('delivery.hours_logged', 'Hours Logged', 'sum', '#,##0.0');
const BUDGET = field('delivery.hours_budgeted', 'Hours Budgeted', 'sum', '#,##0.0');
const REVENUE = field('finance.revenue_gbp', 'Revenue', 'sum', '£#,##0');
const MARGIN = field('finance.margin_pct', 'Margin %', 'number', '0.0%');
const RESOLUTION = field('support.resolution_hours', 'Resolution Hours', 'number', '#,##0.0');

const cell = (value, rendered) => ({ value, rendered, links: [] });

// One dimension, two measures: hours logged against budgeted.
const CLIENTS = {
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

// One dimension, two measures of different kinds: revenue and a margin rate.
const REVENUE_MARGIN = {
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

// Two dimensions, one measure: twelve months by three clients.
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

// One measure with a long tail, for the histogram.
const DURATIONS = (() => {
  const values = [2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 8, 9, 11, 12, 13, 14, 16, 18,
    19, 21, 23, 24, 27, 29, 31, 34, 38, 41, 44, 52, 58, 66, 74, 91, 118, 152, 214, 412];
  return {
    fields: { dimension_like: [field('support.ticket', 'Ticket', 'string')],
      measure_like: [RESOLUTION] },
    rows: values.map((v, i) => ({
      'support.ticket': cell('T-' + (1000 + i), 'T-' + (1000 + i)),
      'support.resolution_hours': cell(v, v.toLocaleString())
    }))
  };
})();

const CHARTS = [
  { id: 'treemap_dual', file: 'treemap_dual.js', data: REVENUE_MARGIN,
    blurb: 'Box area from one measure, colour from another, both figures printed in the box.' },
  { id: 'marimekko', file: 'marimekko.js', data: CLIENTS,
    blurb: 'Width carries one measure, height the other, so each column’s area is a third quantity.' },
  { id: 'dumbbell', file: 'dumbbell.js', data: CLIENTS,
    blurb: 'Two measures per row on one shared scale, joined by a connector showing the gap.' },
  { id: 'histogram', file: 'histogram.js', data: DURATIONS,
    blurb: 'Distribution of one measure, binned, with optional mean, median and percentile lines.' },
  { id: 'line_series', file: 'line_series.js', data: MONTHS,
    blurb: 'One line per series across an ordered dimension.' },
  { id: 'stacked_area', file: 'stacked_area.js', data: MONTHS,
    blurb: 'One band per series, stacked, in absolute values or share of total.' },
  { id: 'grouped_column', file: 'grouped_column.js', data: CLIENTS,
    blurb: 'One group per dimension value, one column per measure.' },
  { id: 'scatter_plot', file: 'scatter_plot.js', data: CLIENTS,
    blurb: 'One dot per row, two measures placing it, a third sizing it.' },
  { id: 'bullet_bar', file: 'bullet_bar.js', data: CLIENTS,
    blurb: 'Actual against target, one row per dimension value.' }
];

// --- The stand-in for Looker ------------------------------------------------

let pending = null;

// Looker calls create() and updateAsync() with the visualisation as `this`,
// and provides these three on it. Without them a chart throws on its first
// line, where it clears stale errors.
const context = {
  clearErrors() {},
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

function buildConfig(vis) {
  const config = {};
  Object.keys(vis.options || {}).forEach((key) => {
    if ('default' in vis.options[key]) config[key] = vis.options[key].default;
  });
  return config;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('could not load ' + src));
    document.head.appendChild(s);
  });
}

function optionsTable(vis) {
  const table = document.createElement('table');
  table.className = 'options';
  table.innerHTML = '<thead><tr><th>Control</th><th>Type</th><th>Default</th></tr></thead>';
  const body = document.createElement('tbody');

  Object.keys(vis.options || {}).forEach((key) => {
    const opt = vis.options[key];
    const row = document.createElement('tr');

    const label = document.createElement('td');
    label.textContent = opt.label || key;
    const name = document.createElement('code');
    name.textContent = key;
    label.appendChild(document.createElement('br'));
    label.appendChild(name);

    const type = document.createElement('td');
    if (opt.values) {
      type.textContent = opt.values
        .map((v) => Object.keys(v)[0])
        .join(' · ');
    } else if (opt.display === 'color' || opt.display === 'colors') {
      type.textContent = 'colour';
    } else {
      type.textContent = opt.type === 'boolean' ? 'on / off' : opt.type;
    }

    const dflt = document.createElement('td');
    let value = opt.default;
    if (Array.isArray(value)) value = value[0];
    if (opt.values && typeof value === 'string') {
      const match = opt.values.find((v) => Object.values(v)[0] === value);
      if (match) value = Object.keys(match)[0];
    }
    if (value === true) value = 'on';
    if (value === false) value = 'off';
    dflt.textContent = value === '' || value === undefined ? '—' : String(value);

    row.append(label, type, dflt);
    body.appendChild(row);
  });

  table.appendChild(body);
  return table;
}

async function renderChart(chart) {
  const section = document.getElementById(chart.id);
  const tile = section.querySelector('.tile');
  const panel = section.querySelector('.panel');

  try {
    await loadScript(BASE + chart.file);
    const vis = pending;
    pending = null;
    if (!vis) throw new Error('the file registered no visualisation');

    section.querySelector('.chart-name').textContent = vis.label || chart.id;
    section.querySelector('.build').textContent = 'id ' + vis.id;

    const config = buildConfig(vis);
    if (typeof vis.create === 'function') vis.create(tile, config);
    await new Promise((resolve) => {
      vis.updateAsync(chart.data.rows, tile, config,
        { fields: chart.data.fields }, { changed: {} }, resolve);
    });

    if (vis._errors && vis._errors.length) {
      tile.classList.add('failed');
      tile.textContent = vis._errors[0].title + ': ' + vis._errors[0].message;
    }

    panel.appendChild(optionsTable(vis));
    const count = Object.keys(vis.options || {}).length;
    section.querySelector('.count').textContent =
      count + (count === 1 ? ' control' : ' controls');
  } catch (err) {
    tile.classList.add('failed');
    tile.textContent = 'Could not render: ' + err.message;
  }
}

async function start() {
  // Sequential: each file registers into the same global, so they cannot
  // overlap.
  for (const chart of CHARTS) await renderChart(chart);

  // Re-render on resize so the charts re-measure their tiles, and on a theme
  // change so they pick up the new surface.
  let timer = null;
  const rerender = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll('.panel .options').forEach((t) => t.remove());
      CHARTS.forEach((c) => { document.getElementById(c.id).querySelector('.tile').innerHTML = ''; });
      start();
    }, 250);
  };
  window.addEventListener('resize', rerender);
  document.getElementById('theme').addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    document.getElementById('theme').textContent =
      next === 'dark' ? 'Light dashboard' : 'Dark dashboard';
    rerender();
  });
}

start();
