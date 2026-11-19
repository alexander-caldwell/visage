// Pie: what share of the total does each part take, for a handful of parts?
// A Donut option cuts a hole and puts the total in it.
//
// Query shape: 1 dimension + 1 measure. A second measure is ignored by the
// slices and shown in the tooltip.
//
// Slices start at 12 o'clock, largest first, clockwise. Five slices plus a
// grey Other by default, the cap the roadmap settled: past five, angles stop
// being comparable. Group the Tail sets the cap from 1 to 8.
//
// The number leads: each slice carries its figure when the figure fits inside
// it, in ink or white by measured contrast against the fill, and the key
// beside the pie states every part's share and absolute value. Rows with no
// value and rows below zero are left out of the total, and the caption says
// how many. Colour follows the part's name, never its rank, the same as the
// waffle.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.1.0. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('pie build v1.1.0');

/* visage:manifest
{ "id": "pie", "family": "part_to_whole",
  "shapes": ["1d1m", "1d2m"],
  "checks": [
    { "fixture": "treemap", "config": {} },
    { "fixture": "treemap", "config": { "donut": true } },
    { "fixture": "treemap", "config": { "max_slices": 8, "share_or_absolute": "share" } },
    { "fixture": "one_measure", "config": {} },
    { "fixture": "one_measure", "config": { "donut": true, "label_strategy": "value", "show_legend": false } },
    { "fixture": "progress_edge", "config": {} },
    { "fixture": "engagements", "config": { "donut": true } },
    { "fixture": "single_part", "config": {} },
    { "fixture": "single_part", "config": { "donut": true } }
  ] }
*/

(function () {
  var SPEC = {
    id: 'pie',
    label: 'Pie',
    version: '1.1.0',
    family: 'part_to_whole',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension + 1 measure',
    good_for: [
      'What share of the total each of a handful of parts takes, when the audience expects a pie',
      'Over the waffle when one or two parts dominate; past five parts, the waffle or a bar reads better'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A pie needs 1 dimension and 1 measure.'
    },

    css:
      '.pie-slice { stroke: var(--v-surface); stroke-linejoin: round; cursor: pointer; }' +
      '.pie-slice:hover { filter: brightness(1.09); }' +
      '.pie-slice:focus { outline: none; }' +
      '.pie-slice:focus-visible { stroke: var(--v-ink); stroke-width: 2; }' +
      '.pie-in { font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }' +
      '.pie-in-name { pointer-events: none; }' +
      '.pie-total { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.pie-head { fill: var(--v-ink-2); }' +
      '.pie-lead { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.pie-second { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.pie-name { fill: var(--v-ink); }' +
      '.pie-note { fill: var(--v-muted); }' +
      '.pie-ring { fill: none; stroke-width: 1.5; }' +
      '.pie-hit { fill: transparent; cursor: pointer; }' +
      '.pie-hit:focus { outline: none; }' +
      '.pie-hit:focus-visible { stroke: var(--v-axis); stroke-width: 1; }' +
      // The tooltip is where a cut name is read in full, so it wraps there
      // rather than taking an end ellipsis that loses "... Phase 2".
      '.v-tip-name { white-space: normal; }'
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
      '  --v-seq-0: #95acff; --v-seq-ink-0: #151d2d; --v-seq-1: #788cff; --v-seq-ink-1: #151d2d;' +
      '  --v-seq-2: #606dff; --v-seq-ink-2: #151d2d; --v-seq-3: #4c52f4; --v-seq-ink-3: #ffffff;' +
      '  --v-seq-4: #3b3dcb; --v-seq-ink-4: #ffffff; --v-seq-5: #2c2e9b; --v-seq-ink-5: #ffffff;' +
      '  --v-seq-6: #1e2368; --v-seq-ink-6: #ffffff;' +
      '  --v-neg-3: #9b3a3f; --v-neg-ink-3: #ffffff; --v-neg-2: #e85856; --v-neg-ink-2: #151d2d;' +
      '  --v-neg-1: #e4a0a2; --v-neg-ink-1: #151d2d; --v-neutral: #e5e7eb; --v-neutral-ink: #151d2d;' +
      '  --v-pos-1: #a3a8f4; --v-pos-ink-1: #151d2d; --v-pos-2: #525aff; --v-pos-ink-2: #ffffff;' +
      '  --v-pos-3: #3d45b6; --v-pos-ink-3: #ffffff;' +
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
      '  --v-c6: #8f7ce8; --v-c7: #e66767; --v-other: #3a4054;' +
      '  --v-seq-0: #c1d3ff; --v-seq-ink-0: #151d2d; --v-seq-1: #a5b9ff; --v-seq-ink-1: #151d2d;' +
      '  --v-seq-2: #8ba0ff; --v-seq-ink-2: #151d2d; --v-seq-3: #7286fb; --v-seq-ink-3: #151d2d;' +
      '  --v-seq-4: #7078ff; --v-seq-ink-4: #151d2d; --v-seq-5: #474ee0; --v-seq-ink-5: #ffffff;' +
      '  --v-seq-6: #372ad2; --v-seq-ink-6: #ffffff;' +
      '  --v-neg-3: #f0a4a4; --v-neg-ink-3: #151d2d; --v-neg-2: #e66767; --v-neg-ink-2: #151d2d;' +
      '  --v-neg-1: #87525d; --v-neg-ink-1: #ffffff; --v-neutral: #3a4054; --v-neutral-ink: #ffffff;' +
      '  --v-pos-1: #5259a1; --v-pos-ink-1: #ffffff; --v-pos-2: #7078ff; --v-pos-ink-2: #151d2d;' +
      '  --v-pos-3: #a9aeff; --v-pos-ink-3: #151d2d; }' +
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
    function seriesColour(config, options, index, key) {
      key = key || 'series_colours';
      var slot = key === 'series_colours' ? index : 0;
      var chosen = config[key] && config[key][slot];
      var option = options[key];
      var defaultColour = option && option.default && option.default[slot];
      if (chosen && String(chosen).toLowerCase() !== defaultColour) return chosen;
      return index < 8 ? 'var(--v-c' + index + ')' : 'var(--v-other)';
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
                colour: function (index, key) { return seriesColour(config, OPTIONS, index, key); },
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

  // The panel the user sees. Baseline plus the part-to-whole tier, inherited
  // from docs/roadmap.md, plus one Series Colours array for the parts and the
  // Donut switch. The axis-title trio has no axis to name here, so it names the
  // header instead: "Revenue by Client". The labels match the waffle's, so the
  // two read the same in the panel.
  var OPTIONS = {
    // The tier's default of 0 is kept so a saved config means the same thing
    // on every chart in the family; on the pie, 0 means the roadmap's five.
    max_slices: {
      type: 'number',
      label: 'Group the Tail After N Slices (0 = Five)',
      default: 0,
      section: 'Data',
      order: 0
    },
    share_or_absolute: {
      type: 'string',
      label: 'Lead With',
      display: 'select',
      values: [{ 'Absolute': 'absolute' }, { 'Share of Total (%)': 'share' }],
      default: 'absolute',
      section: 'Data',
      order: 1
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
    donut: {
      type: 'boolean',
      label: 'Donut with the Total in the Middle',
      default: false,
      section: 'Style',
      order: 1
    },
    label_strategy: {
      type: 'string',
      label: 'Labels',
      display: 'select',
      values: [{ 'Name and Value': 'both' }, { 'Name Only': 'name' }, { 'Value Only': 'value' }, { 'None': 'none' }],
      default: 'both',
      section: 'Style',
      order: 3
    },
    show_values: {
      type: 'boolean',
      label: 'Show Share and Value',
      default: true,
      section: 'Style',
      order: 4
    },
    series_colours: {
      type: 'array',
      label: 'Series Colours',
      display: 'colors',
      default: ['#525aff', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#ad93f1', '#e34948'],
      section: 'Style',
      order: 5
    },
    show_legend: {
      type: 'boolean',
      label: 'Show Key',
      default: true,
      section: 'Style',
      order: 10
    },
    show_axis_titles: {
      type: 'boolean',
      label: 'Show Header',
      default: true,
      section: 'Style',
      order: 20
    },
    x_axis_label: {
      type: 'string',
      label: 'Category Label',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 21
    },
    y_axis_label: {
      type: 'string',
      label: 'Measure Label',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 22
    }
  };

  var DEFAULT_COLOURS = OPTIONS.series_colours.default;
  var FIVE = 5;
  var TAU = Math.PI * 2;

  // Left at its default a slot takes the theme token, so an untouched chart
  // still follows a dark dashboard. A colour the user changed wins.
  function slotFill(config, slot) {
    var chosen = config.series_colours && config.series_colours[slot];
    return chosen && String(chosen).toLowerCase() !== DEFAULT_COLOURS[slot]
      ? chosen : 'var(--v-c' + slot + ')';
  }

  function hashOf(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h;
  }

  // Colour follows the part, never its rank. Each name takes the slot its hash
  // points at, or the next free one, placed in name order, so filtering one
  // part out repaints at most the parts that collided with it. Takes at most
  // eight names: past eight the tail is already folded into Other.
  function slotsFor(names) {
    var taken = {};
    var out = {};
    names.slice().sort().forEach(function (name) {
      var slot = hashOf(name) % 8;
      while (taken[slot]) slot = (slot + 1) % 8;
      taken[slot] = true;
      out[name] = slot;
    });
    return out;
  }

  function nameOf(field) {
    return field ? (field.label_short || field.label || field.name) : '';
  }

  // Looker hands a derived amount (a total, an Other) no rendered string of
  // its own, so it borrows a cell's: the same prefix, suffix and decimals,
  // when that rendered text is plainly the cell's value. Otherwise compact.
  function formatLike(cell, amount) {
    var text = cell && cell.rendered != null ? String(cell.rendered).trim() : '';
    var m = /^([^\d\-−]*)[-−]?(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(text);
    if (m && cell.value != null && isFinite(cell.value)) {
      var decimals = (m[2].split('.')[1] || '').length;
      var shown = Number(m[2].replace(/,/g, ''));
      if (Math.abs(shown - Math.abs(cell.value)) <= Math.pow(10, -decimals) / 2 + 1e-9) {
        return (amount < 0 ? '−' : '') + m[1] + Math.abs(amount).toLocaleString('en-US', {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals,
          useGrouping: m[2].indexOf(',') !== -1 || Math.abs(shown) < 1000
        }) + m[3];
      }
    }
    // Already compact ("£482.3k"): keep the prefix, compact the amount.
    var k = /^([^\d\-−]*)[-−]?\d[\d,.]*\s*(k|m|bn|K|M|B)$/.exec(text);
    return (k ? k[1] : '') + V.compact(amount);
  }

  // A cell with no rendered text borrows the format of a cell that has one.
  function valueText(cell, value, like) {
    return (cell && cell.rendered != null ? String(cell.rendered) : '') || formatLike(like || cell, value);
  }

  function pctText(p) {
    if (p === 0) return '0%';
    if (p > 0 && p < 0.1) return '<0.1%';
    // Near 100 a whole number would print 100% for a part just short of the
    // whole, so it keeps one decimal there.
    var digits = p < 10 || (p !== 100 && Math.round(p) === 100) ? 1 : 0;
    return p.toLocaleString('en-US', { maximumFractionDigits: digits }) + '%';
  }

  // Hover, focus and Enter or Space to drill, the same on every target.
  function answer(c, node, title, rows, links, focusable) {
    if (focusable) node.setAttribute('tabindex', '0');
    node.addEventListener('pointermove', function (event) {
      c.tip.show(title, rows, event.clientX, event.clientY);
    });
    node.addEventListener('pointerleave', c.tip.hide);
    // Chrome puts an SVG element with a focus listener in the tab order, so
    // the 100 cells only get one when they are the keyboard's way in.
    if (focusable) {
      node.addEventListener('focus', function () {
        var box = node.getBoundingClientRect();
        c.tip.show(title, rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      node.addEventListener('blur', c.tip.hide);
    }
    if (links && links.length) {
      var drill = function (event) {
        LookerCharts.Utils.openDrillMenu({ links: links, event: event });
      };
      node.addEventListener('click', drill);
      if (focusable) node.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
      });
    }
  }

  // Wrap, then shrink, then cut from the middle, then drop. Returns the lines
  // and the size they fit at, or null when the name is dropped.
  function fitName(text, room, maxHeight, top) {
    for (var s = top || 12; s >= 9; s--) {
      var lines = Math.floor(maxHeight / Math.ceil(s * 1.3));
      if (lines < 1) continue;
      var font = V.fontOf(s);
      var wrapped = V.wrapWords(text, font, room, lines);
      // wrapWords lets one long word overrun a line; that is not a fit.
      if (wrapped && wrapped.every(function (l) { return V.textWidth(l, font) <= room; })) {
        return { lines: wrapped, size: s };
      }
    }
    var cut = maxHeight >= 11 ? V.middleFit(text, V.fontOf(9), room) : null;
    return cut ? { lines: [cut], size: 9 } : null;
  }

  // One line of text at the largest size from 12 down to 9 that fits, cut
  // from the middle at 9 when nothing does.
  function fitLine(text, room, top) {
    for (var s = top || 12; s >= 9; s--) {
      if (V.textWidth(text, V.fontOf(s)) <= room) return { text: text, size: s };
    }
    var cut = V.middleFit(text, V.fontOf(9), room);
    return cut ? { text: cut, size: 9 } : null;
  }

  function text(svg, cls, x, y, size, content, anchor) {
    var t = V.el('text', { class: cls, x: x, y: y, 'font-size': size });
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = content;
    svg.appendChild(t);
    return t;
  }

  // Caption: one line of the full notes, then of the short form, then two
  // lines of each, shrinking 11 to 9. The full notes stay in its tooltip.
  function fitCaption(full, short, room) {
    var tries = [[full, 1], [short, 1], [full, 2], [short, 2]];
    for (var i = 0; i < tries.length; i++) {
      for (var s = 11; s >= 9; s--) {
        var lines = V.wrapWords(tries[i][0], V.fontOf(s), room, tries[i][1]);
        if (lines && lines.every(function (l) { return V.textWidth(l, V.fontOf(s)) <= room; })) {
          return { lines: lines, size: s };
        }
      }
    }
    var cut = V.middleFit(short, V.fontOf(9), room);
    return cut ? { lines: [cut], size: 9 } : null;
  }

  // A point at radius r and angle a, measured clockwise from 12 o'clock.
  function at(cx, cy, r, a) {
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }

  // A slice from a0 to a1 between radii r0 (0 for a pie) and r1. A whole
  // circle is two half arcs with no edge to the centre, since one arc cannot
  // start and end on the same point.
  function wedge(cx, cy, r0, r1, a0, a1) {
    if (a1 - a0 >= TAU - 1e-9) {
      var ring = function (r) {
        return 'M' + cx + ',' + (cy - r) + 'A' + r + ',' + r + ' 0 1 1 ' + cx + ',' + (cy + r) +
          'A' + r + ',' + r + ' 0 1 1 ' + cx + ',' + (cy - r) + 'Z';
      };
      // Drawn with fill-rule evenodd, so the inner circle cuts the hole.
      return ring(r1) + (r0 > 0 ? ' ' + ring(r0) : '');
    }
    var large = a1 - a0 > Math.PI ? 1 : 0;
    var p0 = at(cx, cy, r1, a0), p1 = at(cx, cy, r1, a1);
    var d = 'M' + p0 + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + p1;
    if (r0 > 0) {
      var q1 = at(cx, cy, r0, a1), q0 = at(cx, cy, r0, a0);
      return d + 'L' + q1 + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + q0 + 'Z';
    }
    return d + 'L' + cx + ',' + cy + 'Z';
  }

  // Does a w x h box centred on (x, y) sit inside the slice, clear of its
  // edges by `inset` px? Tested on the box's corners and edge midpoints.
  function boxInSlice(cx, cy, r0, r1, a0, a1, x, y, w, h, inset) {
    var whole = a1 - a0 >= TAU - 1e-9;
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        var px = x + i * w / 2 - cx, py = y + j * h / 2 - cy;
        var d = Math.sqrt(px * px + py * py);
        if (d > r1 - inset || (r0 > 0 && d < r0 + inset)) return false;
        if (whole || d < 1e-6) { if (whole) continue; return false; }
        var a = Math.atan2(px, -py);
        if (a < 0) a += TAU;
        // The perpendicular distance to each straight edge.
        if (a < a0 || a > a1) return false;
        if (Math.sin(Math.min(a - a0, Math.PI / 2)) * d < inset) return false;
        if (Math.sin(Math.min(a1 - a, Math.PI / 2)) * d < inset) return false;
      }
    }
    return true;
  }

  // The real colour behind a theme token, so the ink on it can be measured.
  function resolve(root, fill) {
    var m = /^var\((--[\w-]+)\)$/.exec(fill);
    return m ? window.getComputedStyle(root).getPropertyValue(m[1]).trim() : fill;
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    if (c.dims.length > 1) {
      c.message('A pie takes one dimension.');
      return;
    }

    var config = c.config;
    var W = c.width, H = c.height;
    var pad = W < 420 || H < 260 ? 8 : 14;
    var asShare = config.share_or_absolute === 'share';
    var strategy = config.label_strategy || 'both';
    var showNames = strategy === 'both' || strategy === 'name';
    var showFigures = config.show_values !== false && (strategy === 'both' || strategy === 'value');
    var keyOn = config.show_legend !== false && (showNames || showFigures);
    var donut = config.donut === true;

    // --- Work out the parts ---------------------------------------------------

    var dim = c.dims[0], m = c.meas[0], extra = c.meas[1];
    var parts = [], nulls = 0, negatives = [];
    c.data.forEach(function (r, i) {
      var cell = r[m.name];
      var v = V.cellNumber(cell);
      var name = V.cellText(r[dim.name]) || '∅';
      if (v === null) { nulls++; return; }
      if (v < 0) { negatives.push(name); return; }
      parts.push({ name: name, value: v, cell: cell, row: r, index: i, links: cell && cell.links });
    });
    var total = parts.reduce(function (s, x) { return s + x.value; }, 0);
    if (!parts.length || !(total > 0)) {
      c.message(parts.length ? 'Total of ' + nameOf(m) + ' is zero: nothing to divide.'
        : 'No values: every row is empty or below zero.');
      return;
    }
    // The first cell with rendered text sets the format for derived figures.
    var likeCell = (parts.filter(function (x) { return x.cell && x.cell.rendered != null; })[0] || parts[0]).cell;
    var totalText = formatLike(likeCell, total);

    // Largest first, so the tail that folds into Other is the smallest.
    parts.sort(function (a, b) { return b.value - a.value || a.index - b.index; });
    var asked = Math.floor(Number(config.max_slices) || 0);
    var keep = asked > 0 ? Math.min(asked, 8) : FIVE;
    var shown = parts.length > keep ? parts.slice(0, keep) : parts;
    var rest = parts.slice(shown.length);
    // Reserve the same slots as the other part-to-whole view before
    // applying this chart’s display limit.
    var slots = slotsFor(parts.slice(0, 8).map(function (x) { return x.name; }));

    var groups = shown.map(function (x) {
      return {
        name: x.name, value: x.value, cell: x.cell, row: x.row, links: x.links,
        text: valueText(x.cell, x.value, likeCell), fill: slotFill(config, slots[x.name])
      };
    });
    if (rest.length) {
      var restSum = rest.reduce(function (s, x) { return s + x.value; }, 0);
      // A tail of one keeps its own name; it is still grey, as Other.
      groups.push(rest.length === 1 ? {
        name: rest[0].name, value: rest[0].value, cell: rest[0].cell, row: rest[0].row, links: rest[0].links,
        text: valueText(rest[0].cell, rest[0].value, likeCell), fill: 'var(--v-other)'
      } : {
        name: 'Other (' + rest.length + ')', value: restSum, members: rest,
        text: formatLike(likeCell, restSum), fill: 'var(--v-other)'
      });
    }
    var a = 0;
    groups.forEach(function (g) {
      g.share = g.value / total * 100;
      g.a0 = a;
      a += g.value / total * TAU;
      g.a1 = Math.min(TAU, a);
      g.tip = [[nameOf(m), g.text], ['Share of Total', pctText(g.share)]];
      if (g.members) {
        g.tip.push(['Parts Grouped', String(g.members.length)]);
        // Name the grouped parts while the tooltip has room for them.
        g.members.slice(0, 6).forEach(function (x) {
          g.tip.push([x.name, valueText(x.cell, x.value, likeCell)]);
        });
        if (g.members.length > 6) g.tip.push(['and ' + (g.members.length - 6) + ' more', '']);
      } else if (extra) g.tip.push([nameOf(extra), V.cellText(g.row[extra.name]) || '∅']);
    });

    var yT = c.title('y_axis_label', nameOf(m));
    var xT = c.title('x_axis_label', nameOf(dim));
    var header = yT && xT ? yT + ' by ' + xT : yT || xT;

    var notes = [], shortNotes = [];
    var none = groups.filter(function (g) { return !g.value; });
    if (none.length) {
      notes.push(none.length === 1 ? none[0].name + ' is zero and has no slice.'
        : none.length + ' parts are zero and have no slice.');
      shortNotes.push(none.length + ' at zero.');
    }
    if (negatives.length) {
      notes.push((negatives.length === 1 ? negatives[0] + ' is below zero' : negatives.length + ' rows are below zero') +
        ' and left out: a pie cannot show a negative part.');
      shortNotes.push(negatives.length + ' below zero left out.');
    }
    if (nulls) {
      notes.push(nulls + (nulls === 1 ? ' row has' : ' rows have') + ' no value and ' + (nulls === 1 ? 'is' : 'are') + ' left out.');
      shortNotes.push(nulls + ' with no value left out.');
    }

    // --- Layout -----------------------------------------------------------------

    var svg = c.svg();
    var room = W - pad * 2;
    var y = pad;

    if (header) {
      // The donut states the total in its middle, so the header does not.
      var head = (!donut && fitLine(header + ' · ' + totalText + ' total', room, 12)) || fitLine(header, room, 12);
      if (head) {
        text(svg, 'pie-head', pad, y + 11, head.size, head.text);
        y += 22;
      }
    }

    var capFull = notes.join(' ');
    var cap = notes.length ? fitCaption(capFull, shortNotes.join(' '), room) : null;
    var capH = cap ? cap.lines.length * Math.ceil(cap.size * 1.3) + 8 : 0;

    var bodyH = Math.max(40, H - y - pad - capH);
    var side, gx, gy, kx, ky, kw, kh;
    if (!keyOn) {
      side = Math.min(room, bodyH);
      gx = pad + (room - side) / 2; gy = y;
    } else if (room >= bodyH * 1.3) {
      side = Math.min(bodyH, room * 0.5);
      gx = pad; gy = y;
      kx = pad + side + 16; ky = y; kw = room - side - 16; kh = bodyH;
    } else {
      side = Math.min(room, bodyH * 0.6);
      gx = pad + (room - side) / 2; gy = y;
      kx = pad; ky = y + side + 10; kw = room; kh = bodyH - side - 10;
    }

    var r1 = Math.max(4, side / 2 - 1);
    var r0 = donut ? r1 * 0.58 : 0;
    var cx = gx + side / 2, cy = gy + side / 2;

    // --- Slices -----------------------------------------------------------------

    groups.forEach(function (g) {
      if (!g.value) return;
      var arc = (g.a1 - g.a0) * r1;
      var path = V.el('path', {
        class: 'pie-slice v-mark', d: wedge(cx, cy, r0, r1, g.a0, g.a1), fill: g.fill, 'fill-rule': 'evenodd',
        // A thin slice keeps its colour rather than vanishing under the gap.
        'stroke-width': Math.min(1.5, arc / 4)
      });
      svg.appendChild(path);
      // The slice is the keyboard stop, however thin, in clockwise order.
      answer(c, path, g.name, g.tip, g.links, true);
      // Too thin to point at: an invisible target 10px wide at the rim.
      if (arc < 10) {
        var mid = (g.a0 + g.a1) / 2, half = 5 / r1;
        var hit = V.el('path', {
          class: 'pie-hit', d: wedge(cx, cy, Math.max(r0, r1 * 0.5), r1 + 4, mid - half, mid + half)
        });
        svg.appendChild(hit);
        answer(c, hit, g.name, g.tip, g.links, false);
      }
    });

    // --- Labels inside the slices ---------------------------------------------
    // The figure first; the name below it when both fit. A label that does
    // not fit is left to the key and the tooltip, never pushed over the edge.

    var labels = [];
    groups.forEach(function (g) {
      if (!g.value || (!showFigures && !showNames)) return;
      var whole = g.a1 - g.a0 >= TAU - 1e-9;
      // A whole donut already states its total and share in the middle.
      if (whole && donut) return;
      var mid = (g.a0 + g.a1) / 2;
      // A whole pie labels its centre; a donut labels its ring.
      var rl = whole && !donut ? 0 : donut ? (r0 + r1) / 2 : r1 * 0.62;
      var p = at(cx, cy, rl, mid);
      var ink = V.inkOn(resolve(c.root, g.fill));
      // One part is the whole: it says 100%, and the key and header carry the value.
      var lead = showFigures ? (asShare || whole ? pctText(g.share) : g.text) : null;
      var maxW = Math.min(150, donut ? (r1 - r0) * 1.6 : r1 * 1.1);
      // A narrower wrap makes a taller box, which suits a ring seen side on.
      var widths = [maxW, maxW * 0.7, maxW * 0.5];
      for (var s = 12; s >= 9; s--) {
        var lh = Math.ceil(s * 1.25);
        var tries = [];
        widths.forEach(function (mw) {
          var nameLines = showNames ? V.wrapWords(g.name, V.fontOf(s), mw, 3) : null;
          if (!nameLines || !nameLines.every(function (l) { return V.textWidth(l, V.fontOf(s)) <= mw; })) return;
          tries.push(lead ? [lead].concat(nameLines) : nameLines);
        });
        if (lead) tries.push([lead]);
        for (var t = 0; t < tries.length; t++) {
          var lines = tries[t];
          var w = lines.reduce(function (mx, l, k) {
            return Math.max(mx, V.textWidth(l, V.fontOf(s, lead && k === 0 ? 600 : 0)));
          }, 0);
          var h = lines.length * lh;
          if (boxInSlice(cx, cy, r0, r1, g.a0, g.a1, p[0], p[1], w, h, 3)) {
            labels.push({ lines: lines, size: s, lh: lh, x: p[0], y: p[1] - h / 2, ink: ink, bold: !!lead });
            return;
          }
        }
      }
    });
    labels.forEach(function (l) {
      l.lines.forEach(function (line, k) {
        var t = text(svg, l.bold && k === 0 ? 'pie-in' : 'pie-in-name', l.x, l.y + k * l.lh + l.size * 0.95, l.size, line, 'middle');
        t.setAttribute('fill', l.ink);
      });
    });

    // --- The total in the hole -----------------------------------------------------

    if (donut && r0 >= 18) {
      var holeW = r0 * 1.6;
      var compactTotal = (/^[^\d\-−]*/.exec(totalText) || [''])[0] + V.compact(total);
      var big = null;
      [totalText, compactTotal].some(function (txt) {
        for (var s = Math.min(28, Math.floor(r0 * 0.5)); s >= 10; s--) {
          if (V.textWidth(txt, V.fontOf(s, 600)) <= holeW) { big = { text: txt, size: s }; return true; }
        }
        return false;
      });
      if (big) {
        var subSize = Math.max(9, Math.min(12, Math.floor(big.size * 0.5)));
        var sub = fitLine('Total', holeW, subSize);
        if (groups.length === 1) {
          // One part is the whole. Its name goes in whole or not at all.
          var said = '100% ' + groups[0].name;
          sub = fitLine(said, holeW, subSize);
          if (!sub || sub.text !== said) sub = fitLine('100%', holeW, subSize);
        }
        var blockH = big.size + (sub ? sub.size + 4 : 0);
        var top = cy - blockH / 2;
        text(svg, 'pie-total', cx, top + big.size * 0.85, big.size, big.text, 'middle');
        if (sub) text(svg, 'pie-note', cx, top + big.size + 4 + sub.size * 0.85, sub.size, sub.text, 'middle');
      }
      var hole = V.el('circle', { class: 'pie-hit', cx: cx, cy: cy, r: r0 - 2 });
      svg.appendChild(hole);
      answer(c, hole, 'Total', [[nameOf(m), totalText], ['Parts', String(parts.length)]], null, false);
    }

    // --- Key ------------------------------------------------------------------------

    if (keyOn) {
      var count = groups.length;
      var rowH = Math.min(30, kh / count);
      var visible = groups;
      var moreH = 0;
      if (rowH < 12) {
        moreH = 14;
        visible = groups.slice(0, Math.max(1, Math.floor((kh - moreH) / 12)));
        rowH = 12;
      }
      var fs = Math.max(9, Math.min(12, Math.floor(rowH / 1.45)));
      var leadOf = function (g) { return asShare ? pctText(g.share) : g.text; };
      var secondOf = function (g) { return asShare ? g.text : pctText(g.share); };
      var fb = V.fontOf(fs, 600), fr = V.fontOf(fs);
      var widest = function (fn, font) {
        return visible.reduce(function (mx, g) { return Math.max(mx, V.textWidth(fn(g), font)); }, 0);
      };
      var sw = 16;
      var leadW = showFigures ? widest(leadOf, fb) : 0;
      var secW = showFigures ? widest(secondOf, fr) : 0;
      // The name keeps at least 48px; the second figure goes first, then
      // the lead shrinks to the tooltip.
      var withSecond = showFigures && (!showNames || kw - sw - leadW - secW - 20 >= 48) && sw + leadW + secW + 10 <= kw;
      if (!withSecond) secW = 0;
      var figW = showFigures ? leadW + (withSecond ? 10 + secW : 0) + 10 : 0;
      var nameRoom = kw - sw - figW;
      // Centred on the pie when the key is beside it and shorter than it.
      var listTop = ky + (kx > gx + side ? Math.max(0, (Math.min(kh, side) - visible.length * rowH - moreH) / 2) : 0);

      visible.forEach(function (g, i) {
        var top = listTop + i * rowH;
        var mid = top + rowH / 2;
        var hitRow = V.el('rect', { class: 'pie-hit', x: kx - 3, y: top, width: kw + 6, height: rowH, rx: 3 });
        svg.appendChild(hitRow);
        // The slices are the keyboard stops; a part with no slice is reached
        // through its key row instead.
        answer(c, hitRow, g.name, g.tip, g.links, !g.value);

        // A part with no slice keeps its colour as a ring, not a filled dot.
        svg.appendChild(V.el('circle', g.value
          ? { cx: kx + 5, cy: mid, r: 5, fill: g.fill }
          : { class: 'pie-ring', cx: kx + 5, cy: mid, r: 4.25, stroke: g.fill }));

        var base = mid + fs * 0.35;
        var x = kx + sw;
        if (showFigures && sw + leadW <= kw) {
          text(svg, 'pie-lead', x + leadW, base, fs, leadOf(g), 'end');
          x += leadW + 10;
          if (withSecond) {
            text(svg, 'pie-second', x + secW, base, fs, secondOf(g), 'end');
            x += secW + 10;
          }
        }
        if (showNames && nameRoom >= 24) {
          var nm = fitName(g.name, nameRoom, rowH - 2, fs);
          if (nm) {
            var lh = Math.ceil(nm.size * 1.3);
            var y0 = mid - (nm.lines.length - 1) * lh / 2 + nm.size * 0.35;
            nm.lines.forEach(function (line, k) {
              text(svg, 'pie-name', x, y0 + k * lh, nm.size, line);
            });
          }
        }
      });

      if (moreH) {
        var more = fitLine((groups.length - visible.length) + ' more: a taller tile lists them', kw, 10);
        if (more) text(svg, 'pie-note', kx, listTop + visible.length * rowH + 11, more.size, more.text);
      }
    }

    // --- Caption ------------------------------------------------------------------

    if (cap) {
      var lhC = Math.ceil(cap.size * 1.3);
      var capY = H - pad - (cap.lines.length - 1) * lhC - 3;
      cap.lines.forEach(function (line, k) {
        text(svg, 'v-caption', pad, capY + k * lhC, cap.size, line);
      });
      if (cap.lines.join(' ') !== capFull) {
        var capHit = V.el('rect', { class: 'pie-hit', x: pad, y: H - pad - capH + 4, width: room, height: capH - 4 });
        svg.appendChild(capHit);
        answer(c, capHit, 'Notes', notes.map(function (n) { return [n, '']; }), null, true);
      }
    }
  }));
})();
