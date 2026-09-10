// Histogram: buckets one measure across the rows of the query and draws how
// many rows fall in each bucket.
// Query shape: 1 dimension (the thing each row is, used for hover and drill),
// 1 or more measures (the first is binned unless another is chosen).
// Pure SVG, no dependencies to declare in the manifest.
//
// Looker's built-in charts cannot do this: they draw one bar per row, so a
// distribution has to be pre-bucketed in SQL. This chart does the bucketing in
// the tile, so the bin width is a visualisation option rather than a model
// change.
//
// Follows every house rule: the container is rebuilt each render, a zero-sized
// tile is drawn anyway, no innerHTML, errors surface through addError, labels
// shrink and thin out and are never clipped, every column answers on hover and
// on keyboard focus, and the theme follows the tile.
//
// Build v1.2.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('histogram build v1.2.0');

looker.plugins.visualizations.add({
  id: 'histogram',
  label: 'Histogram',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 measure (a dimension is optional)',
  good_for: [
    'The shape of one measure: where values cluster and how long the tail is',
    'Deciding a threshold, such as an SLA, from real spread rather than an average',
    'Showing that a mean hides a skew',
  ],

  options: {
    value_measure: {
      type: 'string',
      label: 'Measure to Bin',
      display: 'select',
      values: [{ 'First Measure': '' }],
      default: '',
      section: 'Data',
      order: 0
    },
    height_by: {
      type: 'string',
      label: 'Bar Height',
      display: 'select',
      values: [
        { 'Number of Rows': 'count' },
        { 'Share of Rows (%)': 'share' },
        { 'Sum of a Measure': 'sum' }
      ],
      default: 'count',
      section: 'Data',
      order: 1
    },
    sum_measure: {
      type: 'string',
      label: 'Measure to Sum (Bar Height "Sum of a Measure")',
      applies_when: { option: 'height_by', value: 'sum', reason: 'Bar Height is "Sum of a Measure"' },
      display: 'select',
      values: [{ 'Last Measure': '' }],
      default: '',
      section: 'Data',
      order: 2
    },
    outliers: {
      type: 'string',
      label: 'Extreme Values',
      display: 'select',
      values: [
        { 'Keep All': 'include' },
        { 'Pull Into Range (1st-99th Percentile)': 'clip' },
        { 'Leave Out (Beyond 1.5 x IQR)': 'exclude' }
      ],
      default: 'include',
      section: 'Data',
      order: 3
    },

    bin_mode: {
      type: 'string',
      label: 'Bin Width',
      display: 'select',
      values: [
        { 'Automatic': 'auto' },
        { 'Fixed Number of Bins': 'count' },
        { 'Fixed Bin Width': 'width' }
      ],
      default: 'auto',
      section: 'Bins',
      order: 0
    },
    bin_count: {
      type: 'number',
      label: 'Number of Bins (Mode "Fixed Number of Bins")',
      applies_when: { option: 'bin_mode', value: 'count', reason: 'Bin Width is "Fixed Number of Bins"' },
      default: 10,
      section: 'Bins',
      order: 1
    },
    bin_width: {
      type: 'number',
      label: 'Bin Width (Mode "Fixed Bin Width", 0 = Automatic)',
      applies_when: { option: 'bin_mode', value: 'width', reason: 'Bin Width is "Fixed Bin Width"' },
      default: 0,
      section: 'Bins',
      order: 2
    },
    bin_start: {
      type: 'string',
      label: 'First Bin Starts at (Blank = Lowest Value)',
      default: '',
      section: 'Bins',
      order: 3
    },

    theme: {
      type: 'string',
      label: 'Theme',
      display: 'select',
      values: [{ 'Match Looker': 'auto' }, { 'Light': 'light' }, { 'Dark': 'dark' }],
      default: 'auto',
      section: 'Style',
      order: 0
    },
    bar_colour: {
      type: 'array',
      label: 'Bar Colour',
      display: 'color',
      default: ['#3b6ea5'],
      section: 'Style',
      order: 1
    },
    shade_bars: {
      type: 'string',
      label: 'Bar Shading',
      display: 'select',
      values: [{ 'One Colour': 'flat' }, { 'Darker With Height': 'by_height' }],
      default: 'flat',
      section: 'Style',
      order: 2
    },
    show_values: {
      type: 'boolean',
      label: 'Show Value on Each Bar',
      default: true,
      section: 'Style',
      order: 3
    },
    show_axis: {
      type: 'boolean',
      label: 'Show Axes',
      default: true,
      section: 'Style',
      order: 4
    },
    show_axis_titles: {
      type: 'boolean',
      label: 'Show Axis Titles',
      default: true,
      section: 'Style',
      order: 20
    },
    x_axis_label: {
      type: 'string',
      label: 'X Axis Title',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 21
    },
    y_axis_label: {
      type: 'string',
      label: 'Y Axis Title',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 22
    },
    show_caption: {
      type: 'boolean',
      label: 'Show Caption',
      default: true,
      section: 'Style',
      order: 5
    },

    show_mean: {
      type: 'boolean',
      label: 'Mean Line',
      default: false,
      section: 'Statistics',
      order: 0
    },
    show_median: {
      type: 'boolean',
      label: 'Median Line',
      default: false,
      section: 'Statistics',
      order: 1
    },
    percentile: {
      type: 'number',
      label: 'Percentile Line (0 = Off)',
      default: 0,
      section: 'Statistics',
      order: 2
    }
  },

  // The measure pickers can only be filled once the query is known, so the
  // option panel is rebuilt whenever the fields change. Everything else is
  // copied from the static block above so nothing is lost in the rebuild.
  _registerMeasureOptions: function (meas) {
    var signature = meas.map(function (f) { return f.name; }).join('|');
    if (this._optionSignature === signature) return;
    this._optionSignature = signature;

    var rebuilt = {};
    var statics = this.options;
    Object.keys(statics).forEach(function (key) {
      var copy = {};
      Object.keys(statics[key]).forEach(function (prop) { copy[prop] = statics[key][prop]; });
      rebuilt[key] = copy;
    });

    var asValues = meas.map(function (field) {
      var entry = {};
      entry[field.label_short || field.label || field.name] = field.name;
      return entry;
    });
    rebuilt.value_measure.values = [{ 'First measure': '' }].concat(asValues);
    rebuilt.sum_measure.values = [{ 'Last measure': '' }].concat(asValues);

    this.trigger('registerOptions', rebuilt);
  },

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped, so the container is looked up and rebuilt on every render,
  // never cached. Built with createElement because an instance with a Trusted
  // Types policy rejects an innerHTML assignment by throwing.
  _ensureRoot: function (element) {
    var root = element.querySelector('.histogram-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.histogram-root {' +
      '  --hg-surface: #fcfcfb;' +
      '  --hg-ink: #0b0b0b;' +
      '  --hg-ink-2: #52514e;' +
      '  --hg-muted: #898781;' +
      '  --hg-grid: #e7e8ea;' +
      '  --hg-axis: #c8c9cc;' +
      '  --hg-marker: #2f3437;' +
      '  --hg-hairline: rgba(11,11,11,0.10);' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--hg-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.histogram-root.hg-dark { --hg-surface: #1a1a19; --hg-ink: #ffffff;' +
      '  --hg-ink-2: #c3c2b7; --hg-muted: #898781; --hg-grid: #2c2c2a;' +
      '  --hg-axis: #3d3d3a; --hg-marker: #e8e7e1;' +
      '  --hg-hairline: rgba(255,255,255,0.10); }' +
      '.histogram-root text { font-size: 12px; fill: var(--hg-ink); }' +
      '.histogram-root .hg-axis-title { font-size: 11px; fill: var(--hg-muted); }' +
      '.histogram-root .hg-tick { fill: var(--hg-ink-2);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.histogram-root .hg-value { fill: var(--hg-ink-2);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.histogram-root .hg-caption { fill: var(--hg-muted); }' +
      '.histogram-root .hg-grid { stroke: var(--hg-grid); stroke-width: 1; }' +
      '.histogram-root .hg-axis-line { stroke: var(--hg-axis); stroke-width: 1; }' +
      '.histogram-root .hg-col { cursor: pointer; }' +
      '.histogram-root .hg-hit { fill: transparent; }' +
      '.histogram-root .hg-band { fill: var(--hg-ink); opacity: 0;' +
      '  transition: opacity 90ms ease-out; }' +
      '.histogram-root .hg-col:hover .hg-band,' +
      '.histogram-root .hg-col:focus-visible .hg-band { opacity: 0.06; }' +
      '.histogram-root .hg-col:focus { outline: none; }' +
      '.histogram-root .hg-stat { stroke: var(--hg-marker); stroke-width: 1.5;' +
      '  fill: none; }' +
      '.histogram-root .hg-stat-label { fill: var(--hg-ink-2); }' +
      '.histogram-root .hg-empty { fill: var(--hg-muted); font-style: italic;' +
      '  font-size: 11px; }' +
      '.hg-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--hg-surface); color: var(--hg-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--hg-hairline); }' +
      '.hg-tip[data-shown="1"] { opacity: 1; }' +
      '.hg-tip-name { font-weight: 600; margin-bottom: 3px; }' +
      '.hg-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--hg-ink-2); }' +
      '.hg-tip-row b { font-weight: 600; color: var(--hg-ink);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.hg-tip-members { color: var(--hg-muted); margin-top: 3px; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'histogram-root';
    element.appendChild(root);
    return root;
  },

  // The tile should match the dashboard it sits in, not the viewer's operating
  // system. Looker's own theme is not exposed to a visualisation, so read the
  // background colour of the first ancestor that paints one, and fall back to
  // the OS preference only when nothing does.
  _hostIsDark: function (element) {
    var node = element;
    while (node && node !== document.documentElement) {
      var colour = window.getComputedStyle(node).backgroundColor;
      var parts = /rgba?\(([^)]+)\)/.exec(colour);
      if (parts) {
        var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
        var alpha = channels.length > 3 ? channels[3] : 1;
        if (alpha > 0.1) {
          var brightness = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
          return brightness < 0.5;
        }
      }
      node = node.parentElement;
    }
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  _applyTheme: function (element, root, config) {
    var dark;
    if (config.theme === 'dark') dark = true;
    else if (config.theme === 'light') dark = false;
    else dark = this._hostIsDark(element);

    if (dark) root.classList.add('hg-dark');
    else root.classList.remove('hg-dark');
    return dark;
  },

  create: function (element, config) {
    var root = this._ensureRoot(element);
    this._applyTheme(element, root, config || {});
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();
    config = config || {};

    var dims = (queryResponse && queryResponse.fields && queryResponse.fields.dimension_like) || [];
    var meas = (queryResponse && queryResponse.fields && queryResponse.fields.measure_like) || [];

    if (dims.length < 1 || meas.length < 1) {
      this.addError({
        title: 'Wrong query shape',
        message: 'Histogram needs one dimension and at least one measure. The measure is split into bins and the rows in each bin are counted.'
      });
      done();
      return;
    }

    this._registerMeasureOptions(meas);

    var dimField = dims[0];

    function fieldByName(name, fallback) {
      for (var i = 0; i < meas.length; i++) {
        if (meas[i].name === name) return meas[i];
      }
      return fallback;
    }

    var valueField = fieldByName(config.value_measure, meas[0]);
    var sumField = fieldByName(config.sum_measure, meas[meas.length - 1]);
    var heightBy = config.height_by === 'share' || config.height_by === 'sum'
      ? config.height_by : 'count';
    if (heightBy === 'sum' && !sumField) heightBy = 'count';

    // Looker can call updateAsync before the tile has been laid out, when the
    // element measures zero. Bailing out then leaves a blank panel with no
    // error, so measure every way available, walk up to an ancestor that has a
    // size, and retry across a few frames before falling back to a default.
    function measure(node) {
      var box = node.getBoundingClientRect();
      var w = Math.floor(box.width) || node.clientWidth || node.offsetWidth || 0;
      var h = Math.floor(box.height) || node.clientHeight || node.offsetHeight || 0;

      var parent = node.parentElement;
      while (parent && (!w || !h)) {
        var pbox = parent.getBoundingClientRect();
        if (!w) w = Math.floor(pbox.width) || parent.clientWidth || parent.offsetWidth || 0;
        if (!h) h = Math.floor(pbox.height) || parent.clientHeight || parent.offsetHeight || 0;
        parent = parent.parentElement;
      }
      return { width: w, height: h };
    }

    var vis = this;
    var root = this._ensureRoot(element);
    var isDark = this._applyTheme(element, root, config);
    var attempts = 0;

    function attempt() {
      var size = measure(element);
      if ((!size.width || !size.height) && attempts < 12) {
        attempts++;
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(attempt);
        } else {
          window.setTimeout(attempt, 16);
        }
        return;
      }
      try {
        render(size.width || 600, size.height || 400);
      } catch (err) {
        // Without this the tile goes blank with nothing to read.
        vis.addError({
          title: 'Histogram failed to render',
          message: (err && err.message) || String(err)
        });
      }
      done();
    }

    function render(width, height) {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.style.height = height + 'px';

    var svgNS = 'http://www.w3.org/2000/svg';

    function el(name, attrs) {
      var node = document.createElementNS(svgNS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    function cellNumber(cell) {
      return cell && cell.value != null && isFinite(cell.value) ? Number(cell.value) : null;
    }

    function cellText(cell) {
      if (!cell) return '';
      if (cell.rendered != null) return String(cell.rendered);
      return cell.value != null ? String(cell.value) : '';
    }

    var scratch = document.createElement('canvas').getContext('2d');
    var FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    // Text is sized with an inline style, never the font-size attribute: the
    // stylesheet rule on .histogram-root text overrides the attribute, so the
    // shrink steps below would measure at one size and draw at another.

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    // Shrink through the sizes, then cut with an ellipsis. Nothing is clipped:
    // a label that cannot be read at the smallest size is dropped and lives on
    // in the tooltip instead.
    function fitText(text, room, sizes) {
      var list = sizes || [12, 11, 10, 9];
      for (var i = 0; i < list.length; i++) {
        if (textWidth(text, fontOf(list[i])) <= room) {
          return { text: text, size: list[i] };
        }
      }
      var smallest = list[list.length - 1];
      var font = fontOf(smallest);
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '…', font) > room) cut = cut.slice(0, -1);
      if (cut.length < 3) return null;
      return { text: cut + '…', size: smallest };
    }

    function compact(value) {
      var abs = Math.abs(value);
      if (abs >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
      if (abs >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
      if (abs >= 1e4) return Math.round(value / 1e3) + 'k';
      if (abs >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
      if (abs >= 10) return String(Math.round(value));
      if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
      if (abs === 0) return '0';
      // Small numbers must not all round to "0": keep two significant digits.
      return Number(value.toPrecision(2)).toString();
    }

    // --- Colour ------------------------------------------------------------
    // Shading follows the bar's own height, never its position on the axis, so
    // filtering a row out never repaints the bars that remain.
    function toRgb(hex) {
      var clean = String(hex || '').replace('#', '');
      if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [59, 110, 165];
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16)
      ];
    }

    function mix(a, b, t) {
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t)
      ];
    }

    function toHex(rgb) {
      return '#' + rgb.map(function (v) {
        var s = Math.max(0, Math.min(255, v)).toString(16);
        return s.length === 1 ? '0' + s : s;
      }).join('');
    }

    function luminance(rgb) {
      var channels = rgb.map(function (v) {
        var c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    // Text sitting inside a filled bar takes ink or white by measured contrast,
    // never by guessing from the theme.
    function inkOn(rgb) {
      var l = luminance(rgb);
      var withWhite = 1.05 / (l + 0.05);
      var withInk = (l + 0.05) / 0.09;
      return withWhite >= withInk ? '#ffffff' : '#0b0b0b';
    }

    var baseRgb = toRgb((config.bar_colour && config.bar_colour[0]) || '#3b6ea5');
    // Dark tiles get their own steps. The darkest end of a light scale
    // disappears against a dark surface, so the ramp is built from the surface
    // outwards in each theme rather than flipped.
    var rampFrom = isDark ? mix(baseRgb, [26, 26, 25], 0.55) : mix(baseRgb, [255, 255, 255], 0.72);
    var rampTo = isDark ? mix(baseRgb, [255, 255, 255], 0.22) : baseRgb;

    function barRgb(share) {
      if (config.shade_bars !== 'by_height') return isDark ? rampTo : baseRgb;
      var t = Math.max(0, Math.min(1, share));
      return mix(rampFrom, rampTo, 0.25 + 0.75 * t);
    }

    function emptyMessage(text) {
      var svg = el('svg', { width: width, height: height });
      var laid = fitText(text, Math.max(20, width - 16), [11, 10, 9]);
      var msg = el('text', {
        class: 'hg-empty', x: width / 2, y: Math.round(height / 2), 'text-anchor': 'middle'
      });
      msg.style.fontSize = (laid ? laid.size : 9) + 'px';
      msg.textContent = laid ? laid.text : '…';
      svg.appendChild(msg);
      root.appendChild(svg);
    }

    if (!data.length) {
      emptyMessage('No results');
      return;
    }

    // --- The values --------------------------------------------------------
    var points = [];
    data.forEach(function (row) {
      var value = cellNumber(row[valueField.name]);
      if (value === null) return;
      points.push({
        value: value,
        name: cellText(row[dimField.name]),
        weight: heightBy === 'sum' ? (cellNumber(row[sumField.name]) || 0) : 0,
        links: (row[dimField.name] && row[dimField.name].links) || []
      });
    });

    if (!points.length) {
      emptyMessage('No numeric values in ' + (valueField.label_short || valueField.label));
      return;
    }

    var sorted = points.map(function (p) { return p.value; }).sort(function (a, b) { return a - b; });

    function quantile(q) {
      if (sorted.length === 1) return sorted[0];
      var pos = (sorted.length - 1) * q;
      var lower = Math.floor(pos);
      var upper = Math.min(sorted.length - 1, lower + 1);
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    }

    var q1 = quantile(0.25);
    var q3 = quantile(0.75);
    var iqr = q3 - q1;
    var droppedOutliers = 0;
    var clippedOutliers = 0;

    if (config.outliers === 'exclude' && iqr > 0) {
      var low = q1 - 1.5 * iqr;
      var high = q3 + 1.5 * iqr;
      var kept = points.filter(function (p) { return p.value >= low && p.value <= high; });
      droppedOutliers = points.length - kept.length;
      if (kept.length) points = kept;
      else droppedOutliers = 0;
    } else if (config.outliers === 'clip') {
      var p1 = quantile(0.01);
      var p99 = quantile(0.99);
      points.forEach(function (p) {
        if (p.value < p1) { p.value = p1; clippedOutliers++; }
        else if (p.value > p99) { p.value = p99; clippedOutliers++; }
      });
    }

    var values = points.map(function (p) { return p.value; });
    var minValue = Math.min.apply(null, values);
    var maxValue = Math.max.apply(null, values);
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;

    var reSorted = values.slice().sort(function (a, b) { return a - b; });
    function quantileOf(list, q) {
      if (list.length === 1) return list[0];
      var pos = (list.length - 1) * q;
      var lower = Math.floor(pos);
      var upper = Math.min(list.length - 1, lower + 1);
      return list[lower] + (list[upper] - list[lower]) * (pos - lower);
    }
    var median = quantileOf(reSorted, 0.5);

    // --- The bins ----------------------------------------------------------
    var MAX_BINS = 60;
    var start = minValue;
    var startOption = String(config.bin_start === undefined || config.bin_start === null ? '' : config.bin_start).trim();
    if (startOption !== '' && isFinite(Number(startOption))) {
      start = Math.min(Number(startOption), minValue);
    }

    var span = maxValue - start;
    if (!(span > 0)) span = Math.max(1, Math.abs(maxValue) * 0.1);

    var binCount;
    var binWidth;

    if (config.bin_mode === 'count') {
      binCount = Math.max(1, Math.min(MAX_BINS, Math.round(Number(config.bin_count) || 10)));
      binWidth = span / binCount;
    } else if (config.bin_mode === 'width' && Number(config.bin_width) > 0) {
      binWidth = Number(config.bin_width);
      binCount = Math.ceil(span / binWidth);
      if (binCount > MAX_BINS) {
        binCount = MAX_BINS;
        binWidth = span / binCount;
      }
      binCount = Math.max(1, binCount);
    } else {
      // Freedman-Diaconis where there is spread to work with, Sturges when the
      // middle half of the values are identical.
      var freedman = values.length > 1 && iqr > 0
        ? 2 * iqr / Math.pow(values.length, 1 / 3)
        : 0;
      if (freedman > 0) {
        binCount = Math.ceil(span / freedman);
      } else {
        binCount = Math.ceil(Math.log(values.length) / Math.LN2) + 1;
      }
      // The bin width stays as Freedman-Diaconis computed it, even when one
      // far value means most bins are empty: widening the bins to fill the gap
      // hides the shape of the bulk of the data, and the empty span is itself
      // worth seeing. The "Extreme values" option is how a reader closes it.
      binCount = Math.max(1, Math.min(MAX_BINS, binCount));
      binWidth = span / binCount;
    }

    var bins = [];
    for (var b = 0; b < binCount; b++) {
      bins.push({
        from: start + b * binWidth,
        to: start + (b + 1) * binWidth,
        rows: [],
        count: 0,
        sum: 0
      });
    }

    points.forEach(function (p) {
      var index = Math.floor((p.value - start) / binWidth);
      if (index < 0) index = 0;
      if (index > binCount - 1) index = binCount - 1;
      var bin = bins[index];
      bin.count++;
      bin.sum += p.weight;
      if (bin.rows.length < 40) bin.rows.push(p);
    });

    var totalRows = points.length;

    bins.forEach(function (bin) {
      if (heightBy === 'share') bin.height = totalRows ? (bin.count / totalRows) * 100 : 0;
      else if (heightBy === 'sum') bin.height = bin.sum;
      else bin.height = bin.count;
    });

    var peak = bins.reduce(function (m, bin) { return Math.max(m, bin.height); }, 0) || 1;

    function heightLabel(bin) {
      if (heightBy === 'share') {
        var pct = bin.height;
        return (pct >= 10 ? Math.round(pct) : Number(pct.toFixed(1))) + '%';
      }
      if (heightBy === 'sum') return compact(bin.height);
      return String(bin.count);
    }

    function rangeLabel(bin) {
      return compact(bin.from) + '–' + compact(bin.to);
    }

    // --- Axis scale --------------------------------------------------------
    function niceStep(rough) {
      if (!(rough > 0)) return 1;
      var power = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
      var candidates = [1, 2, 2.5, 5, 10];
      for (var i = 0; i < candidates.length; i++) {
        if (power * candidates[i] >= rough) return power * candidates[i];
      }
      return power * 10;
    }

    var showAxis = config.show_axis !== false && width >= 108 && height >= 100;

    // An empty option means "use the field's own name", so the chart is
    // labelled without the user doing anything, and can be overridden or
    // switched off.
    function axisTitle(option, auto) {
      if (config.show_axis_titles === false) return '';
      var given = (config[option] || '').trim();
      return given || auto || '';
    }

    var xTitle = showAxis ? axisTitle('x_axis_label', valueField.label_short) : '';
    var yTitle = showAxis ? axisTitle('y_axis_label',
      heightBy === 'count' ? 'Rows'
        : heightBy === 'share' ? 'Share of Rows'
        : (sumField ? sumField.label_short : 'Value')) : '';

    var xTitleBand = xTitle ? 16 : 0;
    var yTitleBand = yTitle ? 15 : 0;
    var tickTarget = height < 200 ? 3 : 4;
    var yStep = niceStep(peak / tickTarget);
    if (heightBy === 'count' && yStep < 1) yStep = 1;
    var yMax = Math.max(yStep, Math.ceil(peak / yStep) * yStep);

    var yTicks = [];
    for (var t = 0; t <= yMax + 1e-9; t += yStep) yTicks.push(t);
    if (yTicks.length > 8) yTicks = yTicks.filter(function (v, i) { return i % 2 === 0; });

    function yTickLabel(value) {
      if (heightBy === 'share') return compact(value) + '%';
      return compact(value);
    }

    var tickFont = fontOf(11);
    var leftPad = 6 + yTitleBand;
    if (showAxis) {
      var widest = yTicks.reduce(function (m, v) {
        return Math.max(m, textWidth(yTickLabel(v), tickFont));
      }, 0);
      leftPad = Math.min(Math.ceil(widest) + 10 + yTitleBand, Math.floor(width * 0.34));
    }

    // --- Vertical space ----------------------------------------------------
    var statLines = [];
    if (config.show_mean) statLines.push({ label: 'Mean', value: mean, dash: '5 3' });
    if (config.show_median) statLines.push({ label: 'Median', value: median, dash: '' });
    var pct = Number(config.percentile);
    if (pct > 0 && pct < 100) {
      statLines.push({
        label: 'p' + (Math.round(pct * 10) / 10),
        value: quantileOf(reSorted, pct / 100),
        dash: '1 3'
      });
    }

    var showCaption = config.show_caption !== false && height >= 130;

    var captionSpace = showCaption ? 16 : 0;
    var topPad = 8;
    if (config.show_values !== false) topPad += 12;
    // Two stat labels close together go on two rows rather than one being
    // dropped: a line whose name is missing cannot be told from its neighbour.
    var statRows = statLines.length > 1 ? 2 : statLines.length;
    topPad += statRows * 12;
    topPad = Math.min(topPad, Math.floor(height * 0.3));

    var rightPad = 8;
    var plotLeft = leftPad;
    var plotWidth = Math.max(20, width - plotLeft - rightPad);

    // Bin edge labels: flat where three or more fit without touching, on their
    // side where the tile is too narrow for that but tall enough to hang them,
    // and otherwise given up to the tooltip and the caption.
    var edgeLabels = [];
    for (var e = 0; e <= binCount; e++) edgeLabels.push(compact(start + e * binWidth));

    var edgeFont = fontOf(11);
    var widestEdge = edgeLabels.reduce(function (m, text) {
      return Math.max(m, textWidth(text, edgeFont));
    }, 0);

    function planFlatEdges(available) {
      var slot = available / binCount;
      var plan = [];
      var lastIndex = binCount;
      var lastWidth = textWidth(edgeLabels[lastIndex], edgeFont);
      var lastLeft = plotLeft + available - lastWidth;
      if (lastLeft >= 2 && plotLeft + available <= width - 2) {
        plan.push({ index: lastIndex, x: plotLeft + available, anchor: 'end' });
      }
      var limit = plan.length ? lastLeft - 6 : plotLeft + available;

      var cursor = -Infinity;
      for (var i = 0; i < binCount; i++) {
        var x = plotLeft + i * slot;
        var w = textWidth(edgeLabels[i], edgeFont);
        var anchor = i === 0 ? 'start' : 'middle';
        var left = anchor === 'start' ? x : x - w / 2;
        var right = anchor === 'start' ? x + w : x + w / 2;
        if (left < 2 || right > limit) continue;
        if (left < cursor + 8) continue;
        plan.push({ index: i, x: x, anchor: anchor });
        cursor = right;
      }
      return plan;
    }

    var edgeMode = 'none';
    var edgePlan = [];
    if (showAxis) {
      edgePlan = planFlatEdges(plotWidth);
      if (edgePlan.length >= 3) {
        edgeMode = 'flat';
      } else if (widestEdge + 12 <= height * 0.4) {
        edgeMode = 'side';
      } else if (edgePlan.length) {
        edgeMode = 'flat';
      }
    }

    var bottomPad = 6 + xTitleBand;
    if (edgeMode === 'flat') bottomPad = 20 + xTitleBand;
    else if (edgeMode === 'side') bottomPad = Math.ceil(widestEdge) + 12 + xTitleBand;

    var axisY = height - captionSpace - bottomPad;
    var plotTop = topPad;
    var plotHeight = axisY - plotTop;

    if (plotHeight < 24) {
      // Too little room for an axis: give the space back to the bars.
      edgeMode = 'none';
      bottomPad = 6;
      axisY = height - captionSpace - bottomPad;
      plotHeight = axisY - plotTop;
    }
    if (plotHeight < 10) {
      plotTop = 2;
      axisY = height - 2;
      plotHeight = axisY - plotTop;
      captionSpace = 0;
      showCaption = false;
    }

    var svg = el('svg', { width: width, height: height });

    // --- Tooltip -----------------------------------------------------------
    // One element, refilled per column, so every bar answers for itself however
    // narrow it is and whatever its label had to give up.
    var tip = document.createElement('div');
    tip.className = 'hg-tip';
    var tipName = document.createElement('div');
    tipName.className = 'hg-tip-name';
    tip.appendChild(tipName);
    var tipRows = document.createElement('div');
    tip.appendChild(tipRows);
    var tipMembers = document.createElement('div');
    tipMembers.className = 'hg-tip-members';
    tip.appendChild(tipMembers);

    function tipLine(key, value) {
      var row = document.createElement('div');
      row.className = 'hg-tip-row';
      var k = document.createElement('span');
      k.textContent = key;
      var v = document.createElement('b');
      v.textContent = value;
      row.appendChild(k);
      row.appendChild(v);
      tipRows.appendChild(row);
    }

    function showTip(bin, clientX, clientY) {
      tipName.textContent = rangeLabel(bin);
      while (tipRows.firstChild) tipRows.removeChild(tipRows.firstChild);

      tipLine('Rows', String(bin.count));
      tipLine('Share', (totalRows ? (bin.count / totalRows) * 100 : 0).toFixed(1) + '%');
      if (heightBy === 'sum') {
        tipLine(sumField.label_short || sumField.label, compact(bin.sum));
      }

      var names = bin.rows.slice(0, 3).map(function (p) { return p.name; })
        .filter(function (n) { return n; });
      var extra = bin.count - names.length;
      tipMembers.textContent = names.length
        ? names.join(', ') + (extra > 0 ? ' and ' + extra + ' more' : '')
        : '';

      tip.setAttribute('data-shown', '1');

      var host = root.getBoundingClientRect();
      var tw = tip.offsetWidth;
      var th = tip.offsetHeight;
      var px = clientX - host.left + 14;
      var py = clientY - host.top + 14;
      if (px + tw > width - 4) px = Math.max(4, clientX - host.left - tw - 14);
      if (py + th > height - 4) py = Math.max(4, clientY - host.top - th - 14);
      tip.style.left = Math.round(px) + 'px';
      tip.style.top = Math.round(py) + 'px';
    }

    function hideTip() {
      tip.removeAttribute('data-shown');
    }

    // --- Axes --------------------------------------------------------------
    if (showAxis) {
      yTicks.forEach(function (value) {
        var y = Math.round(axisY - (value / yMax) * plotHeight) - 0.5;
        if (y < plotTop - 1) return;
        svg.appendChild(el('line', {
          class: 'hg-grid', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
        }));
        var laid = fitText(yTickLabel(value), leftPad - 8, [11, 10, 9]);
        if (laid) {
          var label = el('text', {
            class: 'hg-tick', x: plotLeft - 6, y: y + 4, 'text-anchor': 'end'
          });
          label.style.fontSize = (laid.size) + 'px';
          label.textContent = laid.text;
          svg.appendChild(label);
        }
      });
    }

    svg.appendChild(el('line', {
      class: 'hg-axis-line',
      x1: plotLeft, x2: plotLeft + plotWidth,
      y1: Math.round(axisY) + 0.5, y2: Math.round(axisY) + 0.5
    }));

    // --- Bars --------------------------------------------------------------
    var slotWidth = plotWidth / binCount;
    var gap = slotWidth > 6 ? Math.min(2, slotWidth * 0.12) : 0;
    var valueCursor = -Infinity;

    bins.forEach(function (bin, i) {
      var slotX = plotLeft + i * slotWidth;
      var barX = slotX + gap / 2;
      var barWidth = Math.max(1, slotWidth - gap);
      var barHeight = bin.height > 0
        ? Math.max(1, (bin.height / yMax) * plotHeight)
        : 0;
      var barY = axisY - barHeight;

      var group = el('g', { class: 'hg-col', tabindex: '0', role: 'img' });
      group.setAttribute('aria-label',
        (valueField.label_short || valueField.label) + ' ' + rangeLabel(bin) + ': ' +
        bin.count + ' ' + (dimField.label_short || dimField.label) +
        (heightBy === 'sum' ? ', ' + (sumField.label_short || sumField.label) + ' ' + compact(bin.sum) : '') + '.');

      group.appendChild(el('rect', {
        class: 'hg-band',
        x: Math.round(slotX), y: Math.round(plotTop),
        width: Math.max(1, Math.round(slotWidth)),
        height: Math.max(1, Math.round(axisY - plotTop)), rx: 2
      }));
      // The whole column is the hover and focus target, so a bin with one row
      // or none is still as easy to point at as the tallest bar.
      group.appendChild(el('rect', {
        class: 'hg-hit',
        x: Math.round(slotX), y: Math.round(plotTop),
        width: Math.max(1, Math.round(slotWidth)),
        height: Math.max(1, Math.round(axisY - plotTop))
      }));

      var fillRgb = barRgb(bin.height / peak);
      if (barHeight > 0) {
        var bar = el('rect', {
          class: 'hg-bar',
          x: barX, y: barY, width: barWidth, height: barHeight,
          rx: Math.min(2, barWidth / 2)
        });
        bar.style.fill = toHex(fillRgb);
        group.appendChild(bar);
      }

      if (config.show_values !== false && bin.height > 0) {
        var text = heightLabel(bin);
        var laidValue = fitText(text, barWidth + (gap || 1), [11, 10, 9]);
        // On a narrow tile a label can be wider than its own bar. Keep it only
        // where it cannot touch the label before it, so two numbers never read
        // as one. The value axis and the tooltip still carry what is dropped.
        if (laidValue) {
          var labelWidth = textWidth(laidValue.text, fontOf(laidValue.size));
          var labelLeft = barX + barWidth / 2 - labelWidth / 2;
          if (labelLeft < valueCursor + 3 || labelLeft < 1 ||
              labelLeft + labelWidth > width - 1) {
            laidValue = null;
          } else {
            valueCursor = labelLeft + labelWidth;
          }
        }
        if (laidValue) {
          var above = barY - 3 >= plotTop;
          var valueLabel = el('text', {
            class: 'hg-value',
            x: barX + barWidth / 2,
            y: above ? Math.round(barY - 3) : Math.round(barY + laidValue.size + 3),
            'text-anchor': 'middle'
          });
          valueLabel.style.fontSize = (laidValue.size) + 'px';
          // Inside the fill the label takes ink or white by measured contrast;
          // outside it, it uses the text token.
          if (!above) valueLabel.style.fill = inkOn(fillRgb);
          valueLabel.textContent = laidValue.text;
          group.appendChild(valueLabel);
        }
      }

      group.addEventListener('pointermove', function (event) {
        showTip(bin, event.clientX, event.clientY);
      });
      group.addEventListener('pointerleave', hideTip);
      group.addEventListener('focus', function () {
        var box = group.getBoundingClientRect();
        showTip(bin, box.left + box.width / 2, box.top + box.height / 2);
      });
      group.addEventListener('blur', hideTip);

      var links = [];
      var seen = {};
      bin.rows.forEach(function (p) {
        (p.links || []).forEach(function (link) {
          var key = (link && link.url) || '';
          if (key && seen[key]) return;
          if (key) seen[key] = true;
          if (links.length < 12) links.push(link);
        });
      });
      if (links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: links, event: event });
        };
        group.addEventListener('click', drill);
        group.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            drill(event);
          }
        });
      }

      svg.appendChild(group);
    });

    // --- Bin edge labels ---------------------------------------------------
    if (edgeMode === 'flat') {
      edgePlan.forEach(function (item) {
        var laid = fitText(edgeLabels[item.index], 90, [11, 10, 9]);
        if (!laid) return;
        var label = el('text', {
          class: 'hg-tick', x: Math.round(item.x), y: Math.round(axisY + 13),
          'text-anchor': item.anchor
        });
        label.style.fontSize = (laid.size) + 'px';
        label.textContent = laid.text;
        svg.appendChild(label);
      });
    } else if (edgeMode === 'side') {
      // Turned on its side rather than dropped: a narrow tile keeps its numbers.
      var need = 13;
      var cursorX = -Infinity;
      for (var s = 0; s <= binCount; s++) {
        var x = plotLeft + s * slotWidth;
        if (x < cursorX + need) continue;
        if (x < plotLeft - 1 || x > plotLeft + plotWidth + 1) continue;
        var laidSide = fitText(edgeLabels[s], height - axisY - 12, [11, 10, 9]);
        if (!laidSide) continue;
        var sideLabel = el('text', {
          class: 'hg-tick', x: 0, y: 0, 'text-anchor': 'end'
        });
        sideLabel.style.fontSize = (laidSide.size) + 'px';
        sideLabel.setAttribute('transform',
          'translate(' + (Math.round(x) + Math.round(laidSide.size / 3)) + ',' +
          Math.round(axisY + 6) + ') rotate(-90)');
        sideLabel.textContent = laidSide.text;
        svg.appendChild(sideLabel);
        cursorX = x;
      }
    }

    // --- Statistics --------------------------------------------------------
    var statCursors = [-Infinity, -Infinity];
    statLines.forEach(function (stat) {
      var x = plotLeft + ((stat.value - start) / (binWidth * binCount)) * plotWidth;
      if (!isFinite(x)) return;
      x = Math.max(plotLeft, Math.min(plotLeft + plotWidth, x));

      var line = el('line', {
        class: 'hg-stat', x1: Math.round(x) + 0.5, x2: Math.round(x) + 0.5,
        y1: plotTop, y2: axisY
      });
      if (stat.dash) line.setAttribute('stroke-dasharray', stat.dash);
      svg.appendChild(line);

      if (plotTop < 12) return;
      var text = stat.label + ' ' + compact(stat.value);
      var laid = fitText(text, plotWidth * 0.5, [11, 10, 9]);
      if (!laid) return;
      var w = textWidth(laid.text, fontOf(laid.size));
      var anchor = x + w + 4 <= plotLeft + plotWidth ? 'start' : 'end';
      var left = anchor === 'start' ? x + 3 : x - 3 - w;
      if (left < 2 || left + w > width - 2) return;

      // The upper row is used only when the lower one is already taken at this
      // position, and there is room above the plot for it.
      var row = 0;
      if (left < statCursors[0] + 6) row = 1;
      if (row === 1 && (statRows < 2 || plotTop < 26 || left < statCursors[1] + 6)) return;

      var label = el('text', {
        class: 'hg-stat-label', x: Math.round(anchor === 'start' ? x + 3 : x - 3),
        y: Math.round(plotTop - 3 - row * 12), 'text-anchor': anchor
      });
      label.style.fontSize = (laid.size) + 'px';
      label.textContent = laid.text;
      svg.appendChild(label);
      statCursors[row] = left + w;
    });

    // --- Caption -----------------------------------------------------------
    if (showCaption) {
      var parts = [];
      if (heightBy === 'share') {
        parts.push('Bars: share of all ' + totalRows + ' rows');
      } else if (heightBy === 'sum') {
        parts.push('Bars: ' + (sumField.label_short || sumField.label) + ' summed, ' +
          totalRows + ' rows');
      } else {
        parts.push('Bars: rows per bin, ' + totalRows + ' rows in total');
      }
      parts.push((valueField.label_short || valueField.label) + ' ' +
        compact(minValue) + ' to ' + compact(maxValue) +
        ', ' + binCount + ' bins of ' + compact(binWidth));
      if (statLines.length) {
        parts.push('Lines: ' + statLines.map(function (s) { return s.label.toLowerCase(); }).join(', '));
      }
      if (droppedOutliers) parts.push(droppedOutliers + ' extreme left out');
      if (clippedOutliers) parts.push(clippedOutliers + ' extreme pulled into range');
      // Say when the form is wrong for the data rather than drawing something
      // that reads as a distribution when it is not one.
      if (totalRows < 5) parts.push('only ' + totalRows + ' values: too few for a distribution');

      var caption = parts.join('. ');
      var laidCaption = fitText(caption, width - 12, [11, 10, 9]);
      if (laidCaption) {
        var capText = el('text', {
          class: 'hg-caption', x: 6, y: height - 5, 'text-anchor': 'start'
        });
        capText.style.fontSize = (laidCaption.size) + 'px';
        capText.textContent = laidCaption.text;
        svg.appendChild(capText);
      }
    }

    // Axis titles: the x title under the tick labels, the y title turned up the
    // left edge. Both are dropped rather than clipped, and both use the muted
    // text token, never a series colour.
    if (xTitle) {
      var xLaid = fitText(xTitle, plotWidth, [11, 10, 9]);
      if (xLaid) {
        var xLabel = el('text', {
          class: 'hg-axis-title',
          x: plotLeft + plotWidth / 2,
          y: height - captionSpace - 4,
          'text-anchor': 'middle'
        });
        xLabel.style.fontSize = xLaid.size + 'px';
        xLabel.textContent = xLaid.text;
        svg.appendChild(xLabel);
      }
    }

    if (yTitle) {
      var yLaid = fitText(yTitle, plotHeight, [11, 10, 9]);
      if (yLaid) {
        var yLabel = el('text', {
          class: 'hg-axis-title',
          transform: 'translate(' + (yTitleBand - 3) + ',' +
            (plotTop + plotHeight / 2) + ') rotate(-90)',
          'text-anchor': 'middle'
        });
        yLabel.style.fontSize = yLaid.size + 'px';
        yLabel.textContent = yLaid.text;
        svg.appendChild(yLabel);
      }
    }

    root.appendChild(svg);
    root.appendChild(tip);
    }

    attempt();
  }
});
