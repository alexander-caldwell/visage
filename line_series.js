// Line: one line per series across an ordered dimension, with the area family
// folded in as a fill mode.
//
// Line and area share an axis model, a series model and their whole options
// set. The difference is a fill and a stacking rule, so they are one file:
//   fill  none | area | stacked | share
//
// `stacked_area` was a separate chart until v2.0.0. It is now this file with
// fill set to "stacked".
//
// Query shape: 1 dimension + 1 measure. A second dimension gives one line per
// value. Self-contained: no dependencies to declare in the manifest.
//
// Build v2.0.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('line_series build v2.0.0');

/* visage:manifest
{ "id": "line_series", "family": "time",
  "shapes": ["2d1m", "1d1m"],
  "checks": [
    { "fixture": "months" },
    { "fixture": "months", "config": { "fill": "area" }, "name": "months [area]" },
    { "fixture": "months", "config": { "fill": "stacked" }, "name": "months [stacked]" },
    { "fixture": "months", "config": { "fill": "share" }, "name": "months [100%]" },
    { "fixture": "months", "config": { "rolling_average": 3 }, "name": "months [3-period average]" },
    { "fixture": "months", "config": { "missing_values": "zero" }, "name": "months [missing as zero]" },
    { "fixture": "months", "config": { "missing_values": "connect" }, "name": "months [missing joined]" },
    { "fixture": "months", "config": { "zero_baseline": false }, "name": "months [free scale]" },
    { "fixture": "months", "config": { "show_points": true }, "name": "months [points]" }
  ] }
*/

(function () {
  var SPEC = {
    id: 'line_series',
    label: 'Line',
    version: '2.0.0',
    family: 'time',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension + 1 measure (a second dimension gives one line per value)',
    good_for: [
      'A measure over time, one line per series',
      'Trend and turning points, where the reader needs the shape not the value',
      'What a total is made of over time, as stacked bands or a 100% share'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A line needs at least one dimension for the axis and one measure. A second dimension becomes one line per value.'
    },

    css:
      '.v-band { stroke: none; }' +
      '.v-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }' +
      '.v-note { font-size: 10px; fill: var(--v-muted); }'
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

  // The panel the user sees. Baseline plus the time tier, inherited from
  // docs/roadmap.md, plus the fill mode that folds area in.
  var OPTIONS = {
    fill: {
      type: 'string',
      label: 'Fill',
      display: 'select',
      values: [
        { 'Lines Only': 'none' },
        { 'Area Under Each Line': 'area' },
        { 'Stacked Bands': 'stacked' },
        { 'Stacked to 100%': 'share' }
      ],
      default: 'none',
      section: 'Data',
      order: 0
    },
    zero_baseline: {
      type: 'boolean',
      label: 'Start Scale at Zero',
      default: true,
      section: 'Data',
      order: 1
    },
    missing_values: {
      type: 'string',
      label: 'Missing Periods',
      display: 'select',
      applies_when: { option: 'fill', value: 'none', reason: 'Fill is "Lines Only"' },
      values: [
        { 'Leave a Gap': 'gap' },
        { 'Treat as Zero': 'zero' },
        { 'Join Across': 'connect' }
      ],
      default: 'gap',
      section: 'Data',
      order: 2
    },
    rolling_average: {
      type: 'number',
      label: 'Rolling Average over N Periods (0 = Off)',
      default: 0,
      section: 'Data',
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
    show_points: {
      type: 'boolean',
      label: 'Show Point Markers',
      default: false,
      section: 'Style',
      order: 1
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

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var width = c.width;
    var height = c.height;

    var fill = config.fill || 'none';
    var isShare = fill === 'share';
    var isStacked = fill === 'stacked' || isShare;
    var isArea = fill === 'area';

    var xField = c.dims[0];
    var seriesField = c.dims.length > 1 ? c.dims[1] : null;
    var valueField = c.meas[0];

    // --- Points --------------------------------------------------------------

    var xKeys = [];
    var xLabels = {};
    var totals = {};
    var points = {};

    c.data.forEach(function (row) {
      var xKey = V.cellText(row[xField.name]);
      var value = V.cellNumber(row[valueField.name]);
      if (value === null) return;
      var name = seriesField
        ? V.cellText(row[seriesField.name])
        : (valueField.label_short || valueField.label || valueField.name);
      if (xKeys.indexOf(xKey) === -1) {
        xKeys.push(xKey);
        xLabels[xKey] = V.cellText(row[xField.name]);
      }
      if (!points[name]) { points[name] = {}; totals[name] = 0; }
      points[name][xKey] = {
        value: value,
        text: V.cellText(row[valueField.name]),
        links: (row[xField.name] && row[xField.name].links) || []
      };
      totals[name] += value;
    });

    // Colour follows the series' own total, not its row position, so filtering
    // one out never repaints the survivors.
    var names = Object.keys(points).sort(function (a, b) { return totals[b] - totals[a]; });
    if (!names.length || xKeys.length < 2) {
      c.message('Not enough points to draw a line');
      return;
    }

    // A gap cannot be stacked: a band with a hole in it reads as a value of
    // zero anyway, so stacking says so plainly.
    var missing = isStacked ? 'zero' : (config.missing_values || 'gap');

    var plotted = {};
    names.forEach(function (name) {
      plotted[name] = xKeys.map(function (key) {
        var p = points[name][key];
        if (p) return { value: p.value, text: p.text, links: p.links, real: true };
        if (missing === 'zero') return { value: 0, text: '0', links: [], real: false };
        return null;
      });
    });

    // A rolling mean over the last N periods, so a noisy series shows its
    // trend. The tooltip keeps the actual figure beside it.
    var window_ = Math.round(config.rolling_average || 0);
    if (window_ > 1) {
      names.forEach(function (name) {
        var raw = plotted[name];
        plotted[name] = raw.map(function (pt, i) {
          if (!pt) return null;
          var sum = 0;
          var count = 0;
          for (var j = Math.max(0, i - window_ + 1); j <= i; j++) {
            if (raw[j]) { sum += raw[j].value; count++; }
          }
          if (!count) return null;
          return {
            value: sum / count, text: pt.text, links: pt.links,
            real: pt.real, raw: pt.value
          };
        });
      });
    }

    // --- Stacking ------------------------------------------------------------

    var lower = {};
    var upper = {};
    var stackTotals = [];

    if (isStacked) {
      names.forEach(function (name) { lower[name] = []; upper[name] = []; });
      xKeys.forEach(function (key, i) {
        var total = 0;
        names.forEach(function (name) {
          var pt = plotted[name][i];
          if (pt && pt.value > 0) total += pt.value;
        });
        stackTotals[i] = total;
        var running = 0;
        names.forEach(function (name) {
          var pt = plotted[name][i];
          var amount = pt && pt.value > 0 ? pt.value : 0;
          if (isShare) amount = total ? (amount / total) * 100 : 0;
          lower[name][i] = running;
          running += amount;
          upper[name][i] = running;
        });
      });
    }

    // --- Scale ---------------------------------------------------------------

    var peak = 0;
    var trough = Infinity;
    if (isShare) {
      peak = 100;
      trough = 0;
    } else if (isStacked) {
      xKeys.forEach(function (key, i) { peak = Math.max(peak, stackTotals[i]); });
      trough = 0;
    } else {
      names.forEach(function (name) {
        plotted[name].forEach(function (pt) {
          if (!pt) return;
          peak = Math.max(peak, pt.value);
          trough = Math.min(trough, pt.value);
        });
      });
    }
    if (!isFinite(trough)) trough = 0;

    // An area is a filled quantity, so it is read from zero whatever the
    // option says: a band floating off the floor overstates every difference.
    var floating = config.zero_baseline === false && !isStacked && !isArea;

    var step = V.niceStep((peak - (floating ? trough : Math.min(0, trough))) /
      (height < 220 ? 3 : 4));
    var yMin = isShare ? 0 : (floating ? Math.floor(trough / step) * step : Math.min(0, Math.floor(trough / step) * step));
    var yMax = isShare ? 100 : Math.max(yMin + step, Math.ceil(peak / step) * step);

    var ticks = [];
    for (var t = yMin; t <= yMax + 1e-9; t += step) ticks.push(Number(t.toFixed(10)));

    function tickText(value) { return isShare ? Math.round(value) + '%' : V.compact(value); }

    // --- Room for the furniture ---------------------------------------------

    var tickFont = V.fontOf(11);

    var legendHeight = 0;
    if (names.length > 1 && config.show_legend !== false && width >= 260) {
      var legend = document.createElement('div');
      legend.className = 'v-legend';
      names.slice(0, 8).forEach(function (name, i) {
        var key = document.createElement('div');
        key.className = 'v-key';
        var dot = document.createElement('div');
        dot.className = 'v-swatch';
        if (isStacked || isArea) dot.style.borderRadius = '2px';
        dot.style.background = c.colour(i);
        var text = document.createElement('span');
        text.textContent = name;
        key.appendChild(dot);
        key.appendChild(text);
        legend.appendChild(key);
      });
      c.root.appendChild(legend);
      legendHeight = legend.offsetHeight || 20;
    }

    var measureName = isShare
      ? 'Share of Total'
      : (valueField.label_short || valueField.label || valueField.name);
    var yTitle = c.title('y_axis_label', measureName);
    var xTitle = c.title('x_axis_label', xField.label_short || xField.label || xField.name);
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    var widest = ticks.reduce(function (m, v) {
      return Math.max(m, V.textWidth(tickText(v), tickFont));
    }, 0);

    // Areas laid over each other hide what is behind them, which is why the
    // roadmap scopes this fill to a single series. It is still the user's
    // choice, so it draws, and says what it is doing to the data.
    var overlapping = isArea && names.length > 1;
    var noteBand = overlapping ? 13 : 0;

    var plotLeft = yBand + Math.ceil(widest) + 10;
    var plotTop = 6;
    var tickBand = 18;
    var plotWidth = Math.max(20, width - plotLeft - 10);
    var plotHeight = Math.max(20, height - legendHeight - plotTop - tickBand - xBand - noteBand);

    var svg = c.svg();
    svg.setAttribute('height', Math.max(20, height - legendHeight));

    function xAt(i) {
      return xKeys.length < 2 ? plotLeft : plotLeft + (i / (xKeys.length - 1)) * plotWidth;
    }
    function yAt(value) {
      return plotTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    }

    // --- Grid, ticks and axis ------------------------------------------------

    ticks.forEach(function (value) {
      var y = Math.round(yAt(value)) + 0.5;
      svg.appendChild(V.el('line', {
        class: 'v-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = V.el('text', {
        class: 'v-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = tickText(value);
      svg.appendChild(label);
    });

    // X labels are thinned until they fit rather than overlapping.
    var everyNth = 1;
    while (everyNth < xKeys.length) {
      var need = xKeys.filter(function (k, i) { return i % everyNth === 0; })
        .reduce(function (m, k) { return Math.max(m, V.textWidth(xLabels[k], tickFont)); }, 0);
      if (need + 8 <= plotWidth / Math.ceil(xKeys.length / everyNth)) break;
      everyNth++;
    }

    xKeys.forEach(function (key, i) {
      if (i % everyNth !== 0) return;
      var label = V.fit(xLabels[key], tickFont, plotWidth / Math.ceil(xKeys.length / everyNth));
      if (!label) return;
      // The first and last labels anchor inwards, or they hang off the plot.
      var anchor = i === 0 ? 'start' : (i === xKeys.length - 1 ? 'end' : 'middle');
      var text = V.el('text', {
        class: 'v-tick', x: xAt(i), y: plotTop + plotHeight + 14, 'text-anchor': anchor
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    svg.appendChild(V.el('line', {
      class: 'v-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
      y1: Math.round(yAt(Math.max(yMin, Math.min(0, yMax)))) + 0.5,
      y2: Math.round(yAt(Math.max(yMin, Math.min(0, yMax)))) + 0.5
    }));

    // --- Series --------------------------------------------------------------

    // Drawn back to front, so the band nearest the axis is not covered by the
    // one above it.
    var order = isStacked ? names.slice().reverse() : names;

    order.forEach(function (name) {
      var s = names.indexOf(name);
      var colour = s < 8 ? c.colour(s) : 'var(--v-other)';

      if (isStacked) {
        var top = [];
        var bottom = [];
        xKeys.forEach(function (key, i) {
          top.push((top.length ? 'L' : 'M') + xAt(i) + ' ' + yAt(upper[name][i]));
          bottom.push('L' + xAt(xKeys.length - 1 - i) + ' ' + yAt(lower[name][xKeys.length - 1 - i]));
        });
        var band = V.el('path', { class: 'v-mark v-band', d: top.join(' ') + ' ' + bottom.join(' ') + ' Z' });
        band.style.fill = colour;
        svg.appendChild(band);
        return;
      }

      // A gap breaks the path; joining across is a choice the reader can see
      // in the option, not a silent one.
      var segments = [];
      var current = [];
      plotted[name].forEach(function (pt, i) {
        if (!pt) {
          if (missing === 'gap' && current.length) { segments.push(current); current = []; }
          return;
        }
        current.push({ x: xAt(i), y: yAt(pt.value) });
      });
      if (current.length) segments.push(current);
      if (!segments.length) return;

      if (isArea) {
        var floor = yAt(Math.max(yMin, Math.min(0, yMax)));
        segments.forEach(function (segment) {
          if (segment.length < 2) return;
          var d = segment.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
          d += ' L' + segment[segment.length - 1].x + ' ' + floor + ' L' + segment[0].x + ' ' + floor + ' Z';
          var area = V.el('path', { class: 'v-mark v-band', d: d });
          area.style.fill = colour;
          area.style.opacity = names.length > 1 ? 0.22 : 0.16;
          svg.appendChild(area);
        });
      }

      segments.forEach(function (segment) {
        var d = segment.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
        var line = V.el('path', { class: 'v-mark v-line', d: d });
        line.style.stroke = colour;
        svg.appendChild(line);
      });

      // A marker on every point when asked for, otherwise just the last one,
      // which is what tells the reader where the series ends.
      var lastSegment = segments[segments.length - 1];
      var lastPoint = lastSegment[lastSegment.length - 1];
      if (config.show_points) {
        segments.forEach(function (segment) {
          segment.forEach(function (p) {
            var dot = V.el('circle', { class: 'v-mark', cx: p.x, cy: p.y, r: 3.5, 'stroke-width': 2 });
            dot.style.fill = colour;
            dot.style.stroke = 'var(--v-surface)';
            svg.appendChild(dot);
          });
        });
      } else if (lastPoint) {
        var end = V.el('circle', { class: 'v-mark', cx: lastPoint.x, cy: lastPoint.y, r: 4, 'stroke-width': 2 });
        end.style.fill = colour;
        end.style.stroke = 'var(--v-surface)';
        svg.appendChild(end);
      }
    });

    // --- Hover and keyboard --------------------------------------------------

    // One target per x position listing every series, so the pointer never has
    // to land on a 2px line.
    xKeys.forEach(function (key, i) {
      var half = plotWidth / Math.max(1, xKeys.length - 1) / 2;
      var band = V.el('rect', {
        class: 'v-hit', x: Math.max(plotLeft, xAt(i) - half), y: plotTop,
        width: Math.max(4, half * 2), height: plotHeight, tabindex: '0'
      });

      var rows = names.map(function (name) {
        var pt = plotted[name][i];
        var raw = points[name][key];
        if (!raw && !(pt && pt.real === false)) return [name, '∅'];
        var shown = raw ? raw.text : '0';
        if (isStacked && stackTotals[i]) {
          var amount = pt && pt.value > 0 ? pt.value : 0;
          shown += '  ·  ' + Math.round((amount / stackTotals[i]) * 100) + '%';
        } else if (window_ > 1 && pt && pt.raw !== undefined) {
          shown += '  ·  ' + window_ + '-period avg ' + V.compact(pt.value);
        }
        return [name, shown];
      });
      if (isStacked) rows.push(['Total', V.compact(stackTotals[i])]);

      band.addEventListener('pointermove', function (event) {
        c.tip.show(xLabels[key], rows, event.clientX, event.clientY);
      });
      band.addEventListener('pointerleave', c.tip.hide);
      band.addEventListener('focus', function () {
        var box = band.getBoundingClientRect();
        c.tip.show(xLabels[key], rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      band.addEventListener('blur', c.tip.hide);

      var links = [];
      names.forEach(function (name) {
        var raw = points[name][key];
        if (raw && raw.links && raw.links.length && !links.length) links = raw.links;
      });
      if (links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: links, event: event });
        };
        band.addEventListener('click', drill);
        band.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
        });
      }
      svg.appendChild(band);
    });

    // --- Titles --------------------------------------------------------------

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

    if (overlapping) {
      var noteText = V.fit(
        names.length + ' areas drawn over each other; stacked bands or lines only may read better',
        V.fontOf(10), Math.max(0, width - plotLeft - 4));
      if (noteText) {
        var note = V.el('text', {
          class: 'v-note', x: plotLeft, y: Math.max(20, height - legendHeight) - 3
        });
        note.textContent = noteText;
        svg.appendChild(note);
      }
    }
  }));
})();
