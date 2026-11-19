// KPI tile: one number, how it compares, and where it has been.
//
// Query shape: 1 measure (a comparison measure is optional), with an optional
// dimension. The headline is the first measure. Compare To picks what it is
// held against: the second measure (a target), or the previous period in a
// date series. The tile shows the change, absolute and as a percentage,
// marked by direction, and says so when there is nothing to compare to.
// With a date dimension and several rows the tile draws a sparkline of the
// first measure, puts the rows in time order and leads with the latest. Any
// other dimension gets no sparkline, keeps query order and leads with its
// first row, as Looker's own single value does.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.1. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('kpi_tile build v1.0.1');

/* visage:manifest
{ "id": "kpi_tile", "family": "single_value",
  "shapes": ["0d1m", "0d2m", "1d1m", "1d2m"],
  "checks": [
    { "fixture": "kpi_monthly", "config": {} },
    { "fixture": "kpi_monthly", "config": { "good_direction": "down" } },
    { "fixture": "kpi_monthly", "config": { "compare_to": "previous" } },
    { "fixture": "kpi_monthly", "config": { "compare_to": "previous", "good_direction": "down" } },
    { "fixture": "kpi_single", "config": { "compare_to": "previous" } },
    { "fixture": "kpi_single", "config": {} },
    { "fixture": "one_measure", "config": {} },
    { "fixture": "example", "config": {} }
  ] }
*/

(function () {
  var SPEC = {
    id: 'kpi_tile',
    label: 'KPI Tile',
    version: '1.0.1',
    family: 'single_value',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 measure (a comparison measure is optional; a date dimension adds a sparkline)',
    good_for: [
      'One headline figure on a dashboard, with its change against a target or an earlier period',
      'Over Looker\'s single value when the reader also needs the trend and a change that is coloured by whether it is good'
    ],

    requires: {
      dims: 0,
      meas: 1,
      message: 'A KPI tile needs 1 measure. A second measure adds a comparison, a date dimension adds a sparkline.'
    },

    css:
      '.kpi-label { font-size: 12px; fill: var(--v-ink-2); }' +
      '.kpi-number { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.kpi-change { font-size: 12px; fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.kpi-versus { fill: var(--v-muted); }' +
      '.kpi-good { fill: var(--v-c2); } .kpi-bad { fill: var(--v-c7); } .kpi-flat { fill: var(--v-muted); }' +
      '.kpi-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }' +
      '.kpi-hit { fill: transparent; cursor: pointer; }' +
      '.kpi-hit:focus { outline: none; }' +
      '.kpi-hit:focus-visible { stroke: var(--v-axis); stroke-width: 1; }'
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

  // The panel the user sees. Baseline plus the single value tier,
  // inherited from docs/roadmap.md. Drop one only with a reason: npm run check
  // fails a chart that is short of its tier.
  var OPTIONS = {
    compare_to: {
      type: 'string',
      label: 'Compare To',
      display: 'select',
      values: [
        { 'Automatic': 'auto' },
        { 'Target (Second Measure)': 'target' },
        { 'Previous Period': 'previous' }
      ],
      default: 'auto',
      section: 'Data',
      order: 0
    },
    good_direction: {
      type: 'string',
      label: 'Good Direction',
      display: 'select',
      values: [{ 'Higher Is Better': 'up' }, { 'Lower Is Better': 'down' }, { 'Neither': 'none' }],
      default: 'up',
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
    main_colour: {
      type: 'array',
      label: 'Main Colour',
      display: 'color',
      default: ['#525aff'],
      section: 'Style',
      order: 1
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
      label: 'Sparkline Title',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 21
    },
    y_axis_label: {
      type: 'string',
      label: 'Number Label',
      placeholder: 'Field name',
      default: '',
      section: 'Style',
      order: 22
    }
  };

  // Looker hands the change no rendered string of its own, so it borrows the
  // headline's: the same prefix, suffix and decimals, when that rendered text
  // is plainly the cell's value. Anything else (a "k" suffix, a percentage
  // stored as a fraction) falls back to the compact form.
  function formatLike(cell, amount) {
    var text = cell && cell.rendered != null ? String(cell.rendered).trim() : '';
    var m = /^([^\d\-−]*)[-−]?(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(text);
    if (m && cell.value != null && isFinite(cell.value)) {
      var decimals = (m[2].split('.')[1] || '').length;
      var shown = Number(m[2].replace(/,/g, ''));
      if (Math.abs(shown - Math.abs(cell.value)) <= Math.pow(10, -decimals) / 2 + 1e-9) {
        return m[1] + Math.abs(amount).toLocaleString('en-US', {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals,
          useGrouping: m[2].indexOf(',') !== -1 || Math.abs(shown) < 1000
        }) + m[3];
      }
    }
    return V.compact(Math.abs(amount));
  }

  function isTime(field) {
    return !!(field && (field.is_timeframe || /^(date|time|year|yesno_time)/.test(field.type || '')));
  }

  function nameOf(field) {
    return field ? (field.label_short || field.label || field.name) : '';
  }

  // Hover, focus and Enter or Space to drill, the same on every target.
  function answer(c, node, title, rows, links) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('pointermove', function (event) {
      c.tip.show(title, rows, event.clientX, event.clientY);
    });
    node.addEventListener('pointerleave', c.tip.hide);
    node.addEventListener('focus', function () {
      var box = node.getBoundingClientRect();
      c.tip.show(title, rows, box.left + box.width / 2, box.top + box.height / 2);
    });
    node.addEventListener('blur', c.tip.hide);
    if (links && links.length) {
      var drill = function (event) {
        LookerCharts.Utils.openDrillMenu({ links: links, event: event });
      };
      node.addEventListener('click', drill);
      node.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
      });
    }
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    if (c.dims.length > 1) {
      c.message('A KPI tile takes at most one dimension.');
      return;
    }

    var dim = c.dims[0];
    var main = c.meas[0];
    var versus = c.meas[1];
    var config = c.config;

    // A date dimension is put in time order and the latest row leads. Any
    // other dimension keeps query order and the first row leads.
    var rows = c.data.slice();
    var timed = dim && isTime(dim);
    if (timed) {
      rows.sort(function (a, b) {
        var x = String((a[dim.name] || {}).value), y = String((b[dim.name] || {}).value);
        return x < y ? -1 : x > y ? 1 : 0;
      });
    }
    var lead = timed ? rows[rows.length - 1] : rows[0];
    var leadCell = lead[main.name];
    var value = V.cellNumber(leadCell);
    var numberText = value === null ? '∅' : V.cellText(leadCell) || V.compact(value);

    // --- The change against the comparison measure ---------------------------

    // A KPI tile compares to something, or it is just a metric. Automatic
    // takes the second measure when there is one, otherwise the previous
    // period when there is a date series.
    var canTarget = !!versus;
    var canPrevious = timed && rows.length > 1;
    var mode = config.compare_to || 'auto';
    if (mode === 'auto') mode = canTarget ? 'target' : canPrevious ? 'previous' : 'none';

    var change;
    var base = null;
    var baseName = '';
    var baseText = '';
    if (mode === 'target' && canTarget) {
      base = V.cellNumber(lead[versus.name]);
      baseName = nameOf(versus);
      baseText = V.cellText(lead[versus.name]) || '∅';
      change = { versus: 'vs ' + baseName };
    } else if (mode === 'previous' && canPrevious) {
      // Previous Period skips back over null rows to the last period that has
      // a value, and the caption names that period, so the reader sees what
      // the figure is being held against.
      var prev = null;
      for (var p = rows.length - 2; p >= 0; p--) {
        if (V.cellNumber(rows[p][main.name]) !== null) { prev = rows[p]; break; }
      }
      if (prev) {
        base = V.cellNumber(prev[main.name]);
        baseName = V.cellText(prev[dim.name]) || 'Previous Period';
        baseText = V.cellText(prev[main.name]);
        change = { versus: V.cellText(prev[dim.name]) ? 'vs ' + baseName : 'vs previous period' };
      } else {
        change = { none: 'No comparison: no earlier period', why: 'No earlier period has a value' };
      }
    } else {
      // Say why there is no comparison rather than showing nothing.
      change = mode === 'target'
        ? { none: 'No comparison: no second measure', why: 'Target needs a second measure' }
        : mode === 'previous'
          ? { none: 'No comparison: no earlier period', why: 'Previous Period needs a date dimension and 2 or more rows' }
          : { none: 'No comparison: add a second measure or a date', why: 'Add a second measure, or a date dimension with 2 or more rows' };
    }

    if (!change.none) {
      if (value === null || base === null) {
        change.text = 'No comparison';
        change.dir = 0;
      } else {
        var delta = value - base;
        var dir = delta > 0 ? 1 : delta < 0 ? -1 : 0;
        var sign = dir > 0 ? '+' : dir < 0 ? '−' : '';
        var text = sign + formatLike(leadCell, delta);
        // No percentage against zero: it would be infinite.
        if (base !== 0) {
          var pct = Math.abs(delta / base * 100);
          text += ' (' + sign + pct.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%)';
        }
        change.text = text;
        change.dir = dir;
      }
      var good = config.good_direction || 'up';
      change.cls = change.dir === 0 || good === 'none' ? 'kpi-flat'
        : (change.dir > 0) === (good === 'up') ? 'kpi-good' : 'kpi-bad';
      if (config.show_legend === false) change.versus = '';
    }

    // --- Layout, top to bottom -----------------------------------------------

    var W = c.width, H = c.height;
    var pad = W < 260 || H < 160 ? 8 : 14;
    var room = W - pad * 2;
    var label = c.title('y_axis_label', nameOf(main));
    // A line across categories implies an order and continuity that is not
    // there, so only a date series gets a sparkline.
    var points = timed && rows.length > 1 ? rows : [];
    var labelH = label ? 18 : 0;
    var changeH = 20;

    // The sparkline needs 32px of line and a row for its end labels, or it is
    // dropped and the number has the room. Its axis title goes with it, unless
    // the user typed one.
    var sparkMin = 32 + 8 + 16;
    var xLabel = c.title('x_axis_label', nameOf(dim));
    var free = H - pad * 2 - labelH - changeH - (xLabel ? 16 : 0);
    if (points.length && (free - sparkMin) / 1.15 < 24) points = [];
    if (!points.length) {
      xLabel = c.title('x_axis_label', '');
      free = H - pad * 2 - labelH - changeH - (xLabel ? 16 : 0);
    }
    var xLabelH = xLabel ? 16 : 0;

    // The number takes what is left. It shrinks to fit the width, then falls
    // back to compact form, and is never cut.
    var size = Math.floor(Math.min(72, points.length ? Math.min(free * 0.5, (free - sparkMin) / 1.15) : free * 0.9));
    var font = function (s) { return V.fontOf(s, 600); };
    while (size > 14 && V.textWidth(numberText, font(size)) > room) size -= 2;
    if (V.textWidth(numberText, font(size)) > room && value !== null) {
      numberText = V.compact(value);
      while (size > 10 && V.textWidth(numberText, font(size)) > room) size--;
    }
    size = Math.max(10, size);
    var numberH = Math.ceil(size * 1.15);

    var endsH = points.length ? 16 : 0;
    var sparkH = points.length ? Math.min(free - numberH - 8 - endsH, Math.min(140, Math.max(40, H * 0.3))) : 0;

    var used = labelH + numberH + changeH + (sparkH ? sparkH + 8 + endsH : 0) + xLabelH;
    var y = Math.max(pad, (H - used) / 2);

    var svg = c.svg();

    // The tooltip carries everything, including whatever the layout dropped.
    function detail(row) {
      var list = [[nameOf(main), V.cellText(row[main.name]) || '∅']];
      if (versus) list.push([nameOf(versus), V.cellText(row[versus.name]) || '∅']);
      return list;
    }
    var leadTitle = dim ? V.cellText(lead[dim.name]) || nameOf(main) : nameOf(main);
    var leadRows = detail(lead);
    if (mode === 'previous' && baseText) leadRows.push([baseName, baseText]);
    leadRows.push(['Change', change.none ? change.why : change.text]);

    // An invisible target over the headline block, so it answers on hover and
    // focus like any other mark.
    var hit = V.el('rect', {
      class: 'kpi-hit', x: pad / 2, y: y - 2, width: W - pad,
      height: labelH + numberH + changeH + 4, rx: 4
    });
    svg.appendChild(hit);
    answer(c, hit, leadTitle, leadRows, leadCell && leadCell.links);

    if (label) {
      var fitted = V.middleFit(label, V.fontOf(12), room);
      if (fitted) {
        var t = V.el('text', { class: 'kpi-label', x: pad, y: y + 13 });
        t.textContent = fitted;
        svg.appendChild(t);
      }
      y += labelH;
    }

    var n = V.el('text', { class: 'kpi-number', x: pad - size * 0.04, y: y + size * 0.92, 'font-size': size });
    n.textContent = numberText;
    svg.appendChild(n);
    y += numberH;

    if (change.none) {
      var why = V.el('text', { class: 'kpi-change kpi-versus', x: pad, y: y + 14 });
      why.textContent = V.fit(change.none, V.fontOf(12), room) || '';
      svg.appendChild(why);
      y += changeH;
    } else {
      var x = pad;
      var mid = y + 10;
      // The direction is in the shape as well as the colour.
      var mark = change.dir > 0
        ? V.el('path', { d: 'M' + x + ',' + (mid + 4) + 'h10l-5,-8z' })
        : change.dir < 0
          ? V.el('path', { d: 'M' + x + ',' + (mid - 4) + 'h10l-5,8z' })
          : V.el('rect', { x: x, y: mid - 1, width: 10, height: 2 });
      mark.setAttribute('class', 'v-mark ' + change.cls);
      svg.appendChild(mark);
      x += 15;

      var line = V.el('text', { class: 'kpi-change', x: x, y: mid + 4 });
      var main_ = change.text;
      var rest = change.versus ? '  ' + change.versus : '';
      var f12 = V.fontOf(12);
      if (V.textWidth(main_ + rest, f12) > W - pad - x) {
        rest = V.textWidth(main_, f12) <= W - pad - x
          ? (V.fit(rest, f12, W - pad - x - V.textWidth(main_, f12)) || '') : '';
        // The tooltip still holds the full change when the line cannot.
        if (V.textWidth(main_, f12) > W - pad - x) main_ = V.fit(main_, f12, W - pad - x) || '';
      }
      line.textContent = main_;
      if (rest) {
        var span = V.el('tspan', { class: 'kpi-versus' });
        span.textContent = rest;
        line.appendChild(span);
      }
      svg.appendChild(line);
      y += changeH;
    }

    // --- Sparkline ------------------------------------------------------------

    if (points.length) {
      y += 8;
      var vals = points.map(function (row) { return V.cellNumber(row[main.name]); });
      var known = vals.filter(function (v) { return v !== null; });
      var lo = Math.min.apply(null, known.length ? known : [0]);
      var hi = Math.max.apply(null, known.length ? known : [1]);
      if (hi === lo) { hi += 1; lo -= 1; }
      var inset = 5;
      var stepX = (room - inset * 2) / (points.length - 1);
      var xAt = function (i) { return pad + inset + i * stepX; };
      var yAt = function (v) { return y + inset + (hi - v) / (hi - lo) * (sparkH - inset * 2); };

      var colour = config.main_colour && config.main_colour[0] &&
        String(config.main_colour[0]).toLowerCase() !== '#525aff'
        ? config.main_colour[0] : 'var(--v-c0)';

      // A null breaks the line rather than joining across it.
      var d = '';
      var pen = false;
      vals.forEach(function (v, i) {
        if (v === null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1);
        pen = true;
      });
      if (d) svg.appendChild(V.el('path', { class: 'v-mark kpi-line', d: d, stroke: colour }));

      vals.forEach(function (v, i) {
        var row = points[i];
        var isLead = row === lead;
        // A point with no neighbour draws no line, so give it a dot.
        var alone = v !== null && (i === 0 || vals[i - 1] === null) &&
          (i === vals.length - 1 || vals[i + 1] === null);
        if (v !== null && (isLead || alone)) {
          svg.appendChild(V.el('circle', {
            class: 'v-mark', cx: xAt(i), cy: yAt(v), r: isLead ? 3.5 : 2, fill: colour
          }));
        }
        var band = V.el('rect', {
          class: 'kpi-hit', x: xAt(i) - stepX / 2, y: y, width: Math.max(4, stepX), height: sparkH
        });
        svg.appendChild(band);
        var cell = row[main.name];
        answer(c, band, V.cellText(row[dim.name]) || '∅', detail(row), cell && cell.links);
      });
      y += sparkH;

      // The first and last periods, so the line has a span. Dropped when the
      // two would meet; every point still names itself in the tooltip.
      var f11 = V.fontOf(11);
      var first = V.cellText(points[0][dim.name]);
      var last = V.cellText(points[points.length - 1][dim.name]);
      if (V.textWidth(first, f11) + V.textWidth(last, f11) + 16 <= room) {
        var a = V.el('text', { class: 'v-tick', x: pad, y: y + 12 });
        a.textContent = first;
        var b = V.el('text', { class: 'v-tick', x: W - pad, y: y + 12, 'text-anchor': 'end' });
        b.textContent = last;
        svg.appendChild(a);
        svg.appendChild(b);
      }
      y += endsH;
    }

    if (xLabel) {
      var xt = V.fit(xLabel, V.fontOf(11), room);
      if (xt) {
        var xn = V.el('text', { class: 'v-axis-title', x: pad, y: y + 13 });
        xn.textContent = xt;
        svg.appendChild(xn);
      }
    }
  }));
})();
