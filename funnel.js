// Funnel: how many reach each stage, and how many are lost between stages?
//
// Query shape: 1 dimension (the stage) + 1 measure (the count at each stage).
// Stages are drawn in query order and never re-sorted by value: the order of
// a funnel is the process, not the ranking.
//
// Each bar's width is its count against the first stage, so a fivefold drop
// looks fivefold. A stage larger than the first widens the scale to the
// largest stage instead of being clamped, and the caption says so.
//
// The number leads: every stage states its count, then its share of the first
// stage. Between stages the conversion (share of the stage before) and the
// drop-off are labelled. A stage larger than the one before is drawn as it is
// and named in the caption. A stage with no value keeps its row, says so, and
// breaks the conversion either side of it. A first stage of zero gives no
// percentage of first, and the caption says why. A stage below zero is not a
// count, so the chart refuses rather than drawing it.
//
// A second measure is not drawn. It is shown in each stage's tooltip and the
// caption says so.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.0. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('funnel build v1.0.0');

/* visage:manifest
{ "id": "funnel", "family": "part_to_whole",
  "shapes": ["1d1m", "1d2m"],
  "checks": [
    { "fixture": "funnel_stages", "config": {} },
    { "fixture": "funnel_stages", "config": { "share_or_absolute": "share", "show_legend": false } },
    { "fixture": "funnel_stages", "config": { "max_slices": 3, "label_strategy": "value" } },
    { "fixture": "funnel_stages", "config": { "label_strategy": "name", "main_colour": ["#1baf7a"] } },
    { "fixture": "funnel_edge", "config": {} },
    { "fixture": "one_measure", "config": {} },
    { "fixture": "treemap", "config": {} }
  ] }
*/

(function () {
  var SPEC = {
    id: 'funnel',
    label: 'Funnel',
    version: '1.0.0',
    family: 'part_to_whole',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension (the stage, in query order) + 1 measure (the count at each stage)',
    good_for: [
      'How many reach each stage of a process, and where the most are lost',
      'Over a bar chart when the rows are steps in order: each bar is read against the first stage and the one before, with the drop-off between them labelled'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A funnel needs 1 dimension (the stage) and 1 measure (the count at each stage).'
    },

    css:
      '.fn-bar { shape-rendering: crispEdges; }' +
      '.fn-link { fill: var(--v-grid); }' +
      '.fn-zero { stroke: var(--v-axis); stroke-width: 1; }' +
      '.fn-head { fill: var(--v-ink-2); }' +
      '.fn-lead { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.fn-second { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.fn-gap { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.fn-name { fill: var(--v-ink); }' +
      '.fn-note { fill: var(--v-muted); }' +
      '.fn-hit { fill: transparent; cursor: pointer; }' +
      '.fn-hit:focus { outline: none; }' +
      '.fn-hit:focus-visible { stroke: var(--v-axis); stroke-width: 1; }' +
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

  // The panel the user sees. Baseline plus the part-to-whole tier, inherited
  // from docs/roadmap.md, plus one Main Colour. Stages are told apart by
  // position and name, so there is one hue and no series colours. Inherited
  // options are reworded for a funnel: the tail grouping keeps the first N
  // stages, the share is of the first stage, the legend switch (one series,
  // nothing to key) turns the drop-off labels on and off, and the axis-title
  // trio names the header: "Users by Stage".
  var OPTIONS = {
    max_slices: {
      type: 'number',
      label: 'Show the First N Stages (0 = All)',
      default: 0,
      section: 'Data',
      order: 0
    },
    share_or_absolute: {
      type: 'string',
      label: 'Lead With',
      display: 'select',
      values: [{ 'Count': 'absolute' }, { 'Share of First Stage (%)': 'share' }],
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
    main_colour: {
      type: 'array',
      label: 'Main Colour',
      display: 'color',
      default: ['#525aff'],
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
      label: 'Show Count and Share',
      default: true,
      section: 'Style',
      order: 4
    },
    show_legend: {
      type: 'boolean',
      label: 'Show Drop-Off Between Stages',
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
      label: 'Stage Label',
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

  function nameOf(field) {
    return field ? (field.label_short || field.label || field.name) : '';
  }

  // Looker hands a derived amount (a drop-off) no rendered string of its own,
  // so it borrows a cell's: the same prefix, suffix and decimals, when that
  // rendered text is plainly the cell's value. Otherwise compact.
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
    var k = /^([^\d\-−]*)[-−]?\d[\d,.]*\s*(k|m|bn|K|M|B)$/.exec(text);
    return (k ? k[1] : '') + V.compact(amount);
  }

  function valueText(cell, value, like) {
    return (cell && cell.rendered != null ? String(cell.rendered) : '') || formatLike(like || cell, value);
  }

  function pctText(p) {
    if (p === 0) return '0%';
    if (p > 0 && p < 0.1) return '<0.1%';
    var digits = p < 10 || (p !== 100 && Math.round(p) === 100) ? 1 : 0;
    return p.toLocaleString('en-US', { maximumFractionDigits: digits }) + '%';
  }

  // Hover, focus and Enter or Space to drill, the same on every target.
  function answer(c, node, title, rows, links) {
    node.setAttribute('tabindex', '0');
    var show = function (x, y) { c.tip.show(title, rows, x, y); };
    node.addEventListener('pointermove', function (event) { show(event.clientX, event.clientY); });
    node.addEventListener('pointerleave', c.tip.hide);
    node.addEventListener('focus', function () {
      var box = node.getBoundingClientRect();
      show(box.left + box.width / 2, box.top + box.height / 2);
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

  // One line at the largest size from top down to 9 that fits, cut from the
  // middle at 9 when nothing does.
  function fitLine(text, room, top) {
    for (var s = top || 12; s >= 9; s--) {
      if (V.textWidth(text, V.fontOf(s)) <= room) return { text: text, size: s };
    }
    var cut = V.middleFit(text, V.fontOf(9), room);
    return cut ? { text: cut, size: 9 } : null;
  }

  // The first of several forms that fits whole, largest size first. No cut:
  // a figure with its middle taken out is a different figure.
  function firstFit(forms, room, top) {
    for (var i = 0; i < forms.length; i++) {
      for (var s = top; s >= 9; s--) {
        if (V.textWidth(forms[i], V.fontOf(s)) <= room) return { text: forms[i], size: s };
      }
    }
    return null;
  }

  // Caption: one line of the full notes, then of the short form, then two
  // lines of each, shrinking 11 to 9. A tall tile takes the full notes on two
  // lines before the short form. The full notes stay in its tooltip.
  function fitCaption(full, short, room, tall) {
    var tries = tall ? [[full, 1], [full, 2], [short, 1], [short, 2]] : [[full, 1], [short, 1], [full, 2], [short, 2]];
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

  function text(svg, cls, x, y, size, content, anchor) {
    var t = V.el('text', { class: cls, x: x, y: y, 'font-size': size });
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = content;
    svg.appendChild(t);
    return t;
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    if (c.dims.length > 1) {
      c.message('A funnel takes one dimension: the stage.');
      return;
    }

    var config = c.config;
    var W = c.width, H = c.height;
    var pad = W < 420 || H < 260 ? 8 : 14;
    var asShare = config.share_or_absolute === 'share';
    var strategy = config.label_strategy || 'both';
    var showNames = strategy === 'both' || strategy === 'name';
    var showFigures = config.show_values !== false && (strategy === 'both' || strategy === 'value');
    var showGaps = config.show_legend !== false && strategy !== 'none';
    var dim = c.dims[0], m = c.meas[0], extra = c.meas[1];
    var chosen = config.main_colour && config.main_colour[0];
    // Left at its default the theme token wins, so a dark dashboard still
    // gets the stepped-up indigo.
    var fill = chosen && String(chosen).toLowerCase() !== '#525aff' ? chosen : 'var(--v-c0)';

    // --- Work out the stages ----------------------------------------------------

    var all = c.data.map(function (r, i) {
      var cell = r[m.name];
      return {
        name: V.cellText(r[dim.name]) || '∅', value: V.cellNumber(cell), cell: cell, row: r,
        links: (cell && cell.links && cell.links.length ? cell.links : (r[dim.name] || {}).links) || []
      };
    });
    var negative = all.filter(function (s) { return s.value !== null && s.value < 0; });
    if (negative.length) {
      var refusal = (negative.length === 1 ? negative[0].name + ' is' : negative.length + ' stages are') +
        ' below zero: a funnel counts, so nothing is drawn.';
      // The message is one centred line; a long stage name gives way to a count.
      if (V.textWidth(refusal, V.fontOf(12)) > c.width - 16) {
        refusal = (negative.length === 1 ? 'A stage is' : negative.length + ' stages are') + ' below zero: nothing drawn.';
      }
      c.message(refusal);
      return;
    }
    if (!all.some(function (s) { return s.value !== null; })) {
      c.message('No values: every stage is empty.');
      return;
    }

    var asked = Math.floor(Number(config.max_slices) || 0);
    var stages = asked > 0 && asked < all.length ? all.slice(0, asked) : all;
    var likeCell = (all.filter(function (s) { return s.cell && s.cell.rendered != null && s.value !== null; })[0] || {}).cell;
    var first = stages[0].value;
    var firstOk = first !== null && first > 0;
    var top = stages.reduce(function (mx, s) { return Math.max(mx, s.value || 0); }, 0);
    var notes = [], shortNotes = [];

    stages.forEach(function (s, i) {
      s.text = s.value === null ? 'No value' : valueText(s.cell, s.value, likeCell);
      s.ofFirst = firstOk && s.value !== null ? s.value / first * 100 : null;
      var prev = i ? stages[i - 1] : null;
      s.prev = prev;
      s.ofPrev = prev && prev.value > 0 && s.value !== null ? s.value / prev.value * 100 : null;
      s.change = prev && prev.value !== null && s.value !== null ? s.value - prev.value : null;
      s.tip = [[nameOf(m), s.text]];
      s.tip.push(['Share of First Stage', s.ofFirst !== null ? pctText(s.ofFirst)
        : s.value === null ? '—' : first === null ? 'First stage has no value' : 'First stage is zero']);
      if (prev) {
        s.tip.push(['Share of Previous Stage', s.ofPrev !== null ? pctText(s.ofPrev)
          : s.value === null || prev.value === null ? '—' : 'Previous stage is zero']);
        if (s.change !== null) {
          var pctChange = prev.value > 0 ? ' (' + pctText(Math.abs(s.change) / prev.value * 100) + ')' : '';
          s.tip.push([s.change > 0 ? 'Rise from Previous' : 'Drop-Off from Previous',
            formatLike(likeCell, Math.abs(s.change)) + pctChange]);
        }
      }
      if (extra) s.tip.push([nameOf(extra), V.cellText(s.row[extra.name]) || '∅']);

      // The label in the gap above this stage: longest form first.
      if (!prev) s.gap = null;
      else if (prev.value === null || s.value === null) s.gap = ['No value: no conversion'];
      else if (!(prev.value > 0)) s.gap = ['From zero: no conversion', 'From zero'];
      else {
        var conv = pctText(s.ofPrev);
        var diff = formatLike(likeCell, Math.abs(s.change));
        s.gap = s.change > 0
          ? ['↑ ' + conv + ' · ' + diff + ' more than before', '↑ ' + conv + ' · +' + diff, '↑ ' + conv]
          : ['↓ ' + conv + ' continue · ' + diff + ' drop off', '↓ ' + conv + ' · −' + diff, '↓ ' + conv];
      }
    });

    // --- Notes ----------------------------------------------------------------------

    var rises = stages.filter(function (s) { return s.change !== null && s.change > 0; });
    var gaps = stages.filter(function (s) { return s.value === null; });
    if (stages.length === 1) {
      notes.push('One stage: nothing to convert to.');
      shortNotes.push('One stage.');
    }
    if (first === 0) {
      notes.push('The first stage is zero, so there is no share of first.');
      shortNotes.push('First stage is zero.');
    } else if (first === null) {
      notes.push('The first stage has no value, so there is no share of first.');
      shortNotes.push('First stage has no value.');
    }
    if (rises.length) {
      notes.push((rises.length === 1 ? rises[0].name + ' is' : rises.length + ' stages are') +
        ' larger than the stage before, drawn as counted: stages may count different things.');
      shortNotes.push(rises.length + (rises.length === 1 ? ' stage rises.' : ' stages rise.'));
    }
    if (firstOk && top > first) {
      notes.push('Bars are scaled to the largest stage, not the first.');
    }
    if (gaps.length) {
      notes.push((gaps.length === 1 ? gaps[0].name + ' has' : gaps.length + ' stages have') +
        ' no value: no conversion to or from ' + (gaps.length === 1 ? 'it.' : 'them.'));
      shortNotes.push(gaps.length + ' with no value.');
    }
    if (stages.length < all.length) {
      notes.push('First ' + stages.length + ' of ' + all.length + ' stages shown.');
      shortNotes.push(stages.length + ' of ' + all.length + ' stages.');
    }
    if (extra) notes.push(nameOf(extra) + ' is in the tooltip only.');

    // --- Layout -----------------------------------------------------------------------

    var svg = c.svg();
    var room = W - pad * 2;
    var y = pad;

    var yT = c.title('y_axis_label', nameOf(m));
    var xT = c.title('x_axis_label', nameOf(dim));
    var header = yT && xT ? yT + ' by ' + xT : yT || xT;
    if (header) {
      var last = stages[stages.length - 1];
      var overall = stages.length > 1 && last.ofFirst !== null ? ' · ' + pctText(last.ofFirst) + ' reach the last stage' : '';
      var head = fitLine(header + overall, room, 12) || fitLine(header, room, 12);
      if (head) {
        text(svg, 'fn-head', pad, y + 11, head.size, head.text);
        y += 22;
      }
    }

    var capFull = notes.join(' ');
    var cap = notes.length ? fitCaption(capFull, shortNotes.length ? shortNotes.join(' ') : notes[0], room, H >= 300) : null;
    var capH = cap ? cap.lines.length * Math.ceil(cap.size * 1.3) + 8 : 0;
    var bodyH = Math.max(20, H - y - pad - capH);

    // Rows and the gaps between them share the height; a gap is 0.6 of a row
    // when it carries a drop-off label, a sliver when it does not.
    var n = stages.length;
    var gapShare = showGaps ? 0.6 : 0.25;
    // Gaps too short for a label at 9px give their height back to the rows.
    if (showGaps && bodyH / (n + (n - 1) * 0.6) * 0.6 < 11) gapShare = 0.25;
    var rowH = Math.min(56, bodyH / (n + (n - 1) * gapShare));
    var gapH = rowH * gapShare;
    var usedH = n * rowH + (n - 1) * gapH;
    var fs = Math.max(9, Math.min(12, Math.floor(rowH / 1.5)));
    var fb = V.fontOf(fs, 600), fr = V.fontOf(fs);

    // Figures on the right: the lead right-aligned so counts compare by
    // place value, the second beside it.
    var leadOf = function (s) { return s.value === null ? 'No value' : asShare && s.ofFirst !== null ? pctText(s.ofFirst) : s.text; };
    var secondOf = function (s) {
      if (s.value === null) return '';
      if (asShare) return s.ofFirst !== null ? s.text : '';
      return s.ofFirst !== null ? pctText(s.ofFirst) + ' of first' : '';
    };
    var widest = function (fn, font) {
      return stages.reduce(function (mx, s) { return Math.max(mx, V.textWidth(fn(s), font)); }, 0);
    };
    var leadW = showFigures ? widest(leadOf, fb) : 0;
    var secW = showFigures ? widest(secondOf, fr) : 0;
    var colGap = 12;
    var minBar = Math.min(120, room * 0.35);
    var nameW = showNames ? Math.min(room * (room < 400 ? 0.36 : 0.3), Math.max(60, widest(function (s) { return s.name; }, fr) + 2)) : 0;
    // The second figure goes before the bar is squeezed, then the lead.
    var withSecond = showFigures && secW > 0 && room - nameW - leadW - secW - 3 * colGap >= minBar;
    var figW = showFigures ? leadW + (withSecond ? 8 + secW : 0) : 0;
    // Widen the figures to take the drop-off in words, while the bars keep
    // at least 40% of the tile.
    var gapFull = showGaps && gapShare > 0.25
      ? widest(function (s) { return s.gap ? s.gap[0] : ''; }, V.fontOf(Math.min(fs, 11))) + 4 : 0;
    if (showFigures && gapFull > figW && room - nameW - gapFull - 2 * colGap >= room * 0.4) figW = gapFull;
    if (showFigures && room - nameW - figW - 2 * colGap < minBar * 0.6) { figW = 0; showFigures = false; }
    var barX = pad + (showNames ? nameW + colGap : 0);
    var barW = Math.max(10, room - (showNames ? nameW + colGap : 0) - (showFigures ? figW + colGap : 0));
    var figX = barX + barW + colGap;
    var mid = barX + barW / 2;
    var scale = firstOk ? Math.max(first, top) : top;
    var widthOf = function (v) { return v > 0 ? Math.max(2, v / scale * barW) : 0; };
    var y0 = y + Math.max(0, (bodyH - usedH) / 2);

    // Names share one size, the smallest any whole name needed, so the column
    // reads evenly. A name cut from the middle does not pull the rest down.
    var nameTop = fs;
    if (showNames) stages.forEach(function (s) {
      var f = fitName(s.name, nameW, rowH, fs);
      if (f && f.lines.join(' ') === s.name.replace(/\s+/g, ' ')) nameTop = Math.min(nameTop, f.size);
    });

    // --- Draw ---------------------------------------------------------------------------

    stages.forEach(function (s, i) {
      var top = y0 + i * (rowH + gapH);
      var bh = Math.max(2, rowH - 2);
      var w = s.value === null ? 0 : widthOf(s.value);

      // Hit row first so the marks drawn after it still take the brightening.
      var hit = V.el('rect', { class: 'fn-hit v-hit', x: pad - 3, y: top, width: room + 6, height: rowH, rx: 3,
        'aria-label': s.name + ': ' + s.text });
      svg.appendChild(hit);
      answer(c, hit, s.name, s.tip, s.links);

      // The band between this bar and the next, so the narrowing reads as one shape.
      var next = stages[i + 1];
      if (next && s.value !== null && next.value !== null && gapH >= 1) {
        var wn = widthOf(next.value);
        svg.appendChild(V.el('polygon', {
          class: 'fn-link',
          points: [[mid - w / 2, top + bh], [mid + w / 2, top + bh], [mid + wn / 2, top + rowH + gapH], [mid - wn / 2, top + rowH + gapH]]
            .map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ')
        }));
      }

      if (s.value === null) {
        var nv = fitLine('No value', barW, fs);
        if (nv && !showFigures) text(svg, 'fn-note', mid, top + rowH / 2 + nv.size * 0.35, nv.size, nv.text, 'middle');
      } else if (w > 0) {
        svg.appendChild(V.el('rect', { class: 'fn-bar v-mark', x: mid - w / 2, y: top, width: w, height: bh, rx: Math.min(3, bh / 4), fill: fill }));
      } else {
        svg.appendChild(V.el('line', { class: 'fn-zero', x1: mid, x2: mid, y1: top, y2: top + bh }));
      }

      var base = top + rowH / 2 + fs * 0.35;
      if (showNames) {
        var nm = fitName(s.name, nameW, rowH, nameTop);
        if (nm) {
          var lh = Math.ceil(nm.size * 1.3);
          var ny = top + rowH / 2 - (nm.lines.length - 1) * lh / 2 + nm.size * 0.35;
          nm.lines.forEach(function (line, k) { text(svg, 'fn-name', pad, ny + k * lh, nm.size, line); });
        }
      }
      if (showFigures) {
        text(svg, s.value === null ? 'fn-note' : 'fn-lead', figX + leadW, base, fs, leadOf(s), 'end');
        if (withSecond && secondOf(s)) text(svg, 'fn-second', figX + leadW + 8, base, fs, secondOf(s));
      }

      // Conversion and drop-off from this stage to the next, in the gap.
      if (showGaps && next && next.gap && gapH >= 11) {
        var gapRoom = showFigures ? room - (figX - pad) : barW;
        var g = firstFit(next.gap, gapRoom, Math.min(fs, 11));
        if (g && gapH >= g.size + 2) {
          var gy = top + rowH + gapH / 2 + g.size * 0.35;
          if (showFigures) text(svg, 'fn-gap', figX, gy, g.size, g.text);
          else text(svg, 'fn-gap', mid, gy, g.size, g.text, 'middle');
        }
      }
    });

    // --- Caption ------------------------------------------------------------------------

    if (cap) {
      var lhC = Math.ceil(cap.size * 1.3);
      var cy = H - pad - (cap.lines.length - 1) * lhC - 3;
      cap.lines.forEach(function (line, k) {
        text(svg, 'v-caption', pad, cy + k * lhC, cap.size, line);
      });
      if (cap.lines.join(' ') !== capFull) {
        var capHit = V.el('rect', { class: 'fn-hit', x: pad, y: H - pad - capH + 4, width: room, height: capH - 4 });
        svg.appendChild(capHit);
        answer(c, capHit, 'Notes', notes.map(function (t) { return [t, '']; }), null);
      }
    }
  }));
})();
