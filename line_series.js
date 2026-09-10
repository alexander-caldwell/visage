// Line: one line per series across an ordered dimension.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.1.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('line_series build v1.1.0');

looker.plugins.visualizations.add({
  id: 'line_series',
  label: 'Line',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 1 measure (a second dimension gives one line per value)',

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
    zero_baseline: {
      type: 'boolean',
      label: 'Start Scale at Zero',
      default: true,
      section: 'Data',
      order: 1
    },
    show_points: {
      type: 'boolean',
      label: 'Show Point Markers',
      default: false,
      section: 'Style',
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
    var root = element.querySelector('.ln-root');
    if (root) return root;
    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.ln-root {' +
      '  --ln-surface: #fcfcfb; --ln-ink: #0b0b0b; --ln-ink-2: #52514e;' +
      '  --ln-muted: #898781; --ln-grid: #e1e0d9; --ln-axis: #c3c2b7;' +
      '  --ln-hairline: rgba(11,11,11,0.10);' +
      '  --ln-c0: #2a78d6; --ln-c1: #eb6834; --ln-c2: #1baf7a;' +
      '  --ln-c3: #eda100; --ln-c4: #e87ba4; --ln-c5: #008300;' +
      '  --ln-c6: #4a3aa7; --ln-c7: #e34948; --ln-other: #b9b7ae;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--ln-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.ln-root.ln-dark { --ln-surface: #1a1a19; --ln-ink: #ffffff;' +
      '  --ln-ink-2: #c3c2b7; --ln-muted: #898781; --ln-grid: #2c2c2a;' +
      '  --ln-axis: #383835; --ln-hairline: rgba(255,255,255,0.10);' +
      '  --ln-c0: #3987e5; --ln-c1: #d95926; --ln-c2: #199e70;' +
      '  --ln-c3: #c98500; --ln-c4: #d55181; --ln-c5: #008300;' +
      '  --ln-c6: #9085e9; --ln-c7: #e66767; --ln-other: #4a4a46; }' +
      '.ln-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--ln-ink-2); overflow: hidden; }' +
      '.ln-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 220px; }' +
      '.ln-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.ln-swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }' +
      '.ln-plot { display: block; }' +
      '.ln-grid-line { stroke: var(--ln-grid); stroke-width: 1; }' +
      '.ln-axis-line { stroke: var(--ln-axis); stroke-width: 1; }' +
      '.ln-tick { font-size: 11px; fill: var(--ln-muted);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.ln-axis-title { font-size: 11px; fill: var(--ln-muted); }' +
      '.ln-label { font-size: 11px; fill: var(--ln-ink); }' +
      '.ln-empty { font-size: 12px; fill: var(--ln-muted); }' +
      '.ln-mark { transition: filter 90ms ease-out; }' +
      '.ln-hit { fill: transparent; cursor: pointer; }' +
      '.ln-hit:hover ~ .ln-mark, .ln-hit:focus-visible ~ .ln-mark { filter: brightness(1.09); }' +
      '.ln-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--ln-surface); color: var(--ln-ink); border-radius: 6px;' +
      '  padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--ln-hairline); }' +
      '.ln-tip[data-shown="1"] { opacity: 1; }' +
      '.ln-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.ln-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--ln-ink-2); }' +
      '.ln-tip-row b { font-weight: 600; color: var(--ln-ink);' +
      '  font-variant-numeric: tabular-nums; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'ln-root';
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
    if (dark) root.classList.add('ln-dark');
    else root.classList.remove('ln-dark');
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
        message: 'A line needs at least one dimension for the axis and one measure. A second dimension becomes one line per value.'
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
          title: 'Line failed to render',
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
      var svg = el('svg', { class: 'ln-plot', width: width, height: height });
      var text = el('text', {
        class: 'ln-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    // One tooltip, moved and refilled per mark.
    var tip = document.createElement('div');
    tip.className = 'ln-tip';
    var tipName = document.createElement('div');
    tipName.className = 'ln-tip-name';
    tip.appendChild(tipName);
    var tipBody = document.createElement('div');
    tip.appendChild(tipBody);

    function showTip(title, rows, clientX, clientY) {
      tipName.textContent = title;
      while (tipBody.firstChild) tipBody.removeChild(tipBody.firstChild);
      rows.forEach(function (row) {
        var line = document.createElement('div');
        line.className = 'ln-tip-row';
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

    // Series come from the second dimension when there is one, otherwise from
    // the measures. Colour follows the series name, in a fixed order taken from
    // each series' own total, so a filter never repaints the survivors.
    var xField = dims[0];
    var seriesField = dims.length > 1 ? dims[1] : null;
    var valueField = meas[0];

    var xKeys = [];
    var xLabels = {};
    var totals = {};
    var points = {};

    data.forEach(function (row) {
      var xKey = cellText(row[xField.name]);
      var value = cellNumber(row[valueField.name]);
      if (value === null) return;
      var name = seriesField ? cellText(row[seriesField.name]) : valueField.label_short;
      if (xKeys.indexOf(xKey) === -1) {
        xKeys.push(xKey);
        xLabels[xKey] = cellText(row[xField.name]);
      }
      if (!points[name]) { points[name] = {}; totals[name] = 0; }
      points[name][xKey] = { value: value, text: cellText(row[valueField.name]),
        links: (row[xField.name] && row[xField.name].links) || [] };
      totals[name] += value;
    });

    var names = Object.keys(points).sort(function (a, b) { return totals[b] - totals[a]; });
    if (!names.length || xKeys.length < 2) {
      drawMessage('Not enough points to draw a line');
      return;
    }

    var peak = 0;
    names.forEach(function (name) {
      xKeys.forEach(function (k) {
        var p = points[name][k];
        if (p) peak = Math.max(peak, p.value);
      });
    });

    // Legend: two or more series never rest on colour alone.
    var legendHeight = 0;
    if (names.length > 1 && width >= 260) {
      var legend = document.createElement('div');
      legend.className = 'ln-legend';
      names.slice(0, 8).forEach(function (name, i) {
        var key = document.createElement('div');
        key.className = 'ln-key';
        var dot = document.createElement('div');
        dot.className = 'ln-swatch';
        dot.style.background = 'var(--ln-c' + i + ')';
        var text = document.createElement('span');
        text.textContent = name;
        key.appendChild(dot);
        key.appendChild(text);
        legend.appendChild(key);
      });
      root.appendChild(legend);
      legendHeight = legend.offsetHeight || 20;
    }

    var yTitle = axisTitle('y_axis_label', valueField.label_short);
    var xTitle = axisTitle('x_axis_label', xField.label_short);
    var yBand = yTitle ? 15 : 0;
    var xBand = xTitle ? 16 : 0;

    // Off zero, the scale starts a step below the lowest point, so a flat
    // series does not read as a flat line pinned to the floor.
    var trough = Infinity;
    names.forEach(function (name) {
      xKeys.forEach(function (k) {
        var p = points[name][k];
        if (p) trough = Math.min(trough, p.value);
      });
    });
    if (!isFinite(trough)) trough = 0;

    var step = niceStep((peak - (config.zero_baseline === false ? trough : 0)) /
      (height < 220 ? 3 : 4));
    var yMin = config.zero_baseline === false ? Math.floor(trough / step) * step : 0;
    var yMax = Math.max(yMin + step, Math.ceil(peak / step) * step);
    var ticks = [];
    for (var t = yMin; t <= yMax + 1e-9; t += step) ticks.push(t);

    var tickFont = fontOf(11);
    var widest = ticks.reduce(function (m, v) {
      return Math.max(m, textWidth(compact(v), tickFont));
    }, 0);

    var plotLeft = yBand + Math.ceil(widest) + 10;
    var plotRight = 10;
    var plotTop = 6;
    var tickBand = 18;
    var plotWidth = Math.max(20, width - plotLeft - plotRight);
    var plotHeight = Math.max(20, height - legendHeight - plotTop - tickBand - xBand);

    var svg = el('svg', { class: 'ln-plot', width: width, height: plotHeight + plotTop + tickBand + xBand });

    ticks.forEach(function (value) {
      var y = Math.round(plotTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight) + 0.5;
      svg.appendChild(el('line', {
        class: 'ln-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = el('text', {
        class: 'ln-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = compact(value);
      svg.appendChild(label);
    });

    function xAt(i) {
      return plotWidth <= 0 || xKeys.length < 2
        ? plotLeft
        : plotLeft + (i / (xKeys.length - 1)) * plotWidth;
    }
    function yAt(value) {
      return plotTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    }

    // X labels are thinned until they fit rather than overlapping.
    var everyNth = 1;
    while (everyNth < xKeys.length) {
      var need = xKeys.filter(function (k, i) { return i % everyNth === 0; })
        .reduce(function (m, k) { return Math.max(m, textWidth(xLabels[k], tickFont)); }, 0);
      if (need + 8 <= plotWidth / Math.ceil(xKeys.length / everyNth)) break;
      everyNth++;
    }

    xKeys.forEach(function (key, i) {
      if (i % everyNth !== 0) return;
      var label = fit(xLabels[key], tickFont, plotWidth / Math.ceil(xKeys.length / everyNth));
      if (!label) return;
      // The first and last labels anchor inwards, or they hang off the plot.
      var anchor = i === 0 ? 'start' : (i === xKeys.length - 1 ? 'end' : 'middle');
      var text = el('text', {
        class: 'ln-tick', x: xAt(i), y: plotTop + plotHeight + 14, 'text-anchor': anchor
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    svg.appendChild(el('line', {
      class: 'ln-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
      y1: plotTop + plotHeight + 0.5, y2: plotTop + plotHeight + 0.5
    }));

    // 2px lines, round joins, a marker on the last point, and an end label
    // where it fits: identity without making the reader match colours.
    names.forEach(function (name, s) {
      var colour = s < 8 ? 'var(--ln-c' + s + ')' : 'var(--ln-other)';
      var path = [];
      var last = null;
      xKeys.forEach(function (key, i) {
        var p = points[name][key];
        if (!p) return;
        path.push((path.length ? 'L' : 'M') + xAt(i) + ' ' + yAt(p.value));
        last = { x: xAt(i), y: yAt(p.value), point: p };
      });
      if (!path.length) return;

      var line = el('path', {
        class: 'ln-mark', d: path.join(' '), fill: 'none',
        'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      });
      line.style.stroke = colour;
      svg.appendChild(line);

      // A marker on every point when asked for, otherwise just the last one,
      // which is what tells the reader where the series ends.
      if (config.show_points) {
        xKeys.forEach(function (key, i) {
          var p = points[name][key];
          if (!p) return;
          var point = el('circle', { class: 'ln-mark', cx: xAt(i), cy: yAt(p.value),
            r: 3.5, 'stroke-width': 2 });
          point.style.fill = colour;
          point.style.stroke = 'var(--ln-surface)';
          svg.appendChild(point);
        });
      } else if (last) {
        var dot = el('circle', { class: 'ln-mark', cx: last.x, cy: last.y, r: 4,
          'stroke-width': 2 });
        dot.style.fill = colour;
        dot.style.stroke = 'var(--ln-surface)';
        svg.appendChild(dot);
      }
    });

    // One tooltip per x position listing every series, so the pointer never has
    // to land on a 2px line.
    xKeys.forEach(function (key, i) {
      var half = plotWidth / Math.max(1, xKeys.length - 1) / 2;
      var band = el('rect', {
        class: 'ln-hit', x: Math.max(plotLeft, xAt(i) - half), y: plotTop,
        width: Math.max(4, half * 2), height: plotHeight, tabindex: '0'
      });
      var rows = names.map(function (name) {
        var p = points[name][key];
        return [name, p ? p.text : '\u2205'];
      });
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
          class: 'ln-axis-title',
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
          class: 'ln-axis-title', x: plotLeft + plotWidth / 2,
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
