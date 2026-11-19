// Calendar Heatmap: one measure per day, laid out as weeks across and weekdays
// down, so seasonality, weekly rhythm and gaps show that a line hides.
//
// Query shape: 1 date dimension at day grain + 1 measure. Further measures are
// read out in the tooltip. A week, month or time grain is refused with a
// message naming the Date timeframe, not adapted: a week in one cell of seven
// would read as a single day.
//
// One band per calendar year, stacked, January on the left, so the same week
// of each year sits in the same column and one row of month names serves every
// band. At most three years are drawn, the most recent, which holds any range
// up to two years; the caption says what was left out. Weeks start on Monday
// unless Week Starts on says Sunday.
//
// A day inside the range with no row is an empty cell with a dashed outline.
// A null is a grey cell. A zero is a coloured cell. Days outside the range are
// not drawn.
//
// The colour scale, its steps, the caption and the keyboard grid are the
// heatmap's and the table's, so the three read as one family.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.1. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('calendar_heatmap build v1.0.1');

/* visage:manifest
{ "id": "calendar_heatmap", "family": "grid",
  "shapes": ["1d1m"],
  "checks": [
    { "fixture": "daily_subscriptions", "config": {} },
    { "fixture": "daily_subscriptions", "name": "diverging", "config": { "colour_scale": "diverging" } },
    { "fixture": "daily_subscriptions", "name": "diverging, mean, reversed, newest first, Sunday", "config": { "colour_scale": "diverging", "midpoint_mode": "mean", "reverse_scale": true, "sort_by": "desc", "week_start": "sunday" } },
    { "fixture": "daily_subscriptions", "name": "values off, chosen colour, total", "config": { "show_values": false, "main_colour": ["#1baf7a"], "show_totals": true } }
  ] }
*/

(function () {
  var SPEC = {
    id: 'calendar_heatmap',
    label: 'Calendar Heatmap',
    version: '1.0.1',
    family: 'grid',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 date dimension (day) + 1 measure',
    good_for: [
      'A daily measure over months, where the weekly rhythm, the season and the missing days are the point: orders, sign-ups, incidents',
      'Reach for it over a line when the reader needs to see which weekday or which week, and where the data stops'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A calendar heatmap needs 1 date dimension at day grain and 1 measure.'
    },

    // Rules for this chart only. The shared tokens, legend, tooltip and axis
    // styles are already in the prelude.
    //
    // The scale is the heatmap's and the table's, step for step: sequential
    // from the treemap's steps, diverging red below the midpoint and indigo
    // above with a grey middle and three steps per arm. Each fill has its own
    // ink token, picked by measured contrast.
    css:
      '.v-root { --hm-null: #eceef3; --hm-head: #eef0f5; }' +
      '.v-root.v-dark { --hm-null: #22263a; --hm-head: #1a1c2a; }' +
      '.hm-text { font-size: 12px; fill: var(--v-ink); font-variant-numeric: tabular-nums; }' +
      '.hm-head-text { fill: var(--v-ink-2); font-weight: 600; }' +
      '.hm-day-text { fill: var(--v-muted); }' +
      '.hm-missing { fill: transparent; stroke: var(--v-axis); stroke-width: 1; stroke-dasharray: 3 2; }' +
      '.hm-cell { cursor: pointer; outline: none; }' +
      '.hm-cell:hover .hm-fill { filter: brightness(1.09); }' +
      '.hm-cell:focus-visible .hm-fill { stroke: var(--v-ink); stroke-width: 2px; stroke-dasharray: none; }' +
      '.hm-ramp { display: inline-flex; height: 8px; width: 56px; border-radius: 2px; overflow: hidden;' +
      '  box-shadow: inset 0 0 0 1px var(--v-hairline); }' +
      '.hm-ramp i { flex: 1 1 auto; }' +
      '.hm-key { display: flex; gap: 6px; align-items: center; min-width: 0; white-space: nowrap; }' +
      '.hm-gap { width: 10px; height: 10px; border-radius: 2px; flex: 0 0 auto;' +
      '  box-sizing: border-box; border: 1px dashed var(--v-axis); }' +
      '.hm-nil { width: 10px; height: 10px; border-radius: 2px; flex: 0 0 auto; background: var(--hm-null); }'
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

  // The panel the user sees. Baseline plus the grid tier, inherited from
  // docs/roadmap.md, plus the day a week starts on.
  //
  // Two tier controls are reworded for a calendar, keeping their key, type and
  // default so a saved config means the same thing across the family. Weekday
  // rows cannot be sorted by size, so Sort Rows by orders the year bands. A
  // sum of days is wrong for an average, so totals are Looker's own query
  // total, shown in the caption.
  var OPTIONS = {
    colour_scale: {
      type: 'string',
      label: 'Colour Scale',
      display: 'select',
      values: [{ 'Sequential': 'sequential' }, { 'Diverging': 'diverging' }],
      default: 'sequential',
      section: 'Colour',
      order: 0
    },
    midpoint_mode: {
      type: 'string',
      label: 'Midpoint',
      display: 'select',
      applies_when: { option: 'colour_scale', value: 'diverging', reason: 'Colour Scale is "Diverging"' },
      values: [{ 'Zero': 'zero' }, { 'Mean': 'mean' }, { 'Custom': 'custom' }],
      default: 'zero',
      section: 'Colour',
      order: 1
    },
    midpoint_value: {
      type: 'number',
      label: 'Custom Midpoint',
      applies_when: { option: 'midpoint_mode', value: 'custom', reason: 'Midpoint is "Custom"' },
      default: 0,
      section: 'Colour',
      order: 2
    },
    reverse_scale: {
      type: 'boolean',
      label: 'Reverse the Scale',
      default: false,
      section: 'Colour',
      order: 3
    },
    sort_by: {
      type: 'string',
      label: 'Year Order',
      display: 'select',
      values: [{ 'Oldest First': 'query' }, { 'Newest First': 'desc' }],
      default: 'query',
      section: 'Data',
      order: 0
    },
    week_start: {
      type: 'string',
      label: 'Week Starts on',
      display: 'select',
      values: [{ 'Monday': 'monday' }, { 'Sunday': 'sunday' }],
      default: 'monday',
      section: 'Data',
      order: 1
    },
    show_totals: {
      type: 'boolean',
      label: 'Show the Query Total',
      default: false,
      section: 'Data',
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
      label: 'Cell Colour',
      display: 'color',
      default: ['#525aff'],
      section: 'Style',
      order: 1
    },
    show_values: {
      type: 'boolean',
      label: 'Show Value in Each Cell',
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
      placeholder: 'None',
      default: '',
      section: 'Style',
      order: 22
    }
  };

  var SIZES = [12, 11, 10, 9];
  var DAY = 86400000;
  var MAX_YEARS = 3;      // the most recent three calendar years: any two-year range
  var PAD = 6;

  function nameOf(field) {
    return field.label_short || field.label || field.name;
  }

  // Numbers shrink but never wrap or cut: a cut figure is a wrong figure.
  function shrink(text, room, weight, most) {
    for (var i = 0; i < SIZES.length; i++) {
      if (most && SIZES[i] > most) continue;
      if (V.textWidth(text, V.fontOf(SIZES[i], weight)) <= room) return SIZES[i];
    }
    return null;
  }

  // Whole days since 1970-01-01 in UTC, so no time zone can move a date.
  // Null for anything that is not a YYYY-MM-DD calendar date.
  function dayOf(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return new Date(t).getUTCDate() === +m[3] ? t / DAY : null;
  }
  function yearOf(day) { return new Date(day * DAY).getUTCFullYear(); }
  function jan1(year) { return Date.UTC(year, 0, 1) / DAY; }
  function says(day, opts) {
    opts.timeZone = 'UTC';
    return new Date(day * DAY).toLocaleDateString(undefined, opts);
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var qr = c.queryResponse || {};
    var measure = c.meas[0];

    if (qr.pivots && qr.pivots.length) { c.message('Remove the pivot: one value per day'); return; }
    if (c.dims.length !== 1) { c.message('Use 1 date dimension, at day grain'); return; }
    var dateField = c.dims[0];
    // Refused rather than adapted: a week drawn in one cell of seven would
    // read as a single day.
    var grain = /^date_(\w+)$/.exec(dateField.type || '');
    if (grain && grain[1] !== 'date') {
      c.message(nameOf(dateField) + ' is by ' + grain[1].replace(/_/g, ' ') + ': use its Date timeframe');
      return;
    }

    // --- The days ------------------------------------------------------------

    var byDay = {};
    var days = [];
    var undated = 0;
    var notDate = false;
    c.data.forEach(function (row) {
      var cell = row[dateField.name] || {};
      if (cell.value == null) { undated++; return; }
      var day = dayOf(cell.value);
      if (day === null) { notDate = true; return; }
      if (!(day in byDay)) { byDay[day] = row; days.push(day); }
    });
    if (notDate) { c.message(nameOf(dateField) + ' is not a date at day grain'); return; }
    if (!days.length) { c.message('No rows with a date'); return; }

    // Rows arrive in any order; the calendar orders them itself.
    days.sort(function (a, b) { return a - b; });
    var last = days[days.length - 1];
    var lastYear = yearOf(last);
    var firstYear = Math.max(yearOf(days[0]), lastYear - MAX_YEARS + 1);
    var dropped = 0;
    while (days[dropped] < jan1(firstYear)) dropped++;
    var first = days[dropped];

    var years = [];
    for (var y = firstYear; y <= lastYear; y++) years.push(y);
    if (config.sort_by === 'desc') years.reverse();

    var start = config.week_start === 'sunday' ? 0 : 1;
    function rowOf(day) { return (new Date(day * DAY).getUTCDay() - start + 7) % 7; }
    // Each year starts at column 0, so the same week of every year lines up.
    function colOf(day) {
      var j = jan1(yearOf(day));
      return Math.floor((day - j + rowOf(j)) / 7);
    }

    var minCol = Infinity;
    var maxCol = 0;
    years.forEach(function (year) {
      minCol = Math.min(minCol, colOf(Math.max(first, jan1(year))));
      maxCol = Math.max(maxCol, colOf(Math.min(last, jan1(year + 1) - 1)));
    });

    // undefined: no row for this day. {} with a null value: a null.
    function cellOf(day) { return byDay[day] ? byDay[day][measure.name] || {} : undefined; }

    var nums = [];
    var hasMissing = false;
    var hasNull = false;
    for (var d = first; d <= last; d++) {
      var cell = cellOf(d);
      if (!cell) { hasMissing = true; continue; }
      var v = V.cellNumber(cell);
      if (v === null) hasNull = true;
      else nums.push(v);
    }
    var stats = {
      min: nums.length ? Math.min.apply(null, nums) : 0,
      max: nums.length ? Math.max.apply(null, nums) : 0,
      mean: nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0
    };

    // --- Colour, the heatmap's ----------------------------------------------------

    var diverging = config.colour_scale === 'diverging';
    var reverse = config.reverse_scale === true;
    var chosen = config.main_colour && config.main_colour[0];
    // Left at its default the theme token wins, so an untouched calendar still
    // answers to a dark dashboard.
    var custom = chosen && String(chosen).toLowerCase() !== '#525aff' ? V.toRgb(chosen) : null;

    function midpoint() {
      if (config.midpoint_mode === 'mean') return stats.mean;
      if (config.midpoint_mode === 'custom') return Number(config.midpoint_value) || 0;
      return 0;
    }

    function customStep(t) {
      var rgb = t < 0.5
        ? V.mix(V.mix(custom, [255, 255, 255], 0.65), custom, t * 2)
        : V.mix(custom, [21, 29, 45], t - 0.5);
      return V.toHex(rgb);
    }

    // Returns { fill, ink } for a cell.
    function toneOf(value) {
      if (value === null) return { fill: 'var(--hm-null)', ink: 'var(--v-ink-2)' };
      if (diverging) {
        var mid = midpoint();
        var reach = Math.max(Math.abs(stats.max - mid), Math.abs(stats.min - mid));
        var s = reach ? (value - mid) / reach : 0;
        if (reverse) s = -s;
        // Equal steps either side, so distance from the middle means the same
        // on both arms. The middle itself is grey, never a hue.
        var step = Math.min(3, Math.round(Math.abs(s) * 3));
        if (!step) return { fill: 'var(--v-neutral)', ink: 'var(--v-neutral-ink)' };
        return s < 0
          ? { fill: 'var(--v-neg-' + step + ')', ink: 'var(--v-neg-ink-' + step + ')' }
          : { fill: 'var(--v-pos-' + step + ')', ink: 'var(--v-pos-ink-' + step + ')' };
      }
      var t = stats.max === stats.min ? 0.5 : (value - stats.min) / (stats.max - stats.min);
      if (reverse) t = 1 - t;
      if (custom) {
        // A chosen hue has no paired token, so its ink is measured.
        var hex = customStep(t);
        return { fill: hex, ink: V.inkOn(hex) };
      }
      var k = Math.round(t * 6);
      return { fill: 'var(--v-seq-' + k + ')', ink: 'var(--v-seq-ink-' + k + ')' };
    }

    // --- Layout ---------------------------------------------------------------

    var svg = c.svg('hm-plot');
    var caption = legendNode();
    var captionH = 0;
    if (caption) {
      c.root.appendChild(caption);
      captionH = caption.offsetHeight || 22;
    }
    var H = Math.max(60, c.height - captionH);
    var W = c.width;
    svg.setAttribute('height', H);

    var xTitle = c.title('x_axis_label', nameOf(dateField));
    // The weekday names label the rows, so there is no field to name them by
    // default. A supplied title is drawn.
    var yTitle = c.title('y_axis_label', '');
    var topBand = xTitle ? 18 : 0;
    var leftBand = yTitle ? 16 : 0;
    var monthH = 16;
    var bandGap = 8;
    var yearW = 16;
    var nCols = maxCol - minCol + 1;
    var nBands = years.length;
    var gridY = topBand + monthH;

    var dayNames = [];
    for (var r = 0; r < 7; r++) dayNames.push(says(3 + (start + r) % 7, { weekday: 'short' }));  // day 3 was a Sunday

    // Weekday names on every row where there is room, every other row where
    // there is not, otherwise dropped to the tooltip and their room given back.
    function cellFor(dayW) {
      return Math.max(1, Math.min(48,
        (W - leftBand - yearW - dayW - 4) / nCols,
        (H - gridY - bandGap * (nBands - 1) - 4) / (7 * nBands)));
    }
    function widest(size) {
      return Math.ceil(Math.max.apply(null, dayNames.map(function (n) { return V.textWidth(n, V.fontOf(size)); }))) + PAD;
    }
    var cellSize = cellFor(widest(11));
    var dayEvery = cellSize >= 12 ? 1 : cellSize >= 6 ? 2 : 0;
    var daySize = 0;
    [11, 10, 9].forEach(function (s) { if (!daySize && s + 1 <= cellSize * dayEvery) daySize = s; });
    var dayW = daySize ? widest(daySize) : 0;
    cellSize = cellFor(dayW);
    var gridX = leftBand + yearW + dayW;
    var gridW = cellSize * nCols;
    var bandH = cellSize * 7;
    function bandY(b) { return gridY + b * (bandH + bandGap); }
    var gap = cellSize > 6 ? 1 : 0;
    var rx = Math.min(2, cellSize / 4);   // a 5px cell with a 2px corner is a dot

    function addText(parent, cls, x, y, text, size, anchor, fill) {
      var node = V.el('text', { class: cls, x: x, y: y, 'text-anchor': anchor || 'start' });
      // A style, not the attribute: the class's font-size would beat an
      // attribute, and the measured size is the one that fits.
      node.style.fontSize = size + 'px';
      if (fill) node.style.fill = fill;
      node.textContent = text;
      parent.appendChild(node);
      return node;
    }

    // --- Axis titles, reserved before anything else was placed ---------------

    if (xTitle) {
      var xt = V.middleFit(xTitle, V.fontOf(11), gridW);
      if (xt) addText(svg, 'v-axis-title', gridX + gridW / 2, 12, xt, 11, 'middle');
    }
    var allH = nBands * bandH + (nBands - 1) * bandGap;
    if (yTitle) {
      var yt = V.middleFit(yTitle, V.fontOf(11), allH);
      if (yt) {
        svg.appendChild(V.el('text', {
          class: 'v-axis-title', x: 0, y: 0, 'text-anchor': 'middle',
          transform: 'translate(11,' + (gridY + allH / 2) + ') rotate(-90)'
        })).textContent = yt;
      }
    }

    // --- Month names, once along the top --------------------------------------

    // Columns line up across years to within one week, so each month is
    // placed by the latest year that has it in range.
    var months = [];
    for (var m = 0; m < 12; m++) {
      for (var year = lastYear; year >= firstYear; year--) {
        var from = Date.UTC(year, m, 1) / DAY;
        var to = Date.UTC(year, m + 1, 1) / DAY - 1;
        if (to < first || from > last) continue;
        months.push({ col: colOf(Math.max(from, first)), name: says(from, { month: 'short' }) });
        break;
      }
    }
    months.sort(function (a, b) { return a.col - b.col; });
    // One size for every month name, the size the tightest one needed, so the
    // row reads as one list. A name with no room at all is cut to its initial,
    // then dropped; the tooltip names the date.
    var monthSize = 11;
    months.forEach(function (mo, i) {
      var next = i + 1 < months.length ? months[i + 1].col : maxCol + 1;
      mo.room = (next - mo.col) * cellSize - 4;
      var size = shrink(mo.name, mo.room, 600, 11);
      mo.full = Boolean(size);
      if (size) monthSize = Math.min(monthSize, size);
    });
    months.forEach(function (mo) {
      var text = mo.full ? mo.name : mo.name.charAt(0);
      if (V.textWidth(text, V.fontOf(monthSize, 600)) > mo.room) return;
      addText(svg, 'hm-text hm-head-text', gridX + (mo.col - minCol) * cellSize, gridY - 5, text, monthSize, 'start');
    });

    // --- Year bands -----------------------------------------------------------------

    var measureName = nameOf(measure);
    var grid = V.el('g', { role: 'grid', 'aria-label': measureName + ' by ' + nameOf(dateField) + ', one cell per day' });
    svg.appendChild(grid);
    var nodes = {};

    // The number leads. One size and one form for every cell, so the grid
    // reads evenly: Looker's rendered value at the largest size where all of
    // them fit, else the compact form, else none, and the tooltip carries the
    // figure. At day size this is usually none: the colour and the readout
    // carry it.
    function compactOf(cell) {
      var v = V.cellNumber(cell);
      if (v === null || Math.abs(v) < 1000) return V.cellText(cell) || '';
      var prefix = (/^-?([^\d.,\s-]*)/.exec(V.cellText(cell)) || ['', ''])[1];
      return (v < 0 ? '-' : '') + prefix + V.compact(Math.abs(v));
    }
    function sizeFor(form) {
      var size = 12;
      for (var day = first; day <= last; day++) {
        var cell = cellOf(day);
        if (!cell || V.cellNumber(cell) === null) continue;
        size = shrink(form(cell), cellSize - 6, null, Math.min(size, cellSize - 3));
        if (!size) return null;
      }
      return size;
    }
    var valueForm = null;
    var valueSize = null;
    if (config.show_values !== false) {
      var fullForm = function (cell) { return V.cellText(cell); };
      valueSize = sizeFor(fullForm);
      valueForm = valueSize ? fullForm : compactOf;
      if (!valueSize) valueSize = sizeFor(compactOf);
    }

    function readout(day) {
      var row = byDay[day];
      var cell = cellOf(day);
      var out = [[measureName, !cell ? 'No row for this day' : (V.cellText(cell) || 'No value')]];
      // The other measures, so nothing in the query is out of reach.
      if (row) {
        c.meas.slice(1).forEach(function (other) {
          out.push([nameOf(other), V.cellText(row[other.name]) || 'No value']);
        });
      }
      return out;
    }

    function drill(day, event) {
      var row = byDay[day];
      if (!row) return;
      var links = (row[measure.name] || {}).links || [];
      if (!links.length) links = (row[dateField.name] || {}).links || [];
      if (links.length) LookerCharts.Utils.openDrillMenu({ links: links, event: event });
    }

    function focusDay(day) {
      var next = nodes[day];
      if (!next) return;
      Object.keys(nodes).forEach(function (k) { nodes[k].setAttribute('tabindex', '-1'); });
      next.setAttribute('tabindex', '0');
      next.focus();
    }

    years.forEach(function (year, b) {
      var top = bandY(b);
      var yearText = String(year);
      var ys = shrink(yearText, bandH - 4, 600, 11);
      if (ys) {
        var yl = addText(svg, 'hm-text hm-head-text', 0, 0, yearText, ys, 'middle');
        yl.setAttribute('transform', 'translate(' + (leftBand + 11) + ',' + (top + bandH / 2) + ') rotate(-90)');
      }
      if (daySize) {
        for (var r = 0; r < 7; r += dayEvery) {
          addText(svg, 'hm-text hm-day-text', gridX - 4, top + r * cellSize + cellSize / 2 + daySize * 0.35,
            dayNames[r], daySize, 'end');
        }
      }

      var from = Math.max(first, jan1(year));
      var to = Math.min(last, jan1(year + 1) - 1);
      for (var day = from; day <= to; day++) {
        (function (day) {
          var x = gridX + (colOf(day) - minCol) * cellSize;
          var y = top + rowOf(day) * cellSize;
          var cell = cellOf(day);
          var value = cell ? V.cellNumber(cell) : null;
          var title = says(day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          var g = V.el('g', {
            class: 'hm-cell', role: 'gridcell', tabindex: day === first ? '0' : '-1',
            'aria-label': title + ': ' + readout(day)[0][1]
          });
          if (!cell) {
            g.appendChild(V.el('rect', {
              class: 'hm-fill hm-missing', x: x + gap + 0.5, y: y + gap + 0.5,
              width: Math.max(1, cellSize - gap * 2 - 1), height: Math.max(1, cellSize - gap * 2 - 1), rx: rx
            }));
          } else {
            var tone = toneOf(value);
            g.appendChild(V.el('rect', {
              class: 'v-mark hm-fill', x: x + gap, y: y + gap,
              width: Math.max(1, cellSize - gap * 2), height: Math.max(1, cellSize - gap * 2), rx: rx, fill: tone.fill
            }));
            if (valueSize && value !== null) {
              addText(g, 'hm-text', x + cellSize / 2, y + cellSize / 2 + valueSize * 0.35, valueForm(cell), valueSize,
                'middle', tone.ink);
            }
          }

          g.addEventListener('mousemove', function (e) { c.tip.show(title, readout(day), e.clientX, e.clientY); });
          g.addEventListener('mouseleave', function () { c.tip.hide(); });
          g.addEventListener('click', function (event) { drill(day, event); });
          g.addEventListener('focus', function () {
            var box = g.getBoundingClientRect();
            c.tip.show(title, readout(day), box.left + box.width / 2, box.bottom);
          });
          g.addEventListener('blur', function () { c.tip.hide(); });
          g.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              drill(day, event);
              return;
            }
            // Up and down are a day, left and right a week, crossing into the
            // next year's band where the dates run on.
            var moves = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
            if (!(event.key in moves)) return;
            event.preventDefault();
            focusDay(day + moves[event.key]);
          });
          grid.appendChild(g);
          nodes[day] = g;
        })(day);
      }
    });

    svg.setAttribute('height', Math.min(H, Math.ceil(gridY + allH + 6)));

    // --- Caption -------------------------------------------------------------------

    // Says what the colour means, names the two kinds of empty cell where the
    // calendar has them, and says what was not drawn.
    function legendNode() {
      if (config.show_legend === false || c.width < 300) return null;
      var box = document.createElement('div');
      box.className = 'v-legend';
      function key(swatch, words) {
        var item = document.createElement('div');
        item.className = 'hm-key';
        if (swatch) item.appendChild(swatch);
        words.forEach(function (w) {
          if (typeof w !== 'string') { item.appendChild(w); return; }
          var span = document.createElement('span');
          span.textContent = w;
          item.appendChild(span);
        });
        box.appendChild(item);
      }
      var ramp = document.createElement('span');
      ramp.className = 'hm-ramp';
      var steps = diverging
        ? ['n3', 'n2', 'n1', 'z', 'p1', 'p2', 'p3']
        : ['s0', 's1', 's2', 's3', 's4', 's5', 's6'];
      if (reverse) steps.reverse();
      steps.forEach(function (step, i) {
        var seg = document.createElement('i');
        seg.style.background = custom && !diverging
          ? customStep((reverse ? 6 - i : i) / 6)
          : 'var(--hm-' + step + ')';
        ramp.appendChild(seg);
      });
      if (diverging) {
        var midText = config.midpoint_mode === 'mean' ? 'the mean'
          : config.midpoint_mode === 'custom' ? V.compact(Number(config.midpoint_value) || 0) : 'zero';
        key(null, ['Below ' + midText, ramp, 'above']);
      } else {
        key(null, ['Low', ramp, 'high']);
      }
      if (hasNull) {
        var nil = document.createElement('span');
        nil.className = 'hm-nil';
        key(nil, ['No value']);
      }
      if (hasMissing) {
        var gapKey = document.createElement('span');
        gapKey.className = 'hm-gap';
        key(gapKey, ['No row']);
      }
      if (config.show_totals === true) {
        var total = qr.totals_data && qr.totals_data[measure.name];
        key(null, [total ? 'Total ' + (V.cellText(total) || 'none') : 'Turn on totals in the query for a total']);
      }
      if (dropped) key(null, ['Before ' + firstYear + ': ' + dropped + (dropped === 1 ? ' day' : ' days') + ' not drawn']);
      if (undated) key(null, [undated + (undated === 1 ? ' row' : ' rows') + ' with no date']);
      return box;
    }
  }));
})();
