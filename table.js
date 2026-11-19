// Table: the actual figures, row by row, in the suite's own look, with each
// measure column showing its value alone, with a colour scale behind it, or
// with a bar beside it.
//
// Query shape: 1 or 2 dimensions + 1 or more measures. One column per field,
// in query order. Values are Looker's own rendered text, so each column keeps
// its LookML value_format. Pivoted queries are refused with a message.
//
// Long results scroll a row at a time under a frozen header, with the
// dimension columns frozen when the measures scroll sideways. Only whole rows
// and whole columns are drawn, so nothing is ever clipped at the tile edge.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.1. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('table build v1.0.1');

/* visage:manifest
{ "id": "table", "family": "grid",
  "shapes": ["1d1m", "1d2m", "1d3m", "1d4m", "2d1m"],
  "checks": [
    { "fixture": "table_totals", "config": {} },
    { "fixture": "table_totals", "name": "colour, totals", "config": { "show_totals": true, "sort_by": "desc", "col_delivery_invoiced_gbp": "colour", "col_delivery_margin_pct": "colour" } },
    { "fixture": "table_totals", "name": "diverging, bars", "config": { "colour_scale": "diverging", "col_delivery_variance_gbp": "colour", "col_delivery_invoiced_gbp": "bar", "show_totals": true } },
    { "fixture": "table_totals", "name": "values off", "config": { "show_values": false, "col_delivery_invoiced_gbp": "colour", "col_delivery_margin_pct": "bar" } },
    { "fixture": "months", "config": { "col_finance_revenue_gbp": "bar" } },
    { "fixture": "wide_measures", "config": { "col_delivery_invoiced_gbp": "bar", "col_delivery_margin_pct": "colour", "colour_scale": "diverging", "midpoint_mode": "mean" } },
    { "fixture": "engagements", "config": { "sort_by": "name" } },
    { "fixture": "example", "config": {} }
  ] }
*/

(function () {
  var SPEC = {
    id: 'table',
    label: 'Table',
    version: '1.0.1',
    family: 'grid',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 or 2 dimensions + 1 or more measures',
    good_for: [
      'Reading the exact figures, with a colour scale or a bar on the columns where the pattern matters',
      'Any query where the reader wants the numbers rather than the shape; a chart is better when the shape is the point'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A table needs 1 dimension and 1 measure.'
    },

    // Rules for this chart only. The shared tokens, legend, tooltip and axis
    // styles are already in the prelude.
    //
    // Sequential steps are the treemap's, which passed the palette gates.
    // Diverging is red below the midpoint and indigo above, the brand poles
    // validated as a pair in both modes, with a grey middle and three steps
    // per arm. Each fill has its own ink token, picked by measured contrast.
    css:
      '.v-root { --tb-null: #eceef3; --tb-band: rgba(82,90,255,0.07); --tb-head: #eef0f5; }' +
      '.v-root.v-dark { --tb-null: #22263a; --tb-band: rgba(112,120,255,0.12); --tb-head: #1a1c2a; }' +
      '.tb-scroll { position: relative; overflow: auto; }' +
      '.tb-view { position: sticky; top: 0; left: 0; display: block; }' +
      '.tb-text { font-size: 12px; fill: var(--v-ink); font-variant-numeric: tabular-nums; }' +
      '.tb-head-text { fill: var(--v-ink-2); font-weight: 600; }' +
      '.tb-group-text { font-size: 11px; fill: var(--v-muted); }' +
      '.tb-null-text { fill: var(--v-muted); }' +
      '.tb-total-text { font-weight: 600; }' +
      '.tb-rule { stroke: var(--v-grid); stroke-width: 1; }' +
      '.tb-rule-strong { stroke: var(--v-axis); stroke-width: 1; }' +
      '.tb-row, .tb-head { cursor: pointer; outline: none; }' +
      '.tb-band { fill: transparent; }' +
      '.tb-row:hover .tb-band, .tb-row:focus .tb-band { fill: var(--tb-band); }' +
      '.tb-row:focus-visible .tb-band, .tb-head:focus-visible .tb-head-bg' +
      '  { stroke: var(--v-c0); stroke-width: 2px; }' +
      '.tb-head-bg { fill: var(--tb-head); }' +
      '.tb-ramp { display: inline-flex; height: 8px; width: 56px; border-radius: 2px; overflow: hidden;' +
      '  box-shadow: inset 0 0 0 1px var(--v-hairline); }' +
      '.tb-ramp i { flex: 1 1 auto; }' +
      '.tb-key { display: flex; gap: 6px; align-items: center; min-width: 0; white-space: nowrap; }' +
      // A row's names can be long, and what a cell dropped must stay readable
      // here, so the tooltip title wraps instead of ellipsising.
      '.v-tip-name { white-space: normal; overflow-wrap: anywhere; }'
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

  // The panel the user sees. Baseline plus the grid tier,
  // inherited from docs/roadmap.md. Drop one only with a reason: npm run check
  // fails a chart that is short of its tier.
  //
  // A table has no axes, so the three axis-title options keep their keys and
  // name the two column groups instead: a title spanning the measure columns
  // and one spanning the row columns. Left empty, there is no group row, since
  // every column already carries its field's own name.
  //
  // Per-column formatting is added at render time, one select per measure,
  // once the query's fields are known. See _registerColumnOptions below.
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
      label: 'Sort Rows by',
      display: 'select',
      values: [{ 'Query Order': 'query' }, { 'Largest First': 'desc' }, { 'Smallest First': 'asc' }, { 'Name': 'name' }],
      default: 'query',
      section: 'Data',
      order: 0
    },
    show_totals: {
      type: 'boolean',
      label: 'Show Row and Column Totals',
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
      label: 'Show Group Titles',
      default: true,
      section: 'Style',
      order: 20
    },
    x_axis_label: {
      type: 'string',
      label: 'Title over the Measures',
      placeholder: 'None',
      default: '',
      section: 'Style',
      order: 21
    },
    y_axis_label: {
      type: 'string',
      label: 'Title over the Rows',
      placeholder: 'None',
      default: '',
      section: 'Style',
      order: 22
    }
  };


  var PAD = 8;            // cell padding, each side
  var LINE = 14;          // line height of cell text
  var HEAD_LINE = 13;     // line height of header text
  var BAR_ROOM = 64;      // extra width a bar column asks for
  var SIZES = [12, 11, 10, 9];
  var NULL_TEXT = '∅';    // what Looker's own table shows for a null

  // The option key for one measure's column style. Field names carry dots,
  // which a config key cannot.
  function columnKey(field) {
    return 'col_' + String(field.name).replace(/[^A-Za-z0-9]+/g, '_');
  }

  function nameOf(field) {
    return field.label_short || field.label || field.name;
  }

  // Wrap, then shrink, then cut from the middle, then drop, in that order.
  // Returns { size, lines } or null when even the cut does not fit.
  function ladder(text, room, maxLines, sizes, weight) {
    for (var i = 0; i < sizes.length; i++) {
      var font = V.fontOf(sizes[i], weight);
      var lines = V.wrapWords(text, font, room, maxLines);
      if (lines && lines.every(function (l) { return V.textWidth(l, font) <= room; })) {
        return { size: sizes[i], lines: lines };
      }
    }
    var last = sizes[sizes.length - 1];
    var cut = V.middleFit(text, V.fontOf(last, weight), room);
    return cut ? { size: last, lines: [cut] } : null;
  }

  // Numbers shrink but never wrap or cut: a cut figure is a wrong figure.
  function shrink(text, room, weight) {
    for (var i = 0; i < SIZES.length; i++) {
      if (V.textWidth(text, V.fontOf(SIZES[i], weight)) <= room) return SIZES[i];
    }
    return null;
  }

  var CHART = V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var vis = c.vis;
    var qr = c.queryResponse || {};

    if (qr.pivots && qr.pivots.length) {
      c.message('Remove the pivot: this table shows one column per measure');
      return;
    }

    // --- Columns and their numbers ------------------------------------------

    var cols = c.dims.map(function (f) {
      return { field: f, dim: true, name: nameOf(f), mode: 'value' };
    }).concat(c.meas.map(function (f) {
      var mode = config[columnKey(f)];
      return { field: f, dim: false, name: nameOf(f), mode: mode === 'colour' || mode === 'bar' ? mode : 'value' };
    }));
    var dimCols = cols.filter(function (col) { return col.dim; });
    var measCols = cols.filter(function (col) { return !col.dim; });
    // Off hides the figure only where a colour or a bar stands in for it: a
    // plain column with no figure would be a blank column.
    var hideValues = config.show_values === false;
    function valuesIn(col) { return col.dim || col.mode === 'value' || !hideValues; }

    function cellOf(row, col) { return row[col.field.name] || {}; }
    function textOf(row, col) {
      var text = V.cellText(cellOf(row, col));
      return text === '' ? NULL_TEXT : text;
    }

    measCols.forEach(function (col) {
      var nums = c.data.map(function (row) { return V.cellNumber(cellOf(row, col)); })
        .filter(function (v) { return v !== null; });
      col.min = nums.length ? Math.min.apply(null, nums) : 0;
      col.max = nums.length ? Math.max.apply(null, nums) : 0;
      col.mean = nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
    });

    // --- Colour ---------------------------------------------------------------

    var diverging = config.colour_scale === 'diverging';
    var reverse = config.reverse_scale === true;
    var chosen = config.main_colour && config.main_colour[0];
    // Left at its default the theme token wins, so an untouched table still
    // answers to a dark dashboard.
    var custom = chosen && String(chosen).toLowerCase() !== '#525aff' ? V.toRgb(chosen) : null;
    var barFill = custom ? chosen : 'var(--v-c0)';

    function midpointOf(col) {
      if (config.midpoint_mode === 'mean') return col.mean;
      if (config.midpoint_mode === 'custom') return Number(config.midpoint_value) || 0;
      return 0;
    }

    function customStep(t) {
      var rgb = t < 0.5
        ? V.mix(V.mix(custom, [255, 255, 255], 0.65), custom, t * 2)
        : V.mix(custom, [21, 29, 45], t - 0.5);
      return V.toHex(rgb);
    }

    // Returns { fill, ink } for a colour-scaled cell.
    function toneOf(col, value) {
      if (value === null) return { fill: 'var(--tb-null)', ink: 'var(--v-ink-2)' };
      if (diverging) {
        var mid = midpointOf(col);
        var reach = Math.max(Math.abs(col.max - mid), Math.abs(col.min - mid));
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
      var t = col.max === col.min ? 0.5 : (value - col.min) / (col.max - col.min);
      if (reverse) t = 1 - t;
      if (custom) {
        // A chosen hue has no paired token, so its ink is measured.
        var hex = customStep(t);
        return { fill: hex, ink: V.inkOn(hex) };
      }
      var k = Math.round(t * 6);
      return { fill: 'var(--v-seq-' + k + ')', ink: 'var(--v-seq-ink-' + k + ')' };
    }

    // --- Sort -----------------------------------------------------------------

    // A header click sorts by that column and is kept on the visualisation
    // object, so it survives a resize. The Sort Rows option is the default
    // until a header is clicked.
    function currentSort() {
      var picked = vis._tableSort;
      if (picked && cols.some(function (col) { return col.field.name === picked.name; })) return picked;
      if (config.sort_by === 'desc') return { name: measCols[0].field.name, dir: -1 };
      if (config.sort_by === 'asc') return { name: measCols[0].field.name, dir: 1 };
      if (config.sort_by === 'name') return { name: dimCols[0].field.name, dir: 1 };
      return null;
    }

    var order = [];
    function sortRows() {
      var sort = currentSort();
      order = c.data.map(function (row, i) { return i; });
      if (!sort) return;
      order.sort(function (a, b) {
        var va = (c.data[a][sort.name] || {}).value;
        var vb = (c.data[b][sort.name] || {}).value;
        // Nulls last whichever way the sort runs.
        if (va == null || vb == null) return va == null && vb == null ? a - b : va == null ? 1 : -1;
        var diff = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), undefined, { numeric: true });
        return diff ? diff * sort.dir : a - b;
      });
    }
    sortRows();

    // --- Widths ---------------------------------------------------------------

    var bodyFont = V.fontOf(12);
    var headFont = V.fontOf(11, 600);
    cols.forEach(function (col) {
      var widest = 0;
      c.data.forEach(function (row) {
        widest = Math.max(widest, V.textWidth(textOf(row, col), bodyFont));
      });
      if (!valuesIn(col)) widest = 0;
      // A header asks for its full width up to a point, then wraps.
      var head = Math.min(V.textWidth(col.name, headFont), 150);
      col.valueRoom = widest;
      var bar = col.mode === 'bar' ? BAR_ROOM : 0;
      col.natural = Math.min(col.dim ? 260 : 220, Math.max(widest + bar, head + 10, 36)) + PAD * 2;
      // A measure keeps room for its figure at 11px: past that the table
      // scrolls sideways rather than lose numbers, which are what it is for.
      col.least = col.dim
        ? Math.min(col.natural, 100)
        : Math.min(col.natural, Math.max(52, Math.ceil(widest * 11 / 12) + PAD * 2) + (bar ? 32 : 0));
      // Room for the header's longest word at the smallest size, so a header
      // can always wrap rather than vanish.
      var word = 0;
      col.name.split(/\s+/).forEach(function (w) { word = Math.max(word, V.textWidth(w, V.fontOf(9, 600))); });
      col.least = Math.max(col.least, Math.min(col.natural, Math.ceil(word) + PAD * 2 + 10));
    });

    function setWidths(room) {
      var natural = 0;
      var least = 0;
      cols.forEach(function (col) { natural += col.natural; least += col.least; });
      cols.forEach(function (col) {
        if (natural <= room) col.w = col.natural * room / natural;
        else if (least <= room) col.w = col.least + (col.natural - col.least) * (room - least) / (natural - least);
        else col.w = col.least;
        col.w = Math.floor(col.w);
      });
    }

    // --- The scroller ---------------------------------------------------------

    var totals = config.show_totals && qr.totals_data ? qr.totals_data : null;
    var xGroup = c.title('x_axis_label', '');
    var yGroup = c.title('y_axis_label', '');
    var groupH = xGroup || yGroup ? 22 : 0;

    var caption = legendNode();
    var captionH = 0;
    var scroller = document.createElement('div');
    scroller.className = 'tb-scroll';
    c.root.appendChild(scroller);
    if (caption) {
      c.root.appendChild(caption);
      captionH = caption.offsetHeight || 22;
    }
    scroller.style.height = Math.max(40, c.height - captionH) + 'px';
    var view = V.el('svg', { class: 'tb-view' });
    scroller.appendChild(view);
    var spacer = document.createElement('div');
    scroller.appendChild(spacer);

    var L = {};
    var cache = {};

    // Lays the table out for a viewport. Run twice when scrollbars appear,
    // since they take room from the viewport they depend on.
    function layout(viewW, viewH) {
      cache = {};
      setWidths(viewW);
      var frozenW = 0;
      dimCols.forEach(function (col) { frozenW += col.w; });
      var scrollW = 0;
      measCols.forEach(function (col) { scrollW += col.w; });

      var headLines = 1;
      cols.forEach(function (col) {
        col.head = ladder(col.name, col.w - PAD * 2 - 10, 3, [11, 10, 9], 600);
        if (col.head) headLines = Math.max(headLines, col.head.lines.length);
      });
      var headH = headLines * HEAD_LINE + 12;

      // One line per row unless a name needs two to avoid a cut.
      var lines = 1;
      dimCols.forEach(function (col) {
        c.data.forEach(function (row) {
          if (V.textWidth(textOf(row, col), bodyFont) > col.w - PAD * 2) lines = 2;
        });
      });
      var rowH = lines === 1 ? 26 : 26 + LINE;
      var totalH = totals ? 28 : 0;
      var extraW = Math.max(0, frozenW + scrollW - viewW);
      var fit = Math.max(1, Math.floor((viewH - groupH - headH - totalH) / rowH));
      // Overlay scrollbars hide until used, so a table that scrolls says so.
      var statusH = fit < c.data.length || extraW ? 16 : 0;
      if (statusH) fit = Math.max(1, Math.floor((viewH - groupH - headH - totalH - statusH) / rowH));

      L = {
        viewW: viewW, viewH: viewH, frozenW: frozenW, scrollW: scrollW,
        headH: headH, rowH: rowH, lines: lines, totalH: totalH, statusH: statusH,
        fit: Math.min(fit, c.data.length), extraRows: Math.max(0, c.data.length - fit),
        extraW: extraW
      };
      view.setAttribute('width', viewW);
      view.setAttribute('height', viewH);
      // The view is in flow, so the spacer is only what lies beyond it.
      spacer.style.width = (viewW + L.extraW) + 'px';
      spacer.style.height = (L.extraRows * rowH) + 'px';
      scroller.style.overflowX = L.extraW ? 'auto' : 'hidden';
      scroller.style.overflowY = L.extraRows ? 'auto' : 'hidden';
    }

    layout(c.width, Math.max(40, c.height - captionH));
    if (scroller.clientWidth !== L.viewW || scroller.clientHeight !== L.viewH) {
      layout(scroller.clientWidth || c.width, scroller.clientHeight || L.viewH);
    }

    // --- Painting -------------------------------------------------------------

    var focusRow = null;
    var focusHead = null;
    var painting = false;
    var pending = false;

    function firstRow() {
      return Math.max(0, Math.min(L.extraRows, Math.round(scroller.scrollTop / L.rowH)));
    }

    // The measure columns shown: whole columns from the scroll position, never
    // a part of one.
    function visibleMeasures() {
      var left = scroller.scrollLeft;
      var start = 0;
      var x = 0;
      while (start < measCols.length - 1 && x + measCols[start].w / 2 < left) {
        x += measCols[start].w;
        start++;
      }
      var out = [];
      var at = L.frozenW;
      for (var i = start; i < measCols.length; i++) {
        if (at + measCols[i].w > L.viewW + 0.5 && out.length) break;
        out.push({ col: measCols[i], x: at });
        at += measCols[i].w;
      }
      return out;
    }

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

    function paint() {
      pending = false;
      painting = true;
      var hadFocus = view.contains(document.activeElement);
      while (view.firstChild) view.removeChild(view.firstChild);

      var shown = [];
      var x = 0;
      dimCols.forEach(function (col) { shown.push({ col: col, x: x }); x += col.w; });
      shown = shown.concat(visibleMeasures());
      var right = 0;
      shown.forEach(function (s) { right = Math.max(right, s.x + s.col.w); });
      var sort = currentSort();

      // Group titles, spanning the row columns and the measure columns.
      var top = 0;
      if (groupH) {
        if (yGroup) {
          var yt = V.middleFit(yGroup, V.fontOf(11), L.frozenW - PAD * 2);
          if (yt) addText(view, 'tb-group-text', PAD, 15, yt, 11);
        }
        if (xGroup) {
          var xt = V.middleFit(xGroup, V.fontOf(11), right - L.frozenW - PAD * 2);
          if (xt) addText(view, 'tb-group-text', L.frozenW + PAD, 15, xt, 11);
        }
        top = groupH;
      }

      // The header, frozen.
      shown.forEach(function (s) {
        var col = s.col;
        var sorted = sort && sort.name === col.field.name;
        var g = V.el('g', { class: 'tb-head', tabindex: '0', role: 'columnheader', 'data-name': col.field.name });
        g.appendChild(V.el('rect', {
          class: 'tb-head-bg', x: s.x + 0.5, y: top + 0.5, width: Math.max(1, col.w - 1), height: L.headH - 1
        }));
        var anchorRight = !col.dim;
        var tx = anchorRight ? s.x + col.w - PAD - (sorted ? 4 : 0) : s.x + PAD;
        if (col.head) {
          var y0 = top + L.headH - 8 - (col.head.lines.length - 1) * HEAD_LINE;
          col.head.lines.forEach(function (line, i) {
            addText(g, 'tb-text tb-head-text', tx, y0 + i * HEAD_LINE, line, col.head.size,
              anchorRight ? 'end' : 'start');
          });
        }
        if (sorted) {
          var lastLine = col.head ? col.head.lines[col.head.lines.length - 1] : '';
          var after = col.head ? V.textWidth(lastLine, V.fontOf(col.head.size, 600)) + 3 : 0;
          addText(g, 'tb-text tb-head-text', anchorRight ? s.x + col.w - 3 : Math.min(tx + after, s.x + col.w - 10),
            top + L.headH - 8, sort.dir < 0 ? '▾' : '▴', 10, anchorRight ? 'end' : 'start');
        }
        var sortTo = function () {
          var now = currentSort();
          var dir = now && now.name === col.field.name ? -now.dir : (col.dim ? 1 : -1);
          vis._tableSort = { name: col.field.name, dir: dir };
          sortRows();
          paint();
        };
        var tip = function (cx, cy) {
          c.tip.show(col.name, [['Sort', sorted
            ? (sort.dir < 0 ? (col.dim ? 'Z to A' : 'Largest first') : (col.dim ? 'A to Z' : 'Smallest first'))
            : 'Click or press Enter']], cx, cy);
        };
        g.addEventListener('click', sortTo);
        g.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            focusHead = col.field.name;
            focusRow = null;
            sortTo();
          }
        });
        g.addEventListener('mousemove', function (e) { tip(e.clientX, e.clientY); });
        g.addEventListener('mouseleave', function () { c.tip.hide(); });
        g.addEventListener('focus', function () {
          if (painting) return;
          focusHead = col.field.name;
          focusRow = null;
          var b = g.getBoundingClientRect();
          tip(b.left + b.width / 2, b.bottom);
        });
        g.addEventListener('blur', function () { if (!painting) c.tip.hide(); });
        view.appendChild(g);
      });
      top += L.headH;
      view.appendChild(V.el('line', { class: 'tb-rule-strong', x1: 0, x2: right, y1: top - 0.5, y2: top - 0.5 }));

      // The rows that fit whole.
      var start = firstRow();
      for (var r = 0; r < L.fit && start + r < order.length; r++) {
        drawRow(order[start + r], top + r * L.rowH, shown, right, start + r, start);
      }

      // Under the last row when everything fits, pinned to the bottom when
      // the rows scroll.
      if (totals) drawTotals(Math.min(L.viewH - L.statusH - L.totalH, top + L.fit * L.rowH), shown, right);

      if (L.statusH) {
        var status = 'Rows ' + (start + 1) + '–' + Math.min(order.length, start + L.fit) + ' of ' + order.length;
        if (L.extraW) {
          var firstShown = measCols.indexOf(shown[dimCols.length] ? shown[dimCols.length].col : measCols[0]);
          status += ' · Measures ' + (firstShown + 1) + '–' + (firstShown + shown.length - dimCols.length) +
            ' of ' + measCols.length;
        }
        status = V.fit(status, V.fontOf(10), L.viewW - PAD * 2);
        if (status) addText(view, 'tb-group-text', L.viewW - PAD, L.viewH - 4, status, 10, 'end');
      }

      painting = false;
      if (hadFocus) {
        var target = focusRow !== null
          ? view.querySelector('[data-at="' + focusRow + '"]')
          : focusHead !== null ? view.querySelector('[data-name="' + focusHead + '"]') : null;
        if (target) target.focus({ preventScroll: true });
      }
    }

    function tipRows(row) {
      return cols.map(function (col) {
        var text = V.cellText(cellOf(row, col));
        return [col.name, text === '' ? 'No value' : text];
      });
    }

    function drill(row, col, event) {
      // The cell's own drill, or failing that the first one the row has.
      var links = cellOf(row, col).links || [];
      for (var i = 0; !links.length && i < cols.length; i++) links = cellOf(row, cols[i]).links || [];
      if (links.length) LookerCharts.Utils.openDrillMenu({ links: links, event: event });
    }

    function drawRow(index, y, shown, right, at, first) {
      var row = c.data[index];
      var g = V.el('g', { class: 'tb-row', tabindex: '0', role: 'row', 'data-at': String(at) });
      g.appendChild(V.el('rect', { class: 'tb-band', x: 1, y: y + 1, width: Math.max(1, right - 2), height: L.rowH - 2 }));
      var mid = y + L.rowH / 2;

      shown.forEach(function (s) {
        var col = s.col;
        var cell = cellOf(row, col);
        var raw = V.cellText(cell);
        var isNull = raw === '';
        var text = isNull ? NULL_TEXT : raw;
        var hit = V.el('rect', { class: 'v-hit', x: s.x, y: y, width: col.w, height: L.rowH });
        hit.addEventListener('click', function (event) { drill(row, col, event); });

        if (col.dim) {
          // With two dimensions, the first is printed only where it changes,
          // as a printed table would. The tooltip always carries it.
          var prev = at > first ? c.data[order[at - 1]] : null;
          var repeat = prev && dimCols.length > 1 && col === dimCols[0] &&
            V.cellText(cellOf(prev, col)) === raw;
          var key = index + '|' + col.field.name;
          if (!(key in cache)) cache[key] = ladder(text, col.w - PAD * 2, L.lines, SIZES);
          var fitted = repeat ? null : cache[key];
          if (fitted) {
            var y0 = mid + 4 - (fitted.lines.length - 1) * LINE / 2;
            fitted.lines.forEach(function (line, i) {
              addText(g, 'tb-text' + (isNull ? ' tb-null-text' : ''), s.x + PAD, y0 + i * LINE, line, fitted.size);
            });
          }
          g.appendChild(hit);
          return;
        }

        var value = V.cellNumber(cell);
        var ink = null;
        if (col.mode === 'colour') {
          var tone = toneOf(col, value);
          g.appendChild(V.el('rect', {
            class: 'v-mark', x: s.x + 1, y: y + 1, width: Math.max(1, col.w - 2), height: L.rowH - 2,
            rx: 2, fill: tone.fill
          }));
          ink = tone.ink;
        }

        var showValue = valuesIn(col);
        var textRoom = showValue ? Math.min(col.w - PAD * 2, Math.ceil(col.valueRoom)) : 0;
        if (col.mode === 'bar' && value !== null) {
          var barLeft = s.x + PAD;
          var barRoom = col.w - PAD * 2 - (textRoom ? textRoom + 10 : 0);
          if (barRoom >= 12) {
            var lo = Math.min(0, col.min);
            var hi = Math.max(0, col.max);
            var span = hi - lo || 1;
            var zero = barLeft + (0 - lo) / span * barRoom;
            var end = barLeft + (value - lo) / span * barRoom;
            g.appendChild(V.el('rect', {
              class: 'v-mark', x: Math.min(zero, end), y: mid - 5,
              width: Math.max(value ? 1 : 0, Math.abs(end - zero)), height: 10, rx: 2,
              fill: barFill
            }));
            if (lo < 0) {
              g.appendChild(V.el('line', { class: 'tb-rule-strong', x1: zero, x2: zero, y1: y + 4, y2: y + L.rowH - 4 }));
            }
          }
        }

        if (showValue) {
          var size = shrink(text, col.w - PAD * 2);
          // Too narrow for its number: the cell keeps its colour or bar, and
          // the tooltip keeps the figure.
          if (size) {
            addText(g, 'tb-text' + (isNull && !ink ? ' tb-null-text' : ''), s.x + col.w - PAD, mid + 4,
              text, size, 'end', ink);
          }
        }
        g.appendChild(hit);
      });

      g.appendChild(V.el('line', { class: 'tb-rule', x1: 0, x2: right, y1: y + L.rowH - 0.5, y2: y + L.rowH - 0.5 }));

      var title = dimCols.map(function (col) { return textOf(row, col); }).join(' · ');
      g.addEventListener('mousemove', function (e) { c.tip.show(title, tipRows(row), e.clientX, e.clientY); });
      g.addEventListener('mouseleave', function () { c.tip.hide(); });
      g.addEventListener('focus', function () {
        if (painting) return;
        focusRow = at;
        focusHead = null;
        var b = g.getBoundingClientRect();
        c.tip.show(title, tipRows(row), b.left + Math.min(b.width, 160), b.bottom);
      });
      g.addEventListener('blur', function () { if (!painting) c.tip.hide(); });
      g.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          drill(row, dimCols[0], event);
          return;
        }
        var move = 0;
        if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) move = 1;
        if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) move = -1;
        var next = at + move;
        // Tab past the last row leaves the table, as it should.
        if (!move || next < 0 || next >= order.length) return;
        event.preventDefault();
        moveTo(next);
      });
      view.appendChild(g);
    }

    function drawTotals(y, shown, right) {
      view.appendChild(V.el('rect', { class: 'tb-head-bg', x: 0, y: y, width: right, height: L.totalH }));
      view.appendChild(V.el('line', { class: 'tb-rule-strong', x1: 0, x2: right, y1: y + 0.5, y2: y + 0.5 }));
      var mid = y + L.totalH / 2 + 4;
      addText(view, 'tb-text tb-total-text', PAD, mid, 'Total', 12);
      shown.forEach(function (s) {
        if (s.col.dim || !valuesIn(s.col)) return;
        var cell = totals[s.col.field.name];
        var text = cell ? V.cellText(cell) : '';
        var size = text ? shrink(text, s.col.w - PAD * 2, 600) : null;
        if (size) addText(view, 'tb-text tb-total-text', s.x + s.col.w - PAD, mid, text, size, 'end');
      });
    }

    function moveTo(next) {
      var first = firstRow();
      focusRow = next;
      focusHead = null;
      if (next < first) scroller.scrollTop = next * L.rowH;
      else if (next >= first + L.fit) scroller.scrollTop = (next - L.fit + 1) * L.rowH;
      paint();
      var target = view.querySelector('[data-at="' + next + '"]');
      if (target) target.focus({ preventScroll: true });
    }

    scroller.addEventListener('scroll', function () {
      c.tip.hide();
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || window.setTimeout)(paint);
    });

    paint();

    // --- Caption --------------------------------------------------------------

    // Says what the colour means. Each column is scaled on its own, since the
    // measures are in different units.
    function legendNode() {
      var coloured = measCols.filter(function (col) { return col.mode === 'colour'; });
      if (config.show_legend === false || !coloured.length || c.width < 300) return null;
      var box = document.createElement('div');
      box.className = 'v-legend';
      var item = document.createElement('div');
      item.className = 'tb-key';
      var low = document.createElement('span');
      var high = document.createElement('span');
      var ramp = document.createElement('span');
      ramp.className = 'tb-ramp';
      var steps = diverging
        ? ['n3', 'n2', 'n1', 'z', 'p1', 'p2', 'p3']
        : ['s0', 's1', 's2', 's3', 's4', 's5', 's6'];
      if (reverse) steps.reverse();
      steps.forEach(function (step, i) {
        var seg = document.createElement('i');
        seg.style.background = custom && !diverging
          ? customStep((reverse ? 6 - i : i) / 6)
          : 'var(--tb-' + step + ')';
        ramp.appendChild(seg);
      });
      if (diverging) {
        var midText = config.midpoint_mode === 'mean' ? 'the column mean'
          : config.midpoint_mode === 'custom' ? V.compact(Number(config.midpoint_value) || 0) : 'zero';
        low.textContent = 'Below ' + midText;
        high.textContent = 'above';
      } else {
        low.textContent = 'Low';
        high.textContent = 'high';
      }
      // Said once, where there is room to say it.
      if (c.width >= 520 && measCols.length > 1) high.textContent += ', each column on its own scale';
      item.appendChild(low);
      item.appendChild(ramp);
      item.appendChild(high);
      box.appendChild(item);
      return box;
    }
  });

  // One select per measure, so each column can show its value alone, with a
  // colour scale behind it, or with a bar beside it. Only known once the query
  // is, so the panel is rebuilt when the fields change. Everything else is
  // copied from the literal above so nothing is lost in the rebuild.
  CHART._registerColumnOptions = function (meas) {
    var signature = meas.map(function (f) { return f.name; }).join('|');
    if (this._optionSignature === signature) return;
    this._optionSignature = signature;

    var rebuilt = {};
    Object.keys(OPTIONS).forEach(function (key) { rebuilt[key] = OPTIONS[key]; });
    meas.forEach(function (field, i) {
      rebuilt[columnKey(field)] = {
        type: 'string',
        label: nameOf(field),
        display: 'select',
        values: [{ 'Value': 'value' }, { 'Value and Colour Scale': 'colour' }, { 'Value and Bar': 'bar' }],
        default: 'value',
        section: 'Columns',
        order: i
      };
    });
    this.trigger('registerOptions', rebuilt);
  };

  var baseUpdate = CHART.updateAsync;
  CHART.updateAsync = function (data, element, config, queryResponse, details, done) {
    var meas = (queryResponse && queryResponse.fields && queryResponse.fields.measure_like) || [];
    if (meas.length) this._registerColumnOptions(meas);
    baseUpdate.call(this, data, element, config, queryResponse, details, done);
  };

  looker.plugins.visualizations.add(CHART);
})();
