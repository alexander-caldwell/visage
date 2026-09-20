// Violin: the shape of one measure, drawn as a smoothed density mirrored about
// its own centre line, with one violin per group.
// Query shape: 1 dimension (the thing each row is, used for hover and drill),
// 1 measure (the values), and optionally a second dimension that splits the
// rows into one violin per group.
// Pure SVG, no dependencies to declare in the manifest.
//
// Looker's built-in charts cannot do this: they draw one mark per row, so the
// spread of a measure has to be pre-aggregated in SQL and the shape is lost.
// This chart estimates the density in the tile, so the smoothing is a
// visualisation option rather than a model change.
//
// The density is only drawn between the lowest and the highest value in the
// query. A kernel estimate normally runs on past both ends, which draws a tail
// where there is no data: a duration violin would reach below zero. The curve
// stops flat at the real extremes instead.
//
// Follows every house rule: the container is rebuilt each render, a zero-sized
// tile is drawn anyway, no innerHTML, errors surface through addError, labels
// wrap and shrink and turn on their side and are never clipped, every violin
// answers on hover and on keyboard focus, and the theme follows the tile.
//
// Build v1.0.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('violin build v1.0.0');

looker.plugins.visualizations.add({
  id: 'violin',
  label: 'Violin',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 1 measure (a second dimension gives one violin per group)',
  good_for: [
    'Comparing the spread of one measure across a handful of groups, not just their averages',
    'Showing a distribution with two humps, which a mean and a standard deviation both hide',
    'Seeing where the bulk of the values sit and how far the tail runs',
  ],

  options: {
    value_measure: {
      type: 'string',
      label: 'Measure to Plot',
      display: 'select',
      values: [{ 'First Measure': '' }],
      default: '',
      section: 'Data',
      order: 0
    },
    group_by: {
      type: 'string',
      label: 'One Violin per Group',
      display: 'select',
      values: [{ 'Automatic': '' }],
      default: '',
      section: 'Data',
      order: 1
    },
    sort_by: {
      type: 'string',
      label: 'Order the Violins by',
      display: 'select',
      values: [
        { 'Query Order': 'query' },
        { 'Name': 'name' },
        { 'Median, Highest First': 'median' },
        { 'Number of Rows': 'count' }
      ],
      default: 'query',
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

    smoothing: {
      type: 'number',
      label: 'Smoothing (1 = Automatic)',
      default: 1,
      section: 'Shape',
      order: 0
    },
    width_mode: {
      type: 'string',
      label: 'Violin Width',
      display: 'select',
      values: [
        { 'Every Violin the Same Width': 'same' },
        { 'Wider Where There Are More Rows': 'count' }
      ],
      default: 'same',
      section: 'Shape',
      order: 1
    },
    min_rows: {
      type: 'number',
      label: 'Fewest Rows a Violin Needs',
      default: 2,
      section: 'Shape',
      order: 2
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
    main_colour: {
      type: 'array',
      label: 'Violin Colour',
      display: 'color',
      default: ['#525aff'],
      section: 'Style',
      order: 1
    },
    show_values: {
      type: 'boolean',
      label: 'Show Median and Row Count',
      default: true,
      section: 'Style',
      order: 2
    },
    show_axis: {
      type: 'boolean',
      label: 'Show Axes',
      default: true,
      section: 'Style',
      order: 3
    },
    show_caption: {
      type: 'boolean',
      label: 'Show Caption',
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

    show_box: {
      type: 'boolean',
      label: 'Quartile Box',
      default: true,
      section: 'Statistics',
      order: 0
    },
    show_median: {
      type: 'boolean',
      label: 'Median Line',
      default: true,
      section: 'Statistics',
      order: 1
    },
    show_mean: {
      type: 'boolean',
      label: 'Mean Line',
      default: false,
      section: 'Statistics',
      order: 2
    },
    percentile: {
      type: 'number',
      label: 'Percentile Line (0 = Off)',
      default: 0,
      section: 'Statistics',
      order: 3
    },
    show_points: {
      type: 'boolean',
      label: 'Show Every Row as a Dot',
      default: false,
      section: 'Statistics',
      order: 4
    }
  },

  // The field pickers can only be filled once the query is known, so the option
  // panel is rebuilt whenever the fields change. Everything else is copied from
  // the static block above so nothing is lost in the rebuild.
  _registerFieldOptions: function (dims, meas) {
    var signature = dims.concat(meas).map(function (f) { return f.name; }).join('|');
    if (this._optionSignature === signature) return;
    this._optionSignature = signature;

    var rebuilt = {};
    var statics = this.options;
    Object.keys(statics).forEach(function (key) {
      var copy = {};
      Object.keys(statics[key]).forEach(function (prop) { copy[prop] = statics[key][prop]; });
      rebuilt[key] = copy;
    });

    function asValues(fields) {
      return fields.map(function (field) {
        var entry = {};
        entry[field.label_short || field.label || field.name] = field.name;
        return entry;
      });
    }

    rebuilt.value_measure.values = [{ 'First Measure': '' }].concat(asValues(meas));
    rebuilt.group_by.values = [{ 'Automatic': '' }, { 'Nothing (One Violin)': '__none__' }]
      .concat(asValues(dims));

    this.trigger('registerOptions', rebuilt);
  },

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped, so the container is looked up and rebuilt on every render,
  // never cached. Built with createElement because an instance with a Trusted
  // Types policy rejects an innerHTML assignment by throwing.
  _ensureRoot: function (element) {
    var root = element.querySelector('.violin-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.violin-root {' +
      '  --vl-surface: #f7f7fa;' +
      '  --vl-ink: #151d2d;' +
      '  --vl-ink-2: #475569;' +
      '  --vl-muted: #94a3b8;' +
      '  --vl-grid: #e7e8ea;' +
      '  --vl-axis: #c8c9cc;' +
      '  --vl-marker: #151d2d;' +
      '  --vl-hairline: rgba(11,11,11,0.10);' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--vl-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.violin-root.vl-dark { --vl-surface: #12121c; --vl-ink: #ffffff;' +
      '  --vl-ink-2: #cbd5e1; --vl-muted: #94a3b8; --vl-grid: #252a3a;' +
      '  --vl-axis: #3d3d3a; --vl-marker: #e8e9f2;' +
      '  --vl-hairline: rgba(255,255,255,0.10); }' +
      '.violin-root text { font-size: 12px; fill: var(--vl-ink); }' +
      '.violin-root .vl-axis-title { font-size: 11px; fill: var(--vl-muted); }' +
      '.violin-root .vl-tick { fill: var(--vl-ink-2);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.violin-root .vl-name { fill: var(--vl-ink-2); }' +
      '.violin-root .vl-value { fill: var(--vl-ink-2);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.violin-root .vl-caption { fill: var(--vl-muted); }' +
      '.violin-root .vl-grid { stroke: var(--vl-grid); stroke-width: 1; }' +
      '.violin-root .vl-axis-line { stroke: var(--vl-axis); stroke-width: 1; }' +
      '.violin-root .vl-group { cursor: pointer; }' +
      '.violin-root .vl-hit { fill: transparent; }' +
      '.violin-root .vl-band { fill: var(--vl-ink); opacity: 0;' +
      '  transition: opacity 90ms ease-out; }' +
      '.violin-root .vl-group:hover .vl-band,' +
      '.violin-root .vl-group:focus-visible .vl-band { opacity: 0.06; }' +
      '.violin-root .vl-group:focus { outline: none; }' +
      '.violin-root .vl-stat { stroke: var(--vl-marker); stroke-width: 1.5;' +
      '  fill: none; }' +
      '.violin-root .vl-dot { stroke: none; }' +
      '.violin-root .vl-empty { fill: var(--vl-muted); font-style: italic;' +
      '  font-size: 11px; }' +
      '.vl-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--vl-surface); color: var(--vl-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--vl-hairline); }' +
      '.vl-tip[data-shown="1"] { opacity: 1; }' +
      '.vl-tip-name { font-weight: 600; margin-bottom: 3px; }' +
      '.vl-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--vl-ink-2); }' +
      '.vl-tip-row b { font-weight: 600; color: var(--vl-ink);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.vl-tip-members { color: var(--vl-muted); margin-top: 3px; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'violin-root';
    element.appendChild(root);
    return root;
  },

  // The tile should match the dashboard it sits in, not the viewer's operating
  // system. Looker's own theme is not exposed to a visualisation, so read the
  // background colour of the first ancestor that paints one, and fall back to
  // the OS preference only when nothing does.
  _hostIsDark: function (element) {
    function brightnessOf(colour) {
      var parts = /rgba?\(([^)]+)\)/.exec(colour || '');
      if (!parts) return null;
      var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
      var alpha = channels.length > 3 ? channels[3] : 1;
      if (alpha <= 0.1) return null;
      return (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
    }

    // Walk up to and including <html>. Stopping short of it was the bug: Looker
    // paints its dashboard background high up, and with every element between
    // the tile and there transparent, the chart fell through to the browser's
    // own preference and so followed the laptop rather than the dashboard.
    var node = element;
    while (node) {
      var background = brightnessOf(window.getComputedStyle(node).backgroundColor);
      if (background !== null) return background < 0.5;
      if (node === document.documentElement) break;
      node = node.parentElement || document.documentElement;
    }

    // Nothing painted a background. The text colour the host hands the tile is
    // a better second signal than the operating system: light text means a dark
    // surface behind it.
    var inherited = brightnessOf(window.getComputedStyle(element).color);
    if (inherited !== null) return inherited > 0.6;

    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  _applyTheme: function (element, root, config) {
    var dark;
    if (config.theme === 'dark') dark = true;
    else if (config.theme === 'light') dark = false;
    else dark = this._hostIsDark(element);

    if (dark) root.classList.add('vl-dark');
    else root.classList.remove('vl-dark');
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
        message: 'Violin needs one dimension and at least one measure. The measure is the value each row contributes; a second dimension splits the rows into one violin per group.'
      });
      done();
      return;
    }

    this._registerFieldOptions(dims, meas);

    function fieldByName(list, name, fallback) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) return list[i];
      }
      return fallback;
    }

    var valueField = fieldByName(meas, config.value_measure, meas[0]);

    // Which dimension makes the groups, when the reader has not said.
    //
    // Neither "the first" nor "the last" is right. A query of client by
    // engagement puts the client first; a query of month by client puts it
    // last. What the grouping dimension always is, is the one with fewer
    // distinct values: the other one is the detail that fills each violin, and
    // grouping by it gives one row per violin and no distribution at all.
    function distinctCount(field) {
      var seen = {};
      var n = 0;
      for (var i = 0; i < data.length; i++) {
        var key = String((data[i][field.name] && data[i][field.name].value) || '');
        if (!Object.prototype.hasOwnProperty.call(seen, key)) {
          seen[key] = 1;
          n++;
        }
      }
      return n;
    }

    var groupField = null;
    if (config.group_by === '__none__') {
      groupField = null;
    } else if (config.group_by) {
      groupField = fieldByName(dims, config.group_by, null);
    } else if (dims.length > 1) {
      groupField = dims[dims.length - 1];
      var fewest = distinctCount(groupField);
      for (var di = dims.length - 2; di >= 0; di--) {
        var count = distinctCount(dims[di]);
        if (count < fewest) {
          fewest = count;
          groupField = dims[di];
        }
      }
    }

    // The identity dimension names each row on hover and carries its drill
    // links, so it is whichever dimension is not making the groups.
    var dimField = dims[0];
    if (groupField && groupField.name === dimField.name) {
      for (var oi = 0; oi < dims.length; oi++) {
        if (dims[oi].name !== groupField.name) { dimField = dims[oi]; break; }
      }
    }

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
          title: 'Violin failed to render',
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
    // stylesheet rule on .violin-root text overrides the attribute, so the
    // shrink steps below would measure at one size and draw at another.

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    // Shrink through the sizes, then cut. Nothing is clipped: a label that
    // cannot be read at the smallest size is dropped and lives on in the
    // tooltip instead.
    //
    // The cut comes out of the middle and keeps the tail, because Looker values
    // are often told apart only by their end ("... Phase 2" against
    // "... Phase 3"). Numeric ticks pass middle = false and lose their tail,
    // which is the right end to lose on a number.
    function fitText(text, room, sizes, middle) {
      var list = sizes || [12, 11, 10, 9];
      var i;
      for (i = 0; i < list.length; i++) {
        if (textWidth(text, fontOf(list[i])) <= room) {
          return { text: text, size: list[i] };
        }
      }
      var smallest = list[list.length - 1];
      var font = fontOf(smallest);

      if (!middle) {
        var cut = text;
        while (cut.length > 1 && textWidth(cut + '…', font) > room) cut = cut.slice(0, -1);
        if (cut.length < 3) return null;
        return { text: cut + '…', size: smallest };
      }

      var head = text;
      var tail = '';
      var keep = Math.min(12, Math.floor(text.length / 2));
      tail = text.slice(text.length - keep);
      head = text.slice(0, text.length - keep);
      while (head.length > 1 && textWidth(head + '…' + tail, font) > room) {
        if (head.length > 2) head = head.slice(0, -1);
        else if (tail.length > 3) tail = tail.slice(1);
        else break;
      }
      var joined = head + '…' + tail;
      if (textWidth(joined, font) > room || joined.length < 4) return null;
      return { text: joined, size: smallest };
    }

    // Wrap onto as many lines as there is room for before anything shrinks.
    // Words are never split down the middle: "Liberis" broken into "Lib" and
    // "eris" reads as two words.
    function wrapWords(text, room, size, maxLines) {
      var font = fontOf(size);
      var words = String(text).split(/\s+/).filter(function (w) { return w; });
      if (!words.length) return null;
      var lines = [];
      var current = '';
      for (var i = 0; i < words.length; i++) {
        var candidate = current ? current + ' ' + words[i] : words[i];
        if (textWidth(candidate, font) <= room || !current) {
          current = candidate;
        } else {
          lines.push(current);
          current = words[i];
          if (lines.length >= maxLines) return null;
        }
      }
      lines.push(current);
      if (lines.length > maxLines) return null;
      for (var j = 0; j < lines.length; j++) {
        if (textWidth(lines[j], font) > room) return null;
      }
      return lines;
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
    // One hue for every violin. The groups are already told apart by their
    // position and their name on the axis, so a second colour per group would
    // carry nothing the reader does not already have, and colour keyed to a
    // group's place in the sort repaints the chart whenever one is filtered out.
    function toRgb(hex) {
      var clean = String(hex || '').replace('#', '');
      if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [82, 90, 255];
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

    // Anything sitting inside the filled body takes ink or white by measured
    // contrast, never by guessing from the theme.
    function inkOn(rgb) {
      var l = luminance(rgb);
      var withWhite = 1.05 / (l + 0.05);
      var withInk = (l + 0.05) / 0.09;
      return withWhite >= withInk ? '#ffffff' : '#151d2d';
    }

    var baseRgb = toRgb((config.main_colour && config.main_colour[0]) || '#525aff');
    // Dark tiles get their own steps. The darkest end of a light scale
    // disappears against a dark surface, so the body colour is built from the
    // surface outwards in each theme rather than flipped.
    var bodyRgb = isDark ? mix(baseRgb, [255, 255, 255], 0.18) : baseRgb;
    var bodyHex = toHex(bodyRgb);
    var boxHex = toHex(isDark ? mix(bodyRgb, [18, 18, 28], 0.45) : mix(bodyRgb, [21, 29, 45], 0.35));
    var dotHex = toHex(isDark ? mix(bodyRgb, [255, 255, 255], 0.35) : mix(bodyRgb, [21, 29, 45], 0.25));

    function emptyMessage(text) {
      var svg = el('svg', { width: width, height: height });
      var laid = fitText(text, Math.max(20, width - 16), [11, 10, 9], true);
      var msg = el('text', {
        class: 'vl-empty', x: width / 2, y: Math.round(height / 2), 'text-anchor': 'middle'
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
        group: groupField ? cellText(row[groupField.name]) : '',
        links: (row[dimField.name] && row[dimField.name].links) || []
      });
    });

    if (!points.length) {
      emptyMessage('No numeric values in ' + (valueField.label_short || valueField.label));
      return;
    }

    function quantileOf(list, q) {
      if (!list.length) return 0;
      if (list.length === 1) return list[0];
      var pos = (list.length - 1) * q;
      var lower = Math.floor(pos);
      var upper = Math.min(list.length - 1, lower + 1);
      return list[lower] + (list[upper] - list[lower]) * (pos - lower);
    }

    // Extreme values are handled across the whole query rather than per group,
    // so every violin keeps the same scale and the same rule.
    var allSorted = points.map(function (p) { return p.value; }).sort(function (a, b) { return a - b; });
    var allIqr = quantileOf(allSorted, 0.75) - quantileOf(allSorted, 0.25);
    var droppedOutliers = 0;
    var clippedOutliers = 0;

    if (config.outliers === 'exclude' && allIqr > 0) {
      var low = quantileOf(allSorted, 0.25) - 1.5 * allIqr;
      var high = quantileOf(allSorted, 0.75) + 1.5 * allIqr;
      var kept = points.filter(function (p) { return p.value >= low && p.value <= high; });
      droppedOutliers = points.length - kept.length;
      if (kept.length) points = kept;
      else droppedOutliers = 0;
    } else if (config.outliers === 'clip') {
      var p1 = quantileOf(allSorted, 0.01);
      var p99 = quantileOf(allSorted, 0.99);
      points.forEach(function (p) {
        if (p.value < p1) { p.value = p1; clippedOutliers++; }
        else if (p.value > p99) { p.value = p99; clippedOutliers++; }
      });
    }

    // --- The groups --------------------------------------------------------
    // Groups keep the order the query returned them in unless the reader asks
    // for another, so the chart matches the Explore beside it.
    var byName = {};
    var groups = [];
    points.forEach(function (p) {
      var key = groupField ? (p.group || '∅') : (valueField.label_short || valueField.label || 'All rows');
      if (!Object.prototype.hasOwnProperty.call(byName, key)) {
        byName[key] = { name: key, values: [], rows: [] };
        groups.push(byName[key]);
      }
      byName[key].values.push(p.value);
      if (byName[key].rows.length < 400) byName[key].rows.push(p);
    });

    var minRows = Math.max(1, Math.round(Number(config.min_rows) || 2));
    var thinGroups = groups.filter(function (g) { return g.values.length < minRows; });
    var drawable = groups.filter(function (g) { return g.values.length >= minRows; });
    if (!drawable.length) {
      drawable = groups;
      thinGroups = [];
    }
    groups = drawable;

    var totalRows = 0;
    groups.forEach(function (g) {
      g.values.sort(function (a, b) { return a - b; });
      var n = g.values.length;
      totalRows += n;
      g.count = n;
      g.min = g.values[0];
      g.max = g.values[n - 1];
      g.q1 = quantileOf(g.values, 0.25);
      g.median = quantileOf(g.values, 0.5);
      g.q3 = quantileOf(g.values, 0.75);
      g.mean = g.values.reduce(function (a, b) { return a + b; }, 0) / n;
      var spread = g.values.reduce(function (a, v) {
        return a + (v - g.mean) * (v - g.mean);
      }, 0);
      g.sd = n > 1 ? Math.sqrt(spread / (n - 1)) : 0;
    });

    var sortBy = config.sort_by;
    if (sortBy === 'name') {
      groups.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sortBy === 'median') {
      groups.sort(function (a, b) { return b.median - a.median; });
    } else if (sortBy === 'count') {
      groups.sort(function (a, b) { return b.count - a.count; });
    }

    // Beyond this the violins are thinner than their own outline and nothing
    // can be read. The rest are named in the caption rather than drawn badly.
    var MAX_VIOLINS = 24;
    var hiddenGroups = 0;
    if (groups.length > MAX_VIOLINS) {
      hiddenGroups = groups.length - MAX_VIOLINS;
      groups = groups.slice(0, MAX_VIOLINS);
    }

    var dataMin = groups.reduce(function (m, g) { return Math.min(m, g.min); }, Infinity);
    var dataMax = groups.reduce(function (m, g) { return Math.max(m, g.max); }, -Infinity);
    var dataSpan = dataMax - dataMin;
    if (!(dataSpan > 0)) dataSpan = Math.max(1, Math.abs(dataMax) * 0.1);

    // --- Density -----------------------------------------------------------
    // A Gaussian kernel with Silverman's rule for the bandwidth, which is the
    // usual default and behaves on skewed data. The reader can widen or narrow
    // it, and the caption says which it is.
    // Each group is sampled across its own range rather than a grid shared by
    // every group. A shared grid gives a group that occupies a tenth of the
    // axis only a tenth of the points, and its outline comes out as a handful
    // of straight facets instead of a curve.
    var GRID = 72;

    var smoothing = Number(config.smoothing);
    if (!(smoothing > 0)) smoothing = 1;
    smoothing = Math.max(0.2, Math.min(5, smoothing));

    var INV_ROOT_2PI = 0.3989422804014327;

    groups.forEach(function (g) {
      var iqr = g.q3 - g.q1;
      var sigma = iqr > 0 ? Math.min(g.sd > 0 ? g.sd : iqr / 1.349, iqr / 1.349) : g.sd;
      if (!(sigma > 0)) sigma = dataSpan / 6;
      var bw = 0.9 * sigma * Math.pow(g.count, -1 / 5);
      if (!(bw > 0)) bw = dataSpan / 20;
      bw *= smoothing;
      // A bandwidth far below the grid spacing draws a comb of spikes that is
      // an artefact of the grid, not of the data.
      bw = Math.max(bw, ((g.max - g.min) > 0 ? g.max - g.min : dataSpan) / (GRID * 1.5));
      g.bandwidth = bw;

      var span = g.max - g.min;
      g.grid = [];
      for (var gi = 0; gi < GRID; gi++) {
        g.grid.push(g.min + (span * gi) / (GRID - 1));
      }

      var values = g.values;
      var n = values.length;
      var peak = 0;
      g.density = g.grid.map(function (x) {
        var sum = 0;
        for (var i = 0; i < n; i++) {
          var u = (x - values[i]) / bw;
          if (u > 5 || u < -5) continue;
          sum += INV_ROOT_2PI * Math.exp(-0.5 * u * u);
        }
        var d = sum / (n * bw);
        if (d > peak) peak = d;
        return d;
      });
      g.peak = peak > 0 ? peak : 1;
    });

    var maxCount = groups.reduce(function (m, g) { return Math.max(m, g.count); }, 1);

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

    var tickTarget = height < 200 ? 3 : 5;
    var yStep = niceStep(dataSpan / tickTarget);
    var axisMin = Math.floor(dataMin / yStep) * yStep;
    var axisMax = Math.ceil(dataMax / yStep) * yStep;
    if (!(axisMax > axisMin)) axisMax = axisMin + yStep;

    var yTicks = [];
    for (var tv = axisMin; tv <= axisMax + yStep * 1e-9; tv += yStep) yTicks.push(tv);
    if (yTicks.length > 9) yTicks = yTicks.filter(function (v, i) { return i % 2 === 0; });

    // An empty option means "use the field's own name", so the chart is
    // labelled without the user doing anything, and can be overridden or
    // switched off.
    function axisTitle(option, auto) {
      if (config.show_axis_titles === false) return '';
      var given = (config[option] || '').trim();
      return given || auto || '';
    }

    var xTitle = showAxis ? axisTitle('x_axis_label',
      groupField ? (groupField.label_short || groupField.label) : '') : '';
    var yTitle = showAxis ? axisTitle('y_axis_label',
      valueField.label_short || valueField.label) : '';

    var xTitleBand = xTitle ? 16 : 0;
    var yTitleBand = yTitle ? 15 : 0;

    var tickFont = fontOf(11);
    var leftPad = 6 + yTitleBand;
    if (showAxis) {
      var widestTick = yTicks.reduce(function (m, v) {
        return Math.max(m, textWidth(compact(v), tickFont));
      }, 0);
      leftPad = Math.min(Math.ceil(widestTick) + 10 + yTitleBand, Math.floor(width * 0.34));
    }

    var rightPad = 8;
    var plotLeft = leftPad;
    var plotWidth = Math.max(20, width - plotLeft - rightPad);
    var slotWidth = plotWidth / groups.length;

    // --- Group labels ------------------------------------------------------
    // Wrap, then shrink, then turn on their side, then cut from the middle,
    // then drop. A name lost to a narrow slot is information gone, so it only
    // goes once every step above it has been tried, and it stays in the tooltip.
    var LINE_HEIGHT = 1.2;
    var nameRoom = Math.max(8, slotWidth - 4);
    var namePlan = null;

    if (showAxis && groupField) {
      var flatSizes = [12, 11, 10, 9];
      var maxLines = height >= 260 ? 3 : 2;
      for (var fi = 0; fi < flatSizes.length && !namePlan; fi++) {
        var ok = true;
        var laidAll = groups.map(function (g) {
          var lines = wrapWords(g.name, nameRoom, flatSizes[fi], maxLines);
          if (!lines) ok = false;
          return lines;
        });
        if (ok) {
          var used = laidAll.reduce(function (m, lines) { return Math.max(m, lines.length); }, 1);
          namePlan = {
            mode: 'flat',
            size: flatSizes[fi],
            lines: laidAll,
            band: Math.ceil(used * flatSizes[fi] * LINE_HEIGHT) + 8
          };
        }
      }

      if (!namePlan) {
        // Too narrow to lay the names flat. Turned on their side they keep
        // every character, as long as the tile is tall enough to hang them.
        var sideRoom = Math.floor(height * 0.38);
        var sideLaid = groups.map(function (g) {
          return fitText(g.name, sideRoom, [11, 10, 9], true);
        });
        if (sideLaid.every(function (l) { return l; })) {
          var widestSide = sideLaid.reduce(function (m, l) {
            return Math.max(m, textWidth(l.text, fontOf(l.size)));
          }, 0);
          namePlan = {
            mode: 'side',
            laid: sideLaid,
            band: Math.ceil(widestSide) + 12
          };
        }
      }

      if (!namePlan) {
        var cutLaid = groups.map(function (g) {
          return fitText(g.name, nameRoom, [11, 10, 9], true);
        });
        if (cutLaid.some(function (l) { return l; })) {
          namePlan = { mode: 'cut', laid: cutLaid, band: 20 };
        }
      }
    }

    var nameBand = namePlan ? namePlan.band : 0;

    // --- Vertical space ----------------------------------------------------
    var showCaption = config.show_caption !== false && height >= 130;
    var captionSpace = showCaption ? 16 : 0;

    var showValues = config.show_values !== false;
    var topPad = 8;
    if (showValues) topPad += 26;
    topPad = Math.min(topPad, Math.floor(height * 0.3));

    var bottomPad = 6 + xTitleBand + nameBand;
    var axisY = height - captionSpace - bottomPad;
    var plotTop = topPad;
    var plotHeight = axisY - plotTop;

    if (plotHeight < 40 && nameBand) {
      // Too little room for the names: give the space back to the violins and
      // let the tooltip carry them.
      namePlan = null;
      nameBand = 0;
      bottomPad = 6 + xTitleBand;
      axisY = height - captionSpace - bottomPad;
      plotHeight = axisY - plotTop;
    }
    if (plotHeight < 24) {
      showValues = false;
      topPad = 4;
      plotTop = topPad;
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

    function yOf(value) {
      return axisY - ((value - axisMin) / (axisMax - axisMin)) * plotHeight;
    }

    var svg = el('svg', { width: width, height: height });

    // --- Tooltip -----------------------------------------------------------
    // One element, refilled per violin, so every group answers for itself
    // however narrow it is and whatever its label had to give up.
    var tip = document.createElement('div');
    tip.className = 'vl-tip';
    var tipName = document.createElement('div');
    tipName.className = 'vl-tip-name';
    tip.appendChild(tipName);
    var tipRows = document.createElement('div');
    tip.appendChild(tipRows);
    var tipMembers = document.createElement('div');
    tipMembers.className = 'vl-tip-members';
    tip.appendChild(tipMembers);

    function tipLine(key, value) {
      var row = document.createElement('div');
      row.className = 'vl-tip-row';
      var k = document.createElement('span');
      k.textContent = key;
      var v = document.createElement('b');
      v.textContent = value;
      row.appendChild(k);
      row.appendChild(v);
      tipRows.appendChild(row);
    }

    function showTip(group, clientX, clientY) {
      tipName.textContent = group.name;
      while (tipRows.firstChild) tipRows.removeChild(tipRows.firstChild);

      tipLine('Rows', String(group.count));
      tipLine('Lowest', compact(group.min));
      tipLine('Lower quartile', compact(group.q1));
      tipLine('Median', compact(group.median));
      tipLine('Mean', compact(group.mean));
      tipLine('Upper quartile', compact(group.q3));
      tipLine('Highest', compact(group.max));

      var names = group.rows.slice(0, 3).map(function (p) { return p.name; })
        .filter(function (n) { return n; });
      var extra = group.count - names.length;
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

    // --- Axis --------------------------------------------------------------
    if (showAxis) {
      yTicks.forEach(function (value) {
        var y = Math.round(yOf(value)) - 0.5;
        if (y < plotTop - 1 || y > axisY + 1) return;
        svg.appendChild(el('line', {
          class: 'vl-grid', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
        }));
        var laid = fitText(compact(value), leftPad - 8, [11, 10, 9], false);
        if (laid) {
          var label = el('text', {
            class: 'vl-tick', x: plotLeft - 6, y: y + 4, 'text-anchor': 'end'
          });
          label.style.fontSize = laid.size + 'px';
          label.textContent = laid.text;
          svg.appendChild(label);
        }
      });
    }

    svg.appendChild(el('line', {
      class: 'vl-axis-line',
      x1: plotLeft, x2: plotLeft + plotWidth,
      y1: Math.round(axisY) + 0.5, y2: Math.round(axisY) + 0.5
    }));

    // --- Violins -----------------------------------------------------------
    var pctOption = Number(config.percentile);
    var showPercentile = pctOption > 0 && pctOption < 100;
    // A violin wider than this stops reading as a shape and starts reading as
    // a filled area, so the body is capped however much room the slot has.
    var MAX_HALF = 56;
    var slotHalf = Math.max(2, Math.min(slotWidth / 2 - 3, MAX_HALF));
    var valueCursor = -Infinity;

    // A dot's sideways nudge comes from its own name, not its place in the
    // list, so filtering a row out never shuffles the dots that remain.
    function jitterOf(name, fallback) {
      var text = String(name || fallback || '');
      var hash = 2166136261;
      for (var i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
      }
      return ((hash % 2000) / 1000) - 1;
    }

    groups.forEach(function (group, index) {
      var slotX = plotLeft + index * slotWidth;
      var cx = slotX + slotWidth / 2;
      var widthScale = config.width_mode === 'count'
        ? Math.max(0.18, Math.sqrt(group.count / maxCount))
        : 1;

      var g = el('g', { class: 'vl-group', tabindex: '0', role: 'img' });
      g.setAttribute('aria-label',
        group.name + ': ' + group.count + ' rows, ' +
        (valueField.label_short || valueField.label) + ' from ' + compact(group.min) +
        ' to ' + compact(group.max) + ', median ' + compact(group.median) + '.');

      g.appendChild(el('rect', {
        class: 'vl-band',
        x: Math.round(slotX), y: Math.round(plotTop),
        width: Math.max(1, Math.round(slotWidth)),
        height: Math.max(1, Math.round(axisY - plotTop)), rx: 2
      }));
      // The whole slot is the hover and focus target, so a thin violin is as
      // easy to point at as a wide one.
      g.appendChild(el('rect', {
        class: 'vl-hit',
        x: Math.round(slotX), y: Math.round(plotTop),
        width: Math.max(1, Math.round(slotWidth)),
        height: Math.max(1, Math.round(axisY - plotTop))
      }));

      // The body. Only the part of the grid the group's own values cover is
      // drawn, so a violin stops where its data stops rather than tapering off
      // into a range that holds nothing.
      var half = group.density.map(function (d) {
        return (d / group.peak) * slotHalf * widthScale;
      });

      // A group whose values are nearly identical has no shape to show, and
      // drawn as a density it comes out as a hairline that reads as nothing at
      // all. Below six pixels of height it becomes a single flat mark instead,
      // which says "every row is here" and can actually be seen.
      var drawnHeight = Math.abs(yOf(group.min) - yOf(group.max));
      var left = [];
      var right = [];
      if (group.max > group.min && drawnHeight >= 6) {
        for (var i = 0; i < GRID; i++) {
          var y = yOf(group.grid[i]);
          left.push([cx - half[i], y]);
          right.push([cx + half[i], y]);
        }
      }

      if (left.length >= 2) {
        var d = 'M' + left[0][0].toFixed(2) + ' ' + left[0][1].toFixed(2);
        for (var li = 1; li < left.length; li++) {
          d += 'L' + left[li][0].toFixed(2) + ' ' + left[li][1].toFixed(2);
        }
        for (var ri = right.length - 1; ri >= 0; ri--) {
          d += 'L' + right[ri][0].toFixed(2) + ' ' + right[ri][1].toFixed(2);
        }
        d += 'Z';
        var body = el('path', { class: 'vl-body', d: d });
        body.style.fill = bodyHex;
        body.style.fillOpacity = '0.82';
        g.appendChild(body);
      } else {
        // One value, or every value within a few pixels of the others: there is
        // no shape to draw, so the chart says so with a single mark rather than
        // a slot that looks empty.
        var flatY = yOf(group.median);
        var tick = el('line', {
          class: 'vl-flat',
          x1: cx - slotHalf * widthScale, x2: cx + slotHalf * widthScale,
          y1: Math.round(flatY) + 0.5, y2: Math.round(flatY) + 0.5
        });
        tick.style.stroke = bodyHex;
        tick.style.strokeWidth = '3';
        g.appendChild(tick);
      }

      // Every row as a dot, for a group small enough that a smooth curve
      // claims more than the data supports.
      if (config.show_points) {
        var radius = Math.max(1.2, Math.min(2.6, slotHalf / 7));
        var gridStep = (group.max - group.min) / (GRID - 1);
        group.rows.slice(0, 300).forEach(function (p) {
          // The sideways nudge is bounded by how wide the body is at that
          // value, not by the slot. A fixed band throws dots outside the
          // outline wherever the violin is narrow, which reads as a mistake.
          var slot = gridStep > 0
            ? Math.max(0, Math.min(GRID - 1, Math.round((p.value - group.min) / gridStep)))
            : 0;
          var reach = (half[slot] || 0) * 0.78;
          var dot = el('circle', {
            class: 'vl-dot',
            cx: (cx + jitterOf(p.name, p.value) * reach).toFixed(2),
            cy: yOf(p.value).toFixed(2),
            r: radius
          });
          dot.style.fill = dotHex;
          dot.style.fillOpacity = '0.7';
          g.appendChild(dot);
        });
      }

      // The quartile box and the summary lines sit inside the body, so they
      // take ink or white by measured contrast against it.
      var overlayInk = inkOn(bodyRgb);

      if (config.show_box !== false) {
        var boxTop = yOf(group.q3);
        var boxBottom = yOf(group.q1);
        var boxWidth = Math.max(3, Math.min(9, slotHalf * 0.45));
        var box = el('rect', {
          class: 'vl-box',
          x: (cx - boxWidth / 2).toFixed(2),
          y: Math.min(boxTop, boxBottom).toFixed(2),
          width: boxWidth.toFixed(2),
          height: Math.max(1, Math.abs(boxBottom - boxTop)).toFixed(2),
          rx: Math.min(2, boxWidth / 3)
        });
        box.style.fill = boxHex;
        g.appendChild(box);
      }

      function statLine(value, dash) {
        var y = yOf(value);
        if (y < plotTop - 1 || y > axisY + 1) return;
        var reach = Math.max(4, slotHalf * widthScale * 0.75);
        var line = el('line', {
          class: 'vl-stat',
          x1: (cx - reach).toFixed(2), x2: (cx + reach).toFixed(2),
          y1: y.toFixed(2), y2: y.toFixed(2)
        });
        line.style.stroke = overlayInk;
        if (dash) line.setAttribute('stroke-dasharray', dash);
        g.appendChild(line);
      }

      if (config.show_median !== false) statLine(group.median, '');
      if (config.show_mean) statLine(group.mean, '5 3');
      if (showPercentile) statLine(quantileOf(group.values, pctOption / 100), '1 3');

      // The figure leads: a reader should not have to hover to learn the
      // middle of a group or how many rows made it. Wrap is not available on
      // one line, so the ladder runs shrink, then cut, then drop, and the
      // tooltip keeps whatever goes.
      if (showValues) {
        var headline = compact(group.median);
        var sub = group.count + (group.count === 1 ? ' row' : ' rows');
        var laidValue = fitText(headline, slotWidth - 4, [12, 11, 10, 9], false);
        if (laidValue) {
          var vw = textWidth(laidValue.text, fontOf(laidValue.size, '600'));
          var vLeft = cx - vw / 2;
          if (vLeft < valueCursor + 3 || vLeft < 1 || vLeft + vw > width - 1) {
            laidValue = null;
          } else {
            valueCursor = vLeft + vw;
          }
        }
        if (laidValue) {
          var vText = el('text', {
            class: 'vl-value', x: cx.toFixed(2),
            y: Math.round(plotTop - 14), 'text-anchor': 'middle'
          });
          vText.style.fontSize = laidValue.size + 'px';
          vText.style.fontWeight = '600';
          vText.textContent = laidValue.text;
          g.appendChild(vText);

          var laidSub = fitText(sub, slotWidth - 4, [10, 9], false);
          if (laidSub && plotTop >= 24) {
            var sText = el('text', {
              class: 'vl-value', x: cx.toFixed(2),
              y: Math.round(plotTop - 4), 'text-anchor': 'middle'
            });
            sText.style.fontSize = laidSub.size + 'px';
            sText.style.fillOpacity = '0.75';
            sText.textContent = laidSub.text;
            g.appendChild(sText);
          }
        }
      }

      g.addEventListener('pointermove', function (event) {
        showTip(group, event.clientX, event.clientY);
      });
      g.addEventListener('pointerleave', hideTip);
      g.addEventListener('focus', function () {
        var box2 = g.getBoundingClientRect();
        showTip(group, box2.left + box2.width / 2, box2.top + box2.height / 2);
      });
      g.addEventListener('blur', hideTip);

      var links = [];
      var seen = {};
      group.rows.forEach(function (p) {
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
        g.addEventListener('click', drill);
        g.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            drill(event);
          }
        });
      }

      svg.appendChild(g);
    });

    // --- Group names -------------------------------------------------------
    if (namePlan && namePlan.mode === 'flat') {
      groups.forEach(function (group, index) {
        var lines = namePlan.lines[index];
        if (!lines) return;
        var cx = plotLeft + index * slotWidth + slotWidth / 2;
        lines.forEach(function (line, li) {
          var text = el('text', {
            class: 'vl-name', x: cx.toFixed(2),
            y: Math.round(axisY + 14 + li * namePlan.size * LINE_HEIGHT),
            'text-anchor': 'middle'
          });
          text.style.fontSize = namePlan.size + 'px';
          text.textContent = line;
          svg.appendChild(text);
        });
      });
    } else if (namePlan && namePlan.mode === 'side') {
      groups.forEach(function (group, index) {
        var laid = namePlan.laid[index];
        if (!laid) return;
        var cx = plotLeft + index * slotWidth + slotWidth / 2;
        var text = el('text', { class: 'vl-name', x: 0, y: 0, 'text-anchor': 'end' });
        text.style.fontSize = laid.size + 'px';
        text.setAttribute('transform',
          'translate(' + (Math.round(cx) + Math.round(laid.size / 3)) + ',' +
          Math.round(axisY + 6) + ') rotate(-90)');
        text.textContent = laid.text;
        svg.appendChild(text);
      });
    } else if (namePlan && namePlan.mode === 'cut') {
      groups.forEach(function (group, index) {
        var laid = namePlan.laid[index];
        if (!laid) return;
        var cx = plotLeft + index * slotWidth + slotWidth / 2;
        var text = el('text', {
          class: 'vl-name', x: cx.toFixed(2),
          y: Math.round(axisY + 14), 'text-anchor': 'middle'
        });
        text.style.fontSize = laid.size + 'px';
        text.textContent = laid.text;
        svg.appendChild(text);
      });
    }

    // --- Caption -----------------------------------------------------------
    // Two channels are in play, the width and the overlaid lines, so the
    // caption names what each one means.
    if (showCaption) {
      var parts = [];
      parts.push('Width: how many rows sit at that ' +
        (valueField.label_short || valueField.label).toLowerCase() +
        (config.width_mode === 'count' ? ', scaled by group size' : ''));

      var lineNames = [];
      if (config.show_box !== false) lineNames.push('box = middle half');
      if (config.show_median !== false) lineNames.push('solid = median');
      if (config.show_mean) lineNames.push('dashed = mean');
      if (showPercentile) lineNames.push('dotted = p' + (Math.round(pctOption * 10) / 10));
      if (lineNames.length) parts.push(lineNames.join(', '));

      parts.push(totalRows + ' rows across ' + groups.length +
        (groups.length === 1 ? ' group' : ' groups') +
        ', ' + compact(dataMin) + ' to ' + compact(dataMax));

      if (droppedOutliers) parts.push(droppedOutliers + ' extreme left out');
      if (clippedOutliers) parts.push(clippedOutliers + ' extreme pulled into range');
      if (thinGroups.length) {
        parts.push(thinGroups.length + ' group' + (thinGroups.length === 1 ? '' : 's') +
          ' under ' + minRows + ' rows not drawn');
      }
      if (hiddenGroups) parts.push(hiddenGroups + ' more groups not shown');

      // Say when the form is wrong for the data rather than drawing something
      // that reads as a distribution when it is not one.
      var sparse = groups.filter(function (g) { return g.count < 8; }).length;
      if (sparse) {
        parts.push(sparse + ' group' + (sparse === 1 ? '' : 's') +
          ' under 8 rows: the curve implies more than the data shows');
      }

      var caption = parts.join('. ');
      var laidCaption = fitText(caption, width - 12, [11, 10, 9], false);
      if (laidCaption) {
        var capText = el('text', {
          class: 'vl-caption', x: 6, y: height - 5, 'text-anchor': 'start'
        });
        capText.style.fontSize = laidCaption.size + 'px';
        capText.textContent = laidCaption.text;
        svg.appendChild(capText);
      }
    }

    // Axis titles: the x title under the group names, the y title turned up the
    // left edge. Both are dropped rather than clipped, and both use the muted
    // text token, never a series colour.
    if (xTitle) {
      var xLaid = fitText(xTitle, plotWidth, [11, 10, 9], true);
      if (xLaid) {
        var xLabel = el('text', {
          class: 'vl-axis-title',
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
      var yLaid = fitText(yTitle, plotHeight, [11, 10, 9], true);
      if (yLaid) {
        var yLabel = el('text', {
          class: 'vl-axis-title',
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
