// Dumbbell: two measures per row on one shared scale, joined by a connector.
// Reads as "where is each row now, where was it, how big is the gap".
//
// Query shape: 1 dimension, 2 measures. The connector carries the gap; the two
// dots carry the two measures.
//
// Self-contained: no dependencies to declare in the manifest and nothing to
// load from a CDN at render time.
//
// Build v1.0.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('dumbbell build v1.0.0');

looker.plugins.visualizations.add({
  id: 'dumbbell',
  label: 'Dumbbell',

  options: {
    sort_by: {
      type: 'string',
      label: 'Sort rows by',
      display: 'select',
      values: [
        { 'First measure': 'first' },
        { 'Second measure': 'second' },
        { 'Size of gap': 'gap' },
        { 'Query order': 'query' }
      ],
      default: 'first',
      section: 'Data',
      order: 1
    },
    zero_baseline: {
      type: 'boolean',
      label: 'Start scale at zero',
      default: true,
      section: 'Data',
      order: 2
    },
    label_width: {
      type: 'number',
      label: 'Row label width (px)',
      default: 140,
      section: 'Style',
      order: 1
    },
    show_gap: {
      type: 'boolean',
      label: 'Label the largest gap',
      default: true,
      section: 'Style',
      order: 2
    },
    show_axis: {
      type: 'boolean',
      label: 'Show scale',
      default: true,
      section: 'Style',
      order: 3
    }
  },

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped, so the container is looked up and rebuilt on every render,
  // never cached. Built with createElement because an instance with a Trusted
  // Types policy rejects an innerHTML assignment by throwing.
  _ensureRoot: function (element) {
    var root = element.querySelector('.dmb-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    // Two series, so two categorical hues in fixed order, not cycled. Dark mode
    // gets its own steps: the light steps lose contrast on a dark surface.
    var style = document.createElement('style');
    style.textContent =
      '.dmb-root {' +
      '  --dmb-surface: #fcfcfb;' +
      '  --dmb-ink: #0b0b0b;' +
      '  --dmb-ink-2: #52514e;' +
      '  --dmb-muted: #898781;' +
      '  --dmb-grid: #e1e0d9;' +
      '  --dmb-connector: #c3c2b7;' +
      '  --dmb-hairline: rgba(11,11,11,0.10);' +
      '  --dmb-a: #2a78d6;' +
      '  --dmb-b: #eb6834;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--dmb-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '@media (prefers-color-scheme: dark) {' +
      '  .dmb-root { --dmb-surface: #1a1a19; --dmb-ink: #ffffff; --dmb-ink-2: #c3c2b7;' +
      '    --dmb-muted: #898781; --dmb-grid: #2c2c2a; --dmb-connector: #383835;' +
      '    --dmb-hairline: rgba(255,255,255,0.10);' +
      '    --dmb-a: #3987e5; --dmb-b: #d95926; }' +
      '}' +
      '.dmb-legend { display: flex; gap: 14px; align-items: center; padding: 0 1px 6px;' +
      '  font-size: 11px; color: var(--dmb-ink-2); white-space: nowrap; overflow: hidden; }' +
      '.dmb-key { display: flex; gap: 6px; align-items: center; min-width: 0; }' +
      '.dmb-key span { overflow: hidden; text-overflow: ellipsis; }' +
      '.dmb-dot { width: 10px; height: 10px; border-radius: 50%;' +
      '  box-shadow: 0 0 0 2px var(--dmb-surface); }' +
      '.dmb-plot { display: block; }' +
      '.dmb-row { cursor: pointer; }' +
      '.dmb-hit { fill: transparent; }' +
      '.dmb-row:hover .dmb-band, .dmb-row:focus-visible .dmb-band { opacity: 0.06; }' +
      '.dmb-band { fill: var(--dmb-ink); opacity: 0; transition: opacity 90ms ease-out; }' +
      '.dmb-row:focus { outline: none; }' +
      '.dmb-connector { stroke: var(--dmb-connector); stroke-width: 2; stroke-linecap: round; }' +
      '.dmb-marker { stroke: var(--dmb-surface); stroke-width: 2; }' +
      '.dmb-label { font-size: 12px; fill: var(--dmb-ink); text-anchor: end; }' +
      '.dmb-tick { font-size: 11px; fill: var(--dmb-muted); font-variant-numeric: tabular-nums; }' +
      '.dmb-grid-line { stroke: var(--dmb-grid); stroke-width: 1; }' +
      '.dmb-gap { font-size: 11px; fill: var(--dmb-ink-2); }' +
      '.dmb-note { font-size: 10px; fill: var(--dmb-muted); }' +
      '.dmb-empty { font-size: 12px; fill: var(--dmb-muted); }' +
      '.dmb-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--dmb-surface); color: var(--dmb-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--dmb-hairline); }' +
      '.dmb-tip[data-shown="1"] { opacity: 1; }' +
      '.dmb-tip-name { font-weight: 600; margin-bottom: 3px;' +
      '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.dmb-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--dmb-ink-2); align-items: center; }' +
      '.dmb-tip-row b { font-weight: 600; color: var(--dmb-ink);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.dmb-tip-key { display: flex; gap: 6px; align-items: center; }' +
      '.dmb-tip-sep { height: 1px; background: var(--dmb-hairline); margin: 5px 0 4px; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'dmb-root';
    element.appendChild(root);
    return root;
  },

  create: function (element, config) {
    this._ensureRoot(element);
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    var dims = queryResponse.fields.dimension_like || [];
    var meas = queryResponse.fields.measure_like || [];

    if (dims.length < 1 || meas.length < 2) {
      this.addError({
        title: 'Wrong query shape',
        message: 'Dumbbell needs one dimension and two measures: the two values to compare on each row.'
      });
      done();
      return;
    }

    var dimName = dims[0].name;
    var fieldA = meas[0];
    var fieldB = meas[1];

    // Looker can call updateAsync before the tile has been laid out, when the
    // element measures zero. Bailing out then leaves a blank panel with no
    // error, so measure every way available, walk up to an ancestor that has a
    // size, and retry across a few frames before falling back to a default.
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
    var attempts = 0;

    function attempt() {
      var size = measure(element);
      if ((!size.width || !size.height) && attempts < 12) {
        attempts++;
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(attempt);
        } else {
          window.setTimeout(attempt, 16);
        }
        return;
      }
      try {
        render(size.width || 600, size.height || 400);
      } catch (err) {
        // Without this the tile goes blank with nothing to read.
        vis.addError({
          title: 'Dumbbell failed to render',
          message: (err && err.message) || String(err)
        });
      }
      done();
    }

    function render(width, height) {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.style.height = height + 'px';

    var svgNS = 'http://www.w3.org/2000/svg';

    function el(name, attrs) {
      var node = document.createElementNS(svgNS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    function cellNumber(cell) {
      return cell && cell.value != null && isFinite(cell.value) ? Number(cell.value) : null;
    }

    function cellText(cell) {
      if (!cell) return '';
      if (cell.rendered != null) return String(cell.rendered);
      return cell.value != null ? String(cell.value) : '';
    }

    function drawMessage(msg) {
      var svg = el('svg', { class: 'dmb-plot', width: width, height: height });
      var text = el('text', {
        class: 'dmb-empty',
        x: width / 2,
        y: height / 2,
        'text-anchor': 'middle'
      });
      text.textContent = msg;
      svg.appendChild(text);
      root.appendChild(svg);
    }

    if (!data.length) {
      drawMessage('No results');
      return;
    }

    // A row needs both values to have a connector. Rows missing one are kept
    // and drawn as a single dot; rows missing both are counted and reported.
    var rows = [];
    var skipped = 0;
    data.forEach(function (row) {
      var a = cellNumber(row[fieldA.name]);
      var b = cellNumber(row[fieldB.name]);
      if (a === null && b === null) {
        skipped++;
        return;
      }
      rows.push({
        name: cellText(row[dimName]),
        a: a,
        b: b,
        aText: cellText(row[fieldA.name]),
        bText: cellText(row[fieldB.name]),
        gap: a !== null && b !== null ? b - a : null,
        links: (row[dimName] && row[dimName].links) || []
      });
    });

    if (!rows.length) {
      drawMessage('No values to plot');
      return;
    }

    var sortBy = config.sort_by || 'first';
    if (sortBy !== 'query') {
      rows.sort(function (x, y) {
        function key(d) {
          if (sortBy === 'second') return d.b;
          if (sortBy === 'gap') return d.gap === null ? null : Math.abs(d.gap);
          return d.a;
        }
        var kx = key(x);
        var ky = key(y);
        if (kx === null && ky === null) return 0;
        if (kx === null) return 1;
        if (ky === null) return -1;
        return ky - kx;
      });
    }

    // Text is measured with the real font, so a label is never clipped.
    var scratch = document.createElement('canvas').getContext('2d');
    var fonts = {
      label: '12px system-ui, -apple-system, "Segoe UI", sans-serif',
      tick: '11px system-ui, -apple-system, "Segoe UI", sans-serif'
    };

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    function fit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '…', font) > room) {
        cut = cut.slice(0, -1);
      }
      if (cut.length < Math.min(4, text.length)) return null;
      return cut + '…';
    }

    // Two series, so a legend is always present: identity never rests on colour
    // alone.
    var legendHeight = 0;
    var legend = null;
    if (width >= 300) {
      legend = document.createElement('div');
      legend.className = 'dmb-legend';
      [[fieldA, 'var(--dmb-a)'], [fieldB, 'var(--dmb-b)']].forEach(function (pair) {
        var key = document.createElement('div');
        key.className = 'dmb-key';
        var dot = document.createElement('div');
        dot.className = 'dmb-dot';
        dot.style.background = pair[1];
        var name = document.createElement('span');
        name.textContent = pair[0].label_short;
        key.appendChild(dot);
        key.appendChild(name);
        legend.appendChild(key);
      });
      root.appendChild(legend);
      legendHeight = legend.offsetHeight || 22;
    }

    var noteHeight = skipped ? 15 : 0;
    var axisHeight = config.show_axis ? 20 : 4;
    var plotHeight = Math.max(20, height - legendHeight - noteHeight - axisHeight);

    var labelRoom = Math.min(Number(config.label_width) || 140, Math.floor(width * 0.42));
    if (!isFinite(labelRoom) || labelRoom < 0) labelRoom = 140;

    var padRight = 12;
    var plotLeft = labelRoom + 12;
    var plotWidth = Math.max(20, width - plotLeft - padRight);

    var values = [];
    rows.forEach(function (d) {
      if (d.a !== null) values.push(d.a);
      if (d.b !== null) values.push(d.b);
    });
    var lo = Math.min.apply(null, values);
    var hi = Math.max.apply(null, values);
    if (config.zero_baseline) lo = Math.min(0, lo);
    if (hi === lo) hi = lo + 1;
    var span = hi - lo;
    // A little air so the outermost dot is not clipped by the plot edge.
    lo -= span * 0.04;
    hi += span * 0.04;

    function x(value) {
      return plotLeft + ((value - lo) / (hi - lo)) * plotWidth;
    }

    var rowHeight = plotHeight / rows.length;
    var radius = Math.max(4, Math.min(6, rowHeight * 0.22));

    var svg = el('svg', {
      class: 'dmb-plot',
      width: width,
      height: plotHeight + axisHeight + noteHeight
    });

    // Gridlines behind everything, hairline and recessive.
    var ticks = [];
    if (config.show_axis) {
      var steps = Math.max(2, Math.min(6, Math.floor(plotWidth / 90)));
      var raw = (hi - lo) / steps;
      var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
      var norm = raw / mag;
      var step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
      var first = Math.ceil(lo / step) * step;
      for (var t = first; t <= hi; t += step) {
        // Floating point leaves values like -1e-13, which print as "-0".
        ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
      }
    }

    ticks.forEach(function (value) {
      svg.appendChild(el('line', {
        class: 'dmb-grid-line',
        x1: Math.round(x(value)) + 0.5,
        x2: Math.round(x(value)) + 0.5,
        y1: 0,
        y2: plotHeight
      }));
      var tick = el('text', {
        class: 'dmb-tick',
        x: Math.round(x(value)),
        y: plotHeight + 14,
        'text-anchor': 'middle'
      });
      tick.textContent = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      svg.appendChild(tick);
    });

    // One tooltip element, moved and refilled per row.
    var tip = document.createElement('div');
    tip.className = 'dmb-tip';
    var tipName = document.createElement('div');
    tipName.className = 'dmb-tip-name';
    tip.appendChild(tipName);

    var tipValues = [[fieldA, 'var(--dmb-a)'], [fieldB, 'var(--dmb-b)']].map(function (pair) {
      var row = document.createElement('div');
      row.className = 'dmb-tip-row';
      var key = document.createElement('div');
      key.className = 'dmb-tip-key';
      var dot = document.createElement('div');
      dot.className = 'dmb-dot';
      dot.style.background = pair[1];
      var name = document.createElement('span');
      name.textContent = pair[0].label_short;
      key.appendChild(dot);
      key.appendChild(name);
      var val = document.createElement('b');
      row.appendChild(key);
      row.appendChild(val);
      tip.appendChild(row);
      return val;
    });

    var tipSep = document.createElement('div');
    tipSep.className = 'dmb-tip-sep';
    tip.appendChild(tipSep);
    var tipGapRow = document.createElement('div');
    tipGapRow.className = 'dmb-tip-row';
    var tipGapKey = document.createElement('span');
    tipGapKey.textContent = 'Gap';
    var tipGap = document.createElement('b');
    tipGapRow.appendChild(tipGapKey);
    tipGapRow.appendChild(tipGap);
    tip.appendChild(tipGapRow);

    function formatGap(d) {
      if (d.gap === null) return '—';
      var sign = d.gap > 0 ? '+' : d.gap < 0 ? '−' : '';
      return sign + Math.abs(d.gap).toLocaleString(undefined, { maximumFractionDigits: 1 });
    }

    function showTip(d, clientX, clientY) {
      tipName.textContent = d.name;
      tipValues[0].textContent = d.aText || '∅';
      tipValues[1].textContent = d.bText || '∅';
      tipGap.textContent = formatGap(d);
      tip.setAttribute('data-shown', '1');

      var host = root.getBoundingClientRect();
      var tw = tip.offsetWidth;
      var th = tip.offsetHeight;
      var px = clientX - host.left + 14;
      var py = clientY - host.top + 14;
      if (px + tw > width - 4) px = Math.max(4, clientX - host.left - tw - 14);
      if (py + th > height - 4) py = Math.max(4, clientY - host.top - th - 14);
      tip.style.left = Math.round(px) + 'px';
      tip.style.top = Math.round(py) + 'px';
    }

    function hideTip() {
      tip.removeAttribute('data-shown');
    }

    // The largest gap is the one thing worth labelling directly. A number on
    // every row would go unread.
    var widest = null;
    if (config.show_gap) {
      rows.forEach(function (d) {
        if (d.gap === null) return;
        if (!widest || Math.abs(d.gap) > Math.abs(widest.gap)) widest = d;
      });
    }

    rows.forEach(function (d, i) {
      var midY = Math.round(i * rowHeight + rowHeight / 2);

      var group = el('g', { class: 'dmb-row', tabindex: '0', role: 'img' });
      group.setAttribute('aria-label',
        d.name + '. ' + fieldA.label_short + ': ' + (d.aText || 'no value') +
        '. ' + fieldB.label_short + ': ' + (d.bText || 'no value') +
        '. Gap: ' + formatGap(d) + '.');

      // A hover band the full row height: the hit target is bigger than the dots.
      group.appendChild(el('rect', {
        class: 'dmb-band',
        x: plotLeft - 6,
        y: Math.round(midY - rowHeight / 2),
        width: plotWidth + 12,
        height: Math.max(1, Math.round(rowHeight) - 2),
        rx: 3
      }));
      group.appendChild(el('rect', {
        class: 'dmb-hit',
        x: 0,
        y: Math.round(midY - rowHeight / 2),
        width: width,
        height: Math.max(1, Math.round(rowHeight))
      }));

      var label = fit(d.name, fonts.label, labelRoom);
      if (label) {
        var text = el('text', { class: 'dmb-label', x: labelRoom, y: midY + 4 });
        text.textContent = label;
        group.appendChild(text);
      }

      if (d.a !== null && d.b !== null) {
        group.appendChild(el('line', {
          class: 'dmb-connector',
          x1: x(d.a),
          x2: x(d.b),
          y1: midY,
          y2: midY
        }));
      }

      var bothPresent = d.a !== null && d.b !== null;
      var apart = bothPresent ? Math.abs(x(d.a) - x(d.b)) : Infinity;

      if (bothPresent && apart < radius) {
        // Equal values would put one dot exactly behind the other, which reads
        // as a single series. Split one marker instead: left half is the first
        // measure, right half the second.
        var cx = (x(d.a) + x(d.b)) / 2;
        var halves = [
          ['M ' + cx + ' ' + (midY - radius) + ' A ' + radius + ' ' + radius +
            ' 0 0 0 ' + cx + ' ' + (midY + radius) + ' Z', 'var(--dmb-a)'],
          ['M ' + cx + ' ' + (midY - radius) + ' A ' + radius + ' ' + radius +
            ' 0 0 1 ' + cx + ' ' + (midY + radius) + ' Z', 'var(--dmb-b)']
        ];
        halves.forEach(function (half) {
          var wedge = el('path', { d: half[0] });
          wedge.style.fill = half[1];
          group.appendChild(wedge);
        });
        var ring = el('circle', { class: 'dmb-marker', cx: cx, cy: midY, r: radius });
        ring.style.fill = 'none';
        group.appendChild(ring);
      } else {
        [[d.a, 'var(--dmb-a)'], [d.b, 'var(--dmb-b)']].forEach(function (pair) {
          if (pair[0] === null) return;
          var dot = el('circle', {
            class: 'dmb-marker',
            cx: x(pair[0]),
            cy: midY,
            r: radius
          });
          dot.style.fill = pair[1];
          group.appendChild(dot);
        });
      }

      if (widest === d) {
        var gapLabel = formatGap(d);
        var gapWidth = textWidth(gapLabel, fonts.tick);
        var right = Math.max(x(d.a), x(d.b)) + radius + 6;
        var left = Math.min(x(d.a), x(d.b)) - radius - 6 - gapWidth;

        // Placed right of the pair, or left of it when the edge is too close.
        // Never clipped, and never drawn if neither side has room.
        var gx = null;
        if (right + gapWidth <= width - 2) gx = right;
        else if (left >= plotLeft - labelRoom) gx = left;

        if (gx !== null) {
          var gapText = el('text', { class: 'dmb-gap', x: gx, y: midY + 4 });
          gapText.textContent = gapLabel;
          group.appendChild(gapText);
        }
      }

      group.addEventListener('pointermove', function (event) {
        showTip(d, event.clientX, event.clientY);
      });
      group.addEventListener('pointerleave', hideTip);
      group.addEventListener('focus', function () {
        var box = group.getBoundingClientRect();
        showTip(d, box.left + Math.min(box.width / 2, 260), box.top + box.height / 2);
      });
      group.addEventListener('blur', hideTip);

      if (d.links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        };
        group.addEventListener('click', drill);
        group.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            drill(event);
          }
        });
      }

      svg.appendChild(group);
    });

    if (skipped) {
      var note = el('text', {
        class: 'dmb-note',
        x: 1,
        y: plotHeight + axisHeight + noteHeight - 3
      });
      note.textContent = skipped + (skipped === 1 ? ' row' : ' rows') + ' not shown: no values';
      svg.appendChild(note);
    }

    root.appendChild(svg);
    root.appendChild(tip);
    }

    attempt();
  }
});
