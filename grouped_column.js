// Column: one group per dimension value, one column per measure.
//
// One file, three modes, because they share an axis model, a series model and
// their whole options set:
//   orientation  column | bar      turning it on its side is what makes long
//                                  category names readable
//   stacking     none | stacked | share   grouped, stacked, or 100%
//   mark style   bars | lollipop   a thin stem and a dot, for a sparse set
//
// Query shape: 1 dimension + 1 or more measures.
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v2.0.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('grouped_column build v2.0.0');

/* visage:manifest
{ "id": "grouped_column", "family": "comparison",
  "shapes": ["1d1m", "1d2m"],
  "checks": [
    { "fixture": "example" },
    { "fixture": "engagements" },
    { "fixture": "example", "config": { "orientation": "bar" }, "name": "example [bar]" },
    { "fixture": "example", "config": { "stacking": "stacked" }, "name": "example [stacked]" },
    { "fixture": "example", "config": { "stacking": "share" }, "name": "example [100%]" },
    { "fixture": "example", "config": { "orientation": "bar", "stacking": "share" }, "name": "example [bar, 100%]" },
    { "fixture": "example", "config": { "mark_style": "lollipop" }, "name": "example [lollipop]" },
    { "fixture": "example", "config": { "orientation": "bar", "mark_style": "lollipop" }, "name": "example [bar lollipop]" },
    { "fixture": "engagements", "config": { "sort_by": "desc" }, "name": "engagements [largest first]" },
    { "fixture": "example", "config": { "zero_baseline": false }, "name": "example [free scale]" },
    { "fixture": "one_measure", "config": {}, "name": "one_measure [single series]" },
    { "fixture": "wide_measures", "config": {}, "name": "wide_measures [four measures]" },
    { "fixture": "wide_measures", "config": { "orientation": "bar", "stacking": "stacked" }, "name": "wide_measures [bar, stacked]" }
  ] }
*/

(function () {
  var SPEC = {
    id: 'grouped_column',
    label: 'Column',
    version: '2.0.0',
    family: 'comparison',

    // Declared for the catalogue and the gallery. Looker ignores keys it does
    // not know, so this costs nothing at render time.
    data_shape: '1 dimension + 1 or more measures',
    good_for: [
      'Comparing categories on one measure, or a few measures that share a unit',
      'Long category names, turned on their side as a bar chart',
      'What a total is made of, stacked, or as a share of 100%'
    ],

    requires: {
      dims: 1,
      meas: 1,
      message: 'A column chart needs one dimension and at least one measure. Each measure becomes a column within the group.'
    },

    css:
      '.v-stem { stroke-width: 2; stroke-linecap: round; }' +
      '.v-seg-label { font-size: 10px; font-variant-numeric: tabular-nums; }' +
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

  // The panel the user sees. Baseline plus the comparison tier, inherited from
  // docs/roadmap.md, plus the three controls that make the modes.
  var OPTIONS = {
    orientation: {
      type: 'string',
      label: 'Orientation',
      display: 'select',
      values: [{ 'Columns (Vertical)': 'column' }, { 'Bars (Horizontal)': 'bar' }],
      default: 'column',
      section: 'Data',
      order: 2
    },
    stacking: {
      type: 'string',
      label: 'Stacking',
      display: 'select',
      values: [
        { 'Side by Side': 'none' },
        { 'Stacked': 'stacked' },
        { 'Stacked to 100%': 'share' }
      ],
      default: 'none',
      section: 'Data',
      order: 3
    },
    mark_style: {
      type: 'string',
      label: 'Mark Style',
      display: 'select',
      applies_when: { option: 'stacking', value: 'none', reason: 'Stacking is "Side by Side"' },
      values: [{ 'Bars': 'bar' }, { 'Lollipop': 'lollipop' }],
      default: 'bar',
      section: 'Style',
      order: 2
    },
    sort_by: {
      type: 'string',
      label: 'Sort Rows by',
      display: 'select',
      values: [
        { 'Query Order': 'query' },
        { 'Largest First': 'desc' },
        { 'Smallest First': 'asc' },
        { 'Name': 'name' }
      ],
      default: 'query',
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
    theme: {
      type: 'string',
      label: 'Theme',
      display: 'select',
      values: [{ 'Match Looker': 'auto' }, { 'Light': 'light' }, { 'Dark': 'dark' }],
      default: 'auto',
      section: 'Style',
      order: 0
    },
    show_values: {
      type: 'boolean',
      label: 'Show Value on Each Mark',
      default: true,
      section: 'Style',
      order: 3
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

    var horizontal = config.orientation === 'bar';
    var stacking = config.stacking || 'none';
    var isShare = stacking === 'share';
    var isStacked = stacking !== 'none';
    var lollipop = config.mark_style === 'lollipop' && !isStacked;

    var dimField = c.dims[0];
    var series = c.meas.slice(0, 8);

    // --- Rows ----------------------------------------------------------------

    var groups = [];
    var droppedRows = 0;
    c.data.forEach(function (row) {
      var values = series.map(function (field) {
        return {
          field: field,
          value: V.cellNumber(row[field.name]),
          text: V.cellText(row[field.name])
        };
      });
      if (values.every(function (v) { return v.value === null; })) { droppedRows++; return; }
      var cell = row[dimField.name];
      groups.push({
        name: V.cellText(cell) || '∅',
        values: values,
        links: (cell && cell.links) || []
      });
    });

    if (!groups.length) { c.message('No values to plot'); return; }

    // Stacking adds values together, which only means anything for values that
    // point the same way. Negatives are left out and said so, rather than
    // quietly cancelling part of a bar.
    var droppedNegatives = 0;
    groups.forEach(function (group) {
      group.total = 0;
      group.stack = 0;
      group.values.forEach(function (v) {
        if (v.value === null) return;
        group.total += v.value;
        if (v.value > 0) group.stack += v.value;
        else if (isStacked && v.value < 0) droppedNegatives++;
      });
    });

    if (config.sort_by === 'desc') groups.sort(function (a, b) { return b.total - a.total; });
    else if (config.sort_by === 'asc') groups.sort(function (a, b) { return a.total - b.total; });
    else if (config.sort_by === 'name') groups.sort(function (a, b) { return a.name.localeCompare(b.name); });

    // --- Scale ---------------------------------------------------------------

    var low = 0;
    var high = 0;
    if (isShare) {
      high = 100;
    } else if (isStacked) {
      groups.forEach(function (g) { high = Math.max(high, g.stack); });
    } else {
      var seen = false;
      groups.forEach(function (g) {
        g.values.forEach(function (v) {
          if (v.value === null) return;
          if (!seen) { low = high = v.value; seen = true; }
          low = Math.min(low, v.value);
          high = Math.max(high, v.value);
        });
      });
      // A column read against a baseline that is not zero overstates every
      // difference, so zero is the default and letting it float is a choice.
      if (config.zero_baseline !== false) {
        low = Math.min(0, low);
        high = Math.max(0, high);
      }
    }
    if (high === low) high = low + 1;

    var wantTicks = (horizontal ? width < 420 : height < 220) ? 3 : 4;
    var step = V.niceStep((high - low) / wantTicks);
    var axisLow = isShare ? 0 : Math.floor(low / step) * step;
    var axisHigh = isShare ? 100 : Math.ceil(high / step) * step;
    if (axisHigh === axisLow) axisHigh = axisLow + step;

    var ticks = [];
    for (var t = axisLow; t <= axisHigh + 1e-9; t += step) ticks.push(Number(t.toFixed(10)));

    function tickText(value) { return isShare ? Math.round(value) + '%' : V.compact(value); }

    // --- Room for the furniture ---------------------------------------------

    var tickFont = V.fontOf(11);
    var multi = series.length > 1;

    var legendHeight = 0;
    if (multi && config.show_legend !== false && width >= 260) {
      var legend = document.createElement('div');
      legend.className = 'v-legend';
      series.forEach(function (field, i) {
        var key = document.createElement('div');
        key.className = 'v-key';
        var swatch = document.createElement('div');
        swatch.className = 'v-swatch';
        swatch.style.borderRadius = '2px';
        swatch.style.background = c.colour(i);
        var text = document.createElement('span');
        text.textContent = field.label_short || field.label || field.name;
        key.appendChild(swatch);
        key.appendChild(text);
        legend.appendChild(key);
      });
      c.root.appendChild(legend);
      legendHeight = legend.offsetHeight || 20;
    }

    var measureName = multi ? 'Value' : (series[0].label_short || series[0].label || series[0].name);
    var dimName = dimField.label_short || dimField.label || dimField.name;
    if (isShare) measureName = 'Share of Total';

    // The horizontal axis carries the categories as columns and the values as
    // bars, so which name belongs to which title follows the orientation.
    var xTitle = c.title('x_axis_label', horizontal ? measureName : dimName);
    var yTitle = c.title('y_axis_label', horizontal ? dimName : measureName);
    var xBand = xTitle ? 16 : 0;
    var yBand = yTitle ? 15 : 0;

    var longestName = groups.reduce(function (m, g) {
      return Math.max(m, V.textWidth(g.name, tickFont));
    }, 0);
    var widestTick = ticks.reduce(function (m, v) {
      return Math.max(m, V.textWidth(tickText(v), tickFont));
    }, 0);

    var plotTop = 6;
    var plotLeft;
    var plotWidth;
    var plotHeight;
    var catBand;
    var rotateNames = false;

    if (horizontal) {
      // Names read straight across, which is the whole point of this mode.
      catBand = Math.max(44, Math.min(Math.ceil(longestName) + 10, Math.round(width * 0.42)));
      plotLeft = yBand + catBand + 6;
      plotWidth = Math.max(20, width - plotLeft - Math.ceil(widestTick / 2) - 10);
      plotHeight = Math.max(20, height - legendHeight - plotTop - 18 - xBand);
    } else {
      plotLeft = yBand + Math.ceil(widestTick) + 10;
      plotWidth = Math.max(20, width - plotLeft - 10);
      // A column too narrow for its name flat gets the name turned on its side,
      // rather than cut down to nothing.
      var slotGuess = plotWidth / groups.length;
      if (longestName > slotGuess - 4) {
        rotateNames = true;
        catBand = Math.min(Math.ceil(longestName) + 12, Math.round(height * 0.4));
      } else {
        catBand = 18;
      }
      plotHeight = Math.max(20, height - legendHeight - plotTop - catBand - xBand);
    }

    // Measures on one shared scale only compare if they are the same order of
    // magnitude. Past 25x the smaller ones are a flat line against the axis,
    // so the chart says so rather than drawing something meaningless.
    var mismatched = 0;
    if (series.length > 1) {
      var reach = series.map(function (field, si) {
        return groups.reduce(function (m, g) {
          var v = g.values[si];
          return Math.max(m, v && v.value !== null ? Math.abs(v.value) : 0);
        }, 0);
      }).filter(function (v) { return v > 0; });
      if (reach.length > 1) {
        var biggest = Math.max.apply(null, reach);
        var smallest = Math.min.apply(null, reach);
        if (smallest > 0 && biggest / smallest > 25) mismatched = reach.length;
      }
    }

    var noteBand = (droppedRows || droppedNegatives || mismatched) ? 13 : 0;
    if (horizontal) plotHeight = Math.max(20, plotHeight - noteBand);
    else plotHeight = Math.max(20, plotHeight - noteBand);

    var svg = c.svg();
    svg.setAttribute('height', Math.max(20, height - legendHeight));

    var catStart = horizontal ? plotTop : plotLeft;
    var catLength = horizontal ? plotHeight : plotWidth;

    function pos(value) {
      var ratio = (value - axisLow) / (axisHigh - axisLow);
      return horizontal
        ? plotLeft + ratio * plotWidth
        : plotTop + plotHeight - ratio * plotHeight;
    }

    var basePos = pos(Math.min(Math.max(0, axisLow), axisHigh));

    // --- Grid, ticks and axis ------------------------------------------------

    ticks.forEach(function (value) {
      var at = Math.round(pos(value)) + 0.5;
      if (horizontal) {
        svg.appendChild(V.el('line', {
          class: 'v-grid-line', x1: at, x2: at, y1: plotTop, y2: plotTop + plotHeight
        }));
        var below = V.el('text', {
          class: 'v-tick', x: at, y: plotTop + plotHeight + 14, 'text-anchor': 'middle'
        });
        below.textContent = tickText(value);
        svg.appendChild(below);
      } else {
        svg.appendChild(V.el('line', {
          class: 'v-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: at, y2: at
        }));
        var beside = V.el('text', {
          class: 'v-tick', x: plotLeft - 6,
          y: Math.min(Math.max(at + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
        });
        beside.textContent = tickText(value);
        svg.appendChild(beside);
      }
    });

    svg.appendChild(horizontal
      ? V.el('line', {
          class: 'v-axis-line', x1: Math.round(basePos) + 0.5, x2: Math.round(basePos) + 0.5,
          y1: plotTop, y2: plotTop + plotHeight
        })
      : V.el('line', {
          class: 'v-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
          y1: Math.round(basePos) + 0.5, y2: Math.round(basePos) + 0.5
        }));

    // --- Marks ---------------------------------------------------------------

    // A colour picked in the config has no paired ink token, and a theme token
    // resolves differently in dark mode, so read what the root actually has.
    var rootStyle = window.getComputedStyle(c.root);
    function solidColour(index) {
      var chosen = config.series_colours && config.series_colours[index];
      if (chosen) return chosen;
      var token = (rootStyle.getPropertyValue('--v-c' + (index % 8)) || '').trim();
      return token || '#525aff';
    }

    // A rounded far end, square at the baseline, so a bar reads as sitting on
    // its axis. Segments inside a stack stay square on both ends.
    function barShape(x, y, w, h, round) {
      w = Math.max(1, w);
      h = Math.max(1, h);
      var r = Math.min(4, w / 2, h / 2);
      if (!round || r < 1.5) {
        return V.el('rect', { class: 'v-mark', x: x, y: y, width: w, height: h });
      }
      var d;
      if (round === 'top') {
        d = 'M' + x + ' ' + (y + h) + ' L' + x + ' ' + (y + r) +
            ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
            ' L' + (x + w - r) + ' ' + y +
            ' Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
            ' L' + (x + w) + ' ' + (y + h) + ' Z';
      } else if (round === 'bottom') {
        d = 'M' + x + ' ' + y + ' L' + x + ' ' + (y + h - r) +
            ' Q' + x + ' ' + (y + h) + ' ' + (x + r) + ' ' + (y + h) +
            ' L' + (x + w - r) + ' ' + (y + h) +
            ' Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w) + ' ' + (y + h - r) +
            ' L' + (x + w) + ' ' + y + ' Z';
      } else if (round === 'right') {
        d = 'M' + x + ' ' + y + ' L' + (x + w - r) + ' ' + y +
            ' Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
            ' L' + (x + w) + ' ' + (y + h - r) +
            ' Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) +
            ' L' + x + ' ' + (y + h) + ' Z';
      } else {
        d = 'M' + (x + w) + ' ' + y + ' L' + (x + r) + ' ' + y +
            ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
            ' L' + x + ' ' + (y + h - r) +
            ' Q' + x + ' ' + (y + h) + ' ' + (x + r) + ' ' + (y + h) +
            ' L' + (x + w) + ' ' + (y + h) + ' Z';
      }
      return V.el('path', { class: 'v-mark', d: d });
    }

    var slot = catLength / groups.length;
    var innerGap = series.length > 1 ? 2 : 0;
    var thickness = isStacked
      ? Math.min(34, Math.max(2, slot * 0.7))
      : Math.min(24, Math.max(2, (slot * 0.7 - innerGap * (series.length - 1)) / series.length));
    var clusterSize = isStacked ? thickness : thickness * series.length + innerGap * (series.length - 1);

    function valueLabel(v, group) {
      if (isShare) {
        var share = group.stack ? (v.value / group.stack) * 100 : 0;
        return Math.round(share) + '%';
      }
      return v.text || V.compact(v.value);
    }

    var placedLabels = [];
    function labelClear(x, y, w) {
      var clash = placedLabels.some(function (box) {
        return Math.abs(box.y - y) < 11 && x < box.right + 3 && x + w + 3 > box.left;
      });
      if (clash) return false;
      placedLabels.push({ y: y, left: x, right: x + w });
      return true;
    }

    groups.forEach(function (group, gi) {
      var centre = catStart + slot * (gi + 0.5);
      var from = centre - clusterSize / 2;
      var running = 0;

      group.values.forEach(function (v, si) {
        if (v.value === null) return;
        if (isStacked && v.value <= 0) return;

        var fill = c.colour(si);
        var startValue;
        var endValue;

        if (isStacked) {
          var amount = isShare
            ? (group.stack ? (v.value / group.stack) * 100 : 0)
            : v.value;
          startValue = running;
          endValue = running + amount;
          running = endValue;
        } else {
          startValue = Math.min(Math.max(0, axisLow), axisHigh);
          endValue = v.value;
        }

        var a = pos(startValue);
        var b = pos(endValue);
        var positive = endValue >= startValue;

        if (lollipop) {
          // A stem to the value and a dot on the end: the same encoding as a
          // bar, with less ink, which reads better when the set is sparse.
          var stemThickness = Math.max(2, Math.min(3, thickness / 4));
          var dotR = Math.max(2.5, Math.min(5, thickness / 2));
          var stemAt = from + si * (thickness + innerGap) + thickness / 2;
          var line = horizontal
            ? V.el('line', { class: 'v-mark v-stem', x1: a, x2: b, y1: stemAt, y2: stemAt })
            : V.el('line', { class: 'v-mark v-stem', x1: stemAt, x2: stemAt, y1: a, y2: b });
          line.style.stroke = fill;
          line.style.strokeWidth = stemThickness;
          svg.appendChild(line);
          var dot = horizontal
            ? V.el('circle', { class: 'v-mark', cx: b, cy: stemAt, r: dotR })
            : V.el('circle', { class: 'v-mark', cx: stemAt, cy: b, r: dotR });
          dot.style.fill = fill;
          svg.appendChild(dot);
        } else {
          var offset = isStacked ? 0 : si * (thickness + innerGap);
          var shape;
          if (horizontal) {
            var roundH = isStacked ? (endValue === group.stack || isShare && Math.round(running) >= 100 ? 'right' : null) : (positive ? 'right' : 'left');
            shape = barShape(Math.min(a, b), from + offset, Math.abs(b - a), thickness, roundH);
          } else {
            var roundV = isStacked ? (endValue === group.stack || isShare && Math.round(running) >= 100 ? 'top' : null) : (positive ? 'top' : 'bottom');
            shape = barShape(from + offset, Math.min(a, b), thickness, Math.abs(b - a), roundV);
          }
          shape.style.fill = fill;
          svg.appendChild(shape);
        }

        if (config.show_values === false) return;

        var text = valueLabel(v, group);

        if (isStacked) {
          // Inside the segment, in ink or white by measured contrast against
          // the fill it sits on. Dropped when the segment is too small, and
          // the tooltip still carries it.
          var spanPx = Math.abs(b - a);
          var fits = horizontal
            ? V.textWidth(text, V.fontOf(10)) + 8 <= spanPx && thickness >= 13
            : spanPx >= 13 && V.textWidth(text, V.fontOf(10)) + 6 <= thickness;
          if (!fits) return;
          var inside = V.el('text', {
            class: 'v-seg-label',
            x: horizontal ? (a + b) / 2 : from + thickness / 2,
            y: horizontal ? from + thickness / 2 + 3.5 : (a + b) / 2 + 3.5,
            'text-anchor': 'middle'
          });
          inside.style.fill = V.inkOn(solidColour(si));
          inside.textContent = text;
          svg.appendChild(inside);
          return;
        }

        // Outside the far end, where there is room for it on the tile.
        var near = lollipop ? 8 : 6;
        if (horizontal) {
          var room = width - b - 4;
          var label = V.fit(text, V.fontOf(10), room);
          if (!label || room < 12) return;
          var rightY = from + si * (thickness + innerGap) + thickness / 2 + 3.5;
          if (!labelClear(b + near, rightY, V.textWidth(label, V.fontOf(10)))) return;
          var right = V.el('text', {
            class: 'v-value', x: b + near, y: rightY
          });
          right.style.fontSize = '10px';
          right.textContent = label;
          svg.appendChild(right);
        } else {
          var cap = V.fit(text, V.fontOf(10), Math.max(thickness + 6, slot - 4));
          if (!cap || b - plotTop < 12) return;
          var capX = from + si * (thickness + innerGap) + thickness / 2;
          var capW = V.textWidth(cap, V.fontOf(10));
          if (!labelClear(capX - capW / 2, b - near + 2, capW)) return;
          var above = V.el('text', {
            class: 'v-value', x: capX, y: b - near + 2, 'text-anchor': 'middle'
          });
          above.style.fontSize = '10px';
          above.textContent = cap;
          svg.appendChild(above);
        }
      });

      // One target per group, covering the whole slot, so a mark too thin to
      // point at is still reachable by pointer and by keyboard.
      var hit = horizontal
        ? V.el('rect', { class: 'v-hit', x: plotLeft, y: catStart + slot * gi, width: plotWidth, height: slot, tabindex: '0' })
        : V.el('rect', { class: 'v-hit', x: catStart + slot * gi, y: plotTop, width: slot, height: plotHeight, tabindex: '0' });

      var rows = group.values.map(function (v) {
        if (v.value === null) return [v.field.label_short || v.field.name, '∅'];
        if (isShare) {
          var share = group.stack ? (v.value / group.stack) * 100 : 0;
          return [v.field.label_short || v.field.name, (v.text || V.compact(v.value)) + '  (' + Math.round(share) + '%)'];
        }
        return [v.field.label_short || v.field.name, v.text || V.compact(v.value)];
      });
      if (isStacked) rows.push(['Total', V.compact(group.stack)]);

      hit.addEventListener('pointermove', function (event) {
        c.tip.show(group.name, rows, event.clientX, event.clientY);
      });
      hit.addEventListener('pointerleave', c.tip.hide);
      hit.addEventListener('focus', function () {
        var box = hit.getBoundingClientRect();
        c.tip.show(group.name, rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      hit.addEventListener('blur', c.tip.hide);
      if (group.links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: group.links, event: event });
        };
        hit.addEventListener('click', drill);
        hit.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drill(event); }
        });
      }
      svg.appendChild(hit);

      // The category name: straight across in bar mode, flat under the column
      // where it fits, on its side where it does not.
      if (horizontal) {
        var sideName = V.middleFit(group.name, tickFont, catBand - 10);
        if (sideName) {
          var beside = V.el('text', {
            class: 'v-tick', x: plotLeft - 8, y: centre + 4, 'text-anchor': 'end'
          });
          beside.textContent = sideName;
          svg.appendChild(beside);
        }
      } else if (rotateNames) {
        var turned = V.middleFit(group.name, tickFont, catBand - 12);
        if (turned) {
          var upright = V.el('text', {
            class: 'v-tick', x: 0, y: 0, 'text-anchor': 'end',
            transform: 'translate(' + centre + ',' + (plotTop + plotHeight + 8) + ') rotate(-90)'
          });
          upright.textContent = turned;
          svg.appendChild(upright);
        }
      } else {
        var flat = V.middleFit(group.name, tickFont, slot - 4);
        if (flat) {
          var under = V.el('text', {
            class: 'v-tick', x: centre, y: plotTop + plotHeight + 14, 'text-anchor': 'middle'
          });
          under.textContent = flat;
          svg.appendChild(under);
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
          y: plotTop + plotHeight + (horizontal ? 18 : catBand) + 11, 'text-anchor': 'middle'
        });
        xLabel.textContent = xLaid;
        svg.appendChild(xLabel);
      }
    }

    if (noteBand) {
      var parts = [];
      if (droppedRows) parts.push(droppedRows + (droppedRows === 1 ? ' row' : ' rows') + ' with no value not shown');
      if (droppedNegatives) parts.push(droppedNegatives + ' negative ' + (droppedNegatives === 1 ? 'value' : 'values') + ' left out of the stack');
      if (mismatched) parts.push(mismatched + ' measures on one shared scale are more than 25x apart, so the smaller ones read flat');
      var noteText = V.fit(parts.join('; '), V.fontOf(10), Math.max(0, width - plotLeft - 4));
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
