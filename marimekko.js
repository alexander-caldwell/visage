// Marimekko: column widths carry one measure, column heights carry another, so
// each column's area is a third quantity the reader can compare by eye.
//
// Two query shapes, picked automatically:
//
//   1 dimension + 2 measures   width = measure 1 share, height = measure 2 per
//                              unit of measure 1, so area = measure 2.
//                              Clients by hours and revenue: width is share of
//                              hours, height is revenue per hour, area is
//                              revenue.
//
//   2 dimensions + 1 measure   width = each column's share of the measure,
//                              each column full height and split by the second
//                              dimension, so every cell's area is its share of
//                              the total.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.7.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('marimekko build v1.7.0');

looker.plugins.visualizations.add({
  id: 'marimekko',
  label: 'Marimekko',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 2 measures, or 2 dimensions + 1 measure',

  options: {
    theme: {
      type: 'string',
      label: 'Theme',
      display: 'select',
      values: [{ 'Match Looker': 'auto' }, { 'Light': 'light' }, { 'Dark': 'dark' }],
      default: 'auto',
      section: 'Style',
      order: 0
    },
    mode: {
      type: 'string',
      label: 'Layout',
      display: 'select',
      values: [
        { 'Choose From the Query': 'auto' },
        { 'Width and Height From Two Measures': 'variwide' },
        { 'Split Columns by a Second Dimension': 'mosaic' }
      ],
      default: 'auto',
      section: 'Data',
      order: 1
    },
    width_from: {
      type: 'string',
      label: 'Column Width From',
      display: 'select',
      values: [
        { 'Whichever Reads Better': 'auto' },
        { 'First Measure': 'first' },
        { 'Second Measure': 'second' }
      ],
      default: 'auto',
      section: 'Data',
      order: 2
    },
    max_columns: {
      type: 'number',
      label: 'Columns Before the Rest Are Grouped',
      default: 8,
      section: 'Data',
      order: 3
    },
    shade_columns: {
      type: 'boolean',
      label: 'Shade Columns by Height',
      default: false,
      section: 'Style',
      order: 1
    },
    show_values: {
      type: 'boolean',
      label: 'Show Figures in Columns',
      default: true,
      section: 'Style',
      order: 1
    },
    show_caption: {
      type: 'boolean',
      label: 'Show Caption',
      default: true,
      section: 'Style',
      order: 2
    },
    show_axis: {
      type: 'boolean',
      label: 'Show Scale',
      default: true,
      section: 'Style',
      order: 3
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
    show_column_labels: {
      type: 'boolean',
      label: 'Show Column Names',
      default: true,
      section: 'Style',
      order: 4
    }
  },

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped, so the container is looked up and rebuilt on every render,
  // never cached. Built with createElement because an instance with a Trusted
  // Types policy rejects an innerHTML assignment by throwing.
  _ensureRoot: function (element) {
    var root = element.querySelector('.mrk-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.mrk-root {' +
      '  --mrk-surface: #fcfcfb;' +
      '  --mrk-ink: #0b0b0b;' +
      '  --mrk-ink-2: #52514e;' +
      '  --mrk-muted: #898781;' +
      '  --mrk-grid: #e1e0d9;' +
      '  --mrk-hairline: rgba(11,11,11,0.10);' +
      '  --mrk-c0: #2a78d6; --mrk-k0: #0b0b0b;' +
      '  --mrk-c1: #eb6834; --mrk-k1: #0b0b0b;' +
      '  --mrk-c2: #1baf7a; --mrk-k2: #0b0b0b;' +
      '  --mrk-c3: #eda100; --mrk-k3: #0b0b0b;' +
      '  --mrk-c4: #e87ba4; --mrk-k4: #0b0b0b;' +
      '  --mrk-c5: #008300; --mrk-k5: #ffffff;' +
      '  --mrk-c6: #4a3aa7; --mrk-k6: #ffffff;' +
      '  --mrk-c7: #e34948; --mrk-k7: #ffffff;' +
      '  --mrk-other: #b9b7ae; --mrk-other-ink: #0b0b0b;' +
      '  --mrk-s0: #cde2fb; --mrk-i0: #0b0b0b;' +
      '  --mrk-s1: #9ec5f4; --mrk-i1: #0b0b0b;' +
      '  --mrk-s2: #6da7ec; --mrk-i2: #0b0b0b;' +
      '  --mrk-s3: #3987e5; --mrk-i3: #0b0b0b;' +
      '  --mrk-s4: #256abf; --mrk-i4: #ffffff;' +
      '  --mrk-s5: #184f95; --mrk-i5: #ffffff;' +
      '  --mrk-s6: #0d366b; --mrk-i6: #ffffff;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--mrk-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.mrk-root.mrk-dark { --mrk-surface: #1a1a19; --mrk-ink: #ffffff;' +
      '  --mrk-ink-2: #c3c2b7; --mrk-muted: #898781; --mrk-grid: #2c2c2a;' +
      '  --mrk-hairline: rgba(255,255,255,0.10);' +
      '  --mrk-c0: #3987e5; --mrk-k0: #0b0b0b;' +
      '  --mrk-c1: #d95926; --mrk-k1: #ffffff;' +
      '  --mrk-c2: #199e70; --mrk-k2: #0b0b0b;' +
      '  --mrk-c3: #c98500; --mrk-k3: #0b0b0b;' +
      '  --mrk-c4: #d55181; --mrk-k4: #ffffff;' +
      '  --mrk-c5: #008300; --mrk-k5: #ffffff;' +
      '  --mrk-c6: #9085e9; --mrk-k6: #0b0b0b;' +
      '  --mrk-c7: #e66767; --mrk-k7: #0b0b0b;' +
      '  --mrk-other: #4a4a46; --mrk-other-ink: #ffffff;' +
      '  --mrk-s0: #b7d3f6; --mrk-i0: #0b0b0b;' +
      '  --mrk-s1: #9ec5f4; --mrk-i1: #0b0b0b;' +
      '  --mrk-s2: #86b6ef; --mrk-i2: #0b0b0b;' +
      '  --mrk-s3: #5598e7; --mrk-i3: #0b0b0b;' +
      '  --mrk-s4: #3987e5; --mrk-i4: #0b0b0b;' +
      '  --mrk-s5: #256abf; --mrk-i5: #ffffff;' +
      '  --mrk-s6: #184f95; --mrk-i6: #ffffff; }' +
      '.mrk-caption { padding: 2px 6px 9px; font-size: 11px; color: var(--mrk-muted);' +
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
      '.mrk-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--mrk-ink-2); overflow: hidden; }' +
      '.mrk-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 230px; }' +
      '.mrk-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.mrk-swatch { width: 10px; height: 10px; border-radius: 2px; flex: 0 0 auto;' +
      '  box-shadow: inset 0 0 0 1px var(--mrk-hairline); }' +
      '.mrk-plot { display: block; }' +
      '.mrk-cell { cursor: pointer; transition: filter 90ms ease-out; }' +
      '.mrk-col:hover .mrk-cell, .mrk-col:focus-visible .mrk-cell { filter: brightness(1.09); }' +
      '.mrk-col:focus { outline: none; }' +
      '.mrk-col:focus-visible .mrk-outline { stroke: var(--mrk-ink); stroke-width: 2px; fill: none; }' +
      '.mrk-colname { font-size: 11px; fill: var(--mrk-ink-2); }' +
      '.mrk-value { font-size: 11px; }' +
      '.mrk-tick { font-size: 11px; fill: var(--mrk-muted); font-variant-numeric: tabular-nums; }' +
      '.mrk-grid-line { stroke: var(--mrk-grid); stroke-width: 1; }' +
      '.mrk-note { font-size: 10px; fill: var(--mrk-muted); }' +
      '.mrk-axis-title { font-size: 11px; fill: var(--mrk-muted); }' +
      '.mrk-empty { font-size: 12px; fill: var(--mrk-muted); }' +
      '.mrk-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 280px;' +
      '  background: var(--mrk-surface); color: var(--mrk-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--mrk-hairline); }' +
      '.mrk-tip[data-shown="1"] { opacity: 1; }' +
      '.mrk-tip-name { font-weight: 600; margin-bottom: 3px;' +
      '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.mrk-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--mrk-ink-2); }' +
      '.mrk-tip-row b { font-weight: 600; color: var(--mrk-ink);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.mrk-tip-sep { height: 1px; background: var(--mrk-hairline); margin: 5px 0 4px; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'mrk-root';
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

    if (dark) root.classList.add('mrk-dark');
    else root.classList.remove('mrk-dark');
  },

  create: function (element, config) {
    var root = this._ensureRoot(element);
    this._applyTheme(element, root, config || {});
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    var dims = queryResponse.fields.dimension_like || [];
    var meas = queryResponse.fields.measure_like || [];

    var mode = config.mode || 'auto';
    if (mode === 'auto') {
      mode = dims.length >= 2 && meas.length >= 1 ? 'mosaic' : 'variwide';
    }

    if (mode === 'variwide' && (dims.length < 1 || meas.length < 2)) {
      this.addError({
        title: 'Wrong query shape',
        message: 'This layout needs one dimension and two measures: one sets column width, the other sets height.'
      });
      done();
      return;
    }
    if (mode === 'mosaic' && (dims.length < 2 || meas.length < 1)) {
      this.addError({
        title: 'Wrong query shape',
        message: 'This layout needs two dimensions and one measure: the first dimension makes the columns, the second splits them.'
      });
      done();
      return;
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
    this._applyTheme(element, root, config);
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
          title: 'Marimekko failed to render',
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

    function drawMessage(msg) {
      var svg = el('svg', { class: 'mrk-plot', width: width, height: height });
      var text = el('text', {
        class: 'mrk-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    if (!data.length) {
      drawMessage('No results');
      return;
    }

    // Text is measured with the real font, so a label is never clipped.
    var scratch = document.createElement('canvas').getContext('2d');
    var fonts = {
      label: '11px system-ui, -apple-system, "Segoe UI", sans-serif',
      value: '11px system-ui, -apple-system, "Segoe UI", sans-serif'
    };

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    function fit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '…', font) > room) cut = cut.slice(0, -1);
      if (cut.length < Math.min(4, text.length)) return null;
      return cut + '…';
    }

    // Labels wrap, then shrink, and are only dropped when even the smallest
    // size cannot carry something readable. A name lost to a narrow box is
    // information gone, and Looker dimension values are usually long.
    var FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    // Keeps the end of a value when the middle has to go: Looker names are
    // often distinguished only by their tail, "... Phase 2" against
    // "... Phase 3", so cutting the end makes two different rows read alike.
    function middleFit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var tail = text.slice(-9);
      while (tail.length > 2 && textWidth('…' + tail, font) > room * 0.55) tail = tail.slice(1);
      var head = text.slice(0, text.length - tail.length);
      while (head.length > 1 && textWidth(head + '…' + tail, font) > room) head = head.slice(0, -1);
      if (head.length < 2) return null;
      return head + '…' + tail;
    }

    function wrapLines(text, font, room, maxRows, keepTail) {
      var words = String(text).split(/\s+/).filter(Boolean);
      if (!words.length || room < 8) return null;

      // A canvas measurement and the same string rendered as SVG text disagree
      // by a pixel or so, because the two resolve the system font stack
      // separately. Measured text sitting exactly on its limit can then render
      // a hair past the tile edge, so keep 2px in hand.
      room = room - 2;

      var lines = [];
      var current = '';
      var tooWide = false;

      words.forEach(function (word) {
        if (tooWide) return;
        var candidate = current ? current + ' ' + word : word;
        if (textWidth(candidate, font) <= room) {
          current = candidate;
          return;
        }
        // A word wider than the line is never split down the middle: breaking
        // "Liberis" into "Lib" and "eris" reads as two words. Fail here so a
        // smaller size is tried, and an ellipsis used as the last resort.
        if (textWidth(word, font) > room) {
          tooWide = true;
          return;
        }
        if (current) lines.push(current);
        current = word;
      });
      if (tooWide) return null;
      if (current) lines.push(current);
      if (!lines.length) return null;

      if (lines.length > maxRows) {
        var kept = lines.slice(0, maxRows - 1);
        var remainder = lines.slice(maxRows - 1).join(' ');
        var lastLine = keepTail
          ? middleFit(remainder, font, room)
          : null;
        if (!lastLine) {
          lastLine = remainder;
          while (lastLine.length > 1 && textWidth(lastLine + '…', font) > room) {
            lastLine = lastLine.slice(0, -1);
          }
          lastLine += '…';
        }
        lines = kept.concat([lastLine]);
      }

      var shortest = lines.reduce(function (min, line) {
        return Math.min(min, line.replace('…', '').length);
      }, Infinity);
      if (shortest < 2) return null;
      if (lines.length === 1 && lines[0].replace('…', '').length < Math.min(3, text.length)) return null;

      return lines;
    }

    // Tries each size in turn, wrapping to whatever rows the height allows.
    function layoutLabel(text, opts) {
      var sizes = opts.sizes || [12, 11, 10, 9];
      var room = opts.width;
      var maxLines = opts.maxLines || 3;

      for (var i = 0; i < sizes.length; i++) {
        var size = sizes[i];
        var font = fontOf(size, opts.weight);
        var lineHeight = Math.ceil(size * 1.22);
        var rows = Math.max(1, Math.min(maxLines, Math.floor(opts.height / lineHeight)));
        if (rows < 1) continue;
        var lines = wrapLines(text, font, room, rows, opts.keepTail);
        if (lines && lines.length * lineHeight <= opts.height) {
          return { lines: lines, size: size, font: font, lineHeight: lineHeight,
                   height: lines.length * lineHeight };
        }
      }

      // Last resort: one line at the smallest size, cut with an ellipsis.
      var smallest = sizes[sizes.length - 1];
      var smallFont = fontOf(smallest, opts.weight);
      var smallHeight = Math.ceil(smallest * 1.22);
      if (smallHeight <= opts.height) {
        var cut = opts.keepTail ? middleFit(text, smallFont, room) : null;
        if (!cut) cut = fit(text, smallFont, room);
        if (cut) {
          return { lines: [cut], size: smallest, font: smallFont,
                   lineHeight: smallHeight, height: smallHeight };
        }
      }
      return null;
    }

    // Draws a laid-out label as one or more <text> rows.
    function drawLabel(parent, layout, opts) {
      layout.lines.forEach(function (line, i) {
        var text = el('text', {
          class: opts.cls || '',
          x: opts.x,
          y: Math.round(opts.top + layout.lineHeight * (i + 0.78)),
          'text-anchor': opts.anchor || 'middle'
        });
        // An inline style beats the class's own font-size; the attribute
        // does not, which silently undid every shrink.
        text.style.fontSize = layout.size + 'px';
        if (opts.weight) text.setAttribute('font-weight', opts.weight);
        if (opts.opacity) text.setAttribute('opacity', opts.opacity);
        if (opts.fill) text.style.fill = opts.fill;
        text.textContent = line;
        parent.appendChild(text);
      });
      return layout.height;
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

    var dimName = dims[0].name;
    var maxColumns = Math.max(2, Math.min(40, Number(config.max_columns) || 12));
    var columns = [];
    var skipped = 0;
    var stackKeys = [];
    var nested = false;
    var widthField;
    var heightField;
    var measureField;

    if (mode === 'variwide') {
      // Height is one measure divided by the other, so the choice of which
      // measure sets the width decides whether the height reads as "£125 per
      // hour" or "0.008 hours per £". Default to the orientation that gives a
      // number above 1.
      var useSecond;
      if (config.width_from === 'second') useSecond = true;
      else if (config.width_from === 'first') useSecond = false;
      else {
        var totals = [0, 0];
        data.forEach(function (row) {
          var first = cellNumber(row[meas[0].name]);
          var second = cellNumber(row[meas[1].name]);
          if (first !== null) totals[0] += Math.abs(first);
          if (second !== null) totals[1] += Math.abs(second);
        });
        useSecond = totals[1] > 0 && totals[1] < totals[0];
      }

      widthField = useSecond ? meas[1] : meas[0];
      heightField = useSecond ? meas[0] : meas[1];

      data.forEach(function (row) {
        var w = cellNumber(row[widthField.name]);
        var v = cellNumber(row[heightField.name]);
        // A column needs a positive width and a value to have any area.
        if (w === null || w <= 0 || v === null) {
          skipped++;
          return;
        }
        columns.push({
          name: cellText(row[dimName]),
          weight: w,
          weightText: cellText(row[widthField.name]),
          value: v,
          valueText: cellText(row[heightField.name]),
          rate: v / w,
          links: (row[dimName] && row[dimName].links) || [],
          segments: null
        });
      });

      columns.sort(function (a, b) { return b.weight - a.weight; });
    } else {
      var stackName = dims[1].name;
      measureField = meas[0];
      var byColumn = {};
      var order = [];
      var stackTotals = {};
      var stackSeen = {};
      var stackOwners = {};

      data.forEach(function (row) {
        var v = cellNumber(row[measureField.name]);
        if (v === null || v <= 0) {
          skipped++;
          return;
        }
        var colKey = cellText(row[dimName]);
        var segKey = cellText(row[stackName]);
        if (!byColumn[colKey]) {
          byColumn[colKey] = { name: colKey, weight: 0, segments: [], links: (row[dimName] && row[dimName].links) || [] };
          order.push(colKey);
        }
        byColumn[colKey].weight += v;
        byColumn[colKey].segments.push({
          name: segKey,
          value: v,
          valueText: cellText(row[measureField.name]),
          links: (row[stackName] && row[stackName].links) || []
        });
        stackTotals[segKey] = (stackTotals[segKey] || 0) + v;
        if (!stackSeen[segKey]) stackSeen[segKey] = {};
        if (!stackSeen[segKey][colKey]) {
          stackSeen[segKey][colKey] = true;
          stackOwners[segKey] = (stackOwners[segKey] || 0) + 1;
        }
      });

      columns = order.map(function (key) { return byColumn[key]; });
      columns.sort(function (a, b) { return b.weight - a.weight; });

      // Colour is assigned from the second dimension's own totals, in a fixed
      // order, so it follows the entity and never the position in a column.
      stackKeys = Object.keys(stackTotals).sort(function (a, b) {
        return stackTotals[b] - stackTotals[a];
      });

      // If every value of the second dimension belongs to exactly one column,
      // the two dimensions are a hierarchy: an engagement sits under one
      // client. Colouring by the second dimension is then pointless, because no
      // colour is ever shared between columns, and with more than eight values
      // most of the chart turns grey. Colour by column instead.
      nested = true;
      Object.keys(stackOwners).forEach(function (key) {
        if (stackOwners[key] > 1) nested = false;
      });
    }

    if (!columns.length) {
      drawMessage('No positive values to size columns by');
      return;
    }

    // Past the column limit the tail becomes unreadable slivers, so it is
    // grouped rather than drawn.
    var grouped = 0;
    if (columns.length > maxColumns) {
      var tail = columns.slice(maxColumns - 1);
      grouped = tail.length;
      var rest = {
        name: 'Other (' + grouped + ')',
        weight: 0,
        value: 0,
        links: [],
        segments: mode === 'mosaic' ? [] : null,
        isOther: true
      };
      tail.forEach(function (c) {
        rest.weight += c.weight;
        rest.value += (c.value || 0);
        if (mode === 'mosaic') rest.segments = rest.segments.concat(c.segments);
      });
      if (mode === 'variwide') {
        rest.rate = rest.value / rest.weight;
        rest.weightText = compact(rest.weight);
        rest.valueText = compact(rest.value);
      }
      columns = columns.slice(0, maxColumns - 1).concat([rest]);
    }

    var captionHeight = 0;
    if (config.show_caption && width >= 360) {
      var caption = document.createElement('div');
      caption.className = 'mrk-caption';
      // "Revenue per Hours" reads badly, so the width measure's name is put in
      // the singular for this one phrase. Only the two-measure layout has a
      // width measure at all.
      var totalWidthValue = columns.reduce(function (sum, c) { return sum + c.weight; }, 0);
      var totalHeightValue = columns.reduce(function (sum, c) { return sum + (c.value || 0); }, 0);

      caption.textContent = mode === 'variwide'
        ? 'Width: share of ' + widthField.label_short +
          ' (' + compact(totalWidthValue) + ' total)' +
          ' · Height: ' + heightField.label_short + ' per ' +
          widthField.label_short.replace(/s$/, '') +
          ' · Area: ' + heightField.label_short +
          ' (' + compact(totalHeightValue) + ' total)'
        : 'Width: share of ' + measureField.label_short + ' by ' + dims[0].label_short +
          ' (' + compact(columns.reduce(function (sum, c) { return sum + c.weight; }, 0)) + ' total)' +
          ' · Height: split of ' + measureField.label_short + ' by ' + dims[1].label_short +
          (nested ? ' · Colour: ' + dims[0].label_short : '');
      root.appendChild(caption);
      captionHeight = caption.offsetHeight || 20;
    }

    // Eight categorical slots in fixed order, never cycled: past eight the rest
    // fold into one "Other" colour.
    var slotFor = {};
    var legendHeight = 0;
    if (mode === 'mosaic' && !nested) {
      stackKeys.forEach(function (key, i) {
        slotFor[key] = i < 8 ? i : null;
      });

      if (width >= 300) {
        var legend = document.createElement('div');
        legend.className = 'mrk-legend';
        var shown = stackKeys.slice(0, 8);
        shown.forEach(function (key, i) {
          var item = document.createElement('div');
          item.className = 'mrk-key';
          var swatch = document.createElement('div');
          swatch.className = 'mrk-swatch';
          swatch.style.background = 'var(--mrk-c' + i + ')';
          var name = document.createElement('span');
          name.textContent = key;
          item.appendChild(swatch);
          item.appendChild(name);
          legend.appendChild(item);
        });
        if (stackKeys.length > 8) {
          var other = document.createElement('div');
          other.className = 'mrk-key';
          var otherSwatch = document.createElement('div');
          otherSwatch.className = 'mrk-swatch';
          otherSwatch.style.background = 'var(--mrk-other)';
          var otherName = document.createElement('span');
          otherName.textContent = 'Other (' + (stackKeys.length - 8) + ')';
          other.appendChild(otherSwatch);
          other.appendChild(otherName);
          legend.appendChild(other);
        }
        root.appendChild(legend);
        legendHeight = legend.offsetHeight || 20;
      }
    }

    // An empty option means "use the field's own name", so the chart is
    // labelled without the user doing anything, and can be overridden or
    // switched off.
    function axisTitle(option, auto) {
      if (config.show_axis_titles === false) return '';
      var given = (config[option] || '').trim();
      return given || auto || '';
    }

    var xTitle = axisTitle('x_axis_label', mode === 'variwide'
      ? 'Share of ' + widthField.label_short
      : 'Share of ' + measureField.label_short + ' by ' + dims[0].label_short);
    var yTitle = config.show_axis ? axisTitle('y_axis_label', mode === 'variwide'
      ? heightField.label_short + ' per ' + widthField.label_short.replace(/s$/, '')
      : 'Share of ' + measureField.label_short) : '';
    var xTitleBand = xTitle ? 16 : 0;
    var yTitleBand = yTitle ? 15 : 0;

    var noteHeight = (skipped || grouped) ? 15 : 0;
    var axisWidth = (config.show_axis ? 46 : 2) + yTitleBand;

    var plotLeft = axisWidth;
    var plotWidth = Math.max(20, width - plotLeft - 6);
    var plotTop = 2;

    var totalWeight = columns.reduce(function (sum, c) { return sum + c.weight; }, 0) || 1;
    var grandTotal = totalWeight;
    var gap = columns.length > 1 ? 2 : 0;
    var usableWidth = Math.max(10, plotWidth - gap * (columns.length - 1));

    // Column widths do not depend on the height, so they are worked out first:
    // whether any name is too narrow to sit flat decides how much room the
    // label band needs.
    columns.forEach(function (column) {
      column.pixels = Math.max(1, (column.weight / totalWeight) * usableWidth);
    });

    var nameHeight = 0;
    var rotateNames = false;
    if (config.show_column_labels) {
      var flatFont = fontOf(9);
      var needsRotation = 0;
      var longestName = 0;
      columns.forEach(function (column) {
        var flat = wrapLines(column.name, flatFont, column.pixels - 3, 2);
        if (!flat) {
          needsRotation++;
          longestName = Math.max(longestName, textWidth(column.name, flatFont));
        }
      });

      if (needsRotation) {
        // Turned on its side, a name that has no width has all the height it
        // needs. Costs some plot height, so only done when something would
        // otherwise be lost.
        rotateNames = true;
        nameHeight = Math.min(96, Math.max(34, Math.ceil(longestName) + 10));
      } else {
        nameHeight = 28;
      }
    }

    var plotHeight = Math.max(20, height - captionHeight - legendHeight - noteHeight -
      nameHeight - xTitleBand - plotTop);

    var maxRate = 0;
    if (mode === 'variwide') {
      columns.forEach(function (c) { maxRate = Math.max(maxRate, c.rate); });
      if (!maxRate) maxRate = 1;
    }

    var svg = el('svg', {
      class: 'mrk-plot',
      width: width,
      height: plotHeight + nameHeight + xTitleBand + noteHeight + plotTop
    });

    // Scale and gridlines behind everything, hairline and recessive.
    if (config.show_axis) {
      var ticks = [];
      if (mode === 'variwide') {
        var steps = Math.max(2, Math.min(5, Math.floor(plotHeight / 60)));
        var raw = maxRate / steps;
        var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
        var norm = raw / mag;
        var step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
        for (var t = 0; t <= maxRate * 1.001; t += step) ticks.push({ value: t, label: compact(t) });
      } else {
        [0, 0.25, 0.5, 0.75, 1].forEach(function (share) {
          ticks.push({ value: share, label: Math.round(share * 100) + '%' });
        });
      }

      ticks.forEach(function (tick) {
        var ratio = mode === 'variwide' ? tick.value / maxRate : tick.value;
        var y = Math.round(plotTop + plotHeight - ratio * plotHeight) + 0.5;
        svg.appendChild(el('line', {
          class: 'mrk-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
        }));
        // The topmost tick's baseline would sit above the tile on a short
        // plot, so labels are held inside it.
        var labelY = Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight);
        var label = el('text', {
          class: 'mrk-tick', x: plotLeft - 6, y: labelY, 'text-anchor': 'end'
        });
        label.textContent = tick.label;
        svg.appendChild(label);
      });
    }

    // One tooltip element, moved and refilled per column or cell.
    var tip = document.createElement('div');
    tip.className = 'mrk-tip';
    var tipName = document.createElement('div');
    tipName.className = 'mrk-tip-name';
    tip.appendChild(tipName);
    var tipBody = document.createElement('div');
    tip.appendChild(tipBody);

    function tipRow(key, value, strong) {
      var row = document.createElement('div');
      row.className = 'mrk-tip-row';
      var k = document.createElement('span');
      k.textContent = key;
      var v = document.createElement(strong ? 'b' : 'span');
      v.textContent = value;
      row.appendChild(k);
      row.appendChild(v);
      return row;
    }

    function showTip(title, rows, clientX, clientY) {
      tipName.textContent = title;
      while (tipBody.firstChild) tipBody.removeChild(tipBody.firstChild);
      rows.forEach(function (row) {
        if (row === null) {
          var sep = document.createElement('div');
          sep.className = 'mrk-tip-sep';
          tipBody.appendChild(sep);
          return;
        }
        tipBody.appendChild(tipRow(row[0], row[1], true));
      });
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

    var x = plotLeft;
    var thinTargets = [];

    columns.forEach(function (column, columnIndex) {
      var colWidth = column.pixels;
      var left = Math.round(x);
      var right = Math.round(x + colWidth);
      var boxWidth = Math.max(1, right - left);

      var group = el('g', { class: 'mrk-col', tabindex: '0', role: 'img' });

      var sharePct = (column.weight / totalWeight) * 100;
      var shareText = (sharePct < 1 ? sharePct.toFixed(1) : Math.round(sharePct)) + '%';

      if (mode === 'variwide') {
        var colHeight = Math.max(1, Math.round((column.rate / maxRate) * plotHeight));
        var top = plotTop + plotHeight - colHeight;

        var fill = 'var(--mrk-c0)';
        var ink = 'var(--mrk-k0)';
        if (column.isOther) {
          fill = 'var(--mrk-other)';
          ink = 'var(--mrk-other-ink)';
        } else if (config.shade_columns) {
          var step = Math.min(6, Math.max(0, Math.round((column.rate / maxRate) * 6)));
          fill = 'var(--mrk-s' + step + ')';
          ink = 'var(--mrk-i' + step + ')';
        }

        var rect = el('rect', {
          class: 'mrk-cell', x: left, y: top, width: boxWidth, height: colHeight,
          rx: Math.min(3, boxWidth / 2, colHeight / 2)
        });
        rect.style.fill = fill;
        group.appendChild(rect);

        group.setAttribute('aria-label',
          column.name + '. ' + widthField.label_short + ': ' + column.weightText +
          ' (' + shareText + ' of total). ' + heightField.label_short + ': ' + column.valueText +
          '. ' + heightField.label_short + ' per ' + widthField.label_short + ': ' +
          compact(column.rate) + '.');

        // The height is already the rate, so the figures the reader cannot get
        // from the axes go inside the column: the area measure first, then the
        // width measure, then the rate. Each is dropped from the bottom when
        // the column runs out of room.
        if (config.show_values !== false) {
          var room = boxWidth - 8;
          var stack = [
            { text: column.valueText || compact(column.value), weight: '600', sizes: [12, 11, 10, 9] },
            { text: column.weightText || compact(column.weight), sizes: [11, 10, 9], opacity: '0.86' },
            { text: compact(column.rate) + ' per ' + widthField.label_short.replace(/s$/, '').toLowerCase(),
              sizes: [10, 9], opacity: '0.7' }
          ];

          var cursor = top + 4;
          var budget = colHeight - 8;
          stack.forEach(function (entry) {
            if (budget < 10) return;
            var layout = layoutLabel(entry.text, {
              width: room, height: budget, sizes: entry.sizes, weight: entry.weight, maxLines: 2
            });
            if (!layout) return;
            drawLabel(group, layout, {
              cls: 'mrk-value', x: left + boxWidth / 2, top: cursor,
              fill: ink, weight: entry.weight, opacity: entry.opacity
            });
            cursor += layout.height + 1;
            budget -= layout.height + 1;
          });
        }

        group.addEventListener('pointermove', function (event) {
          showTip(column.name, [
            [widthField.label_short, column.weightText],
            ['Share of ' + widthField.label_short, shareText],
            [heightField.label_short, column.valueText],
            null,
            [heightField.label_short + ' per ' + widthField.label_short.replace(/s$/, ''), compact(column.rate)]
          ], event.clientX, event.clientY);
        });
      } else {
        var columnTotal = column.segments.reduce(function (sum, s) { return sum + s.value; }, 0) || 1;
        column.segments.sort(function (a, b) {
          var sa = slotFor[a.name] === null ? 99 : slotFor[a.name];
          var sb = slotFor[b.name] === null ? 99 : slotFor[b.name];
          return sa - sb;
        });

        var segGap = column.segments.length > 1 ? 2 : 0;
        var usableHeight = Math.max(4, plotHeight - segGap * (column.segments.length - 1));
        var y = plotTop;

        var columnSlot = columnIndex < 8 ? columnIndex : null;

        column.segments.forEach(function (segment) {
          var segHeight = Math.max(1, (segment.value / columnTotal) * usableHeight);
          var slot = nested ? columnSlot : slotFor[segment.name];
          if (column.isOther) slot = null;
          var fill = slot === null ? 'var(--mrk-other)' : 'var(--mrk-c' + slot + ')';
          var ink = slot === null ? 'var(--mrk-other-ink)' : 'var(--mrk-k' + slot + ')';

          var cell = el('rect', {
            class: 'mrk-cell', x: left, y: Math.round(y),
            width: boxWidth, height: Math.max(1, Math.round(segHeight)),
            rx: Math.min(3, boxWidth / 2, segHeight / 2)
          });
          cell.style.fill = fill;
          group.appendChild(cell);

          // Every tile answers for itself on hover, however small it is: a cell
          // with no room for a label is exactly the one a reader needs to point
          // at. The column's figures come along as context.
          var cellShare = Math.round((segment.value / columnTotal) * 100) + '%';
          var totalShare = ((segment.value / grandTotal) * 100);
          cell.addEventListener('pointermove', function (event) {
            showTip(segment.name, [
              [measureField.label_short, segment.valueText || compact(segment.value)],
              ['Share of ' + column.name, cellShare],
              ['Share of all ' + measureField.label_short, (totalShare < 1 ? totalShare.toFixed(1) : Math.round(totalShare)) + '%'],
              null,
              [dims[0].label_short, column.name]
            ], event.clientX, event.clientY);
            event.stopPropagation();
          });

          var segShare = (segment.value / columnTotal) * 100;

          // The name wraps and shrinks to fit; the figure and the share follow
          // while there is room. Anything that will not fit stays in the
          // tooltip rather than being clipped.
          var blocks = [];
          var nameLayout = layoutLabel(segment.name, {
            width: boxWidth - 10, height: Math.max(0, segHeight - 26),
            sizes: [11, 10, 9], weight: '600', maxLines: 3, keepTail: true
          });
          if (nameLayout) blocks.push({ layout: nameLayout, weight: '600' });

          var figure = config.show_values !== false
            ? (segment.valueText || compact(segment.value)) + '  ·  ' + Math.round(segShare) + '%'
            : Math.round(segShare) + '%';
          var used = nameLayout ? nameLayout.height : 0;
          var figureLayout = layoutLabel(figure, {
            width: boxWidth - 10, height: Math.max(0, segHeight - 6 - used),
            sizes: [11, 10, 9], maxLines: 1
          });
          if (!figureLayout) {
            figureLayout = layoutLabel(Math.round(segShare) + '%', {
              width: boxWidth - 10, height: Math.max(0, segHeight - 6 - used),
              sizes: [11, 10, 9], maxLines: 1
            });
          }
          if (figureLayout) blocks.push({ layout: figureLayout, opacity: '0.86' });

          if (blocks.length) {
            var stackHeight = blocks.reduce(function (sum, b) { return sum + b.layout.height; }, 0);
            var cursor = Math.round(y + (segHeight - stackHeight) / 2);
            blocks.forEach(function (block) {
              drawLabel(group, block.layout, {
                cls: 'mrk-value', x: left + boxWidth / 2, top: cursor,
                fill: ink, weight: block.weight, opacity: block.opacity
              });
              cursor += block.layout.height;
            });
          }

          y += segHeight + segGap;
        });

        group.setAttribute('aria-label',
          column.name + '. ' + measureField.label_short + ': ' + compact(column.weight) +
          ' (' + shareText + ' of total), across ' + column.segments.length + ' ' +
          dims[1].label_short + ' values.');

        group.addEventListener('pointermove', function (event) {
          var rows = [
            [measureField.label_short, compact(column.weight)],
            ['Share of total', shareText],
            null
          ];
          column.segments.slice(0, 6).forEach(function (segment) {
            rows.push([segment.name, segment.valueText]);
          });
          if (column.segments.length > 6) {
            rows.push(['and ' + (column.segments.length - 6) + ' more', '']);
          }
          showTip(column.name, rows, event.clientX, event.clientY);
        });
      }

      group.appendChild(el('rect', {
        class: 'mrk-outline', x: left, y: plotTop, width: boxWidth, height: plotHeight,
        fill: 'none'
      }));

      group.addEventListener('pointerleave', hideTip);
      group.addEventListener('focus', function () {
        var box = group.getBoundingClientRect();
        showTip(column.name, mode === 'variwide'
          ? [[widthField.label_short, column.weightText], [heightField.label_short, column.valueText]]
          : [[measureField.label_short, compact(column.weight)], ['Share of total', shareText]],
          box.left + box.width / 2, box.top + box.height / 2);
      });
      group.addEventListener('blur', hideTip);

      if (column.links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: column.links, event: event });
        };
        group.addEventListener('click', drill);
        group.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            drill(event);
          }
        });
      }

      // Column names sit under the plot. They wrap to two lines and shrink
      // before being dropped, because a client name is the thing a reader most
      // needs and Looker values are long.
      if (config.show_column_labels) {
        var flatLayout = wrapLines(column.name, fontOf(9), boxWidth - 3, 2)
          ? layoutLabel(column.name, {
              width: boxWidth - 3, height: Math.min(28, nameHeight) - 1,
              sizes: [11, 10, 9], maxLines: 2, keepTail: true
            })
          : null;

        if (flatLayout) {
          drawLabel(group, flatLayout, {
            cls: 'mrk-colname', x: left + boxWidth / 2, top: plotTop + plotHeight + 1
          });
        } else if (rotateNames) {
          var size = boxWidth >= 14 ? 10 : 9;
          var rotated = fit(column.name, fontOf(size), nameHeight - 8);
          if (rotated) {
            // Turned on its side, the glyphs sit either side of the baseline, so
            // a name on the outermost column can cross the tile edge. Hold it
            // inside the plot.
            var turnX = Math.min(
              Math.max(left + boxWidth / 2 + size * 0.36, plotLeft + size),
              plotLeft + plotWidth - size * 0.4
            );
            var turned = el('text', {
              class: 'mrk-colname',
              transform: 'translate(' + turnX + ',' +
                (plotTop + plotHeight + nameHeight - 4) + ') rotate(-90)',
              'text-anchor': 'start'
            });
            turned.style.fontSize = size + 'px';
            turned.textContent = rotated;
            group.appendChild(turned);
          }
        }
      }

      svg.appendChild(group);

      // Columns narrower than a pointer can comfortably hit get an invisible
      // target, added after the columns so it sits on top of them.
      if (boxWidth < 8) {
        thinTargets.push({ group: group, centre: left + boxWidth / 2 });
      }

      x += colWidth + gap;
    });

    thinTargets.forEach(function (target) {
      var hit = el('rect', {
        class: 'mrk-hit',
        x: Math.max(plotLeft, target.centre - 5),
        y: plotTop,
        width: 10,
        height: plotHeight,
        fill: 'transparent'
      });
      hit.addEventListener('pointermove', function (event) {
        target.group.dispatchEvent(new PointerEvent('pointermove', {
          clientX: event.clientX, clientY: event.clientY, bubbles: false
        }));
      });
      hit.addEventListener('pointerleave', hideTip);
      svg.appendChild(hit);
    });

    if (skipped || grouped) {
      var parts = [];
      if (grouped) parts.push(grouped + ' smallest grouped');
      if (skipped) parts.push(skipped + (skipped === 1 ? ' row' : ' rows') + ' with no positive value not shown');
      var note = el('text', {
        class: 'mrk-note', x: plotLeft,
        y: plotTop + plotHeight + nameHeight + xTitleBand + noteHeight - 3
      });
      note.textContent = parts.join('; ');
      svg.appendChild(note);
    }

    // Axis titles: x under the column names, y turned up the left edge. Dropped
    // rather than clipped, and in the muted text token, never a series colour.
    if (xTitle) {
      var xLaid = layoutLabel(xTitle, {
        width: plotWidth, height: xTitleBand, sizes: [11, 10, 9], maxLines: 1
      });
      if (xLaid) {
        drawLabel(svg, xLaid, {
          cls: 'mrk-axis-title', x: plotLeft + plotWidth / 2,
          top: plotTop + plotHeight + nameHeight, anchor: 'middle'
        });
      }
    }

    if (yTitle) {
      var yLaid = layoutLabel(yTitle, {
        width: plotHeight, height: yTitleBand, sizes: [11, 10, 9], maxLines: 1
      });
      if (yLaid) {
        var turnedTitle = el('text', {
          class: 'mrk-axis-title',
          transform: 'translate(' + (yTitleBand - 4) + ',' +
            (plotTop + plotHeight / 2) + ') rotate(-90)',
          'text-anchor': 'middle'
        });
        turnedTitle.style.fontSize = yLaid.size + 'px';
        turnedTitle.textContent = yLaid.lines[0];
        svg.appendChild(turnedTitle);
      }
    }

    root.appendChild(svg);
    root.appendChild(tip);
    }

    attempt();
  }
});
