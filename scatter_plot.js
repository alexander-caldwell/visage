// Scatter: one dot per row, two measures placing it, a third sizing it.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.5.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('scatter_plot build v1.5.0');

looker.plugins.visualizations.add({
  id: 'scatter_plot',
  label: 'Scatter',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 2 measures (a third measure sizes the dots)',
  good_for: [
    'Whether two measures move together, across many rows',
    'Finding outliers that no ranking would surface',
    'A third measure as dot size, for three at once',
  ],

  options: {
    theme: {
      type: 'string',
      label: 'Theme',
      display: 'select',
      values: [{ 'Match Looker': 'auto' }, { 'Light': 'light' }, { 'Dark': 'dark' }],
      default: 'auto',
      section: 'Style',
      order: 0
    },
    show_labels: {
      type: 'boolean',
      label: 'Show Point Labels',
      default: true,
      section: 'Style',
      order: 1
    },
    zero_baseline: {
      type: 'boolean',
      label: 'Start Axes at Zero',
      default: true,
      section: 'Data',
      order: 1
    },
    main_colour: {
      type: 'array',
      label: 'Main Colour',
      display: 'color',
      default: ['#525aff'],
      section: 'Style',
      order: 5
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
  },

  _ensureRoot: function (element) {
    var root = element.querySelector('.sc-root');
    if (root) return root;
    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.sc-root {' +
      '  --sc-surface: #f7f7fa; --sc-ink: #151d2d; --sc-ink-2: #475569;' +
      '  --sc-muted: #94a3b8; --sc-grid: #e5e7eb; --sc-axis: #cbd5e1;' +
      '  --sc-hairline: rgba(11,11,11,0.10);' +
      '  --sc-c0: #525aff; --sc-c1: #eb6834; --sc-c2: #1baf7a;' +
      '  --sc-c3: #eda100; --sc-c4: #e87ba4; --sc-c5: #008300;' +
      '  --sc-c6: #ad93f1; --sc-c7: #e34948; --sc-other: #aab1c2;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--sc-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.sc-root.sc-dark { --sc-surface: #12121c; --sc-ink: #ffffff;' +
      '  --sc-ink-2: #cbd5e1; --sc-muted: #94a3b8; --sc-grid: #252a3a;' +
      '  --sc-axis: #31384a; --sc-hairline: rgba(255,255,255,0.10);' +
      '  --sc-c0: #7078ff; --sc-c1: #d95926; --sc-c2: #199e70;' +
      '  --sc-c3: #c98500; --sc-c4: #d55181; --sc-c5: #008300;' +
      '  --sc-c6: #8f7ce8; --sc-c7: #e66767; --sc-other: #3a4054; }' +
      '.sc-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--sc-ink-2); overflow: hidden; }' +
      '.sc-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 220px; }' +
      '.sc-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.sc-swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }' +
      '.sc-plot { display: block; }' +
      '.sc-grid-line { stroke: var(--sc-grid); stroke-width: 1; }' +
      '.sc-axis-line { stroke: var(--sc-axis); stroke-width: 1; }' +
      '.sc-tick { font-size: 11px; fill: var(--sc-muted);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.sc-axis-title { font-size: 11px; fill: var(--sc-muted); }' +
      '.sc-label { font-size: 11px; fill: var(--sc-ink); }' +
      '.sc-empty { font-size: 12px; fill: var(--sc-muted); }' +
      '.sc-mark { transition: filter 90ms ease-out; }' +
      '.sc-hit { fill: transparent; cursor: pointer; }' +
      '.sc-hit:hover ~ .sc-mark, .sc-hit:focus-visible ~ .sc-mark { filter: brightness(1.09); }' +
      '.sc-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--sc-surface); color: var(--sc-ink); border-radius: 6px;' +
      '  padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--sc-hairline); }' +
      '.sc-tip[data-shown="1"] { opacity: 1; }' +
      '.sc-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.sc-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--sc-ink-2); }' +
      '.sc-tip-row b { font-weight: 600; color: var(--sc-ink);' +
      '  font-variant-numeric: tabular-nums; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'sc-root';
    element.appendChild(root);
    return root;
  },

  _hostIsDark: function (element) {
    function brightnessOf(colour) {
      var parts = /rgba?\(([^)]+)\)/.exec(colour || '');
      if (!parts) return null;
      var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
      var alpha = channels.length > 3 ? channels[3] : 1;
      if (alpha <= 0.1) return null;
      return (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
    }

    // Walk up to and including <html>. Stopping short of it was the bug: Looker
    // paints its dashboard background high up, and with every element between
    // the tile and there transparent, the chart fell through to the browser's
    // own preference and so followed the laptop rather than the dashboard.
    var node = element;
    while (node) {
      var background = brightnessOf(window.getComputedStyle(node).backgroundColor);
      if (background !== null) return background < 0.5;
      if (node === document.documentElement) break;
      node = node.parentElement || document.documentElement;
    }

    // Nothing painted a background. The text colour the host hands the tile is
    // a better second signal than the operating system: light text means a dark
    // surface behind it.
    var inherited = brightnessOf(window.getComputedStyle(element).color);
    if (inherited !== null) return inherited > 0.6;

    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  _applyTheme: function (element, root, config) {
    var dark;
    if (config.theme === 'dark') dark = true;
    else if (config.theme === 'light') dark = false;
    else dark = this._hostIsDark(element);
    if (dark) root.classList.add('sc-dark');
    else root.classList.remove('sc-dark');
  },

  create: function (element, config) {
    var root = this._ensureRoot(element);
    this._applyTheme(element, root, config || {});
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    var dims = queryResponse.fields.dimension_like || [];
    var meas = queryResponse.fields.measure_like || [];

    if (dims.length < 1 || meas.length < 2) {
      this.addError({
        title: 'Wrong query shape',
        message: 'A scatter needs one dimension and two measures: one across, one up. A third measure sizes the dots.'
      });
      done();
      return;
    }

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

    var vis = this;
    var root = this._ensureRoot(element);
    this._applyTheme(element, root, config);
    var attempts = 0;

    function attempt() {
      var size = measure(element);
      if ((!size.width || !size.height) && attempts < 12) {
        attempts++;
        if (window.requestAnimationFrame) window.requestAnimationFrame(attempt);
        else window.setTimeout(attempt, 16);
        return;
      }
      try {
        render(size.width || 600, size.height || 400);
      } catch (err) {
        vis.addError({
          title: 'Scatter failed to render',
          message: (err && err.message) || String(err)
        });
      }
      done();
    }

    function render(width, height) {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.style.height = height + 'px';

    var svgNS = 'http://www.w3.org/2000/svg';
    var FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    function el(name, attrs) {
      var node = document.createElementNS(svgNS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    var scratch = document.createElement('canvas').getContext('2d');

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    function fit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '\u2026', font) > room) cut = cut.slice(0, -1);
      if (cut.length < 3) return null;
      return cut + '\u2026';
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

    function axisTitle(option, auto) {
      if (config.show_axis_titles === false) return '';
      var given = (config[option] || '').trim();
      return given || auto || '';
    }


    // The main colour overrides the token, but only when the user has moved it
    // off the default, so the theme still drives an untouched chart.
    var mainColour = (config.main_colour && config.main_colour[0]) || 'var(--sc-c0)';

    function drawMessage(msg) {
      var svg = el('svg', { class: 'sc-plot', width: width, height: height });
      var text = el('text', {
        class: 'sc-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    // One tooltip, moved and refilled per mark.
    var tip = document.createElement('div');
    tip.className = 'sc-tip';
    var tipName = document.createElement('div');
    tipName.className = 'sc-tip-name';
    tip.appendChild(tipName);
    var tipBody = document.createElement('div');
    tip.appendChild(tipBody);

    function showTip(title, rows, clientX, clientY) {
      tipName.textContent = title;
      while (tipBody.firstChild) tipBody.removeChild(tipBody.firstChild);
      rows.forEach(function (row) {
        var line = document.createElement('div');
        line.className = 'sc-tip-row';
        var key = document.createElement('span');
        key.textContent = row[0];
        var value = document.createElement('b');
        value.textContent = row[1];
        line.appendChild(key);
        line.appendChild(value);
        tipBody.appendChild(line);
      });
      tip.setAttribute('data-shown', '1');

      var host = root.getBoundingClientRect();
      var px = clientX - host.left + 14;
      var py = clientY - host.top + 14;
      if (px + tip.offsetWidth > width - 4) px = Math.max(4, clientX - host.left - tip.offsetWidth - 14);
      if (py + tip.offsetHeight > height - 4) py = Math.max(4, clientY - host.top - tip.offsetHeight - 14);
      tip.style.left = Math.round(px) + 'px';
      tip.style.top = Math.round(py) + 'px';
    }

    function hideTip() { tip.removeAttribute('data-shown'); }

    if (!data.length) {
      drawMessage('No results');
      return;
    }

    // One dot per row: first measure across, second up, third (if present) sets
    // the dot size. Colour follows the dimension value, in a fixed order taken
    // from the x measure, never the row's position in the query.
    var nameField = dims[0];
    var xMeasure = meas[0];
    var yMeasure = meas[1];
    var sizeMeasure = meas.length > 2 ? meas[2] : null;

    var dots = [];
    var skipped = 0;
    data.forEach(function (row) {
      var x = cellNumber(row[xMeasure.name]);
      var y = cellNumber(row[yMeasure.name]);
      if (x === null || y === null) { skipped++; return; }
      dots.push({
        name: cellText(row[nameField.name]),
        x: x, y: y,
        xText: cellText(row[xMeasure.name]),
        yText: cellText(row[yMeasure.name]),
        size: sizeMeasure ? cellNumber(row[sizeMeasure.name]) : null,
        sizeText: sizeMeasure ? cellText(row[sizeMeasure.name]) : '',
        links: (row[nameField.name] && row[nameField.name].links) || []
      });
    });

    if (!dots.length) {
      drawMessage('No rows with both measures');
      return;
    }

    dots.sort(function (a, b) { return b.x - a.x; });

    var yTitle = axisTitle('y_axis_label', yMeasure.label_short);
    var xTitle = axisTitle('x_axis_label', xMeasure.label_short);
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    // Off zero, each axis starts a step below its lowest point, which spreads a
    // tight cluster out instead of squashing it into one corner.
    var zeroed = config.zero_baseline !== false;
    var xPeak = Math.max.apply(null, dots.map(function (d) { return d.x; }));
    var yPeak = Math.max.apply(null, dots.map(function (d) { return d.y; }));
    var xTrough = Math.min.apply(null, dots.map(function (d) { return d.x; }));
    var yTrough = Math.min.apply(null, dots.map(function (d) { return d.y; }));

    var xStep = niceStep((xPeak - (zeroed ? 0 : xTrough)) / 4);
    var yStep = niceStep((yPeak - (zeroed ? 0 : yTrough)) / (height < 220 ? 3 : 4));
    var xMin = zeroed ? 0 : Math.floor(xTrough / xStep) * xStep;
    var yMin = zeroed ? 0 : Math.floor(yTrough / yStep) * yStep;
    var xMax = Math.max(xMin + xStep, Math.ceil(xPeak / xStep) * xStep);
    var yMax = Math.max(yMin + yStep, Math.ceil(yPeak / yStep) * yStep);

    var xTicks = [];
    for (var xt = xMin; xt <= xMax + 1e-9; xt += xStep) xTicks.push(xt);
    var yTicks = [];
    for (var yt = yMin; yt <= yMax + 1e-9; yt += yStep) yTicks.push(yt);

    var tickFont = fontOf(11);
    var widest = yTicks.reduce(function (m, v) {
      return Math.max(m, textWidth(compact(v), tickFont));
    }, 0);

    // A footnote needs its own band, or it is drawn past the bottom of the SVG
    // and clipped by the tile.
    var noteBand = skipped ? 14 : 0;

    var plotLeft = yBand + Math.ceil(widest) + 10;
    var plotTop = 10;
    var tickBand = 18;
    var plotWidth = Math.max(20, width - plotLeft - 14);
    var plotHeight = Math.max(20, height - plotTop - tickBand - xBand - noteBand);

    var svg = el('svg', { class: 'sc-plot', width: width,
      height: plotHeight + plotTop + tickBand + xBand + noteBand });

    yTicks.forEach(function (value) {
      var y = Math.round(plotTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight) + 0.5;
      svg.appendChild(el('line', {
        class: 'sc-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = el('text', {
        class: 'sc-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = compact(value);
      svg.appendChild(label);
    });

    xTicks.forEach(function (value, i) {
      var x = Math.round(plotLeft + ((value - xMin) / (xMax - xMin)) * plotWidth) + 0.5;
      svg.appendChild(el('line', {
        class: 'sc-grid-line', x1: x, x2: x, y1: plotTop, y2: plotTop + plotHeight
      }));
      var anchor = i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle');
      var label = el('text', {
        class: 'sc-tick', x: x, y: plotTop + plotHeight + 14, 'text-anchor': anchor
      });
      label.textContent = compact(value);
      svg.appendChild(label);
    });

    var sizes = dots.map(function (d) { return d.size; }).filter(function (v) { return v !== null; });
    var sizeMin = sizes.length ? Math.min.apply(null, sizes) : 0;
    var sizeMax = sizes.length ? Math.max.apply(null, sizes) : 0;

    function radiusFor(d) {
      if (d.size === null || sizeMax === sizeMin) return 5;
      // Area, not radius, carries the value: doubling the number should look
      // like twice as much ink, not four times.
      var t = (d.size - sizeMin) / (sizeMax - sizeMin);
      return Math.sqrt(16 + t * 240) / 2;
    }

    var placed = [];

    dots.forEach(function (d, i) {
      var cx = plotLeft + ((d.x - xMin) / (xMax - xMin)) * plotWidth;
      var cy = plotTop + plotHeight - ((d.y - yMin) / (yMax - yMin)) * plotHeight;
      var r = radiusFor(d);
      // One hue for every dot. Twelve unrelated points cannot be told apart by
      // twelve cycled colours, so identity comes from the label beside the dot
      // and from the tooltip, not from hue.
      var colour = mainColour;

      // A 2px ring in the surface colour keeps overlapping dots legible.
      var dot = el('circle', {
        class: 'sc-mark', cx: cx, cy: cy, r: r, 'stroke-width': 2, tabindex: '0'
      });
      dot.style.fill = colour;
      dot.style.stroke = 'var(--sc-surface)';
      dot.style.cursor = 'pointer';

      var rows = [[xMeasure.label_short, d.xText], [yMeasure.label_short, d.yText]];
      if (sizeMeasure) rows.push([sizeMeasure.label_short, d.sizeText]);

      dot.addEventListener('pointermove', function (event) {
        showTip(d.name, rows, event.clientX, event.clientY);
      });
      dot.addEventListener('pointerleave', hideTip);
      dot.addEventListener('focus', function () {
        var box = dot.getBoundingClientRect();
        showTip(d.name, rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      dot.addEventListener('blur', hideTip);
      if (d.links.length) {
        dot.addEventListener('click', function (event) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        });
      }
      svg.appendChild(dot);

      // Direct labels, skipped where they would sit on top of one another or
      // run off the plot. What is skipped is still in the tooltip.
      var label = config.show_labels === false ? null : fit(d.name, fontOf(11), 130);
      if (label) {
        var labelWidth = textWidth(label, fontOf(11));
        var lx = cx + r + 5;
        var anchor = 'start';
        if (lx + labelWidth > plotLeft + plotWidth) {
          lx = cx - r - 5;
          anchor = 'end';
        }
        var left = anchor === 'start' ? lx : lx - labelWidth;
        var clashes = placed.some(function (box) {
          return Math.abs(box.y - cy) < 12 &&
            left < box.right + 6 && left + labelWidth + 6 > box.left;
        });
        if (!clashes && left >= plotLeft - 2) {
          var text = el('text', {
            class: 'sc-label', x: lx, y: cy + 4, 'text-anchor': anchor
          });
          text.style.fill = 'var(--sc-ink-2)';
          text.textContent = label;
          svg.appendChild(text);
          placed.push({ y: cy, left: left, right: left + labelWidth });
        }
      }
    });

    if (yTitle) {
      var yLaid = fit(yTitle, fontOf(11), plotHeight);
      if (yLaid) {
        var yLabel = el('text', {
          class: 'sc-axis-title',
          transform: 'translate(' + (yBand - 3) + ',' + (plotTop + plotHeight / 2) + ') rotate(-90)',
          'text-anchor': 'middle'
        });
        yLabel.textContent = yLaid;
        svg.appendChild(yLabel);
      }
    }
    if (xTitle) {
      var xLaid = fit(xTitle, fontOf(11), plotWidth);
      if (xLaid) {
        var xLabel = el('text', {
          class: 'sc-axis-title', x: plotLeft + plotWidth / 2,
          y: plotTop + plotHeight + tickBand + 11, 'text-anchor': 'middle'
        });
        xLabel.textContent = xLaid;
        svg.appendChild(xLabel);
      }
    }

    if (skipped) {
      var note = el('text', {
        class: 'sc-tick', x: plotLeft,
        y: plotTop + plotHeight + tickBand + xBand + noteBand - 3
      });
      note.textContent = skipped + (skipped === 1 ? ' row' : ' rows') + ' missing a measure';
      svg.appendChild(note);
    }

    root.appendChild(svg);

    root.appendChild(tip);
    }

    attempt();
  }
});
