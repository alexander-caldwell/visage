// Scatter: one dot per row, two measures placing it, a third sizing it.
//
// One file, three modes, because a bubble chart is a scatter with a size scale
// and a quadrant is a scatter with two reference lines:
//   size     a measure sizes the dots, with a legend for the scale
//   quadrant reference lines at a chosen midpoint, splitting the plot in four
//   trend    a least-squares line through the points
//
// Query shape: 1 dimension + 2 measures. A third measure sizes the dots.
// Self-contained: no dependencies to declare in the manifest.
//
// Build v2.0.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('scatter_plot build v2.0.0');

/* visage:manifest
{ "id": "scatter_plot", "family": "relationship",
  "shapes": ["1d2m", "1d4m"],
  "checks": [
    { "fixture": "example" },
    { "fixture": "engagements" },
    { "fixture": "wide_measures" },
    { "fixture": "wide_measures", "config": { "size_measure": "clients.headcount" }, "name": "wide_measures [bubble]" },
    { "fixture": "wide_measures", "config": { "show_quadrants": true }, "name": "wide_measures [quadrant]" },
    { "fixture": "wide_measures", "config": { "show_quadrants": true, "quadrant_by": "median" }, "name": "wide_measures [quadrant on median]" },
    { "fixture": "wide_measures", "config": { "trend_line": true }, "name": "wide_measures [trend]" },
    { "fixture": "wide_measures", "config": { "log_scale": true }, "name": "wide_measures [log]" },
    { "fixture": "wide_measures", "config": { "size_measure": "clients.headcount", "show_quadrants": true, "trend_line": true }, "name": "wide_measures [all on]" },
    { "fixture": "example", "config": { "zero_baseline": false }, "name": "example [free scale]" }
  ] }
*/

(function () {
  var SPEC = {
    id: 'scatter_plot',
    label: 'Scatter',
    version: '2.0.0',
    family: 'relationship',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension + 2 measures (a third measure sizes the dots)',
    good_for: [
      'Whether two measures move together, and which rows do not follow the pattern',
      'A third measure as dot size, so volume shows beside the relationship',
      'Splitting rows into four groups against a chosen midpoint on each axis'
    ],

    requires: {
      dims: 1,
      meas: 2,
      message: 'A scatter needs one dimension and at least two measures: the first places each dot across, the second up. A third measure can size the dots.'
    },

    css:
      '.v-ref { stroke: var(--v-axis); stroke-width: 1; stroke-dasharray: 4 4; }' +
      '.v-trend { fill: none; stroke-width: 2; stroke-dasharray: 6 4; opacity: 0.75; }' +
      '.v-quad { font-size: 10px; fill: var(--v-muted); }' +
      '.v-note { font-size: 10px; fill: var(--v-muted); }' +
      '.v-size-key { display: flex; gap: 10px; align-items: flex-end;' +
      '  padding: 2px 6px 9px; font-size: 10px; color: var(--v-muted); }' +
      '.v-size-key span { color: var(--v-ink-2); }'
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

  // The panel the user sees. Baseline plus the relationship tier, inherited
  // from docs/roadmap.md, plus the quadrant controls.
  var OPTIONS = {
    size_measure: {
      type: 'string',
      label: 'Measure That Sizes the Points',
      display: 'select',
      values: [{ 'None': '' }],
      default: '',
      section: 'Data',
      order: 2
    },
    zero_baseline: {
      type: 'boolean',
      label: 'Start Scale at Zero',
      default: false,
      section: 'Data',
      order: 1
    },
    log_scale: {
      type: 'boolean',
      label: 'Logarithmic Scale',
      default: false,
      section: 'Data',
      order: 4
    },
    trend_line: {
      type: 'boolean',
      label: 'Show Trend Line',
      default: false,
      section: 'Statistics',
      order: 0
    },
    show_quadrants: {
      type: 'boolean',
      label: 'Show Quadrant Lines',
      default: false,
      section: 'Statistics',
      order: 1
    },
    quadrant_by: {
      type: 'string',
      label: 'Quadrant Midpoint',
      display: 'select',
      applies_when: { option: 'show_quadrants', value: true, reason: 'Quadrant Lines are shown' },
      values: [{ 'Mean': 'mean' }, { 'Median': 'median' }, { 'Custom': 'custom' }],
      default: 'mean',
      section: 'Statistics',
      order: 2
    },
    quadrant_x: {
      type: 'number',
      label: 'Custom Midpoint Across',
      applies_when: { option: 'quadrant_by', value: 'custom', reason: 'Quadrant Midpoint is "Custom"' },
      default: 0,
      section: 'Statistics',
      order: 3
    },
    quadrant_y: {
      type: 'number',
      label: 'Custom Midpoint Up',
      applies_when: { option: 'quadrant_by', value: 'custom', reason: 'Quadrant Midpoint is "Custom"' },
      default: 0,
      section: 'Statistics',
      order: 4
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
      label: 'Point Colour',
      display: 'color',
      default: ['#525aff'],
      section: 'Style',
      order: 1
    },
    show_labels: {
      type: 'boolean',
      label: 'Label the Points',
      default: true,
      section: 'Style',
      order: 2
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

  var CHART = V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var width = c.width;
    var height = c.height;

    var nameField = c.dims[0];
    var xMeasure = c.meas[0];
    var yMeasure = c.meas[1];

    // The size measure is chosen, falling back to the third measure so a
    // three-measure query still sizes without touching the panel.
    var sizeMeasure = null;
    if (config.size_measure) {
      sizeMeasure = c.meas.filter(function (f) { return f.name === config.size_measure; })[0] || null;
    } else if (c.meas.length > 2) {
      sizeMeasure = c.meas[2];
    }

    var mainColour = (config.main_colour && config.main_colour[0]) || 'var(--v-c0)';
    var logScale = config.log_scale === true;

    // --- Points --------------------------------------------------------------

    var dots = [];
    var skipped = 0;
    c.data.forEach(function (row) {
      var x = V.cellNumber(row[xMeasure.name]);
      var y = V.cellNumber(row[yMeasure.name]);
      if (x === null || y === null) { skipped++; return; }
      // A log scale has nothing to say about zero or a negative number, so
      // those rows are left out and said so rather than silently misplaced.
      if (logScale && (x <= 0 || y <= 0)) { skipped++; return; }
      dots.push({
        name: V.cellText(row[nameField.name]),
        x: x, y: y,
        xText: V.cellText(row[xMeasure.name]),
        yText: V.cellText(row[yMeasure.name]),
        size: sizeMeasure ? V.cellNumber(row[sizeMeasure.name]) : null,
        sizeText: sizeMeasure ? V.cellText(row[sizeMeasure.name]) : '',
        links: (row[nameField.name] && row[nameField.name].links) || []
      });
    });

    if (!dots.length) {
      c.message(logScale ? 'No rows a log scale can place' : 'No rows with both measures');
      return;
    }

    dots.sort(function (a, b) { return b.x - a.x; });

    var label0 = function (f) { return f.label_short || f.label || f.name; };
    var yTitle = c.title('y_axis_label', label0(yMeasure));
    var xTitle = c.title('x_axis_label', label0(xMeasure));
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    // --- Scale ---------------------------------------------------------------

    function project(value, lo, hi) {
      if (!logScale) return (value - lo) / (hi - lo);
      return (Math.log(value) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    }

    var zeroed = config.zero_baseline === true && !logScale;
    var xs = dots.map(function (d) { return d.x; });
    var ys = dots.map(function (d) { return d.y; });
    var xPeak = Math.max.apply(null, xs);
    var yPeak = Math.max.apply(null, ys);
    var xTrough = Math.min.apply(null, xs);
    var yTrough = Math.min.apply(null, ys);

    var xMin, xMax, yMin, yMax, xTicks = [], yTicks = [];

    if (logScale) {
      // Whole powers of ten, which is the only tick a reader can place on a
      // log axis without doing arithmetic.
      xMin = Math.pow(10, Math.floor(Math.log(xTrough) / Math.LN10));
      xMax = Math.pow(10, Math.ceil(Math.log(xPeak) / Math.LN10));
      yMin = Math.pow(10, Math.floor(Math.log(yTrough) / Math.LN10));
      yMax = Math.pow(10, Math.ceil(Math.log(yPeak) / Math.LN10));
      if (xMax === xMin) xMax = xMin * 10;
      if (yMax === yMin) yMax = yMin * 10;
      for (var lx = xMin; lx <= xMax * 1.0000001; lx *= 10) xTicks.push(lx);
      for (var ly = yMin; ly <= yMax * 1.0000001; ly *= 10) yTicks.push(ly);
    } else {
      // Off zero, each axis starts a step below its lowest point, which spreads
      // a tight cluster out instead of squashing it into one corner.
      var xStep = V.niceStep((xPeak - (zeroed ? 0 : xTrough)) / 4);
      var yStep = V.niceStep((yPeak - (zeroed ? 0 : yTrough)) / (height < 220 ? 3 : 4));
      xMin = zeroed ? 0 : Math.floor(xTrough / xStep) * xStep;
      yMin = zeroed ? 0 : Math.floor(yTrough / yStep) * yStep;
      xMax = Math.max(xMin + xStep, Math.ceil(xPeak / xStep) * xStep);
      yMax = Math.max(yMin + yStep, Math.ceil(yPeak / yStep) * yStep);
      for (var xt = xMin; xt <= xMax + 1e-9; xt += xStep) xTicks.push(Number(xt.toFixed(10)));
      for (var yt = yMin; yt <= yMax + 1e-9; yt += yStep) yTicks.push(Number(yt.toFixed(10)));
    }

    // --- Room for the furniture ---------------------------------------------

    var tickFont = V.fontOf(11);
    var widest = yTicks.reduce(function (m, v) {
      return Math.max(m, V.textWidth(V.compact(v), tickFont));
    }, 0);

    // The size legend says what the scale means. Without it a bubble chart
    // asks the reader to guess how much ink is how much value.
    var legendHeight = 0;
    var sizes = dots.map(function (d) { return d.size; })
      .filter(function (v) { return v !== null; });
    var sizeMin = sizes.length ? Math.min.apply(null, sizes) : 0;
    var sizeMax = sizes.length ? Math.max.apply(null, sizes) : 0;
    var sizing = Boolean(sizeMeasure) && sizes.length > 0 && sizeMax !== sizeMin;

    function radiusFor(value) {
      if (value === null || !sizing) return 5;
      // Area, not radius, carries the value: doubling the number should look
      // like twice as much ink, not four times.
      var t = (value - sizeMin) / (sizeMax - sizeMin);
      return Math.sqrt(16 + t * 240) / 2;
    }

    if (sizing && config.show_legend !== false && width >= 260) {
      var key = document.createElement('div');
      key.className = 'v-size-key';
      var caption = document.createElement('span');
      caption.textContent = label0(sizeMeasure) + ':';
      key.appendChild(caption);
      // The smallest and the largest, labelled with the value Looker rendered
      // for that row, so the legend and the tooltip say the same thing. An
      // interpolated middle bubble would have to invent its own formatting.
      var ends = [sizeMin, sizeMax].map(function (value) {
        var match = dots.filter(function (d) { return d.size === value; })[0];
        return { value: value, text: (match && match.sizeText) || V.compact(value) };
      });
      ends.forEach(function (end) {
        var value = end.value;
        var cell = document.createElement('div');
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.gap = '4px';
        var r = radiusFor(value);
        var bubble = document.createElement('div');
        bubble.style.width = (r * 2) + 'px';
        bubble.style.height = (r * 2) + 'px';
        bubble.style.borderRadius = '50%';
        bubble.style.background = mainColour;
        bubble.style.opacity = '0.85';
        bubble.style.flex = '0 0 auto';
        var text = document.createElement('span');
        text.textContent = end.text;
        cell.appendChild(bubble);
        cell.appendChild(text);
        key.appendChild(cell);
      });
      c.root.appendChild(key);
      legendHeight = key.offsetHeight || 22;
    }

    // A footnote needs its own band, or it is drawn past the bottom of the SVG
    // and clipped by the tile.
    var noteBand = skipped ? 14 : 0;

    var plotLeft = yBand + Math.ceil(widest) + 10;
    var plotTop = 10;
    var tickBand = 18;
    var plotWidth = Math.max(20, width - plotLeft - 14);
    var plotHeight = Math.max(20, height - legendHeight - plotTop - tickBand - xBand - noteBand);

    var svg = c.svg();
    svg.setAttribute('height', Math.max(20, height - legendHeight));

    function xAt(value) { return plotLeft + project(value, xMin, xMax) * plotWidth; }
    function yAt(value) { return plotTop + plotHeight - project(value, yMin, yMax) * plotHeight; }

    // --- Grid and ticks ------------------------------------------------------

    yTicks.forEach(function (value) {
      var y = Math.round(yAt(value)) + 0.5;
      svg.appendChild(V.el('line', {
        class: 'v-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = V.el('text', {
        class: 'v-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = V.compact(value);
      svg.appendChild(label);
    });

    xTicks.forEach(function (value, i) {
      var x = Math.round(xAt(value)) + 0.5;
      svg.appendChild(V.el('line', {
        class: 'v-grid-line', x1: x, x2: x, y1: plotTop, y2: plotTop + plotHeight
      }));
      var anchor = i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle');
      var label = V.el('text', {
        class: 'v-tick', x: x, y: plotTop + plotHeight + 14, 'text-anchor': anchor
      });
      label.textContent = V.compact(value);
      svg.appendChild(label);
    });

    // --- Quadrants -----------------------------------------------------------

    if (config.show_quadrants) {
      var mid = config.quadrant_by || 'mean';
      var midX;
      var midY;
      if (mid === 'custom') {
        midX = Number(config.quadrant_x) || 0;
        midY = Number(config.quadrant_y) || 0;
      } else if (mid === 'median') {
        midX = V.quantileOf(xs.slice().sort(function (a, b) { return a - b; }), 0.5);
        midY = V.quantileOf(ys.slice().sort(function (a, b) { return a - b; }), 0.5);
      } else {
        midX = xs.reduce(function (s, v) { return s + v; }, 0) / xs.length;
        midY = ys.reduce(function (s, v) { return s + v; }, 0) / ys.length;
      }

      // Each line is labelled where it sits, rather than one readout in a
      // corner that lands on whatever happens to be drawn there.
      var midName = mid === 'custom' ? 'Midpoint' : mid === 'median' ? 'Median' : 'Mean';

      if (midX > xMin && midX < xMax) {
        var vx = Math.round(xAt(midX)) + 0.5;
        svg.appendChild(V.el('line', { class: 'v-ref', x1: vx, x2: vx, y1: plotTop, y2: plotTop + plotHeight }));
        var vText = midName + ' ' + V.compact(midX);
        var vRoom = plotLeft + plotWidth - vx - 6;
        var vAnchor = 'start';
        if (V.textWidth(vText, V.fontOf(10)) > vRoom) { vAnchor = 'end'; vRoom = vx - plotLeft - 6; }
        var vLaid = V.fit(vText, V.fontOf(10), vRoom);
        if (vLaid) {
          var vLabel = V.el('text', {
            class: 'v-quad', x: vx + (vAnchor === 'start' ? 4 : -4), y: plotTop + 9,
            'text-anchor': vAnchor
          });
          vLabel.textContent = vLaid;
          svg.appendChild(vLabel);
        }
      }
      if (midY > yMin && midY < yMax) {
        var hy = Math.round(yAt(midY)) + 0.5;
        svg.appendChild(V.el('line', { class: 'v-ref', x1: plotLeft, x2: plotLeft + plotWidth, y1: hy, y2: hy }));
        var hLaid = V.fit(midName + ' ' + V.compact(midY), V.fontOf(10), plotWidth - 8);
        if (hLaid && hy - plotTop > 14) {
          var hLabel = V.el('text', {
            class: 'v-quad', x: plotLeft + 3, y: hy - 4, 'text-anchor': 'start'
          });
          hLabel.textContent = hLaid;
          svg.appendChild(hLabel);
        }
      }

    }

    // --- Trend line ----------------------------------------------------------

    if (config.trend_line && dots.length > 1) {
      // Least squares, fitted in the space the axis is drawn in, so the line
      // is straight on the chart the reader is looking at.
      var px = dots.map(function (d) { return logScale ? Math.log(d.x) : d.x; });
      var py = dots.map(function (d) { return logScale ? Math.log(d.y) : d.y; });
      var n = dots.length;
      var meanX = px.reduce(function (s, v) { return s + v; }, 0) / n;
      var meanY = py.reduce(function (s, v) { return s + v; }, 0) / n;
      var num = 0;
      var den = 0;
      for (var i = 0; i < n; i++) {
        num += (px[i] - meanX) * (py[i] - meanY);
        den += (px[i] - meanX) * (px[i] - meanX);
      }
      if (den !== 0) {
        var slope = num / den;
        var lo = logScale ? Math.log(xMin) : xMin;
        var hi = logScale ? Math.log(xMax) : xMax;
        var at = function (v) { return meanY + slope * (v - meanX); };
        var y1 = at(lo);
        var y2 = at(hi);
        var toY = function (v) {
          var real = logScale ? Math.exp(v) : v;
          return yAt(Math.max(yMin, Math.min(yMax, real)));
        };
        var trend = V.el('line', {
          class: 'v-trend', x1: plotLeft, x2: plotLeft + plotWidth,
          y1: toY(y1), y2: toY(y2)
        });
        trend.style.stroke = mainColour;
        svg.appendChild(trend);
      }
    }

    // --- Dots ----------------------------------------------------------------

    var placed = [];

    dots.forEach(function (d) {
      var cx = xAt(d.x);
      var cy = yAt(d.y);
      var r = radiusFor(d.size);

      // A 2px ring in the surface colour keeps overlapping dots legible.
      var dot = V.el('circle', {
        class: 'v-mark', cx: cx, cy: cy, r: r, 'stroke-width': 2, tabindex: '0'
      });
      dot.style.fill = mainColour;
      dot.style.stroke = 'var(--v-surface)';
      dot.style.cursor = 'pointer';

      var rows = [[label0(xMeasure), d.xText], [label0(yMeasure), d.yText]];
      if (sizeMeasure) rows.push([label0(sizeMeasure), d.sizeText || '∅']);

      dot.addEventListener('pointermove', function (event) {
        c.tip.show(d.name, rows, event.clientX, event.clientY);
      });
      dot.addEventListener('pointerleave', c.tip.hide);
      dot.addEventListener('focus', function () {
        var box = dot.getBoundingClientRect();
        c.tip.show(d.name, rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      dot.addEventListener('blur', c.tip.hide);
      if (d.links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        };
        dot.addEventListener('click', drill);
        dot.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
        });
      }
      svg.appendChild(dot);

      // Direct labels, skipped where they would sit on top of one another or
      // run off the plot. What is skipped is still in the tooltip.
      var label = config.show_labels === false ? null : V.middleFit(d.name, V.fontOf(11), 130);
      if (label) {
        var labelWidth = V.textWidth(label, V.fontOf(11));
        var lx = cx + r + 5;
        var anchor = 'start';
        if (lx + labelWidth > plotLeft + plotWidth) {
          lx = cx - r - 5;
          anchor = 'end';
        }
        var left = anchor === 'start' ? lx : lx - labelWidth;
        var clashes = placed.some(function (box) {
          return Math.abs(box.y - cy) < 12 &&
            left < box.right + 6 && left + labelWidth + 6 > box.left;
        });
        if (!clashes && left >= plotLeft - 2 && cy > plotTop + 4 && cy < plotTop + plotHeight - 4) {
          var text = V.el('text', {
            class: 'v-label', x: lx, y: cy + 4, 'text-anchor': anchor
          });
          text.style.fill = 'var(--v-ink-2)';
          text.textContent = label;
          svg.appendChild(text);
          placed.push({ y: cy, left: left, right: left + labelWidth });
        }
      }
    });

    // --- Titles and the note -------------------------------------------------

    if (yTitle) {
      var yLaid = V.fit(yTitle, V.fontOf(11), plotHeight);
      if (yLaid) {
        var yLabel = V.el('text', {
          class: 'v-axis-title', x: 0, y: 0, 'text-anchor': 'middle',
          transform: 'translate(' + (yBand - 4) + ',' + (plotTop + plotHeight / 2) + ') rotate(-90)'
        });
        yLabel.textContent = yLaid;
        svg.appendChild(yLabel);
      }
    }
    if (xTitle) {
      var xLaid = V.fit(xTitle, V.fontOf(11), plotWidth);
      if (xLaid) {
        var xLabel = V.el('text', {
          class: 'v-axis-title', x: plotLeft + plotWidth / 2,
          y: plotTop + plotHeight + tickBand + 11, 'text-anchor': 'middle'
        });
        xLabel.textContent = xLaid;
        svg.appendChild(xLabel);
      }
    }

    if (skipped) {
      var skippedText = V.fit(
        skipped + (skipped === 1 ? ' row' : ' rows') +
        (logScale ? ' at or below zero not shown' : ' with a missing measure not shown'),
        V.fontOf(10), Math.max(0, width - plotLeft - 4));
      if (skippedText) {
        var footnote = V.el('text', {
          class: 'v-note', x: plotLeft, y: Math.max(20, height - legendHeight) - 3
        });
        footnote.textContent = skippedText;
        svg.appendChild(footnote);
      }
    }
  });

  // The size picker can only be filled once the query is known, so the panel is
  // rebuilt when the fields change. Everything else is copied from the literal
  // above so nothing is lost in the rebuild.
  CHART._registerSizeOptions = function (meas) {
    var signature = meas.map(function (f) { return f.name; }).join('|');
    if (this._optionSignature === signature) return;
    this._optionSignature = signature;

    var rebuilt = {};
    Object.keys(OPTIONS).forEach(function (key) {
      var copy = {};
      Object.keys(OPTIONS[key]).forEach(function (prop) { copy[prop] = OPTIONS[key][prop]; });
      rebuilt[key] = copy;
    });
    rebuilt.size_measure.values = [{ 'None': '' }].concat(meas.map(function (field) {
      var entry = {};
      entry[field.label_short || field.label || field.name] = field.name;
      return entry;
    }));
    this.trigger('registerOptions', rebuilt);
  };

  var baseUpdate = CHART.updateAsync;
  CHART.updateAsync = function (data, element, config, queryResponse, details, done) {
    var meas = (queryResponse && queryResponse.fields && queryResponse.fields.measure_like) || [];
    if (meas.length) this._registerSizeOptions(meas);
    baseUpdate.call(this, data, element, config, queryResponse, details, done);
  };

  looker.plugins.visualizations.add(CHART);
})();
