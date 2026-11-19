// Heatmap (matrix): one dimension down the side, another across the top, and
// one measure in each cell, as a figure on a colour that finds the outliers.
//
// Query shape: 2 dimensions + 1 measure, or 1 dimension + 1 measure pivoted by
// a second dimension. The first dimension gives the rows; the second, or the
// pivot, gives the columns. With more than one measure the first is drawn and
// the others are read out in the tooltip of an unpivoted query.
//
// A pair with no row in the result is an empty cell with a dashed outline. A
// null is a grey cell marked ∅. A zero is a coloured cell showing its zero.
// Looker returns a missing pivot cell as a null, so a pivoted query cannot
// tell the first two apart.
//
// Row and column totals come from Looker, never from adding cells up: a
// measure can be an average, and a sum of averages is wrong. Looker supplies
// them for a pivoted query with row totals and totals switched on.
//
// The colour scale, its steps and the caption are the table's, so the two
// read as one family.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.1. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('heatmap build v1.0.1');

/* visage:manifest
{ "id": "heatmap", "family": "grid",
  "shapes": ["2d1m", "1d1m"],
  "checks": [
    { "fixture": "heatmap_variance", "config": {} },
    { "fixture": "heatmap_variance", "name": "diverging", "config": { "colour_scale": "diverging" } },
    { "fixture": "heatmap_variance", "name": "diverging, mean, reversed, sorted", "config": { "colour_scale": "diverging", "midpoint_mode": "mean", "reverse_scale": true, "sort_by": "desc", "sort_columns_by": "name" } },
    { "fixture": "heatmap_variance", "name": "values off, chosen colour", "config": { "show_values": false, "main_colour": ["#1baf7a"] } },
    { "fixture": "heatmap_pivot", "name": "pivoted, totals", "config": { "show_totals": true } },
    { "fixture": "heatmap_pivot", "name": "pivoted, diverging, totals", "config": { "show_totals": true, "colour_scale": "diverging", "sort_by": "asc" } },
    { "fixture": "months", "config": {} }
  ] }
*/

(function () {
  var SPEC = {
    id: 'heatmap',
    label: 'Heatmap',
    version: '1.0.1',
    family: 'grid',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '2 dimensions + 1 measure (or 1 dimension + 1 measure, pivoted by a second dimension)',
    good_for: [
      'One dimension crossed with another, where the pattern across both is the point: clients by month, teams by stage',
      'Reach for it over a table when the reader needs to find the outliers first and read the figure second'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A heatmap needs 2 dimensions and 1 measure, or 1 dimension and 1 measure pivoted by a second dimension.'
    },

    // Rules for this chart only. The shared tokens, legend, tooltip and axis
    // styles are already in the prelude.
    //
    // The scale is the table's, step for step: sequential from the treemap's
    // steps, diverging red below the midpoint and indigo above with a grey
    // middle and three steps per arm. Each fill has its own ink token, picked
    // by measured contrast.
    css:
      '.v-root { --hm-null: #eceef3; --hm-head: #eef0f5; }' +
      '.v-root.v-dark { --hm-null: #22263a; --hm-head: #1a1c2a; }' +
      '.hm-text { font-size: 12px; fill: var(--v-ink); font-variant-numeric: tabular-nums; }' +
      '.hm-head-text { fill: var(--v-ink-2); font-weight: 600; }' +
      '.hm-total-text { font-weight: 600; }' +
      '.hm-null-text { fill: var(--v-muted); }' +
      '.hm-head-bg { fill: var(--hm-head); }' +
      '.hm-rule { stroke: var(--v-axis); stroke-width: 1; }' +
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
      '.hm-nil { width: 10px; height: 10px; border-radius: 2px; flex: 0 0 auto; background: var(--hm-null); }' +
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

  // The panel the user sees. Baseline plus the grid tier, inherited from
  // docs/roadmap.md, plus a sort for the columns.
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
    // Beyond the tier: the columns are a dimension too, and a date pivot
    // wants query order while a list of names wants sorting.
    sort_columns_by: {
      type: 'string',
      label: 'Sort Columns by',
      display: 'select',
      values: [{ 'Query Order': 'query' }, { 'Largest First': 'desc' }, { 'Smallest First': 'asc' }, { 'Name': 'name' }],
      default: 'query',
      section: 'Data',
      order: 1
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

  var PAD = 6;            // label padding, each side
  var LINE = 13;          // line height of label text
  var SIZES = [12, 11, 10, 9];
  var NULL_TEXT = '∅';    // what Looker's own table shows for a null
  var ROW_TOTAL = '$$$_row_total_$$$';

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
  function shrink(text, room, weight, most) {
    for (var i = 0; i < SIZES.length; i++) {
      if (most && SIZES[i] > most) continue;
      if (V.textWidth(text, V.fontOf(SIZES[i], weight)) <= room) return SIZES[i];
    }
    return null;
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var qr = c.queryResponse || {};
    var fields = qr.fields || {};
    var measure = c.meas[0];
    var pivotFields = fields.pivots || [];
    var pivoted = Boolean(qr.pivots && qr.pivots.length);

    if (pivoted && pivotFields.length > 1) {
      c.message('Pivot by one dimension only: it gives the columns');
      return;
    }
    if (pivoted && c.dims.length !== 1) {
      c.message('With a pivot, use 1 dimension for the rows');
      return;
    }
    if (!pivoted && c.dims.length !== 2) {
      c.message(c.dims.length < 2
        ? 'Add a second dimension, or pivot by one, to give the columns'
        : 'Use 2 dimensions: a third would put two rows in one cell');
      return;
    }

    // --- The matrix -----------------------------------------------------------

    var rowField = c.dims[0];
    var colField = pivoted ? pivotFields[0] : c.dims[1];
    var rows = [];
    var cols = [];
    var rowAt = {};
    var colAt = {};
    var cells = {};
    var sources = {};   // the unpivoted row behind each cell
    var rowTotals = {};
    var colTotals = {};
    var grand = null;

    function keyOf(cell) { return cell && cell.value != null ? String(cell.value) : NULL_TEXT; }
    function labelOf(cell) { return V.cellText(cell) || NULL_TEXT; }
    function addRow(key, label, row) {
      if (!(key in rowAt)) { rowAt[key] = rows.length; rows.push({ key: key, label: label, row: row, at: rows.length }); }
      return rows[rowAt[key]];
    }
    function addCol(key, label) {
      if (!(key in colAt)) { colAt[key] = cols.length; cols.push({ key: key, label: label, at: cols.length }); }
      return cols[colAt[key]];
    }

    if (pivoted) {
      qr.pivots.forEach(function (p) {
        if (p.is_total) return;
        var meta = p.metadata && p.metadata[colField.name];
        var raw = p.data && p.data[colField.name];
        addCol(p.key, (meta && meta.rendered) || (raw != null ? String(raw) : p.key));
      });
      c.data.forEach(function (row) {
        var dimCell = row[rowField.name];
        var r = addRow(keyOf(dimCell), labelOf(dimCell), row);
        var byPivot = row[measure.name] || {};
        cols.forEach(function (col) { cells[r.key + '\u0000' + col.key] = byPivot[col.key] || {}; });
        if (byPivot[ROW_TOTAL]) rowTotals[r.key] = byPivot[ROW_TOTAL];
      });
      var supplied = qr.totals_data && qr.totals_data[measure.name];
      if (supplied) {
        cols.forEach(function (col) { if (supplied[col.key]) colTotals[col.key] = supplied[col.key]; });
        grand = supplied[ROW_TOTAL] || null;
      }
    } else {
      c.data.forEach(function (row) {
        var r = addRow(keyOf(row[rowField.name]), labelOf(row[rowField.name]), row);
        var col = addCol(keyOf(row[colField.name]), labelOf(row[colField.name]));
        cells[r.key + '\u0000' + col.key] = row[measure.name] || {};
        sources[r.key + '\u0000' + col.key] = row;
      });
    }

    // undefined: no row for this pair. {} with a null value: a null.
    function cellAt(r, col) { return cells[r.key + '\u0000' + col.key]; }

    var nums = [];
    var hasMissing = false;
    var hasNull = false;
    rows.forEach(function (r) {
      cols.forEach(function (col) {
        var cell = cellAt(r, col);
        if (!cell) { hasMissing = true; return; }
        var v = V.cellNumber(cell);
        if (v === null) hasNull = true;
        else nums.push(v);
      });
    });
    var stats = {
      min: nums.length ? Math.min.apply(null, nums) : 0,
      max: nums.length ? Math.max.apply(null, nums) : 0,
      mean: nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0
    };

    // --- Sort -----------------------------------------------------------------

    // By Looker's own total where it supplied one, otherwise by the sum of the
    // cells, which is only ever used to order and never shown.
    function rankOf(list, isRow) {
      return function (item) {
        var given = isRow ? rowTotals[item.key] : colTotals[item.key];
        if (given && V.cellNumber(given) !== null) return V.cellNumber(given);
        var sum = 0;
        (isRow ? cols : rows).forEach(function (other) {
          var v = V.cellNumber(isRow ? cellAt(item, other) : cellAt(other, item));
          if (v !== null) sum += v;
        });
        return sum;
      };
    }
    function sortList(list, how, isRow) {
      var rank = rankOf(list, isRow);
      list.forEach(function (item) { item.rank = rank(item); });
      list.sort(function (a, b) {
        var diff = 0;
        if (how === 'desc') diff = b.rank - a.rank;
        else if (how === 'asc') diff = a.rank - b.rank;
        else if (how === 'name') diff = String(a.label).localeCompare(String(b.label), undefined, { numeric: true });
        return diff || a.at - b.at;
      });
    }
    sortList(rows, config.sort_by, true);
    sortList(cols, config.sort_columns_by, false);

    // --- Colour ---------------------------------------------------------------

    var diverging = config.colour_scale === 'diverging';
    var reverse = config.reverse_scale === true;
    var chosen = config.main_colour && config.main_colour[0];
    // Left at its default the theme token wins, so an untouched heatmap still
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

    var showTotals = config.show_totals === true;
    var hasRowTotals = showTotals && Object.keys(rowTotals).length > 0;
    var hasColTotals = showTotals && Object.keys(colTotals).length > 0;

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

    var xTitle = c.title('x_axis_label', nameOf(colField));
    var yTitle = c.title('y_axis_label', nameOf(rowField));
    var topBand = xTitle ? 18 : 0;
    var leftBand = yTitle ? 16 : 0;

    // Laid out up to three times: a line of totals whose figures will not fit
    // is dropped and its room given back to the cells. The tooltip keeps them.
    for (var pass = 0; pass < 3; pass++) {
      var bodyFont = V.fontOf(12);
      var boldFont = V.fontOf(12, 600);
      var totW = 0;
      if (hasRowTotals) {
        totW = V.textWidth('Total', V.fontOf(11, 600));
        rows.forEach(function (r) {
          if (rowTotals[r.key]) totW = Math.max(totW, V.textWidth(V.cellText(rowTotals[r.key]), boldFont));
        });
        if (grand) totW = Math.max(totW, V.textWidth(V.cellText(grand), boldFont));
        totW = Math.min(Math.ceil(totW) + PAD * 2 + 4, Math.floor(W * 0.22));
      }
      var totH = hasColTotals ? 24 : 0;

      // The row labels ask for their full width up to a third of the tile, then
      // wrap, shrink and cut from the middle.
      var widest = 0;
      rows.forEach(function (r) { widest = Math.max(widest, V.textWidth(r.label, bodyFont)); });
      var labelW = Math.min(Math.ceil(widest) + PAD * 2, Math.max(48, Math.floor((W - leftBand - totW) * 0.34)));
      if (hasColTotals) labelW = Math.max(labelW, Math.min(Math.ceil(V.textWidth('Total', V.fontOf(11, 600))) + PAD * 2, 60));

      var gridX = leftBand + labelW;
      var cellW = Math.max(1, (W - gridX - totW - 2) / cols.length);

      // Column names: flat on up to two lines where they fit, otherwise turned
      // on their side, otherwise dropped to the tooltip.
      var head = cols.map(function (col) { return ladder(col.label, cellW - 4, 2, [11, 10, 9], 600); });
      var rotated = !head.every(Boolean);
      var headH;
      if (!rotated) {
        var headLines = 1;
        head.forEach(function (h) { headLines = Math.max(headLines, h.lines.length); });
        headH = headLines * LINE + 8;
      } else {
        // Turned on its side, a name wraps across the column's width instead.
        var cap = Math.max(30, Math.floor(H * 0.3));
        var across = Math.max(1, Math.min(2, Math.floor((cellW - 2) / 11)));
        var used = 0;
        head = cols.map(function (col) {
          if (cellW < 11) return null;
          var fitted = ladder(col.label, cap - 10, across, [10, 9], 600);
          if (fitted) {
            fitted.lines.forEach(function (l) { used = Math.max(used, V.textWidth(l, V.fontOf(fitted.size, 600))); });
          }
          return fitted;
        });
        headH = Math.max(24, Math.ceil(used) + 10);
      }

      var gridY = topBand + headH;
      var cellH = Math.max(1, Math.min(48, (H - gridY - totH - 2) / rows.length));
      var gridW = cellW * cols.length;
      var gridH = cellH * rows.length;
      if (hasRowTotals && cellH < 12) { hasRowTotals = false; continue; }
      if (hasColTotals && !evenly(cols.map(function (col) { return colTotals[col.key]; }), cellW - 4)) {
        hasColTotals = false;
        continue;
      }
      break;
    }
    var gap = cellW > 6 && cellH > 6 ? 1 : 0;

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
    if (yTitle) {
      var yt = V.middleFit(yTitle, V.fontOf(11), gridH);
      if (yt) {
        svg.appendChild(V.el('text', {
          class: 'v-axis-title', x: 0, y: 0, 'text-anchor': 'middle',
          transform: 'translate(11,' + (gridY + gridH / 2) + ') rotate(-90)'
        })).textContent = yt;
      }
    }

    // --- Column names ----------------------------------------------------------

    cols.forEach(function (col, j) {
      var fitted = head[j];
      if (!fitted) return;
      var cx = gridX + j * cellW + cellW / 2;
      if (rotated) {
        var step = fitted.size + 1;
        fitted.lines.forEach(function (line, k) {
          var lx = cx - (fitted.lines.length - 1) * step / 2 + k * step + fitted.size / 2 - 1;
          var node = addText(svg, 'hm-text hm-head-text', 0, 0, line, fitted.size, 'start');
          node.setAttribute('transform', 'translate(' + lx + ',' + (gridY - 5) + ') rotate(-90)');
        });
        return;
      }
      var y0 = gridY - 6 - (fitted.lines.length - 1) * LINE;
      fitted.lines.forEach(function (line, i) {
        addText(svg, 'hm-text hm-head-text', cx, y0 + i * LINE, line, fitted.size, 'middle');
      });
    });

    // --- Row names -------------------------------------------------------------

    // One size for every row name, the size the longest one needed, so the
    // axis reads as one list rather than a ransom note.
    var rowLines = Math.max(1, Math.min(3, Math.floor((cellH - 2) / LINE)));
    var rowSize = 12;
    rows.forEach(function (r) {
      var fitted = ladder(r.label, labelW - PAD * 2, rowLines, SIZES);
      if (fitted) rowSize = Math.min(rowSize, fitted.size);
    });
    var rowSizes = SIZES.filter(function (s) { return s <= rowSize; });
    rows.forEach(function (r, i) {
      if (cellH < 10) return;
      var fitted = ladder(r.label, labelW - PAD * 2, rowLines, rowSizes);
      if (!fitted) return;
      var mid = gridY + i * cellH + cellH / 2;
      var y0 = mid + 4 - (fitted.lines.length - 1) * LINE / 2;
      fitted.lines.forEach(function (line, k) {
        addText(svg, 'hm-text' + (r.label === NULL_TEXT ? ' hm-null-text' : ''), gridX - PAD, y0 + k * LINE,
          line, fitted.size, 'end');
      });
    });

    // --- Cells -------------------------------------------------------------------

    // The number leads. One size and one form for every cell, so the grid
    // reads evenly: Looker's rendered value at the largest size where all of
    // them fit, else the compact form (-£42k), else none, and the tooltip
    // carries the figure. A cell that gives up its number keeps its colour.
    function compactOf(cell) {
      var v = V.cellNumber(cell);
      if (v === null || Math.abs(v) < 1000) return V.cellText(cell) || NULL_TEXT;
      var prefix = (/^-?([^\d.,\s-]*)/.exec(V.cellText(cell)) || ['', ''])[1];
      return (v < 0 ? '-' : '') + prefix + V.compact(Math.abs(v));
    }
    function sizeFor(form) {
      var size = 12;
      for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < cols.length; j++) {
          var cell = cellAt(rows[i], cols[j]);
          if (!cell) continue;
          size = shrink(form(cell), cellW - 6, null, Math.min(size, cellH - 3));
          if (!size) return null;
        }
      }
      return size;
    }
    var valueForm = null;
    var valueSize = null;
    if (config.show_values !== false) {
      var fullForm = function (cell) { return V.cellText(cell) || NULL_TEXT; };
      valueSize = sizeFor(fullForm);
      valueForm = valueSize ? fullForm : compactOf;
      if (!valueSize) valueSize = sizeFor(compactOf);
    }
    var measureName = nameOf(measure);
    var grid = V.el('g', { role: 'grid', 'aria-label': measureName + ' by ' + nameOf(rowField) + ' and ' + nameOf(colField) });
    svg.appendChild(grid);
    var nodes = [];

    function readout(r, col) {
      var cell = cellAt(r, col);
      var out = [[measureName, !cell ? 'No row for this pair' : (V.cellText(cell) || 'No value')]];
      // The other measures of an unpivoted row, so nothing in the query is
      // out of reach.
      var source = sources[r.key + '\u0000' + col.key];
      if (source) {
        c.meas.slice(1).forEach(function (m) {
          out.push([nameOf(m), V.cellText(source[m.name]) || 'No value']);
        });
      }
      if (showTotals && rowTotals[r.key]) out.push(['Row total', V.cellText(rowTotals[r.key])]);
      if (showTotals && colTotals[col.key]) out.push(['Column total', V.cellText(colTotals[col.key])]);
      return out;
    }

    function drill(r, col, event) {
      var cell = cellAt(r, col);
      var links = (cell && cell.links) || [];
      if (!links.length) links = (r.row[rowField.name] || {}).links || [];
      if (links.length) LookerCharts.Utils.openDrillMenu({ links: links, event: event });
    }

    function focusCell(i, j) {
      var next = nodes[i] && nodes[i][j];
      if (!next) return;
      nodes.forEach(function (line) { line.forEach(function (n) { n.setAttribute('tabindex', '-1'); }); });
      next.setAttribute('tabindex', '0');
      next.focus();
    }

    rows.forEach(function (r, i) {
      nodes.push([]);
      cols.forEach(function (col, j) {
        var x = gridX + j * cellW;
        var y = gridY + i * cellH;
        var cell = cellAt(r, col);
        var value = cell ? V.cellNumber(cell) : null;
        var title = r.label + ' · ' + col.label;
        var g = V.el('g', {
          class: 'hm-cell', role: 'gridcell', tabindex: i === 0 && j === 0 ? '0' : '-1',
          'aria-label': title + ': ' + readout(r, col)[0][1]
        });

        if (!cell) {
          g.appendChild(V.el('rect', {
            class: 'hm-fill hm-missing', x: x + gap + 0.5, y: y + gap + 0.5,
            width: Math.max(1, cellW - gap * 2 - 1), height: Math.max(1, cellH - gap * 2 - 1), rx: 2
          }));
        } else {
          var tone = toneOf(value);
          g.appendChild(V.el('rect', {
            class: 'v-mark hm-fill', x: x + gap, y: y + gap,
            width: Math.max(1, cellW - gap * 2), height: Math.max(1, cellH - gap * 2), rx: 2, fill: tone.fill
          }));
          if (valueSize) {
            addText(g, 'hm-text', x + cellW / 2, y + cellH / 2 + valueSize * 0.35, valueForm(cell), valueSize,
              'middle', tone.ink);
          }
        }

        g.addEventListener('mousemove', function (e) { c.tip.show(title, readout(r, col), e.clientX, e.clientY); });
        g.addEventListener('mouseleave', function () { c.tip.hide(); });
        g.addEventListener('click', function (event) { drill(r, col, event); });
        g.addEventListener('focus', function () {
          var b = g.getBoundingClientRect();
          c.tip.show(title, readout(r, col), b.left + b.width / 2, b.bottom);
        });
        g.addEventListener('blur', function () { c.tip.hide(); });
        g.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            drill(r, col, event);
            return;
          }
          var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
          var move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          focusCell(Math.max(0, Math.min(rows.length - 1, i + move[0])),
                    Math.max(0, Math.min(cols.length - 1, j + move[1])));
        });
        grid.appendChild(g);
        nodes[i].push(g);
      });
    });

    // --- Totals, as Looker supplied them ------------------------------------------

    // Like the cells, one size and one form along each line of totals.
    function evenly(list, room, most) {
      var given = list.filter(Boolean);
      var forms = [function (cell) { return V.cellText(cell); }, compactOf];
      for (var f = 0; f < forms.length; f++) {
        var size = most || 12;
        for (var i = 0; i < given.length && size; i++) size = shrink(forms[f](given[i]), room, 600, size);
        if (size) return { form: forms[f], size: size };
      }
      return null;
    }

    function totalText(cell, fit, x, y, h, anchor) {
      if (!cell || !fit || h < 12) return;
      addText(svg, 'hm-text hm-total-text', x, y + h / 2 + fit.size * 0.35, fit.form(cell), fit.size, anchor);
    }

    if (hasRowTotals) {
      var tx = gridX + gridW + 2;
      svg.appendChild(V.el('rect', { class: 'hm-head-bg', x: tx, y: gridY, width: totW, height: gridH }));
      svg.appendChild(V.el('line', { class: 'hm-rule', x1: tx + 0.5, x2: tx + 0.5, y1: gridY, y2: gridY + gridH }));
      addText(svg, 'hm-text hm-head-text', tx + totW - PAD, gridY - 6, 'Total', 11, 'end');
      var rowFit = evenly(rows.map(function (r) { return rowTotals[r.key]; }).concat([hasColTotals ? grand : null]), totW - PAD * 2, valueSize);
      rows.forEach(function (r, i) { totalText(rowTotals[r.key], rowFit, tx + totW - PAD, gridY + i * cellH, cellH, 'end'); });
    }
    if (hasColTotals) {
      var ty = gridY + gridH + 2;
      svg.appendChild(V.el('rect', { class: 'hm-head-bg', x: gridX, y: ty, width: gridW + (hasRowTotals ? totW + 2 : 0), height: totH }));
      svg.appendChild(V.el('line', { class: 'hm-rule', x1: gridX, x2: gridX + gridW, y1: ty + 0.5, y2: ty + 0.5 }));
      addText(svg, 'hm-text hm-total-text', gridX - PAD, ty + totH / 2 + 4, 'Total', 11, 'end');
      var colFit = evenly(cols.map(function (col) { return colTotals[col.key]; }), cellW - 4, valueSize);
      cols.forEach(function (col, j) { totalText(colTotals[col.key], colFit, gridX + j * cellW + cellW / 2, ty, totH, 'middle'); });
      if (hasRowTotals) totalText(grand, rowFit, gridX + gridW + 2 + totW - PAD, ty, totH, 'end');
    }

    svg.setAttribute('height', Math.min(H, Math.ceil(gridY + gridH + (totH ? totH + 2 : 0) + 6)));

    // --- Caption -------------------------------------------------------------------

    // Says what the colour means, and names the two kinds of empty cell where
    // the matrix has them.
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
      // Looker gives an unpivoted query one grand total and nothing per row
      // or column, and adding cells up is wrong for an average.
      if (config.show_totals === true && !Object.keys(rowTotals).length && !Object.keys(colTotals).length) {
        key(null, [pivoted ? 'Turn on totals in the query for totals' : 'Pivot the query for totals']);
      }
      return box;
    }
  }));
})();
