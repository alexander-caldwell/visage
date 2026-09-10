// Stacked Area: one band per series, stacked, across an ordered dimension.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.2.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('stacked_area build v1.2.0');

looker.plugins.visualizations.add({
  id: 'stacked_area',
  label: 'Stacked Area',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 1 measure (a second dimension gives the bands)',
  good_for: [
    'A total over time and the mix that makes it up',
    'Share of total over time, when set to share mode',
    'Showing that a flat total hides a changing mix',
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
    stack_mode: {
      type: 'string',
      label: 'Stack Mode',
      display: 'select',
      values: [{ 'Absolute': 'absolute' }, { 'Share of Total': 'share' }],
      default: 'absolute',
      section: 'Data',
      order: 1
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
    var root = element.querySelector('.ar-root');
    if (root) return root;
    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.ar-root {' +
      '  --ar-surface: #fcfcfb; --ar-ink: #0b0b0b; --ar-ink-2: #52514e;' +
      '  --ar-muted: #898781; --ar-grid: #e1e0d9; --ar-axis: #c3c2b7;' +
      '  --ar-hairline: rgba(11,11,11,0.10);' +
      '  --ar-c0: #2a78d6; --ar-c1: #eb6834; --ar-c2: #1baf7a;' +
      '  --ar-c3: #eda100; --ar-c4: #e87ba4; --ar-c5: #008300;' +
      '  --ar-c6: #4a3aa7; --ar-c7: #e34948; --ar-other: #b9b7ae;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--ar-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.ar-root.ar-dark { --ar-surface: #1a1a19; --ar-ink: #ffffff;' +
      '  --ar-ink-2: #c3c2b7; --ar-muted: #898781; --ar-grid: #2c2c2a;' +
      '  --ar-axis: #383835; --ar-hairline: rgba(255,255,255,0.10);' +
      '  --ar-c0: #3987e5; --ar-c1: #d95926; --ar-c2: #199e70;' +
      '  --ar-c3: #c98500; --ar-c4: #d55181; --ar-c5: #008300;' +
      '  --ar-c6: #9085e9; --ar-c7: #e66767; --ar-other: #4a4a46; }' +
      '.ar-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--ar-ink-2); overflow: hidden; }' +
      '.ar-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 220px; }' +
      '.ar-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.ar-swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }' +
      '.ar-plot { display: block; }' +
      '.ar-grid-line { stroke: var(--ar-grid); stroke-width: 1; }' +
      '.ar-axis-line { stroke: var(--ar-axis); stroke-width: 1; }' +
      '.ar-tick { font-size: 11px; fill: var(--ar-muted);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.ar-axis-title { font-size: 11px; fill: var(--ar-muted); }' +
      '.ar-label { font-size: 11px; fill: var(--ar-ink); }' +
      '.ar-empty { font-size: 12px; fill: var(--ar-muted); }' +
      '.ar-mark { transition: filter 90ms ease-out; }' +
      '.ar-hit { fill: transparent; cursor: pointer; }' +
      '.ar-hit:hover ~ .ar-mark, .ar-hit:focus-visible ~ .ar-mark { filter: brightness(1.09); }' +
      '.ar-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--ar-surface); color: var(--ar-ink); border-radius: 6px;' +
      '  padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--ar-hairline); }' +
      '.ar-tip[data-shown="1"] { opacity: 1; }' +
      '.ar-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.ar-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--ar-ink-2); }' +
      '.ar-tip-row b { font-weight: 600; color: var(--ar-ink);' +
      '  font-variant-numeric: tabular-nums; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'ar-root';
    element.appendChild(root);
    return root;
  },

  _hostIsDark: function (element) {
    var node = element;
    while (node && node !== document.documentElement) {
      var colour = window.getComputedStyle(node).backgroundColor;
      var parts = /rgba?\(([^)]+)\)/.exec(colour);
      if (parts) {
        var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
        var alpha = channels.length > 3 ? channels[3] : 1;
        if (alpha > 0.1) {
          return (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255 < 0.5;
        }
      }
      node = node.parentElement;
    }
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  _applyTheme: function (element, root, config) {
    var dark;
    if (config.theme === 'dark') dark = true;
    else if (config.theme === 'light') dark = false;
    else dark = this._hostIsDark(element);
    if (dark) root.classList.add('ar-dark');
    else root.classList.remove('ar-dark');
  },

  create: function (element, config) {
    var root = this._ensureRoot(element);
    this._applyTheme(element, root, config || {});
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    var dims = queryResponse.fields.dimension_like || [];
    var meas = queryResponse.fields.measure_like || [];

    if (dims.length < 1 || meas.length < 1) {
      this.addError({
        title: 'Wrong query shape',
        message: 'A stacked area needs one dimension for the axis and one measure. A second dimension becomes one band per value.'
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
          title: 'Stacked Area failed to render',
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

    function drawMessage(msg) {
      var svg = el('svg', { class: 'ar-plot', width: width, height: height });
      var text = el('text', {
        class: 'ar-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    // One tooltip, moved and refilled per mark.
    var tip = document.createElement('div');
    tip.className = 'ar-tip';
    var tipName = document.createElement('div');
    tipName.className = 'ar-tip-name';
    tip.appendChild(tipName);
    var tipBody = document.createElement('div');
    tip.appendChild(tipBody);

    function showTip(title, rows, clientX, clientY) {
      tipName.textContent = title;
      while (tipBody.firstChild) tipBody.removeChild(tipBody.firstChild);
      rows.forEach(function (row) {
        var line = document.createElement('div');
        line.className = 'ar-tip-row';
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

    // Bands stack in a fixed order taken from each series' own total, so colour
    // follows the series and a filter never repaints the survivors.
    var xField = dims[0];
    var seriesField = dims.length > 1 ? dims[1] : null;
    var valueField = meas[0];

    var xKeys = [];
    var xLabels = {};
    var totals = {};
    var cells = {};

    data.forEach(function (row) {
      var xKey = cellText(row[xField.name]);
      var value = cellNumber(row[valueField.name]);
      if (value === null || value < 0) return;
      var name = seriesField ? cellText(row[seriesField.name]) : valueField.label_short;
      if (xKeys.indexOf(xKey) === -1) {
        xKeys.push(xKey);
        xLabels[xKey] = cellText(row[xField.name]);
      }
      if (!cells[name]) { cells[name] = {}; totals[name] = 0; }
      cells[name][xKey] = { value: value, text: cellText(row[valueField.name]) };
      totals[name] += value;
    });

    var names = Object.keys(cells).sort(function (a, b) { return totals[b] - totals[a]; });
    if (!names.length || xKeys.length < 2) {
      drawMessage('Not enough points to draw an area');
      return;
    }

    var stackTotals = xKeys.map(function (key) {
      return names.reduce(function (sum, name) {
        var cell = cells[name][key];
        return sum + (cell ? cell.value : 0);
      }, 0);
    });

    // Share mode divides each column by its own total, so the bands show the
    // mix rather than the size, and the axis runs 0 to 100%.
    var shareMode = config.stack_mode === 'share';
    var peak = shareMode ? 100 : Math.max.apply(null, stackTotals);

    var legendHeight = 0;
    if (names.length > 1 && width >= 260) {
      var legend = document.createElement('div');
      legend.className = 'ar-legend';
      names.slice(0, 8).forEach(function (name, i) {
        var key = document.createElement('div');
        key.className = 'ar-key';
        var swatch = document.createElement('div');
        swatch.className = 'ar-swatch';
        swatch.style.borderRadius = '2px';
        swatch.style.background = 'var(--ar-c' + i + ')';
        var text = document.createElement('span');
        text.textContent = name;
        key.appendChild(swatch);
        key.appendChild(text);
        legend.appendChild(key);
      });
      root.appendChild(legend);
      legendHeight = legend.offsetHeight || 20;
    }

    var yTitle = axisTitle('y_axis_label', shareMode
      ? 'Share of ' + valueField.label_short
      : valueField.label_short);
    var xTitle = axisTitle('x_axis_label', xField.label_short);
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    var step = niceStep(peak / (height < 220 ? 3 : 4));
    var yMax = Math.max(step, Math.ceil(peak / step) * step);
    var ticks = [];
    for (var t = 0; t <= yMax + 1e-9; t += step) ticks.push(t);

    var tickFont = fontOf(11);
    var widest = ticks.reduce(function (m, v) {
      return Math.max(m, textWidth(compact(v), tickFont));
    }, 0);

    var plotLeft = yBand + Math.ceil(widest) + 10;
    var plotTop = 6;
    var tickBand = 18;
    var plotWidth = Math.max(20, width - plotLeft - 10);
    var plotHeight = Math.max(20, height - legendHeight - plotTop - tickBand - xBand);

    var svg = el('svg', { class: 'ar-plot', width: width,
      height: plotHeight + plotTop + tickBand + xBand });

    ticks.forEach(function (value) {
      var y = Math.round(plotTop + plotHeight - (value / yMax) * plotHeight) + 0.5;
      svg.appendChild(el('line', {
        class: 'ar-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = el('text', {
        class: 'ar-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = shareMode ? Math.round(value) + '%' : compact(value);
      svg.appendChild(label);
    });

    function xAt(i) {
      return plotLeft + (i / (xKeys.length - 1)) * plotWidth;
    }
    function yAt(value) {
      return plotTop + plotHeight - (value / yMax) * plotHeight;
    }

    // Each band is drawn on the running total below it. The fill is the series
    // hue at low opacity with a 2px line on top, so bands read as bands rather
    // than as blocks of saturated colour.
    var running = xKeys.map(function () { return 0; });
    names.forEach(function (name, s) {
      var colour = s < 8 ? 'var(--ar-c' + s + ')' : 'var(--ar-other)';
      var upper = [];
      var lower = [];
      xKeys.forEach(function (key, i) {
        var cell = cells[name][key];
        var raw = cell ? cell.value : 0;
        var value = shareMode
          ? (stackTotals[i] ? (raw / stackTotals[i]) * 100 : 0)
          : raw;
        lower.push([xAt(i), yAt(running[i])]);
        running[i] += value;
        upper.push([xAt(i), yAt(running[i])]);
      });

      var d = upper.map(function (pt, i) {
        return (i ? 'L' : 'M') + pt[0] + ' ' + pt[1];
      }).join(' ') + ' ' + lower.slice().reverse().map(function (pt) {
        return 'L' + pt[0] + ' ' + pt[1];
      }).join(' ') + ' Z';

      var band = el('path', { class: 'ar-mark', d: d, opacity: 0.28 });
      band.style.fill = colour;
      svg.appendChild(band);

      var edge = el('path', {
        class: 'ar-mark', fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round',
        d: upper.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0] + ' ' + pt[1]; }).join(' ')
      });
      edge.style.stroke = colour;
      svg.appendChild(edge);
    });

    var everyNth = 1;
    while (everyNth < xKeys.length) {
      var need = xKeys.filter(function (k, i) { return i % everyNth === 0; })
        .reduce(function (m, k) { return Math.max(m, textWidth(xLabels[k], tickFont)); }, 0);
      if (need + 8 <= plotWidth / Math.ceil(xKeys.length / everyNth)) break;
      everyNth++;
    }

    xKeys.forEach(function (key, i) {
      if (i % everyNth !== 0) return;
      var anchor = i === 0 ? 'start' : (i === xKeys.length - 1 ? 'end' : 'middle');
      var label = fit(xLabels[key], tickFont, plotWidth / Math.ceil(xKeys.length / everyNth));
      if (!label) return;
      var text = el('text', {
        class: 'ar-tick', x: xAt(i), y: plotTop + plotHeight + 14, 'text-anchor': anchor
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    svg.appendChild(el('line', {
      class: 'ar-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
      y1: plotTop + plotHeight + 0.5, y2: plotTop + plotHeight + 0.5
    }));

    xKeys.forEach(function (key, i) {
      var half = plotWidth / Math.max(1, xKeys.length - 1) / 2;
      var band = el('rect', {
        class: 'ar-hit', x: Math.max(plotLeft, xAt(i) - half), y: plotTop,
        width: Math.max(4, half * 2), height: plotHeight, tabindex: '0'
      });
      var rows = names.map(function (name) {
        var cell = cells[name][key];
        if (!cell) return [name, '\u2205'];
        if (!shareMode) return [name, cell.text];
        var share = stackTotals[i] ? (cell.value / stackTotals[i]) * 100 : 0;
        return [name, cell.text + '  ·  ' + Math.round(share) + '%'];
      });
      rows.push(['Total', compact(stackTotals[i])]);
      band.addEventListener('pointermove', function (event) {
        showTip(xLabels[key], rows, event.clientX, event.clientY);
      });
      band.addEventListener('pointerleave', hideTip);
      band.addEventListener('focus', function () {
        var box = band.getBoundingClientRect();
        showTip(xLabels[key], rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      band.addEventListener('blur', hideTip);
      svg.appendChild(band);
    });

    if (yTitle) {
      var yLaid = fit(yTitle, fontOf(11), plotHeight);
      if (yLaid) {
        var yLabel = el('text', {
          class: 'ar-axis-title',
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
          class: 'ar-axis-title', x: plotLeft + plotWidth / 2,
          y: plotTop + plotHeight + tickBand + 11, 'text-anchor': 'middle'
        });
        xLabel.textContent = xLaid;
        svg.appendChild(xLabel);
      }
    }

    root.appendChild(svg);

    root.appendChild(tip);
    }

    attempt();
  }
});
