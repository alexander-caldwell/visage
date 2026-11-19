// Slope: where was each row in the first period, where is it in the second,
// and which way did it move. Two points per row on one shared vertical scale,
// joined by a line; the sibling of the dumbbell.
//
// Query shape, either of:
//   1 dimension + 2 measures: the two measures are the two periods, left and
//     right in query order, and their names head the two columns.
//   1 dimension + 1 date dimension + 1 measure: the first and last periods.
//     More than two periods: the first and last are compared and the caption
//     says so.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.0. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('slope build v1.0.0');

/* visage:manifest
{ "id": "slope", "family": "time",
  "shapes": ["1d2m", "2d1m"],
  "checks": [
    { "fixture": "example" },
    { "fixture": "months" },
    { "fixture": "slope_edge" },
    { "fixture": "slope_edge", "config": { "good_direction": "down" }, "name": "slope_edge [lower is better]" },
    { "fixture": "slope_edge", "config": { "good_direction": "none" }, "name": "slope_edge [one hue]" },
    { "fixture": "slope_edge", "config": { "missing_values": "zero" }, "name": "slope_edge [missing as zero]" },
    { "fixture": "months", "config": { "rolling_average": 3 }, "name": "months [3-period average]" },
    { "fixture": "example", "config": { "zero_baseline": false }, "name": "example [free scale]" }
  ] }
*/

(function () {
  var SPEC = {
    id: 'slope',
    label: 'Slope',
    version: '1.0.0',
    family: 'time',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension + 2 measures, or 1 dimension + 1 date dimension + 1 measure',
    good_for: [
      'Which rows rose and which fell between two periods, and by how much',
      'Over a dumbbell when the two measures are before and after and the direction of change is the story'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A slope needs 1 dimension and 2 measures, or a date dimension, a second dimension and 1 measure.'
    },

    // Rules for this chart only. The shared tokens, legend, tooltip and axis
    // styles are already in the prelude.
    css:
      '.sl-row { cursor: pointer; }' +
      '.sl-row:focus { outline: none; }' +
      '.sl-line { fill: none; stroke-width: 2; stroke-linecap: round; transition: stroke-width 90ms ease-out; }' +
      '.sl-row:hover .sl-line, .sl-row:focus-visible .sl-line { stroke-width: 4; }' +
      '.sl-hit { fill: none; stroke: transparent; stroke-width: 16; }' +
      '.sl-dot-hit { fill: transparent; }' +
      '.sl-head { font-size: 11px; font-weight: 600; fill: var(--v-ink-2); }' +
      '.sl-name { fill: var(--v-ink-2); }' +
      '.sl-num { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.sl-leader { stroke: var(--v-muted); stroke-width: 1; fill: none; }' +
      '.sl-note { font-size: 10px; fill: var(--v-muted); }'
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

  // The panel the user sees. Baseline plus the time tier,
  // inherited from docs/roadmap.md. Drop one only with a reason: npm run check
  // fails a chart that is short of its tier.
  var OPTIONS = {
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
      values: [{ 'Leave a Gap': 'gap' }, { 'Treat as Zero': 'zero' }, { 'Join Across': 'connect' }],
      default: 'gap',
      section: 'Data',
      order: 2
    },
    rolling_average: {
      type: 'number',
      // Reworded for two ends: with a date dimension, each end becomes the
      // average of its N periods. Ignored with two measures.
      label: 'Average N Periods at Each End (0 = Off)',
      default: 0,
      section: 'Data',
      order: 3
    },
    // Same key and values as the KPI tile and the progress bar.
    good_direction: {
      type: 'string',
      label: 'Good Direction',
      display: 'select',
      values: [{ 'Higher Is Better': 'up' }, { 'Lower Is Better': 'down' }, { 'Neither': 'none' }],
      default: 'up',
      section: 'Data',
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

  // More lines than this and the labels cannot all be read at tile size.
  var MAX_ROWS = 25;

  function nameOf(field) {
    return field ? (field.label_short || field.label || field.name) : '';
  }

  // The later end, or the earlier when the later is missing.
  function topOf(r) { return r.b ? r.b.value : r.a.value; }

  function isDate(field) {
    return !!field && (field.is_timeframe || /^date/.test(field.type || ''));
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    var config = c.config;
    var width = c.width;
    var height = c.height;
    var notes = [];

    // --- Rows ----------------------------------------------------------------

    // Two shapes. With a second dimension, one of them holds the periods (the
    // date one, else the first) and the other names the rows. Without one,
    // the first two measures are the two ends.
    var byPeriod = c.dims.length > 1;
    if (!byPeriod && c.meas.length < 2) {
      c.message('A slope needs 2 measures, or a date dimension with 2 periods');
      return;
    }

    var periodField = null;
    var entityField = c.dims[0];
    var valueField = c.meas[0];
    var heads;
    var rows = [];
    var missing = config.missing_values === 'zero' ? 'zero' : 'gap';

    function end(cell) {
      var value = V.cellNumber(cell);
      if (value === null) {
        if (missing !== 'zero') return null;
        return { value: 0, text: '0' };
      }
      return { value: value, text: V.cellText(cell) || V.compact(value) };
    }

    if (byPeriod) {
      periodField = isDate(c.dims[1]) && !isDate(c.dims[0]) ? c.dims[1] : c.dims[0];
      entityField = periodField === c.dims[0] ? c.dims[1] : c.dims[0];

      var keys = [];
      var keyText = {};
      var cells = {};
      var order = [];
      c.data.forEach(function (row) {
        var pCell = row[periodField.name];
        var key = pCell && pCell.value != null ? String(pCell.value) : V.cellText(pCell);
        if (!(key in keyText)) { keys.push(key); keyText[key] = V.cellText(pCell); }
        var name = V.cellText(row[entityField.name]);
        if (!cells[name]) { cells[name] = { byKey: {}, links: [] }; order.push(name); }
        cells[name].byKey[key] = row[valueField.name];
        var links = row[entityField.name] && row[entityField.name].links;
        if (links && links.length && !cells[name].links.length) cells[name].links = links;
      });
      // Date values sort as text (2026-01 before 2026-02); anything else keeps
      // the query's order.
      if (isDate(periodField)) keys.sort();
      if (keys.length < 2) {
        c.message('A slope needs 2 periods; the query has ' + keys.length);
        return;
      }

      // Each end the mean of its N periods, so one noisy month does not set
      // the slope. Capped so the two ends never share a period.
      var span = Math.min(Math.round(config.rolling_average || 0), Math.floor(keys.length / 2));
      var leftKeys = span > 1 ? keys.slice(0, span) : [keys[0]];
      var rightKeys = span > 1 ? keys.slice(keys.length - span) : [keys[keys.length - 1]];
      if (span > 1) notes.push(keys.length + ' periods: each end is the average of ' + span);
      else if (keys.length > 2) notes.push(keys.length + ' periods: first and last compared');

      var averaged = function (byKey, which) {
        if (which.length === 1) return end(byKey[which[0]]);
        var sum = 0;
        var count = 0;
        which.forEach(function (k) {
          var v = V.cellNumber(byKey[k]);
          if (v === null && missing === 'zero') v = 0;
          if (v !== null) { sum += v; count++; }
        });
        return count ? { value: sum / count, text: V.compact(sum / count) } : null;
      };

      heads = [
        span > 1 ? keyText[leftKeys[0]] + ' to ' + keyText[leftKeys[span - 1]] : keyText[leftKeys[0]],
        span > 1 ? keyText[rightKeys[0]] + ' to ' + keyText[rightKeys[span - 1]] : keyText[rightKeys[0]]
      ];
      order.forEach(function (name) {
        rows.push({
          name: name, links: cells[name].links,
          a: averaged(cells[name].byKey, leftKeys), b: averaged(cells[name].byKey, rightKeys)
        });
      });
    } else {
      heads = [nameOf(c.meas[0]), nameOf(c.meas[1])];
      c.data.forEach(function (row) {
        var cell = row[entityField.name];
        rows.push({
          name: V.cellText(cell), links: (cell && cell.links) || [],
          a: end(row[c.meas[0].name]), b: end(row[c.meas[1].name])
        });
      });
    }

    rows = rows.filter(function (r) { return r.a || r.b; });
    if (!rows.length) {
      c.message('No values to draw');
      return;
    }

    if (rows.length > MAX_ROWS) {
      var total = rows.length;
      rows = rows.slice().sort(function (p, q) { return topOf(q) - topOf(p); }).slice(0, MAX_ROWS);
      notes.push('Showing the ' + MAX_ROWS + ' largest of ' + total + ' rows by ' + heads[1]);
    }

    var gaps = rows.filter(function (r) { return !r.a || !r.b; }).length;
    if (gaps) notes.push(gaps + (gaps === 1 ? ' row is' : ' rows are') + ' missing one end: point only, no line');

    // Colour carries a judgement the angle cannot: with lower is better, a
    // falling line is the good one. The angle still shows direction, so colour
    // is never the only channel. Neither: one hue for every line.
    var good = config.good_direction || 'up';
    var STATES = {
      better: { label: 'Improved', colour: c.colour(2) },
      worse: { label: 'Worsened', colour: c.colour(7) },
      flat: { label: 'No Change', colour: 'var(--v-muted)' },
      one: { label: '', colour: c.colour(0) }
    };
    rows.forEach(function (r) {
      r.change = r.a && r.b ? r.b.value - r.a.value : null;
      if (good === 'none') r.state = 'one';
      else if (r.change === null || r.change === 0) r.state = 'flat';
      else r.state = (r.change > 0) === (good === 'up') ? 'better' : 'worse';
    });

    // --- Room for the furniture ---------------------------------------------

    var legendHeight = 0;
    if (good !== 'none' && config.show_legend !== false && width >= 220) {
      var legend = document.createElement('div');
      legend.className = 'v-legend';
      ['better', 'worse', 'flat'].forEach(function (state) {
        var count = rows.filter(function (r) { return r.state === state && r.change !== null; }).length;
        if (!count) return;
        var key = document.createElement('div');
        key.className = 'v-key';
        var dot = document.createElement('div');
        dot.className = 'v-swatch';
        dot.style.background = STATES[state].colour;
        var text = document.createElement('span');
        text.textContent = STATES[state].label + ' (' + count + ')';
        key.appendChild(dot);
        key.appendChild(text);
        legend.appendChild(key);
      });
      if (legend.firstChild) {
        c.root.appendChild(legend);
        legendHeight = legend.offsetHeight || 20;
      }
    }

    var svgHeight = Math.max(40, height - legendHeight);
    var xTitle = c.title('x_axis_label', periodField ? nameOf(periodField) : '');
    var yTitle = c.title('y_axis_label', periodField ? nameOf(valueField) : '');
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    var noteFont = V.fontOf(10);
    var noteLines = [];
    if (notes.length) {
      var noteRoom = Math.max(0, width - yBand - 12);
      noteLines = V.wrapWords(notes.join(' · '), noteFont, noteRoom, 2) || [];
      noteLines = noteLines.map(function (line) { return V.fit(line, noteFont, noteRoom); })
        .filter(Boolean);
    }
    var noteBand = noteLines.length * 12;

    var headBand = 20;
    var top = headBand + 6;
    var bottom = svgHeight - 6 - xBand - noteBand;
    if (bottom - top < 30) bottom = top + 30;

    // --- Scale ---------------------------------------------------------------

    var lo = Infinity;
    var hi = -Infinity;
    rows.forEach(function (r) {
      [r.a, r.b].forEach(function (e) {
        if (!e) return;
        lo = Math.min(lo, e.value);
        hi = Math.max(hi, e.value);
      });
    });
    if (config.zero_baseline !== false) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
    if (hi === lo) { hi += 1; lo -= 1; }

    // Points sit inside the label band by half a label, so an extreme label
    // centred on its point stays inside the plot.
    var inset = 8;
    function yAt(value) {
      return bottom - inset - ((value - lo) / (hi - lo)) * (bottom - top - inset * 2);
    }

    // --- Columns -------------------------------------------------------------

    var plotLeft = 6 + yBand;
    var plotRight = width - 6;
    var plotWidth = plotRight - plotLeft;
    var DOT_GAP = 14;
    // Horizontal run for a leader, so a pushed label's line can be told apart
    // from its neighbours' rather than stacking along the rule.
    var LEAD = Math.round(Math.max(10, Math.min(24, plotWidth * 0.03)));

    function wanted(side) {
      return rows.reduce(function (m, r) {
        var e = side ? r.b : r.a;
        if (!e) return m;
        return Math.max(m, V.textWidth(e.text, V.fontOf(12, 600)) + 6 + V.textWidth(r.name, V.fontOf(12)));
      }, 0) + DOT_GAP + LEAD;
    }
    var minSpan = Math.max(50, plotWidth * 0.28);
    var maxGutter = Math.max(30, (plotWidth - minSpan) / 2);
    var gutterL = Math.min(wanted(0), maxGutter);
    var gutterR = Math.min(wanted(1), maxGutter);
    var xL = plotLeft + gutterL;
    var xR = plotRight - gutterR;

    var svg = c.svg();
    svg.setAttribute('height', svgHeight);

    // Two upright rules, one per period, and zero when the scale reaches it.
    // No tick scale: every point carries its own figure.
    [xL, xR].forEach(function (x) {
      svg.appendChild(V.el('line', {
        class: 'v-axis-line', x1: Math.round(x) + 0.5, x2: Math.round(x) + 0.5, y1: top, y2: bottom
      }));
    });
    if (lo <= 0 && hi >= 0 && config.zero_baseline !== false) {
      var y0 = Math.round(yAt(0)) + 0.5;
      svg.appendChild(V.el('line', { class: 'v-grid-line', x1: xL, x2: xR, y1: y0, y2: y0 }));
    }

    var headFont = V.fontOf(11, 600);
    // Each head centred on its rule when it fits, else set from the tile's
    // outside edge towards the middle.
    var headFont = V.fontOf(11, 600);
    heads.forEach(function (text, side) {
      var rule = side ? xR : xL;
      var outside = side ? plotRight - rule : rule - plotLeft;
      var half = Math.min(outside, (xR - xL) / 2 - 4);
      var x = rule;
      var anchor = 'middle';
      var laid = V.textWidth(text, headFont) / 2 <= half ? text : null;
      if (!laid) {
        x = side ? plotRight : plotLeft;
        anchor = side ? 'end' : 'start';
        laid = V.middleFit(text, headFont, outside + (xR - xL) / 2 - 4);
      }
      if (!laid) return;
      var head = V.el('text', { class: 'sl-head', x: x, y: 13, 'text-anchor': anchor });
      head.textContent = laid;
      svg.appendChild(head);
    });

    // --- Labels --------------------------------------------------------------

    // Each end: the figure beside the point, the name outside it. Labels that
    // would collide are pushed apart and joined to their point by a leader.
    // When the side is too crowded the ladder runs: wrap, shrink, cut from the
    // middle, drop the name, then drop the label. The tooltip keeps all of it.
    function layoutSide(side, lead) {
      var gutter = (side ? gutterR : gutterL) - DOT_GAP - lead;
      var items = rows.filter(function (r) { return side ? r.b : r.a; }).map(function (r) {
        var e = side ? r.b : r.a;
        return { row: r, value: e.text, target: yAt(e.value) };
      });
      items.sort(function (p, q) { return p.target - q.target; });

      // [size, mode, share of the height the stack may fill]. The first pass
      // shrinks while the stack would fill more than 85% of the height: past
      // that, labels sit so far from their points that the reader is following
      // leaders. The second pass takes any fit before a name is cut.
      var stages = [
        [12, 'wrap', 0.85], [11, 'wrap', 0.85], [10, 'wrap', 0.85],
        [12, 'wrap', 1], [11, 'wrap', 1], [10, 'wrap', 1], [9, 'wrap', 1],
        [9, 'cut', 1], [9, 'value', 1]
      ];
      for (var s = 0; s < stages.length; s++) {
        var size = stages[s][0];
        var mode = stages[s][1];
        var lineH = size + 3;
        var ok = true;
        var need = 0;
        items.forEach(function (it) {
          it.size = size;
          it.valueW = V.textWidth(it.value, V.fontOf(size, 600));
          var room = gutter - it.valueW - 6;
          var font = V.fontOf(size);
          var lines = [];
          if (mode !== 'value' && room > 0) {
            if (V.textWidth(it.row.name, font) <= room) lines = [it.row.name];
            else if (mode === 'wrap') {
              lines = V.wrapWords(it.row.name, font, room, 2);
              if (!lines || lines.some(function (l) { return V.textWidth(l, font) > room; })) {
                ok = false;
                lines = [];
              }
            } else {
              var cut = V.middleFit(it.row.name, font, room);
              lines = cut ? [cut] : [];
            }
          }
          it.lines = lines;
          it.h = Math.max(1, lines.length) * lineH;
          need += it.h;
        });
        if (ok && need <= (bottom - top) * stages[s][2]) return place(items);
      }

      // Still too tall at the smallest step: keep the labels for the largest
      // changes and leave the rest to the tooltip.
      var byChange = items.slice().sort(function (p, q) {
        return Math.abs(q.row.change || 0) - Math.abs(p.row.change || 0);
      });
      var kept = [];
      var used = 0;
      byChange.forEach(function (it) {
        if (used + it.h <= bottom - top) { kept.push(it); used += it.h; }
      });
      kept.sort(function (p, q) { return p.target - q.target; });
      return place(kept);
    }

    // One-dimensional de-overlap: push down from the top, then back up from
    // the bottom. Fits whenever the heights sum to no more than the room.
    function place(items) {
      var floor = top;
      items.forEach(function (it) {
        it.y = Math.max(it.target - it.h / 2, floor);
        floor = it.y + it.h;
      });
      var ceiling = bottom;
      for (var i = items.length - 1; i >= 0; i--) {
        items[i].y = Math.min(items[i].y, ceiling - items[i].h);
        ceiling = items[i].y;
      }
      return items;
    }

    function pushed(items) {
      return items.some(function (it) { return Math.abs(it.y + it.h / 2 - it.target) > 1.5; });
    }

    // Labels sit beside their points when none has to move. Once any is
    // pushed, the whole side steps out by LEAD and every pushed label gets
    // a leader: a short flat stub from its point, then a run to the label.
    function drawLabels(side) {
      var items = layoutSide(side, 0);
      var lead = 0;
      if (pushed(items)) { lead = LEAD; items = layoutSide(side, lead); }
      var dotX = side ? xR : xL;
      var dir = side ? 1 : -1;
      var x = dotX + dir * (DOT_GAP + lead);
      var anchor = side ? 'start' : 'end';
      items.forEach(function (it) {
        var mid = it.y + it.h / 2;
        if (Math.abs(mid - it.target) > 1.5) {
          var leader = V.el('path', {
            class: 'sl-leader',
            d: 'M' + (dotX + dir * 6) + ' ' + it.target +
               ' L' + (dotX + dir * 10) + ' ' + it.target +
               ' L' + (x - dir * 3) + ' ' + mid
          });
          svg.appendChild(leader);
        }
        var num = V.el('text', {
          class: 'sl-num', x: x, y: mid + it.size * 0.36, 'text-anchor': anchor,
          'font-size': it.size
        });
        num.textContent = it.value;
        svg.appendChild(num);

        var nameX = side ? x + it.valueW + 6 : x - it.valueW - 6;
        var lineH = it.size + 3;
        it.lines.forEach(function (line, i) {
          var t = V.el('text', {
            class: 'sl-name', x: nameX, 'text-anchor': anchor, 'font-size': it.size,
            y: mid + (i - (it.lines.length - 1) / 2) * lineH + it.size * 0.36
          });
          t.textContent = line;
          svg.appendChild(t);
        });
      });
    }

    // --- Lines ---------------------------------------------------------------

    function changeText(r) {
      if (r.change === null) return 'No line: one end missing';
      var sign = r.change > 0 ? '+' : (r.change < 0 ? '−' : '');
      var text = sign + V.compact(Math.abs(r.change));
      if (r.a.value !== 0) {
        text += ' (' + sign + Math.abs(r.change / r.a.value * 100)
          .toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%)';
      }
      return text;
    }

    // Grey first, so a coloured line is never painted over by a flat one.
    // Within that, top to bottom, which is also the Tab order.
    var drawOrder = rows.slice().sort(function (p, q) {
      return ((p.state === 'flat' ? 0 : 1) - (q.state === 'flat' ? 0 : 1)) || topOf(q) - topOf(p);
    });

    drawOrder.forEach(function (r) {
      var colour = STATES[r.state].colour;
      var g = V.el('g', { class: 'sl-row', tabindex: '0', role: 'img' });
      g.setAttribute('aria-label', r.name + ': ' + heads[0] + ' ' + (r.a ? r.a.text : 'none') +
        ', ' + heads[1] + ' ' + (r.b ? r.b.text : 'none'));

      var ya = r.a ? yAt(r.a.value) : null;
      var yb = r.b ? yAt(r.b.value) : null;
      if (r.a && r.b) {
        var d = 'M' + xL + ' ' + ya + ' L' + xR + ' ' + yb;
        var line = V.el('path', { class: 'v-mark sl-line', d: d });
        line.style.stroke = colour;
        g.appendChild(line);
        g.appendChild(V.el('path', { class: 'sl-hit', d: d }));
      }
      [[r.a, xL, ya], [r.b, xR, yb]].forEach(function (p) {
        if (!p[0]) return;
        var dot = V.el('circle', { class: 'v-mark', cx: p[1], cy: p[2], r: 4, 'stroke-width': 2 });
        dot.style.fill = colour;
        dot.style.stroke = 'var(--v-surface)';
        g.appendChild(dot);
        g.appendChild(V.el('circle', { class: 'sl-dot-hit', cx: p[1], cy: p[2], r: 9 }));
      });

      var tipRows = [
        [heads[0], r.a ? r.a.text : '∅'],
        [heads[1], r.b ? r.b.text : '∅'],
        ['Change', changeText(r)]
      ];
      g.addEventListener('pointermove', function (event) {
        c.tip.show(r.name, tipRows, event.clientX, event.clientY);
      });
      g.addEventListener('pointerleave', c.tip.hide);
      g.addEventListener('focus', function () {
        var box = g.getBoundingClientRect();
        c.tip.show(r.name, tipRows, box.left + box.width / 2, box.top + box.height / 2);
      });
      g.addEventListener('blur', c.tip.hide);
      if (r.links && r.links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: r.links, event: event });
        };
        g.addEventListener('click', drill);
        g.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
        });
      }
      svg.appendChild(g);
    });

    drawLabels(0);
    drawLabels(1);

    // --- Titles and caption --------------------------------------------------

    if (yTitle) {
      var yLaid = V.fit(yTitle, V.fontOf(11), bottom - top);
      if (yLaid) {
        var yLabel = V.el('text', {
          class: 'v-axis-title', x: 0, y: 0, 'text-anchor': 'middle',
          transform: 'translate(' + (yBand - 3) + ',' + ((top + bottom) / 2) + ') rotate(-90)'
        });
        yLabel.textContent = yLaid;
        svg.appendChild(yLabel);
      }
    }
    if (xTitle) {
      var xLaid = V.fit(xTitle, V.fontOf(11), plotWidth);
      if (xLaid) {
        var xLabel = V.el('text', {
          class: 'v-axis-title', x: (xL + xR) / 2, y: bottom + 16, 'text-anchor': 'middle'
        });
        xLabel.textContent = xLaid;
        svg.appendChild(xLabel);
      }
    }
    noteLines.forEach(function (line, i) {
      var note = V.el('text', {
        class: 'sl-note', x: plotLeft, y: svgHeight - 4 - (noteLines.length - 1 - i) * 12
      });
      note.textContent = line;
      svg.appendChild(note);
    });
  }));
})();
