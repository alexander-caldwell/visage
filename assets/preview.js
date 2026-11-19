// Shared machinery for the gallery: a thin stand-in for the globals Looker
// provides, the sample data, and helpers both pages use. Charts are loaded from
// this site's own directory, so the page always shows the files in this repo.

const CHART_SOURCE = './';

export const REGISTRATION_BASE =
  'https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/';

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
const ORDER = field('orders.order_id', 'Order', 'string');
const CHANNEL = field('orders.channel', 'Channel', 'string');
const ORDER_VALUE = field('orders.order_value_gbp', 'Order Value', 'sum', '£#,##0.00');

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

// One client's revenue by month: a date dimension and one measure, which is
// what a KPI tile needs for its sparkline and its previous-period change.
const REVENUE_BY_MONTH = {
  fields: { dimension_like: [MONTH], measure_like: [REVENUE] },
  rows: [42, 45, 48, 52, 56, 54, 58, 63, 66, 71, 74, 78].map((v, m) => ({
    'finance.month': cell('2026-' + String(m + 1).padStart(2, '0'),
      String(m + 1).padStart(2, '0') + '/26'),
    'finance.revenue_gbp': cell(v * 1000, '£' + (v * 1000).toLocaleString())
  }))
};

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

// Orders by channel: a right-skewed measure with enough rows in each group for
// a density to mean anything. None of the sets above have more than twelve.
const ORDERS = (() => {
  let seed = 20260920;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const channels = [
    { name: 'Paid Social', mu: 3.25, sigma: 0.42 },
    { name: 'Organic Search', mu: 3.85, sigma: 0.55 },
    // Two humps: ordinary orders, and the promotional bundles above them.
    { name: 'Email Marketing', mu: 3.90, sigma: 0.40, bundle: 0.3 },
    { name: 'Direct', mu: 4.40, sigma: 0.62 }
  ];
  const rows = [];
  let id = 100237;
  channels.forEach((c) => {
    for (let i = 0; i < 60; i++) {
      let v = c.bundle && rnd() < c.bundle
        ? Math.max(90, 168 + gauss() * 26)
        : Math.exp(c.mu + c.sigma * gauss());
      v = Math.round(Math.min(520, Math.max(6, v)) * 100) / 100;
      id += 1 + Math.floor(rnd() * 9);
      rows.push({
        'orders.order_id': cell('SO-' + id, 'SO-' + id),
        'orders.channel': cell(c.name, c.name),
        'orders.order_value_gbp': cell(v, '£' + v.toFixed(2))
      });
    }
  });
  return { fields: { dimension_like: [ORDER, CHANNEL], measure_like: [ORDER_VALUE] }, rows };
})();

// A funnel needs stages in process order.
const FUNNEL_STAGES = (() => {
  const stage = field('orders.stage', 'Stage', 'string');
  const count = field('orders.count', 'Orders', 'count', '#,##0');
  return {
    fields: { dimension_like: [stage], measure_like: [count] },
    rows: [
      ['Cart Created', 4800], ['Checkout Started', 3200],
      ['Payment Submitted', 2100], ['Order Placed', 1850]
    ].map(([name, value]) => ({
      [stage.name]: cell(name, name),
      [count.name]: cell(value, value.toLocaleString())
    }))
  };
})();

// A calendar heatmap needs daily values, with both weekly and seasonal variation.
const DAILY_ORDERS = (() => {
  const day = field('orders.date', 'Date', 'date_date');
  const count = field('orders.count', 'Orders', 'count', '#,##0');
  const rows = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.UTC(2026, 0, i + 1));
    const dayOfWeek = date.getUTCDay();
    const weekdayBoost = dayOfWeek >= 1 && dayOfWeek <= 5 ? 22 : 0;
    const season = 15 * Math.cos((i - 315) * 2 * Math.PI / 365);
    const value = Math.round(30 + weekdayBoost + season + (i * 37 % 23));
    const iso = date.toISOString().slice(0, 10);
    rows.push({
      [day.name]: cell(iso, iso),
      [count.name]: cell(value, value.toLocaleString())
    });
  }
  return { fields: { dimension_like: [day], measure_like: [count] }, rows };
})();

// Descriptions say what the chart does with the data, in the chart's own terms.
export const CHARTS = [
  { id: 'treemap_dual', family: 'part_to_whole', name: 'Treemap', data: REVENUE_AND_MARGIN,
    caption: 'See how a total divides into parts using sized rectangles.',
    blurb: 'Nested rectangles, each sized by a measure, so the area shows how ' +
      'a total divides across the values of a dimension. An optional ' +
      'second measure sets the colour, putting amount and rate in one ' +
      'picture.' },
  { id: 'marimekko', family: 'part_to_whole', name: 'Marimekko', data: REVENUE_AND_HOURS,
    caption: 'Show how two dimensions divide a total, or compare measures with variable-width columns.',
    blurb: 'Columns of variable width. Given two dimensions and a measure it ' +
      'draws a mosaic proper, where each cell\'s area is its share of the ' +
      'total. Given one dimension and two measures it draws a variwide: ' +
      'width from one measure, height from the other divided by it, so ' +
      'area is the second measure.' },
  { id: 'dumbbell', family: 'comparison', name: 'Dumbbell', data: HOURS_VS_BUDGET,
    caption: 'Compare two measures per row and see the gap between them.',
    blurb: 'Two measures per row on one shared scale, joined by a line. The ' +
      'line\'s length is the gap between them, which is the thing a pair ' +
      'of bars makes you calculate.' },
  { id: 'histogram', family: 'distribution', name: 'Histogram', data: DURATIONS,
    caption: 'Group values into bins to see the shape of a distribution.',
    blurb: 'The distribution of one measure: rows grouped into bins by value, ' +
      'with the bar height as a count, a share, or the sum of another ' +
      'measure. Optional mean, median and percentile lines.' },
  { id: 'violin', family: 'distribution', name: 'Violin', data: ORDERS,
    caption: 'Compare the shape and spread of a measure across groups.',
    blurb: 'The distribution of one measure as a smoothed density mirrored ' +
      'about its own centre line, one violin per value of a second ' +
      'dimension. Shows where the bulk of the rows sit, how far the tail ' +
      'runs, and whether a group has more than one cluster in it, none of ' +
      'which an average reports. Quartile box, median, mean and percentile ' +
      'lines optional, and every row can be drawn as a dot over the curve.' },
  { id: 'line_series', family: 'time', name: 'Line', data: MONTHS,
    caption: 'See trends over time as lines or filled areas.',
    blurb: 'A measure across an ordered dimension, one line per series. Built ' +
      'for trend and turning points, where the shape matters more than ' +
      'any single value. Fills to an area, stacks into bands, or runs to ' +
      '100%, and can smooth to a rolling average.' },
  { id: 'slope', family: 'time', name: 'Slope', data: MONTHS,
    caption: 'See what rose or fell between two periods on a shared scale.',
    blurb: 'Two values per category on a shared vertical scale, joined by ' +
      'a line to show the direction and size of change. Use two measures ' +
      'or one measure with a date dimension to compare the first and last ' +
      'periods.' },
  { id: 'grouped_column', family: 'comparison', name: 'Column', data: HOURS_VS_BUDGET,
    caption: 'Compare measures across categories using columns, bars or lollipops.',
    blurb: 'One group per value of a dimension, one column per measure, on a ' +
      'shared scale. Turns on its side for long category names, stacks ' +
      'to a total or to 100%, and draws as bars or as a lollipop.' },
  { id: 'scatter_plot', family: 'relationship', name: 'Scatter', data: HOURS_VS_BUDGET,
    caption: 'Plot two measures to see relationships and outliers.',
    blurb: 'One mark per row, placed by two measures, for whether they move ' +
      'together and which rows sit apart from the rest. A third measure ' +
      'can set the mark size, with a legend for the scale, and reference ' +
      'lines can split the plot into quadrants.' },
  { id: 'bullet_bar', family: 'comparison', name: 'Bullet Bar', data: HOURS_VS_BUDGET,
    caption: 'Compare each measure with a target marker.',
    blurb: 'A bar per row against a target marker, turning to the second ' +
      'colour past the target. The compact form of actual-against-plan ' +
      'down a list.' },
  { id: 'kpi_tile', family: 'single_value', name: 'KPI Tile', data: REVENUE_BY_MONTH,
    caption: 'Show a headline measure and how it changed.',
    blurb: 'One measure as a headline number, with its change against a ' +
      'second measure or the previous period, marked by whether the change ' +
      'is good. A date dimension adds a sparkline of the measure over time.' },
  { id: 'progress_bar', family: 'single_value', name: 'Progress Bar', data: HOURS_VS_BUDGET,
    caption: 'Show how far a measure has progressed towards a target.',
    blurb: 'A measure against a target, as a bar filling toward it, with the ' +
      'value and its share of the target stated. One bar for a single ' +
      'figure, or one per row down the tile, each measured against its own ' +
      'target. Past the target the bar fills and says so.' },
  { id: 'box_plot', family: 'distribution', name: 'Box Plot', data: ORDERS,
    caption: 'Summarise each group with quartiles, whiskers and outliers.',
    blurb: 'The distribution of one measure as a box per group: the middle ' +
      'half of the rows, the median, whiskers to the furthest row inside ' +
      '1.5 times the interquartile range, and each row beyond drawn on its ' +
      'own. A group too small for a box is drawn as its rows.' },
  { id: 'strip', family: 'distribution', name: 'Strip / Beeswarm', data: ORDERS,
    caption: 'Show individual values as a beeswarm or jittered dots.',
    blurb: 'One dot per row, positioned by a measure and optionally split ' +
      'into groups. Pack the dots into a beeswarm or spread them with ' +
      'jitter to see individual values, clusters and gaps.' },
  { id: 'pie', family: 'part_to_whole', name: 'Pie / Donut', data: REVENUE_AND_MARGIN,
    caption: 'Show each part’s share as a slice of a pie or donut.',
    blurb: 'One slice per value of a dimension, sized by its share of the ' +
      'measure total. Small slices can be grouped into Other. The donut ' +
      'option puts the total in the centre.' },
  { id: 'waffle', family: 'part_to_whole', name: 'Waffle', data: REVENUE_AND_MARGIN,
    caption: 'Show shares of a whole as a grid of 100 squares.',
    blurb: 'A grid of 100 squares showing the share of each value of a ' +
      'dimension. A query with two measures and no dimension can show ' +
      'one measure as a share of the other.' },
  { id: 'funnel', family: 'part_to_whole', name: 'Funnel', data: FUNNEL_STAGES,
    caption: 'Track volume and drop-off through ordered stages.',
    blurb: 'One centred bar per stage in query order. A measure gives each ' +
      'stage its width, with conversion and drop-off shown between ' +
      'consecutive stages.' },
  { id: 'table', family: 'grid', name: 'Table', data: REVENUE_AND_MARGIN,
    caption: 'Read exact values, with optional in-cell bars or colour scales.',
    blurb: 'One column per field, with values formatted by Looker. Measure ' +
      'columns can add colour scales or bars, and headers and dimensions ' +
      'stay visible as the rows and measures scroll.' },
  { id: 'heatmap', family: 'grid', name: 'Heatmap', data: MONTHS,
    caption: 'Find patterns across two dimensions with a colour-coded matrix.',
    blurb: 'Two dimensions form the rows and columns. A measure gives each ' +
      'cell its value and colour, so patterns and outliers are visible ' +
      'across the matrix.' },
  { id: 'calendar_heatmap', family: 'grid', name: 'Calendar Heatmap', data: DAILY_ORDERS,
    caption: 'See daily values and weekly patterns on a calendar.',
    blurb: 'One measure per day, laid out in weeks across and weekdays ' +
      'down. Each calendar year gets a band so weekly patterns and ' +
      'seasonal changes can be compared.' }
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
  trigger(event, options) {
    if (event === 'registerOptions') this.options = options;
  }
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
  const next = queue.then(async () => {
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
  queue = next.catch(() => {});
  return next;
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

// The chip on a card has less room than a chart page, so the shape is
// abbreviated there: "1 dim + 2 measures" rather than the full sentence.
export function shortShape(shape) {
  if (!shape) return '';
  return shape
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/dimensions/g, 'dims')
    .replace(/dimension/g, 'dim')
    .replace(/measures/g, 'meas')
    .replace(/measure/g, 'meas')
    .trim();
}

// Whether a control applies given the rest of the config. A chart declares this
// on the option itself, which is why a control can look inert: it is waiting on
// another setting.
export function appliesNow(option, config) {
  var rule = option.applies_when;
  if (!rule) return { active: true };
  var wanted = Array.isArray(rule.value) ? rule.value : [rule.value];
  return { active: wanted.indexOf(config[rule.option]) !== -1, reason: rule.reason };
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
