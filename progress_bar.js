// Progress bar: how far is this number toward its target?
//
// Query shape: 1 measure and a target as the second measure, with an optional
// dimension. Each bar fills toward its own target, so the end of the track is
// always 100% of that row's target, and the row states the value and its
// percentage of target, the value first. A row past its target fills the whole
// track, takes the over-target colour and says "over". With no dimension the
// one row is drawn large, as a headline; with a dimension and several rows the
// tile is a list of bars, one per row, in query order.
//
// The percentage is only stated when the target is above zero. A missing,
// zero or negative target, a missing value and a missing second measure are
// each said in words in place of the percentage, never divided through.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.0. The version is logged once on load, so the browser console
// says which build a Looker instance is actually running.

if (window.console && console.log) console.log('progress_bar build v1.0.0');

/* visage:manifest
{ "id": "progress_bar", "family": "single_value",
  "shapes": ["0d1m", "0d2m", "1d1m", "1d2m"],
  "checks": [
    { "fixture": "progress_single", "config": {} },
    { "fixture": "progress_single", "config": { "good_direction": "down" } },
    { "fixture": "progress_edge", "config": {} },
    { "fixture": "progress_edge", "config": { "good_direction": "down" } },
    { "fixture": "example", "config": {} },
    { "fixture": "kpi_monthly", "config": {} },
    { "fixture": "kpi_single", "config": {} },
    { "fixture": "one_measure", "config": {} }
  ] }
*/

(function () {
  var SPEC = {
    id: 'progress_bar',
    label: 'Progress Bar',
    version: '1.0.0',
    family: 'single_value',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 measure + a target measure (a dimension gives one bar per row)',
    good_for: [
      'How far a figure has got toward its target, stated as the value and the percentage of target',
      'Over a gauge when the tile is narrow, or when several rows each have their own target'
    ],

    requires: {
      dims: 0,
      meas: 1,
      message: 'A progress bar needs 1 measure, and a second measure as its target. A dimension gives one bar per row.'
    },

    css:
      '.pb-label { font-size: 12px; fill: var(--v-ink-2); }' +
      '.pb-name { fill: var(--v-ink); }' +
      '.pb-number { fill: var(--v-ink); font-weight: 600; font-variant-numeric: tabular-nums; }' +
      '.pb-pct { fill: var(--v-ink-2); font-variant-numeric: tabular-nums; }' +
      '.pb-note { fill: var(--v-muted); }' +
      '.pb-track { fill: var(--v-grid); }' +
      '.pb-hit { fill: transparent; cursor: pointer; }' +
      '.pb-hit:focus { outline: none; }' +
      '.pb-hit:focus-visible { stroke: var(--v-axis); stroke-width: 1; }' +
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

  // The panel the user sees. Baseline plus the single value tier,
  // inherited from docs/roadmap.md. Drop one only with a reason: npm run check
  // fails a chart that is short of its tier.
  var OPTIONS = {
    good_direction: {
      type: 'string',
      label: 'Good Direction',
      display: 'select',
      values: [{ 'Higher Is Better': 'up' }, { 'Lower Is Better': 'down' }, { 'Neither': 'none' }],
      default: 'up',
      section: 'Data',
      order: 0
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
    // Left at its default, the over-target fill follows Good Direction: the
    // good token when higher is better, the bad one when lower is better, and
    // the main colour when neither, so no second hue appears without a reason.
    over_colour: {
      type: 'array',
      label: 'Colour When over Target',
      display: 'color',
      default: ['#1baf7a'],
      section: 'Style',
      order: 2
    },
    show_legend: {
      type: 'boolean',
      label: 'Show Header',
      default: true,
      section: 'Style',
      order: 10
    },
    show_axis_titles: {
      type: 'boolean',
      label: 'Show Field Names',
      default: true,
      section: 'Style',
      order: 20
    },
    x_axis_label: {
      type: 'string',
      label: 'Target Label',
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

  // Looker hands a derived amount no rendered string of its own, so it
  // borrows the value's: the same prefix, suffix and decimals, when that
  // rendered text is plainly the cell's value. Otherwise the compact form.
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

  function nameOf(field) {
    return field ? (field.label_short || field.label || field.name) : '';
  }

  function pctText(p) {
    var a = Math.abs(p);
    // Near 100 a whole number would print 100% for a row just short of, or
    // just past, its target, so it keeps one decimal there.
    var digits = a < 10 || (a !== 100 && Math.round(a) === 100) ? 1 : 0;
    return (p < 0 ? '−' : '') + a.toLocaleString('en-US', { maximumFractionDigits: digits }) + '%';
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

  // Wrap, then shrink, then cut from the middle, then drop. Returns the lines
  // and the size they fit at, or null when the name is dropped.
  function fitName(text, room, maxHeight) {
    for (var s = 12; s >= 9; s--) {
      var lines = Math.floor(maxHeight / Math.ceil(s * 1.3));
      if (lines < 1) continue;
      var font = V.fontOf(s);
      var wrapped = V.wrapWords(text, font, room, lines);
      // wrapWords lets one long word overrun a line; that is not a fit.
      if (wrapped && wrapped.every(function (l) { return V.textWidth(l, font) <= room; })) {
        return { lines: wrapped, size: s };
      }
    }
    if (maxHeight < 12) return null;
    var cut = V.middleFit(text, V.fontOf(9), room);
    return cut ? { lines: [cut], size: 9 } : null;
  }

  looker.plugins.visualizations.add(V.chart(SPEC, OPTIONS, function draw(c) {
    if (c.dims.length > 1) {
      c.message('A progress bar takes at most one dimension.');
      return;
    }

    var dim = c.dims[0];
    var main = c.meas[0];
    var versus = c.meas[1];
    var config = c.config;
    var W = c.width, H = c.height;
    var pad = W < 260 || H < 160 ? 8 : 14;
    var room = W - pad * 2;

    var mainFill = config.main_colour && config.main_colour[0] &&
      String(config.main_colour[0]).toLowerCase() !== '#525aff'
      ? config.main_colour[0] : 'var(--v-c0)';
    var good = config.good_direction || 'up';
    var overFill = config.over_colour && config.over_colour[0] &&
      String(config.over_colour[0]).toLowerCase() !== '#1baf7a'
      ? config.over_colour[0]
      : good === 'up' ? 'var(--v-c2)' : good === 'down' ? 'var(--v-c7)' : mainFill;

    var mLabel = c.title('y_axis_label', nameOf(main));
    var tLabel = c.title('x_axis_label', versus ? nameOf(versus) : 'Target') || 'target';

    // Everything a row needs, worked out once. A percentage is only stated
    // against a target above zero; every other case is said in words.
    function measureRow(row) {
      var cell = row[main.name];
      var value = V.cellNumber(cell);
      var target = versus ? V.cellNumber(row[versus.name]) : null;
      var r = {
        row: row, cell: cell, value: value, target: target,
        name: dim ? V.cellText(row[dim.name]) || '∅' : '',
        valueText: value === null ? '∅' : V.cellText(cell) || V.compact(value),
        targetText: versus ? V.cellText(row[versus.name]) || (target === null ? '∅' : V.compact(target)) : '',
        frac: 0, over: false, pct: null, note: ''
      };
      if (!versus) r.note = 'No ' + tLabel;
      else if (value === null) r.note = 'No value';
      else if (target === null) r.note = 'No ' + tLabel;
      else if (target === 0) r.note = tLabel + ' is zero';
      else if (target < 0) r.note = tLabel + ' is below zero';
      else {
        r.pct = value / target * 100;
        r.frac = Math.max(0, Math.min(1, value / target));
        r.over = value > target;
      }
      return r;
    }

    // The tooltip carries everything, including whatever the layout dropped.
    function detail(r) {
      var list = [[nameOf(main), r.valueText]];
      if (versus) list.push([nameOf(versus), r.targetText]);
      list.push(['% of ' + tLabel, r.pct === null ? r.note : pctText(r.pct)]);
      if (r.pct !== null) {
        var gap = r.value - r.target;
        list.push([gap > 0 ? 'Over by' : 'To go', gap === 0 ? '0' : formatLike(r.cell, gap)]);
      }
      return list;
    }

    function bar(svg, r, x, y, w, h) {
      svg.appendChild(V.el('rect', { class: 'pb-track', x: x, y: y, width: w, height: h, rx: Math.min(3, h / 2) }));
      if (r.frac > 0) {
        svg.appendChild(V.el('rect', {
          class: 'v-mark', x: x, y: y, width: Math.max(2, w * r.frac), height: h,
          rx: Math.min(3, h / 2), fill: r.over ? overFill : mainFill
        }));
      }
    }

    // The value, then the percentage of target, then "over" when past it.
    // Candidates run longest first and the first that fits is drawn; what
    // drops out stays in the tooltip. Returns the width it took.
    function statusLine(svg, r, x, y, size, anchor, maxW, headline) {
      var fv = V.fontOf(size, 600), fp = V.fontOf(size);
      var flag = r.over ? ' · over' : '';
      var pct = r.pct === null ? r.note : pctText(r.pct);
      var compact = r.value === null ? r.valueText : V.compact(r.value);
      var tries = headline
        ? (r.pct === null ? [['', r.note + (versus ? '' : ': add a second measure')], ['', r.note]] : [
            ['', pct + ' of ' + tLabel + ' ' + r.targetText + flag],
            ['', pct + ' of ' + tLabel + flag],
            ['', pct + flag], ['', pct]])
        : [[r.valueText, pct + flag], [compact, pct + flag], [compact, pct], [compact, '']];
      var pick = tries[tries.length - 1];
      for (var i = 0; i < tries.length; i++) {
        var w = V.textWidth(tries[i][0], fv) + V.textWidth((tries[i][0] ? '  ' : '') + tries[i][1], fp);
        if (w <= maxW) { pick = tries[i]; break; }
      }
      var t = V.el('text', { x: x, y: y, 'font-size': size, 'text-anchor': anchor });
      if (pick[0]) {
        var v = V.el('tspan', { class: 'pb-number' });
        v.textContent = pick[0];
        t.appendChild(v);
      }
      if (pick[1]) {
        var p = V.el('tspan', { class: r.pct === null ? 'pb-note' : 'pb-pct' });
        p.textContent = (pick[0] ? '  ' : '') + pick[1];
        t.appendChild(p);
      }
      svg.appendChild(t);
      return V.textWidth(pick[0], fv) + V.textWidth((pick[0] ? '  ' : '') + pick[1], fp);
    }

    var rows = c.data.map(measureRow);
    var svg = c.svg();

    // --- One row: a headline number over one wide bar --------------------------

    if (rows.length === 1) {
      var r = rows[0];
      var label = config.show_legend === false ? ''
        : [dim ? r.name : '', mLabel].filter(Boolean).join(' · ');
      var labelH = label ? 18 : 0;
      var lineH = 20;
      var barH = Math.max(8, Math.min(18, Math.round(H * 0.06)));
      var free = H - pad * 2 - labelH - lineH - barH - 10;

      // The number takes what is left. It shrinks to fit the width, then falls
      // back to compact form, and is never cut.
      var numberText = r.valueText;
      var size = Math.floor(Math.min(64, free * 0.9));
      var font = function (s) { return V.fontOf(s, 600); };
      while (size > 14 && V.textWidth(numberText, font(size)) > room) size -= 2;
      if (V.textWidth(numberText, font(size)) > room && r.value !== null) {
        numberText = V.compact(r.value);
        while (size > 10 && V.textWidth(numberText, font(size)) > room) size--;
      }
      size = Math.max(10, size);
      var numberH = Math.ceil(size * 1.15);
      var used = labelH + numberH + lineH + 10 + barH;
      var y = Math.max(pad, (H - used) / 2);

      var hit = V.el('rect', { class: 'pb-hit', x: pad / 2, y: y - 4, width: W - pad, height: used + 8, rx: 4 });
      svg.appendChild(hit);
      answer(c, hit, dim ? r.name : nameOf(main), detail(r), r.cell && r.cell.links);

      if (label) {
        var fitted = V.middleFit(label, V.fontOf(12), room);
        if (fitted) {
          var lt = V.el('text', { class: 'pb-label', x: pad, y: y + 13 });
          lt.textContent = fitted;
          svg.appendChild(lt);
        }
        y += labelH;
      }

      var n = V.el('text', { class: 'pb-number', x: pad - size * 0.04, y: y + size * 0.92, 'font-size': size });
      n.textContent = numberText;
      svg.appendChild(n);
      y += numberH;

      statusLine(svg, r, pad, y + 14, 12, 'start', room, true);
      y += lineH + 10;
      bar(svg, r, pad, y, room, barH);
      return;
    }

    // --- Several rows: a list of bars down the tile ---------------------------

    var y0 = pad;
    if (config.show_legend !== false) {
      var right = versus ? '% of ' + tLabel : 'No ' + tLabel + ': add a second measure';
      var f12 = V.fontOf(12);
      var rightText = V.fit(right, f12, mLabel ? room * 0.6 : room) || '';
      var leftText = mLabel ? V.middleFit(mLabel, f12, room - V.textWidth(rightText, f12) - 12) || '' : '';
      if (leftText || rightText) {
        if (leftText) {
          var hl = V.el('text', { class: 'pb-label', x: pad, y: y0 + 12 });
          hl.textContent = leftText;
          svg.appendChild(hl);
        }
        if (rightText) {
          var hr = V.el('text', { class: 'pb-label', x: W - pad, y: y0 + 12, 'text-anchor': 'end' });
          hr.textContent = rightText;
          svg.appendChild(hr);
        }
        y0 += 24;
        // The header already says there is no target; rows need not repeat it.
        if (!versus) rows.forEach(function (r) { r.note = ''; });
      }
    }

    // A row needs one 9px line, a 6px bar and gaps: 27px. Past that the list
    // shows what fits and says how many it left out.
    var MIN_ROW = 27;
    var avail = H - pad - y0;
    var shown = rows;
    var captionH = 0;
    if (avail / rows.length < MIN_ROW) {
      captionH = 18;
      shown = rows.slice(0, Math.max(1, Math.floor((avail - captionH) / MIN_ROW)));
    }
    var per = Math.min(56, (avail - captionH) / shown.length);
    var barH2 = Math.max(6, Math.min(12, Math.round(per * 0.2)));
    var gapBelow = per >= 40 ? 12 : 6;
    var nameH = per - barH2 - 3 - gapBelow;
    var textSize = Math.max(9, Math.min(12, Math.floor(nameH / 1.3)));

    shown.forEach(function (r, i) {
      var top = y0 + i * per;
      var barY = top + nameH + 3;
      var hitRow = V.el('rect', { class: 'pb-hit', x: pad / 2, y: top, width: W - pad, height: per - 2, rx: 4 });
      svg.appendChild(hitRow);
      answer(c, hitRow, dim ? r.name : nameOf(main), detail(r), r.cell && r.cell.links);

      // The figure is laid out first and the name takes what is left.
      var lastBase = barY - 4;
      var used = statusLine(svg, r, W - pad, lastBase, textSize, 'end', room * 0.6, false);
      if (dim) {
        var name = fitName(r.name, room - used - 10, nameH);
        if (name) {
          var lh = Math.ceil(name.size * 1.3);
          name.lines.forEach(function (line, k) {
            var t = V.el('text', {
              class: 'pb-name', x: pad, 'font-size': name.size,
              y: lastBase - (name.lines.length - 1 - k) * lh
            });
            t.textContent = line;
            svg.appendChild(t);
          });
        }
      }
      bar(svg, r, pad, barY, room, barH2);
    });

    if (captionH) {
      var cap = V.el('text', { class: 'v-caption', x: pad, y: H - pad - 4, 'font-size': 11 });
      cap.textContent = V.fit('Showing ' + shown.length + ' of ' + rows.length + ' rows; a taller tile shows more',
        V.fontOf(11), room) || shown.length + ' of ' + rows.length;
      svg.appendChild(cap);
    }
  }));
})();
