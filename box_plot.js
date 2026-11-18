// Box Plot: the spread of one measure as quartiles and whiskers, one box per
// group. The compact sibling of the violin: same axis, same grouping, less ink.
//
// Query shape: 1 measure, optionally 1 dimension that names each row, and
// optionally a second dimension that splits the rows into one box per group.
// The grouping dimension is the one with fewer distinct values, as in the
// violin. Self-contained: no dependencies to declare in the manifest and
// nothing to load from a CDN at render time.
//
// The measure is on y, as in the violin (roadmap, Distribution: the axis
// carries the measure, not the frequency). Each box states its median and row
// count above it. The whisker rule is stated in the caption: by default the
// furthest row within 1.5 x IQR of the box, with every row beyond drawn as its
// own circle; or the lowest and highest row. A group of 1 to 4 rows has no
// quartiles worth drawing, so it is drawn as its rows and says so.
//
// Build v1.0.0. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('box_plot build v1.0.0');

/* visage:manifest
{ "id": "box_plot", "family": "distribution",
  "shapes": ["0d1m", "1d1m", "2d1m"],
  "checks": [
    { "fixture": "orders_by_channel" },
    { "fixture": "utilisation" },
    { "fixture": "resolution_times" },
    { "fixture": "deals_by_team" },
    { "fixture": "deals_by_team", "config": { "whiskers": "minmax", "show_mean": true, "percentile": 90, "show_points": true } },
    { "fixture": "orders_by_channel", "config": { "outliers": "exclude", "sort_by": "median" } }
  ] }
*/

(function () {
  var SPEC = {
    id: 'box_plot',
    label: 'Box Plot',
    version: '1.0.0',
    family: 'distribution',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 measure (a dimension names each row; a second gives one box per group)',
    good_for: [
      'Comparing the middle and the spread of one measure across many groups at once',
      'Finding the rows that sit far outside their own group',
      'A tile too small for a violin, or readers who know a box plot already'
    ],

    requires: {
      dims: 0,
      meas: 1,
      message: 'A box plot needs at least one measure: the value each row contributes. A dimension names each row; a second dimension splits the rows into one box per group.'
    },

    // Rules for this chart only. The shared tokens, legend, tooltip and axis
    // styles are already in the prelude.
    css:
      '.bx-band { fill: transparent; }' +
      '.bx-group { outline: none; cursor: default; }' +
      '.bx-group:hover .bx-band, .bx-group:focus-visible .bx-band { fill: var(--v-hairline); }' +
      '.bx-stat { stroke: var(--v-ink); stroke-width: 2; }' +
      '.bx-thin { stroke: var(--v-ink); stroke-width: 1.5; }' +
      '.bx-name { font-size: 11px; fill: var(--v-ink-2); }' +
      '.bx-value { fill: var(--v-ink); font-variant-numeric: tabular-nums; }' +
      '.bx-sub { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.bx-out { cursor: pointer; }'
  };

// visage:prelude v1 begin — generated from reference/prelude.js, do not edit here
  var V = (function () {
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    var scratch = document.createElement('canvas').getContext('2d');

    // Every fill is a custom property so the theme swaps without a redraw.
    // Dark is its own set of steps, not a flipped copy: the darkest steps of a
    // light scale disappear against a dark surface.
    var BASE_CSS =
      '.v-root {' +
      '  --v-surface: #f7f7fa; --v-ink: #151d2d; --v-ink-2: #475569;' +
      '  --v-muted: #94a3b8; --v-grid: #e5e7eb; --v-axis: #cbd5e1;' +
      '  --v-hairline: rgba(11,11,11,0.10);' +
      '  --v-c0: #525aff; --v-c1: #eb6834; --v-c2: #1baf7a;' +
      '  --v-c3: #eda100; --v-c4: #e87ba4; --v-c5: #008300;' +
      '  --v-c6: #ad93f1; --v-c7: #e34948; --v-other: #aab1c2;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--v-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.v-root.v-dark { --v-surface: #12121c; --v-ink: #ffffff;' +
      '  --v-ink-2: #cbd5e1; --v-muted: #94a3b8; --v-grid: #252a3a;' +
      '  --v-axis: #31384a; --v-hairline: rgba(255,255,255,0.10);' +
      '  --v-c0: #7078ff; --v-c1: #d95926; --v-c2: #199e70;' +
      '  --v-c3: #c98500; --v-c4: #d55181; --v-c5: #008300;' +
      '  --v-c6: #8f7ce8; --v-c7: #e66767; --v-other: #3a4054; }' +
      // Inset from the tile edge, and clear of the plot by 8px or more.
      // Flush into the corner reads as a mistake.
      '.v-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--v-ink-2); overflow: hidden; }' +
      '.v-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 220px; }' +
      '.v-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.v-swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }' +
      '.v-plot { display: block; }' +
      '.v-grid-line { stroke: var(--v-grid); stroke-width: 1; }' +
      '.v-axis-line { stroke: var(--v-axis); stroke-width: 1; }' +
      '.v-tick { font-size: 11px; fill: var(--v-muted);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.v-axis-title { font-size: 11px; fill: var(--v-muted); }' +
      '.v-label { font-size: 11px; fill: var(--v-ink); }' +
      '.v-value { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.v-caption { fill: var(--v-muted); }' +
      '.v-empty { font-size: 12px; fill: var(--v-muted); }' +
      '.v-mark { transition: filter 90ms ease-out; }' +
      '.v-hit { fill: transparent; cursor: pointer; }' +
      '.v-hit:hover ~ .v-mark, .v-hit:focus-visible ~ .v-mark { filter: brightness(1.09); }' +
      '.v-hit:focus { outline: none; }' +
      '.v-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--v-surface); color: var(--v-ink); border-radius: 6px;' +
      '  padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--v-hairline); }' +
      '.v-tip[data-shown="1"] { opacity: 1; }' +
      '.v-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.v-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--v-ink-2); }' +
      '.v-tip-row b { font-weight: 600; color: var(--v-ink);' +
      '  font-variant-numeric: tabular-nums; }';

    function el(name, attrs) {
      var node = document.createElementNS(SVG_NS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    // Measured with the real font. Never estimated from an average character
    // width, and nothing is ever clipped.
    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    function fit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '…', font) > room) cut = cut.slice(0, -1);
      if (cut.length < 3) return null;
      return cut + '…';
    }

    // Take the cut out of the middle and keep the tail: Looker values are
    // often distinguished only by their end ("... Phase 2" against "... Phase 3").
    function middleFit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var head = Math.ceil(text.length / 2);
      var tail = text.length - head;
      while (head + tail > 4) {
        if (head > tail) head--; else tail--;
        var tried = text.slice(0, head) + '…' + text.slice(text.length - tail);
        if (textWidth(tried, font) <= room) return tried;
      }
      return null;
    }

    // Wrap first, on word boundaries only. Never split a word down the middle:
    // "Liberis" as "Lib" and "eris" reads as two words.
    function wrapWords(text, font, room, maxLines) {
      var words = String(text).split(/\s+/).filter(Boolean);
      var lines = [];
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var tried = line ? line + ' ' + words[i] : words[i];
        if (textWidth(tried, font) <= room || !line) {
          line = tried;
        } else {
          lines.push(line);
          line = words[i];
          if (lines.length === maxLines) return null;
        }
      }
      if (line) lines.push(line);
      return lines.length > maxLines ? null : lines;
    }

    function cellNumber(cell) {
      return cell && cell.value != null && isFinite(cell.value) ? Number(cell.value) : null;
    }

    function cellText(cell) {
      if (!cell) return '';
      if (cell.rendered != null) return String(cell.rendered);
      return cell.value != null ? String(cell.value) : '';
    }

    function compact(value) {
      var abs = Math.abs(value);
      if (abs >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
      if (abs >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
      if (abs >= 1e3) return (value / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
      if (abs >= 10) return String(Math.round(value));
      if (abs === 0) return '0';
      if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
      return Number(value.toPrecision(2)).toString();
    }

    function niceStep(rough) {
      if (!(rough > 0)) return 1;
      var power = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
      var candidates = [1, 2, 2.5, 5, 10];
      for (var i = 0; i < candidates.length; i++) {
        if (power * candidates[i] >= rough) return power * candidates[i];
      }
      return power * 10;
    }

    function quantileOf(list, q) {
      if (!list.length) return null;
      var pos = (list.length - 1) * q;
      var base = Math.floor(pos);
      var rest = pos - base;
      if (list[base + 1] === undefined) return list[base];
      return list[base] + rest * (list[base + 1] - list[base]);
    }

    function toRgb(hex) {
      var clean = String(hex || '').replace('#', '');
      if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      var n = parseInt(clean, 16);
      if (!isFinite(n)) return null;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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

    // Text inside a coloured fill takes ink or white by measured contrast,
    // including a hue the user chose in the config, which has no paired token.
    function inkOn(fill) {
      var rgb = toRgb(fill);
      if (!rgb) return '#151d2d';
      var lum = luminance(rgb);
      var onInk = (Math.max(lum, 0.0176) + 0.05) / (Math.min(lum, 0.0176) + 0.05);
      var onWhite = (Math.max(lum, 1) + 0.05) / (Math.min(lum, 1) + 0.05);
      return onInk >= onWhite ? '#151d2d' : '#ffffff';
    }

    // Looker can call updateAsync before layout settles, so walk up to an
    // ancestor that has a size rather than bailing on a zero measurement.
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

    function brightnessOf(colour) {
      var parts = /rgba?\(([^)]+)\)/.exec(colour || '');
      if (!parts) return null;
      var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
      var alpha = channels.length > 3 ? channels[3] : 1;
      if (alpha <= 0.1) return null;
      return (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
    }

    // Match the tile, not the operating system. Walk up to and including
    // <html>: Looker paints its dashboard background high up and leaves
    // everything between transparent, so a walk that stops short finds nothing
    // and follows the laptop rather than the dashboard.
    function hostIsDark(element) {
      var node = element;
      while (node) {
        var background = brightnessOf(window.getComputedStyle(node).backgroundColor);
        if (background !== null) return background < 0.5;
        if (node === document.documentElement) break;
        node = node.parentElement || document.documentElement;
      }
      // Nothing painted a background. The text colour the host hands the tile
      // is a better second signal than the operating system.
      var inherited = brightnessOf(window.getComputedStyle(element).color);
      if (inherited !== null) return inherited > 0.6;
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Looker re-mounts a tile and hands updateAsync an element whose contents
    // have been wiped, so look the root up and rebuild it when it is missing,
    // on every render. Built with createElement because an instance with a
    // Trusted Types policy rejects an innerHTML assignment by throwing.
    function ensureRoot(element, extraCss) {
      var root = element.querySelector('.v-root');
      if (root) return root;
      while (element.firstChild) element.removeChild(element.firstChild);

      var style = document.createElement('style');
      style.textContent = BASE_CSS + (extraCss || '');
      element.appendChild(style);

      root = document.createElement('div');
      root.className = 'v-root';
      element.appendChild(root);
      return root;
    }

    function applyTheme(element, root, config) {
      var dark;
      if (config.theme === 'dark') dark = true;
      else if (config.theme === 'light') dark = false;
      else dark = hostIsDark(element);
      if (dark) root.classList.add('v-dark');
      else root.classList.remove('v-dark');
    }

    // One tooltip, moved and refilled per mark.
    function makeTip(root, width, height) {
      var tip = document.createElement('div');
      tip.className = 'v-tip';
      var name = document.createElement('div');
      name.className = 'v-tip-name';
      tip.appendChild(name);
      var body = document.createElement('div');
      tip.appendChild(body);
      root.appendChild(tip);

      return {
        node: tip,
        show: function (title, rows, clientX, clientY) {
          name.textContent = title;
          while (body.firstChild) body.removeChild(body.firstChild);
          (rows || []).forEach(function (row) {
            var line = document.createElement('div');
            line.className = 'v-tip-row';
            var key = document.createElement('span');
            key.textContent = row[0];
            var value = document.createElement('b');
            value.textContent = row[1];
            line.appendChild(key);
            line.appendChild(value);
            body.appendChild(line);
          });
          tip.setAttribute('data-shown', '1');

          var host = root.getBoundingClientRect();
          var px = clientX - host.left + 14;
          var py = clientY - host.top + 14;
          if (px + tip.offsetWidth > width - 4) px = Math.max(4, clientX - host.left - tip.offsetWidth - 14);
          if (py + tip.offsetHeight > height - 4) py = Math.max(4, clientY - host.top - tip.offsetHeight - 14);
          tip.style.left = Math.round(px) + 'px';
          tip.style.top = Math.round(py) + 'px';
        },
        hide: function () { tip.removeAttribute('data-shown'); }
      };
    }

    // An empty text option means "use the field's own name", so a chart is
    // labelled without the user doing anything, and can be overridden or
    // switched off.
    function axisTitle(config, option, auto) {
      if (config.show_axis_titles === false) return '';
      var given = (config[option] || '').trim();
      return given || auto || '';
    }

    // Draws both axis titles and returns the space they took, so the plot can
    // be laid out clear of them. Call it before measuring the plot area:
    // reserve the room first, or the title lands on the tick labels.
    function drawAxisTitles(config, svg, width, height, xAuto, yAuto) {
      var xText = axisTitle(config, 'x_axis_label', xAuto);
      var yText = axisTitle(config, 'y_axis_label', yAuto);
      var room = { bottom: 0, left: 0 };

      if (xText) {
        var x = el('text', {
          class: 'v-axis-title', x: width / 2, y: height - 4, 'text-anchor': 'middle'
        });
        x.textContent = xText;
        svg.appendChild(x);
        room.bottom = 16;
      }

      if (yText) {
        var y = el('text', {
          class: 'v-axis-title', x: 0, y: 0, 'text-anchor': 'middle',
          transform: 'translate(11,' + (height / 2) + ') rotate(-90)'
        });
        y.textContent = yText;
        svg.appendChild(y);
        room.left = 16;
      }

      return room;
    }

    // A colour option overrides the theme token; left at its default the token
    // wins, so an untouched chart still answers to a dark dashboard.
    function seriesColour(config, index) {
      var chosen = config.series_colours && config.series_colours[index];
      return chosen || 'var(--v-c' + (index % 8) + ')';
    }

    // Returns the object Looker registers. Everything that has ever blanked a
    // tile is handled here, so a draw() body cannot get it wrong.
    function chart(SPEC, OPTIONS, draw) {
      return {
        id: SPEC.id,
        label: SPEC.label,
        data_shape: SPEC.data_shape,
        good_for: SPEC.good_for || [],
        options: OPTIONS,

        create: function (element, config) {
          var root = ensureRoot(element, SPEC.css);
          applyTheme(element, root, config || {});
        },

        updateAsync: function (data, element, config, queryResponse, details, done) {
          this.clearErrors();

          var need = SPEC.requires || {};
          var fields = (queryResponse && queryResponse.fields) || {};
          var dims = fields.dimension_like || [];
          var meas = fields.measure_like || [];

          // Report bad input through addError rather than throwing, and call
          // done() so Looker does not spin forever.
          if (dims.length < (need.dims || 0) || meas.length < (need.meas || 0)) {
            this.addError({ title: 'Wrong query shape', message: need.message || '' });
            done();
            return;
          }

          var vis = this;
          var root = ensureRoot(element, SPEC.css);
          applyTheme(element, root, config);
          var attempts = 0;
          var finished = false;

          // done() exactly once, on every path.
          function settle() {
            if (finished) return;
            finished = true;
            done();
          }

          function attempt() {
            var size = measure(element);
            // Never bail when the element measures zero: retry across a few
            // frames, then fall back to a default size and draw anyway.
            if ((!size.width || !size.height) && attempts < 12) {
              attempts++;
              if (window.requestAnimationFrame) window.requestAnimationFrame(attempt);
              else window.setTimeout(attempt, 16);
              return;
            }

            var width = size.width || 600;
            var height = size.height || 400;

            try {
              while (root.firstChild) root.removeChild(root.firstChild);
              root.style.height = height + 'px';

              var c = {
                root: root,
                width: width,
                height: height,
                data: data,
                config: config,
                dims: dims,
                meas: meas,
                queryResponse: queryResponse,
                vis: vis,
                svg: function (cls) {
                  var node = el('svg', {
                    class: 'v-plot ' + (cls || ''), width: width, height: height
                  });
                  root.appendChild(node);
                  return node;
                },
                colour: function (index) { return seriesColour(config, index); },
                title: function (option, auto) { return axisTitle(config, option, auto); },
                axisTitles: function (node, xAuto, yAuto) {
                  return drawAxisTitles(config, node, width, height, xAuto, yAuto);
                },
                message: function (text) {
                  var node = el('svg', { class: 'v-plot', width: width, height: height });
                  var label = el('text', {
                    class: 'v-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
                  });
                  label.textContent = text;
                  node.appendChild(label);
                  root.appendChild(node);
                }
              };
              c.tip = makeTip(root, width, height);

              if (!data || !data.length) c.message('No results');
              else draw(c);
            } catch (err) {
              // An uncaught error blanks the tile silently.
              vis.addError({
                title: SPEC.label + ' failed to render',
                message: (err && err.message) || String(err)
              });
            }
            settle();
          }

          attempt();
        }
      };
    }

    return {
      el: el, fontOf: fontOf, textWidth: textWidth, fit: fit,
      middleFit: middleFit, wrapWords: wrapWords,
      cellNumber: cellNumber, cellText: cellText, compact: compact,
      niceStep: niceStep, quantileOf: quantileOf,
      toRgb: toRgb, mix: mix, toHex: toHex, luminance: luminance, inkOn: inkOn,
      measure: measure, hostIsDark: hostIsDark,
      ensureRoot: ensureRoot, applyTheme: applyTheme, makeTip: makeTip,
      axisTitle: axisTitle, drawAxisTitles: drawAxisTitles,
      seriesColour: seriesColour, chart: chart
    };
  })();
// visage:prelude v1 end

  // The panel the user sees. Baseline plus the distribution tier, inherited
  // from docs/roadmap.md, and the violin's controls where the two overlap so a
  // reader who knows one can predict the other.
  var OPTIONS = {
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
      label: 'One Box per Group',
      display: 'select',
      values: [{ 'Automatic': '' }],
      default: '',
      section: 'Data',
      order: 1
    },
    sort_by: {
      type: 'string',
      label: 'Order the Boxes by',
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
      values: [{ 'Keep All': 'include' }, { 'Pull Into Range (1st-99th Percentile)': 'clip' }, { 'Leave Out (Beyond 1.5 x IQR)': 'exclude' }],
      default: 'include',
      section: 'Data',
      order: 3
    },
    whiskers: {
      type: 'string',
      label: 'Whiskers Reach',
      display: 'select',
      values: [
        { 'Furthest Row Within 1.5 x IQR': 'tukey' },
        { 'Lowest and Highest Row': 'minmax' }
      ],
      default: 'tukey',
      section: 'Data',
      order: 4
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
      default: true,
      section: 'Statistics',
      order: 1
    },
    percentile: {
      type: 'number',
      label: 'Percentile Line (0 = Off)',
      default: 0,
      section: 'Statistics',
      order: 2
    },
    show_points: {
      type: 'boolean',
      label: 'Show Every Row as a Dot',
      default: false,
      section: 'Statistics',
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
    main_colour: {
      type: 'array',
      label: 'Box Colour',
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
    show_legend: {
      type: 'boolean',
      label: 'Show Legend',
      default: true,
      section: 'Style',
      order: 10
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
    }
  };

  // Below this many rows the quartiles are a guess, and a box drawn from them
  // claims more than the data shows. Those groups are drawn as their rows.
  var MIN_BOX_ROWS = 5;
  // Beyond this the boxes are thinner than their own outline.
  var MAX_GROUPS = 30;

  var CHART = V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config || {};
    var width = c.width;
    var height = c.height;
    var dims = c.dims;
    var meas = c.meas;

    function fieldByName(list, name, fallback) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) return list[i];
      }
      return fallback;
    }
    function nameOf(field) {
      return field ? (field.label_short || field.label || field.name) : '';
    }

    var valueField = fieldByName(meas, config.value_measure, meas[0]);

    // Which dimension makes the groups, when the reader has not said: the one
    // with fewer distinct values, as in the violin. The other one is the detail
    // that fills each box; grouping by it gives one row per box.
    function distinctCount(field) {
      var seen = {};
      var n = 0;
      c.data.forEach(function (row) {
        var key = String((row[field.name] && row[field.name].value) || '');
        if (!Object.prototype.hasOwnProperty.call(seen, key)) { seen[key] = 1; n++; }
      });
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
        if (count < fewest) { fewest = count; groupField = dims[di]; }
      }
    }

    // The identity dimension names each row on hover and carries its drill
    // links, so it is whichever dimension is not making the groups.
    var dimField = null;
    for (var oi = 0; oi < dims.length; oi++) {
      if (!groupField || dims[oi].name !== groupField.name) { dimField = dims[oi]; break; }
    }

    // --- The values --------------------------------------------------------
    var points = [];
    var nullRows = 0;
    c.data.forEach(function (row) {
      var value = V.cellNumber(row[valueField.name]);
      if (value === null) { nullRows++; return; }
      var cell = dimField ? row[dimField.name] : null;
      points.push({
        value: value,
        name: cell ? V.cellText(cell) : '',
        group: groupField ? V.cellText(row[groupField.name]) : '',
        links: (cell && cell.links) || []
      });
    });

    if (!points.length) {
      c.message('No numeric values in ' + nameOf(valueField));
      return;
    }

    // Extreme values are handled across the whole query rather than per group,
    // so every box keeps the same scale and the same rule. Same as the violin.
    var allSorted = points.map(function (p) { return p.value; }).sort(function (a, b) { return a - b; });
    var allQ1 = V.quantileOf(allSorted, 0.25);
    var allQ3 = V.quantileOf(allSorted, 0.75);
    var droppedOutliers = 0;
    var clippedOutliers = 0;
    if (config.outliers === 'exclude' && allQ3 > allQ1) {
      var low = allQ1 - 1.5 * (allQ3 - allQ1);
      var high = allQ3 + 1.5 * (allQ3 - allQ1);
      var kept = points.filter(function (p) { return p.value >= low && p.value <= high; });
      if (kept.length) { droppedOutliers = points.length - kept.length; points = kept; }
    } else if (config.outliers === 'clip') {
      var p1 = V.quantileOf(allSorted, 0.01);
      var p99 = V.quantileOf(allSorted, 0.99);
      points.forEach(function (p) {
        if (p.value < p1) { p.value = p1; clippedOutliers++; }
        else if (p.value > p99) { p.value = p99; clippedOutliers++; }
      });
    }

    // --- The groups --------------------------------------------------------
    var byName = {};
    var groups = [];
    points.forEach(function (p) {
      var key = groupField ? (p.group || '∅') : nameOf(valueField);
      if (!Object.prototype.hasOwnProperty.call(byName, key)) {
        byName[key] = { name: key, rows: [] };
        groups.push(byName[key]);
      }
      byName[key].rows.push(p);
    });

    var minmax = config.whiskers === 'minmax';
    var pct = Number(config.percentile);
    var showPercentile = pct > 0 && pct < 100;
    var totalRows = 0;

    groups.forEach(function (g) {
      g.rows.sort(function (a, b) { return a.value - b.value; });
      var values = g.rows.map(function (p) { return p.value; });
      var n = values.length;
      totalRows += n;
      g.values = values;
      g.count = n;
      g.min = values[0];
      g.max = values[n - 1];
      g.q1 = V.quantileOf(values, 0.25);
      g.median = V.quantileOf(values, 0.5);
      g.q3 = V.quantileOf(values, 0.75);
      g.mean = values.reduce(function (a, b) { return a + b; }, 0) / n;
      g.pct = showPercentile ? V.quantileOf(values, pct / 100) : null;
      g.boxed = n >= MIN_BOX_ROWS;

      // Tukey's rule: each whisker runs to the furthest row still within 1.5 x
      // IQR of the box, and every row beyond it is drawn on its own.
      var iqr = g.q3 - g.q1;
      var fenceLow = minmax ? -Infinity : g.q1 - 1.5 * iqr;
      var fenceHigh = minmax ? Infinity : g.q3 + 1.5 * iqr;
      g.lo = g.q1;
      g.hi = g.q3;
      g.outliers = [];
      g.rows.forEach(function (p) {
        if (p.value < fenceLow || p.value > fenceHigh) g.outliers.push(p);
        else {
          if (p.value < g.lo) g.lo = p.value;
          if (p.value > g.hi) g.hi = p.value;
        }
      });
    });

    if (config.sort_by === 'name') {
      groups.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (config.sort_by === 'median') {
      groups.sort(function (a, b) { return b.median - a.median; });
    } else if (config.sort_by === 'count') {
      groups.sort(function (a, b) { return b.count - a.count; });
    }

    var hiddenGroups = 0;
    if (groups.length > MAX_GROUPS) {
      hiddenGroups = groups.length - MAX_GROUPS;
      groups = groups.slice(0, MAX_GROUPS);
    }
    var thinGroups = groups.filter(function (g) { return !g.boxed; }).length;

    var dataMin = groups.reduce(function (m, g) { return Math.min(m, g.min); }, Infinity);
    var dataMax = groups.reduce(function (m, g) { return Math.max(m, g.max); }, -Infinity);
    var dataSpan = dataMax - dataMin;
    if (!(dataSpan > 0)) dataSpan = Math.max(1, Math.abs(dataMax) * 0.1);

    // --- Text ladder -------------------------------------------------------
    // Whole at each size first, then cut at the smallest, then nothing.
    function ladder(text, room, sizes, middle, weight) {
      for (var i = 0; i < sizes.length; i++) {
        if (V.textWidth(text, V.fontOf(sizes[i], weight)) <= room) return { text: text, size: sizes[i] };
      }
      var last = sizes[sizes.length - 1];
      var cut = (middle ? V.middleFit : V.fit)(text, V.fontOf(last, weight), room);
      return cut ? { text: cut, size: last } : null;
    }

    // --- Axis scale --------------------------------------------------------
    var showAxis = config.show_axis !== false && width >= 108 && height >= 100;
    var yStep = V.niceStep(dataSpan / (height < 200 ? 3 : 5));
    var axisMin = Math.floor(dataMin / yStep) * yStep;
    var axisMax = Math.ceil(dataMax / yStep) * yStep;
    if (!(axisMax > axisMin)) axisMax = axisMin + yStep;
    var yTicks = [];
    for (var tv = axisMin; tv <= axisMax + yStep * 1e-9; tv += yStep) yTicks.push(tv);
    if (yTicks.length > 9) yTicks = yTicks.filter(function (v, i) { return i % 2 === 0; });

    var xTitle = showAxis ? c.title('x_axis_label', nameOf(groupField)) : '';
    var yTitle = showAxis ? c.title('y_axis_label', nameOf(valueField)) : '';
    var xTitleBand = xTitle ? 16 : 0;
    var yTitleBand = yTitle ? 15 : 0;

    var leftPad = 6 + yTitleBand;
    if (showAxis) {
      var widestTick = yTicks.reduce(function (m, v) {
        return Math.max(m, V.textWidth(V.compact(v), V.fontOf(11)));
      }, 0);
      leftPad = Math.min(Math.ceil(widestTick) + 10 + yTitleBand, Math.floor(width * 0.34));
    }
    var plotLeft = leftPad;
    var plotWidth = Math.max(20, width - plotLeft - 8);
    var slotWidth = plotWidth / groups.length;

    // --- Group names -------------------------------------------------------
    // Wrap, then shrink, then turn on their side, then cut from the middle,
    // then drop. Anything lost stays in the tooltip.
    var showLegend = config.show_legend !== false && height >= 130;
    var captionSpace = showLegend ? 16 : 0;
    var showValues = config.show_values !== false;
    var topPad = Math.min(8 + (showValues ? 26 : 0), Math.floor(height * 0.3));
    var LINE_HEIGHT = 1.2;
    var nameRoom = Math.max(8, slotWidth - 4);
    var namePlan = null;

    if (showAxis && groupField) {
      var flatSizes = [12, 11, 10, 9];
      var maxLines = height >= 260 ? 3 : 2;
      for (var fi = 0; fi < flatSizes.length && !namePlan; fi++) {
        var font = V.fontOf(flatSizes[fi]);
        var laidAll = groups.map(function (g) {
          var lines = V.wrapWords(g.name, font, nameRoom, maxLines);
          // wrapWords keeps a single over-long word whole, so check every line.
          if (lines && lines.every(function (l) { return V.textWidth(l, font) <= nameRoom; })) return lines;
          return null;
        });
        if (laidAll.every(function (l) { return l; })) {
          var used = laidAll.reduce(function (m, l) { return Math.max(m, l.length); }, 1);
          namePlan = { mode: 'flat', size: flatSizes[fi], lines: laidAll,
            band: Math.ceil(used * flatSizes[fi] * LINE_HEIGHT) + 8 };
        }
      }
      if (!namePlan) {
        // Only as long as leaves the boxes 40% of the tile; past that a flat
        // cut keeps the boxes readable and loses little more.
        var sideRoom = Math.min(Math.floor(height * 0.38),
          height - topPad - captionSpace - 6 - xTitleBand - Math.max(40, Math.round(height * 0.4)) - 12);
        var sideLaid = groups.map(function (g) {
          return sideRoom >= 30 ? ladder(g.name, sideRoom, [11, 10, 9], true) : null;
        });
        // On their side a name has far more room than flat, so a cut there
        // keeps more of it. The slot must still be as wide as a line of text.
        if (slotWidth >= 12 && sideLaid.every(function (l) { return l; })) {
          var widestSide = sideLaid.reduce(function (m, l) {
            return Math.max(m, V.textWidth(l.text, V.fontOf(l.size)));
          }, 0);
          namePlan = { mode: 'side', laid: sideLaid, band: Math.ceil(widestSide) + 12 };
        }
      }
      if (!namePlan) {
        var cutLaid = groups.map(function (g) { return ladder(g.name, nameRoom, [11, 10, 9], true); });
        if (cutLaid.some(function (l) { return l; })) namePlan = { mode: 'cut', laid: cutLaid, band: 20 };
      }
    }

    var nameBand = namePlan ? namePlan.band : 0;

    // --- Vertical space ----------------------------------------------------
    var axisY = height - captionSpace - (6 + xTitleBand + nameBand);
    var plotTop = topPad;

    if (axisY - plotTop < 40 && nameBand) {
      namePlan = null;
      nameBand = 0;
      axisY = height - captionSpace - (6 + xTitleBand);
    }
    if (axisY - plotTop < 24) {
      showValues = false;
      plotTop = 4;
      axisY = height - captionSpace - 6;
    }
    if (axisY - plotTop < 10) {
      plotTop = 2;
      axisY = height - 2;
      showLegend = false;
      captionSpace = 0;
    }
    var plotHeight = axisY - plotTop;

    function yOf(value) {
      return axisY - ((value - axisMin) / (axisMax - axisMin)) * plotHeight;
    }

    var svg = c.svg();

    // Left at its default the theme token wins, so an untouched chart still
    // follows a dark dashboard.
    var chosen = config.main_colour && config.main_colour[0];
    var colour = chosen && String(chosen).toLowerCase() !== '#525aff' ? chosen : 'var(--v-c0)';

    // --- Axis --------------------------------------------------------------
    if (showAxis) {
      yTicks.forEach(function (value) {
        var y = Math.round(yOf(value)) - 0.5;
        if (y < plotTop - 1 || y > axisY + 1) return;
        svg.appendChild(V.el('line', { class: 'v-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y }));
        var laid = ladder(V.compact(value), leftPad - 8 - yTitleBand, [11, 10, 9], false);
        if (!laid) return;
        var label = V.el('text', { class: 'v-tick', x: plotLeft - 6, y: y + 4, 'text-anchor': 'end' });
        label.style.fontSize = laid.size + 'px';
        label.textContent = laid.text;
        svg.appendChild(label);
      });
    }
    svg.appendChild(V.el('line', {
      class: 'v-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
      y1: Math.round(axisY) + 0.5, y2: Math.round(axisY) + 0.5
    }));

    // --- Tooltip -----------------------------------------------------------
    function groupRows(g) {
      var rows = [['Rows', String(g.count)]];
      if (!g.boxed) {
        rows.push(['Median', V.compact(g.median)]);
        g.rows.slice(0, 4).forEach(function (p) { rows.push([p.name || 'Row', V.compact(p.value)]); });
        rows.push(['Box', 'Too few rows (under ' + MIN_BOX_ROWS + ')']);
        return rows;
      }
      rows.push(['Highest', V.compact(g.max)]);
      rows.push(['Upper whisker', V.compact(g.hi)]);
      rows.push(['Upper quartile', V.compact(g.q3)]);
      rows.push(['Median', V.compact(g.median)]);
      rows.push(['Mean', V.compact(g.mean)]);
      if (showPercentile) rows.push(['p' + (Math.round(pct * 10) / 10), V.compact(g.pct)]);
      rows.push(['Lower quartile', V.compact(g.q1)]);
      rows.push(['Lower whisker', V.compact(g.lo)]);
      rows.push(['Lowest', V.compact(g.min)]);
      rows.push(['Beyond whiskers', String(g.outliers.length)]);
      return rows;
    }

    function drillOn(node, links) {
      if (!links.length) return;
      var drill = function (event) {
        LookerCharts.Utils.openDrillMenu({ links: links, event: event });
      };
      node.addEventListener('click', function (event) { event.stopPropagation(); drill(event); });
      node.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
      });
    }

    // A dot's sideways nudge comes from its own name, not its place in the
    // list, so filtering a row out never shuffles the dots that remain.
    function jitterOf(p) {
      var text = String(p.name || p.value);
      var hash = 2166136261;
      for (var i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
      }
      return ((hash % 2000) / 1000) - 1;
    }

    // --- Boxes -------------------------------------------------------------
    var boxHalf = Math.max(3, Math.min(slotWidth * 0.28, 32));
    var valueCursor = -Infinity;
    var valueLabel = nameOf(valueField);

    groups.forEach(function (group, index) {
      var slotX = plotLeft + index * slotWidth;
      var cx = slotX + slotWidth / 2;

      var g = V.el('g', { class: 'bx-group', tabindex: '0', role: 'img' });
      g.setAttribute('aria-label', group.name + ': ' + group.count +
        (group.count === 1 ? ' row' : ' rows') + ', ' + valueLabel + ' median ' +
        V.compact(group.median) + (group.boxed
          ? ', middle half ' + V.compact(group.q1) + ' to ' + V.compact(group.q3) +
            ', ' + group.outliers.length + ' beyond the whiskers.'
          : ', too few rows for a box.'));

      // The whole slot is the hover and focus target, so a thin box is as easy
      // to point at as a wide one.
      g.appendChild(V.el('rect', {
        class: 'bx-band', x: Math.round(slotX), y: Math.round(plotTop),
        width: Math.max(1, Math.round(slotWidth)), height: Math.max(1, Math.round(plotHeight)), rx: 2
      }));

      function line(x1, y1, x2, y2, cls, dash) {
        var node = V.el('line', {
          class: cls, x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2)
        });
        if (cls === 'v-mark') { node.style.stroke = colour; node.style.strokeWidth = '1.5'; }
        if (dash) node.setAttribute('stroke-dasharray', dash);
        g.appendChild(node);
      }

      if (group.boxed) {
        var yq1 = yOf(group.q1);
        var yq3 = yOf(group.q3);
        var capHalf = boxHalf * 0.5;
        line(cx, yOf(group.hi), cx, yq3, 'v-mark');
        line(cx, yq1, cx, yOf(group.lo), 'v-mark');
        line(cx - capHalf, yOf(group.hi), cx + capHalf, yOf(group.hi), 'v-mark');
        line(cx - capHalf, yOf(group.lo), cx + capHalf, yOf(group.lo), 'v-mark');

        var box = V.el('rect', {
          class: 'v-mark', x: (cx - boxHalf).toFixed(2), y: Math.min(yq3, yq1).toFixed(2),
          width: (boxHalf * 2).toFixed(2), height: Math.max(1.5, Math.abs(yq1 - yq3)).toFixed(2), rx: 2
        });
        box.style.fill = colour;
        box.style.fillOpacity = '0.22';
        box.style.stroke = colour;
        box.style.strokeWidth = '1.5';
        g.appendChild(box);

        if (config.show_points) {
          var reach = boxHalf * 0.8;
          group.rows.slice(0, 400).forEach(function (p) {
            var dot = V.el('circle', {
              class: 'v-mark', cx: (cx + jitterOf(p) * reach).toFixed(2),
              cy: yOf(p.value).toFixed(2), r: 1.6
            });
            dot.style.fill = colour;
            dot.style.fillOpacity = '0.45';
            g.appendChild(dot);
          });
        }

        // The summary lines sit on a light tint of the box colour, so they take
        // the ink token, which the theme swaps.
        if (config.show_median !== false) line(cx - boxHalf, yOf(group.median), cx + boxHalf, yOf(group.median), 'bx-stat');
        if (config.show_mean) line(cx - boxHalf, yOf(group.mean), cx + boxHalf, yOf(group.mean), 'bx-thin', '4 3');
        if (showPercentile) line(cx - boxHalf, yOf(group.pct), cx + boxHalf, yOf(group.pct), 'bx-thin', '1.5 2.5');

        // Every row beyond the whiskers is its own circle, and answers for
        // itself on hover and drills to its own row.
        group.outliers.forEach(function (p) {
          var dot = V.el('circle', {
            class: 'v-mark bx-out', cx: cx.toFixed(2), cy: yOf(p.value).toFixed(2), r: 3
          });
          dot.style.fill = 'var(--v-surface)';
          dot.style.stroke = colour;
          dot.style.strokeWidth = '1.5';
          dot.addEventListener('pointermove', function (event) {
            event.stopPropagation();
            c.tip.show(p.name || group.name, [
              [valueLabel, V.compact(p.value)],
              ['Group', group.name],
              ['Beyond whisker', V.compact(p.value > group.hi ? group.hi : group.lo)]
            ], event.clientX, event.clientY);
          });
          drillOn(dot, p.links);
          g.appendChild(dot);
        });
      } else {
        // Too few rows for quartiles to mean anything: draw the rows and a
        // median tick, and say so above the group and in the caption.
        var spread = Math.min(boxHalf, 8);
        group.rows.forEach(function (p) {
          var dot = V.el('circle', {
            class: 'v-mark', cx: (cx + (group.count > 1 ? jitterOf(p) * spread : 0)).toFixed(2),
            cy: yOf(p.value).toFixed(2), r: 3
          });
          dot.style.fill = colour;
          g.appendChild(dot);
        });
        if (config.show_median !== false && group.count > 1) {
          line(cx - spread - 4, yOf(group.median), cx + spread + 4, yOf(group.median), 'bx-stat');
        }
      }

      // The figure leads: the median and the row count above each group, so a
      // reader does not have to hover to learn either.
      if (showValues) {
        var laidValue = ladder(V.compact(group.median), slotWidth - 4, [12, 11, 10, 9], false, '600');
        if (laidValue) {
          var vw = V.textWidth(laidValue.text, V.fontOf(laidValue.size, '600'));
          var vLeft = cx - vw / 2;
          if (vLeft < valueCursor + 3 || vLeft < 1 || vLeft + vw > width - 1) laidValue = null;
          else valueCursor = vLeft + vw;
        }
        if (laidValue) {
          var vText = V.el('text', { class: 'bx-value', x: cx.toFixed(2), y: Math.round(plotTop - 16), 'text-anchor': 'middle' });
          vText.style.fontSize = laidValue.size + 'px';
          vText.style.fontWeight = '600';
          vText.textContent = laidValue.text;
          g.appendChild(vText);

          var rowsText = 'n=' + group.count;
          var sub = group.boxed ? rowsText : rowsText + ', no box';
          var laidSub = ladder(sub, slotWidth - 4, [10, 9], false) ;
          if (laidSub && laidSub.text !== sub) laidSub = ladder(rowsText, slotWidth - 4, [10, 9], false);
          if (laidSub && plotTop >= 24) {
            var sText = V.el('text', { class: 'bx-sub', x: cx.toFixed(2), y: Math.round(plotTop - 5), 'text-anchor': 'middle' });
            sText.style.fontSize = laidSub.size + 'px';
            sText.textContent = laidSub.text;
            g.appendChild(sText);
          }
        }
      }

      g.addEventListener('pointermove', function (event) {
        c.tip.show(group.name, groupRows(group), event.clientX, event.clientY);
      });
      g.addEventListener('pointerleave', function () { c.tip.hide(); });
      g.addEventListener('focus', function () {
        var r = g.getBoundingClientRect();
        c.tip.show(group.name, groupRows(group), r.left + r.width / 2, r.top + r.height / 2);
      });
      g.addEventListener('blur', function () { c.tip.hide(); });

      var links = [];
      var seen = {};
      group.rows.forEach(function (p) {
        p.links.forEach(function (link) {
          var key = (link && link.url) || '';
          if (key && seen[key]) return;
          if (key) seen[key] = true;
          if (links.length < 12) links.push(link);
        });
      });
      drillOn(g, links);

      svg.appendChild(g);
    });

    // --- Group names -------------------------------------------------------
    if (namePlan) {
      groups.forEach(function (group, index) {
        var cx = plotLeft + index * slotWidth + slotWidth / 2;
        if (namePlan.mode === 'flat') {
          namePlan.lines[index].forEach(function (text, li) {
            var node = V.el('text', {
              class: 'bx-name', x: cx.toFixed(2),
              y: Math.round(axisY + 14 + li * namePlan.size * LINE_HEIGHT), 'text-anchor': 'middle'
            });
            node.style.fontSize = namePlan.size + 'px';
            node.textContent = text;
            svg.appendChild(node);
          });
          return;
        }
        var laid = namePlan.laid[index];
        if (!laid) return;
        var node = V.el('text', { class: 'bx-name', x: cx.toFixed(2), y: Math.round(axisY + 14), 'text-anchor': namePlan.mode === 'side' ? 'end' : 'middle' });
        node.style.fontSize = laid.size + 'px';
        if (namePlan.mode === 'side') {
          node.setAttribute('x', 0);
          node.setAttribute('y', 0);
          node.setAttribute('transform', 'translate(' + (Math.round(cx) + Math.round(laid.size / 3)) + ',' +
            Math.round(axisY + 6) + ') rotate(-90)');
        }
        node.textContent = laid.text;
        svg.appendChild(node);
      });
    }

    // --- Caption -----------------------------------------------------------
    // Names the whisker rule and every mark in play. Parts are in order of
    // importance, and the least important go first when the tile is narrow.
    if (showLegend) {
      var parts = [minmax
        ? 'Whiskers: lowest to highest row'
        : 'Whiskers: furthest row within 1.5 x IQR, circles beyond'];
      if (thinGroups) {
        parts.push(thinGroups + (thinGroups === 1 ? ' group' : ' groups') + ' under ' +
          MIN_BOX_ROWS + ' rows drawn as dots, no box');
      }
      var keys = ['Box: middle half'];
      if (config.show_median !== false) keys.push('Line: median');
      if (config.show_mean) keys.push('dashed: mean');
      if (showPercentile) keys.push('dotted: p' + (Math.round(pct * 10) / 10));
      parts.push(keys.join(', '));
      if (droppedOutliers) parts.push(droppedOutliers + ' extreme left out');
      if (clippedOutliers) parts.push(clippedOutliers + ' extreme pulled into range');
      if (hiddenGroups) parts.push(hiddenGroups + ' more groups not shown');
      if (nullRows) parts.push(nullRows + (nullRows === 1 ? ' row' : ' rows') + ' with no value not shown');
      parts.push(totalRows + ' rows');

      var room = width - 12;
      var caption = null;
      while (parts.length) {
        var whole = parts.join('. ');
        caption = ladder(whole, room, [11, 10, 9], false);
        if (caption && caption.text === whole) break;
        if (parts.length === 1) break;
        parts.pop();
      }
      if (caption) {
        var capText = V.el('text', { class: 'v-caption', x: 6, y: height - 5, 'text-anchor': 'start' });
        capText.style.fontSize = caption.size + 'px';
        capText.textContent = caption.text;
        svg.appendChild(capText);
      }
    }

    // --- Axis titles -------------------------------------------------------
    // Drawn here rather than by c.axisTitles, because the x title sits above
    // the caption and under the group names. Dropped rather than clipped.
    if (xTitle) {
      var xLaid = ladder(xTitle, plotWidth, [11, 10, 9], true);
      if (xLaid) {
        var xNode = V.el('text', {
          class: 'v-axis-title', x: plotLeft + plotWidth / 2, y: height - captionSpace - 4, 'text-anchor': 'middle'
        });
        xNode.style.fontSize = xLaid.size + 'px';
        xNode.textContent = xLaid.text;
        svg.appendChild(xNode);
      }
    }
    if (yTitle) {
      var yLaid = ladder(yTitle, plotHeight, [11, 10, 9], true);
      if (yLaid) {
        var yNode = V.el('text', {
          class: 'v-axis-title', 'text-anchor': 'middle',
          transform: 'translate(' + (yTitleBand - 3) + ',' + (plotTop + plotHeight / 2) + ') rotate(-90)'
        });
        yNode.style.fontSize = yLaid.size + 'px';
        yNode.textContent = yLaid.text;
        svg.appendChild(yNode);
      }
    }
  });

  // The field pickers can only be filled once the query is known, so the panel
  // is rebuilt when the fields change. Everything else is copied from the
  // literal above so nothing is lost in the rebuild.
  CHART._registerFieldOptions = function (dims, meas) {
    var signature = dims.concat(meas).map(function (f) { return f.name; }).join('|');
    if (this._optionSignature === signature) return;
    this._optionSignature = signature;

    var rebuilt = {};
    Object.keys(OPTIONS).forEach(function (key) {
      var copy = {};
      Object.keys(OPTIONS[key]).forEach(function (prop) { copy[prop] = OPTIONS[key][prop]; });
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
    rebuilt.group_by.values = [{ 'Automatic': '' }, { 'Nothing (One Box)': '__none__' }].concat(asValues(dims));
    this.trigger('registerOptions', rebuilt);
  };

  var baseUpdate = CHART.updateAsync;
  CHART.updateAsync = function (data, element, config, queryResponse, details, done) {
    var fields = (queryResponse && queryResponse.fields) || {};
    if ((fields.measure_like || []).length) {
      this._registerFieldOptions(fields.dimension_like || [], fields.measure_like);
    }
    baseUpdate.call(this, data, element, config, queryResponse, details, done);
  };

  looker.plugins.visualizations.add(CHART);
})();
