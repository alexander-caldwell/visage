// Grouped Column: one group per dimension value, one column per measure.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.3.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('grouped_column build v1.3.0');

looker.plugins.visualizations.add({
  id: 'grouped_column',
  label: 'Grouped Column',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 1 or more measures',
  good_for: [
    'Two or three measures compared across a short list of categories',
    'Actual against target, or this year against last, side by side',
    'Any comparison where exact values matter more than shape',
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
    show_values: {
      type: 'boolean',
      label: 'Show Value on Each Column',
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
    var root = element.querySelector('.cl-root');
    if (root) return root;
    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.cl-root {' +
      '  --cl-surface: #fcfcfb; --cl-ink: #0b0b0b; --cl-ink-2: #52514e;' +
      '  --cl-muted: #898781; --cl-grid: #e1e0d9; --cl-axis: #c3c2b7;' +
      '  --cl-hairline: rgba(11,11,11,0.10);' +
      '  --cl-c0: #2a78d6; --cl-c1: #eb6834; --cl-c2: #1baf7a;' +
      '  --cl-c3: #eda100; --cl-c4: #e87ba4; --cl-c5: #008300;' +
      '  --cl-c6: #4a3aa7; --cl-c7: #e34948; --cl-other: #b9b7ae;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--cl-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.cl-root.cl-dark { --cl-surface: #1a1a19; --cl-ink: #ffffff;' +
      '  --cl-ink-2: #c3c2b7; --cl-muted: #898781; --cl-grid: #2c2c2a;' +
      '  --cl-axis: #383835; --cl-hairline: rgba(255,255,255,0.10);' +
      '  --cl-c0: #3987e5; --cl-c1: #d95926; --cl-c2: #199e70;' +
      '  --cl-c3: #c98500; --cl-c4: #d55181; --cl-c5: #008300;' +
      '  --cl-c6: #9085e9; --cl-c7: #e66767; --cl-other: #4a4a46; }' +
      '.cl-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center;' +
      '  padding: 2px 6px 9px; font-size: 11px; color: var(--cl-ink-2); overflow: hidden; }' +
      '.cl-key { display: flex; gap: 6px; align-items: center; min-width: 0; max-width: 220px; }' +
      '.cl-key span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.cl-swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }' +
      '.cl-plot { display: block; }' +
      '.cl-grid-line { stroke: var(--cl-grid); stroke-width: 1; }' +
      '.cl-axis-line { stroke: var(--cl-axis); stroke-width: 1; }' +
      '.cl-tick { font-size: 11px; fill: var(--cl-muted);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.cl-axis-title { font-size: 11px; fill: var(--cl-muted); }' +
      '.cl-label { font-size: 11px; fill: var(--cl-ink); }' +
      '.cl-empty { font-size: 12px; fill: var(--cl-muted); }' +
      '.cl-mark { transition: filter 90ms ease-out; }' +
      '.cl-hit { fill: transparent; cursor: pointer; }' +
      '.cl-hit:hover ~ .cl-mark, .cl-hit:focus-visible ~ .cl-mark { filter: brightness(1.09); }' +
      '.cl-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--cl-surface); color: var(--cl-ink); border-radius: 6px;' +
      '  padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--cl-hairline); }' +
      '.cl-tip[data-shown="1"] { opacity: 1; }' +
      '.cl-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.cl-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--cl-ink-2); }' +
      '.cl-tip-row b { font-weight: 600; color: var(--cl-ink);' +
      '  font-variant-numeric: tabular-nums; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'cl-root';
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
    if (dark) root.classList.add('cl-dark');
    else root.classList.remove('cl-dark');
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
        message: 'A grouped column needs one dimension and at least one measure. Each measure becomes a column within the group.'
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
          title: 'Grouped Column failed to render',
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
      var svg = el('svg', { class: 'cl-plot', width: width, height: height });
      var text = el('text', {
        class: 'cl-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    // One tooltip, moved and refilled per mark.
    var tip = document.createElement('div');
    tip.className = 'cl-tip';
    var tipName = document.createElement('div');
    tipName.className = 'cl-tip-name';
    tip.appendChild(tipName);
    var tipBody = document.createElement('div');
    tip.appendChild(tipBody);

    function showTip(title, rows, clientX, clientY) {
      tipName.textContent = title;
      while (tipBody.firstChild) tipBody.removeChild(tipBody.firstChild);
      rows.forEach(function (row) {
        var line = document.createElement('div');
        line.className = 'cl-tip-row';
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

    // One group per dimension value, one column per measure. Colour follows the
    // measure, in the order the query gives them.
    var xField = dims[0];
    var series = meas.slice(0, 8);

    var groups = [];
    var skipped = 0;
    data.forEach(function (row) {
      var values = series.map(function (field) {
        return { field: field, value: cellNumber(row[field.name]), text: cellText(row[field.name]) };
      });
      if (values.every(function (v) { return v.value === null; })) { skipped++; return; }
      groups.push({
        name: cellText(row[xField.name]),
        values: values,
        links: (row[xField.name] && row[xField.name].links) || []
      });
    });

    if (!groups.length) {
      drawMessage('No values to plot');
      return;
    }

    var peak = 0;
    groups.forEach(function (g) {
      g.values.forEach(function (v) { if (v.value !== null) peak = Math.max(peak, v.value); });
    });

    var legendHeight = 0;
    if (series.length > 1 && width >= 260) {
      var legend = document.createElement('div');
      legend.className = 'cl-legend';
      series.forEach(function (field, i) {
        var key = document.createElement('div');
        key.className = 'cl-key';
        var swatch = document.createElement('div');
        swatch.className = 'cl-swatch';
        swatch.style.borderRadius = '2px';
        swatch.style.background = 'var(--cl-c' + i + ')';
        var text = document.createElement('span');
        text.textContent = field.label_short;
        key.appendChild(swatch);
        key.appendChild(text);
        legend.appendChild(key);
      });
      root.appendChild(legend);
      legendHeight = legend.offsetHeight || 20;
    }

    var yTitle = axisTitle('y_axis_label', series.length === 1 ? series[0].label_short : 'Value');
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

    var svg = el('svg', { class: 'cl-plot', width: width,
      height: plotHeight + plotTop + tickBand + xBand });

    ticks.forEach(function (value) {
      var y = Math.round(plotTop + plotHeight - (value / yMax) * plotHeight) + 0.5;
      svg.appendChild(el('line', {
        class: 'cl-grid-line', x1: plotLeft, x2: plotLeft + plotWidth, y1: y, y2: y
      }));
      var label = el('text', {
        class: 'cl-tick', x: plotLeft - 6,
        y: Math.min(Math.max(y + 4, plotTop + 9), plotTop + plotHeight), 'text-anchor': 'end'
      });
      label.textContent = compact(value);
      svg.appendChild(label);
    });

    // Columns are capped at 24px and never fill their slot: the leftover is air.
    var slot = plotWidth / groups.length;
    var innerGap = 2;
    var barWidth = Math.min(24, Math.max(2,
      (slot * 0.7 - innerGap * (series.length - 1)) / series.length));
    var groupWidth = barWidth * series.length + innerGap * (series.length - 1);

    groups.forEach(function (group, gi) {
      var centre = plotLeft + slot * (gi + 0.5);
      var startX = centre - groupWidth / 2;

      group.values.forEach(function (v, si) {
        if (v.value === null) return;
        var barHeight = Math.max(1, (v.value / yMax) * plotHeight);
        var x = startX + si * (barWidth + innerGap);
        var y = plotTop + plotHeight - barHeight;

        // 4px rounded top, square at the baseline.
        var r = Math.min(4, barWidth / 2, barHeight);
        var d = 'M' + x + ' ' + (y + barHeight) +
          ' L' + x + ' ' + (y + r) +
          ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
          ' L' + (x + barWidth - r) + ' ' + y +
          ' Q' + (x + barWidth) + ' ' + y + ' ' + (x + barWidth) + ' ' + (y + r) +
          ' L' + (x + barWidth) + ' ' + (y + barHeight) + ' Z';
        var bar = el('path', { class: 'cl-mark', d: d });
        bar.style.fill = 'var(--cl-c' + si + ')';
        svg.appendChild(bar);

        // The value on the cap, only where it fits the column's own width and
        // there is room above the bar. Otherwise the tooltip carries it.
        if (config.show_values) {
          var valueLabel = fit(v.text || compact(v.value), fontOf(10), barWidth + 6);
          if (valueLabel && y - plotTop >= 12) {
            var cap = el('text', {
              class: 'cl-tick', x: x + barWidth / 2, y: y - 4, 'text-anchor': 'middle'
            });
            cap.style.fontSize = '10px';
            cap.style.fill = 'var(--cl-ink-2)';
            cap.textContent = valueLabel;
            svg.appendChild(cap);
          }
        }
      });

      var hit = el('rect', {
        class: 'cl-hit', x: plotLeft + slot * gi, y: plotTop,
        width: slot, height: plotHeight, tabindex: '0'
      });
      var rows = group.values.map(function (v) {
        return [v.field.label_short, v.text || '\u2205'];
      });
      hit.addEventListener('pointermove', function (event) {
        showTip(group.name, rows, event.clientX, event.clientY);
      });
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('focus', function () {
        var box = hit.getBoundingClientRect();
        showTip(group.name, rows, box.left + box.width / 2, box.top + box.height / 2);
      });
      hit.addEventListener('blur', hideTip);
      if (group.links.length) {
        hit.addEventListener('click', function (event) {
          LookerCharts.Utils.openDrillMenu({ links: group.links, event: event });
        });
      }
      svg.appendChild(hit);

      var label = fit(group.name, tickFont, slot - 4);
      if (label) {
        var text = el('text', {
          class: 'cl-tick', x: centre, y: plotTop + plotHeight + 14, 'text-anchor': 'middle'
        });
        text.style.fill = 'var(--cl-ink-2)';
        text.textContent = label;
        svg.appendChild(text);
      }
    });

    svg.appendChild(el('line', {
      class: 'cl-axis-line', x1: plotLeft, x2: plotLeft + plotWidth,
      y1: plotTop + plotHeight + 0.5, y2: plotTop + plotHeight + 0.5
    }));

    if (yTitle) {
      var yLaid = fit(yTitle, fontOf(11), plotHeight);
      if (yLaid) {
        var yLabel = el('text', {
          class: 'cl-axis-title',
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
          class: 'cl-axis-title', x: plotLeft + plotWidth / 2,
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
