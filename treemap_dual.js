// Treemap: box area from one measure, two measure values printed in the box,
// box colour from the second measure.
//
// Query shape: 1 dimension, 2 measures. The first measure sizes the boxes and
// shades them; flip which one sizes with the "Size by" option.
//
// Self-contained: the squarify layout is inlined, so there are no dependencies
// to declare in the manifest and nothing to load from a CDN at render time.

looker.plugins.visualizations.add({
  id: 'treemap_dual',
  label: 'Treemap (Dual Value)',

  options: {
    size_by: {
      type: 'string',
      label: 'Size by',
      display: 'select',
      values: [{ 'First measure': 'first' }, { 'Second measure': 'second' }],
      default: 'first',
      section: 'Data',
      order: 1
    },
    colour_by: {
      type: 'string',
      label: 'Colour by',
      display: 'select',
      values: [{ 'Second measure': 'measure' }, { 'One flat colour': 'flat' }],
      default: 'measure',
      section: 'Style',
      order: 1
    },
    show_legend: {
      type: 'boolean',
      label: 'Show caption',
      default: true,
      section: 'Style',
      order: 2
    },
    show_labels: {
      type: 'boolean',
      label: 'Show names',
      default: true,
      section: 'Style',
      order: 3
    },
    show_secondary: {
      type: 'boolean',
      label: 'Show second measure',
      default: true,
      section: 'Style',
      order: 4
    },
    secondary_prefix: {
      type: 'boolean',
      label: 'Prefix second measure with its name',
      default: false,
      section: 'Style',
      order: 5
    },
    box_padding: {
      type: 'number',
      label: 'Gap between boxes (px)',
      default: 2,
      section: 'Style',
      order: 6
    }
  },

  // Sequential single hue, light to dark, in seven steps. Colour carries
  // magnitude, never rank, so filtering a row out never repaints the rows that
  // remain. The step values themselves live in the stylesheet, per theme.
  _steps: 7,

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped. Caching the container from create() and drawing into it
  // then puts the chart in a detached node: no error, empty tile. So rebuild
  // the container whenever it is missing, and never cache it across renders.
  //
  // Built with createElement rather than innerHTML: a Looker instance with a
  // Trusted Types policy can reject an innerHTML assignment outright, which
  // would throw here and leave the tile blank.
  _ensureRoot: function (element) {
    var root = element.querySelector('.tmd-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    // Fills are CSS variables, not attributes, so the dark palette swaps with
    // the viewer's theme without a redraw. The dark steps are their own scale:
    // the light scale's darkest blues sit too close to a dark surface to read.
    // Each step's text colour is the higher-contrast of ink or white, measured,
    // and every pairing clears 5:1.
    style.textContent =
      '.tmd-root {' +
      '  --tmd-surface: #fcfcfb;' +
      '  --tmd-ink: #0b0b0b;' +
      '  --tmd-ink-2: #52514e;' +
      '  --tmd-muted: #898781;' +
      '  --tmd-hairline: rgba(11,11,11,0.10);' +
      '  --tmd-s0: #cde2fb; --tmd-i0: #0b0b0b;' +
      '  --tmd-s1: #9ec5f4; --tmd-i1: #0b0b0b;' +
      '  --tmd-s2: #6da7ec; --tmd-i2: #0b0b0b;' +
      '  --tmd-s3: #3987e5; --tmd-i3: #0b0b0b;' +
      '  --tmd-s4: #256abf; --tmd-i4: #ffffff;' +
      '  --tmd-s5: #184f95; --tmd-i5: #ffffff;' +
      '  --tmd-s6: #0d366b; --tmd-i6: #ffffff;' +
      '  --tmd-flat: #2a78d6; --tmd-flat-ink: #ffffff;' +
      '  --tmd-null: #e6e5df; --tmd-null-ink: #0b0b0b;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--tmd-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '@media (prefers-color-scheme: dark) {' +
      '  .tmd-root { --tmd-surface: #1a1a19; --tmd-ink: #ffffff; --tmd-ink-2: #c3c2b7;' +
      '    --tmd-muted: #898781; --tmd-hairline: rgba(255,255,255,0.10);' +
      '    --tmd-s0: #b7d3f6; --tmd-i0: #0b0b0b;' +
      '    --tmd-s1: #9ec5f4; --tmd-i1: #0b0b0b;' +
      '    --tmd-s2: #86b6ef; --tmd-i2: #0b0b0b;' +
      '    --tmd-s3: #5598e7; --tmd-i3: #0b0b0b;' +
      '    --tmd-s4: #3987e5; --tmd-i4: #0b0b0b;' +
      '    --tmd-s5: #256abf; --tmd-i5: #ffffff;' +
      '    --tmd-s6: #184f95; --tmd-i6: #ffffff;' +
      '    --tmd-flat: #3987e5; --tmd-flat-ink: #0b0b0b;' +
      '    --tmd-null: #3a3a37; --tmd-null-ink: #ffffff; }' +
      '}' +
      '.tmd-caption { display: flex; gap: 14px; align-items: center; padding: 0 1px 6px;' +
      '  font-size: 11px; color: var(--tmd-muted); white-space: nowrap; overflow: hidden; }' +
      '.tmd-caption-item { display: flex; gap: 6px; align-items: center; min-width: 0; }' +
      '.tmd-caption-item span { overflow: hidden; text-overflow: ellipsis; }' +
      '.tmd-ramp { display: flex; height: 8px; width: 64px; border-radius: 2px; overflow: hidden;' +
      '  box-shadow: inset 0 0 0 1px var(--tmd-hairline); }' +
      '.tmd-ramp i { flex: 1 1 auto; }' +
      '.tmd-swatch { width: 10px; height: 10px; border-radius: 2px;' +
      '  box-shadow: inset 0 0 0 1px var(--tmd-hairline); }' +
      '.tmd-plot { display: block; }' +
      '.tmd-box { cursor: pointer; transition: filter 90ms ease-out; }' +
      '.tmd-cell:hover .tmd-box, .tmd-cell:focus-visible .tmd-box { filter: brightness(1.09); }' +
      '.tmd-cell:focus { outline: none; }' +
      '.tmd-cell:focus-visible .tmd-box { stroke: var(--tmd-ink); stroke-width: 2px; }' +
      '.tmd-name { font-size: 12px; font-weight: 600; }' +
      '.tmd-value { font-size: 12px; }' +
      '.tmd-second { font-size: 11px; }' +
      '.tmd-note { font-size: 10px; fill: var(--tmd-muted); }' +
      '.tmd-empty { font-size: 12px; fill: var(--tmd-muted); }' +
      '.tmd-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 240px;' +
      '  background: var(--tmd-surface); color: var(--tmd-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14);' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--tmd-hairline); }' +
      '.tmd-tip[data-shown="1"] { opacity: 1; }' +
      '.tmd-tip-name { font-weight: 600; margin-bottom: 3px;' +
      '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.tmd-tip-row { display: flex; justify-content: space-between; gap: 12px;' +
      '  color: var(--tmd-ink-2); }' +
      '.tmd-tip-row b { font-weight: 600; color: var(--tmd-ink); }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'tmd-root';
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
        message: 'Treemap (Dual Value) needs one dimension and two measures: the one that sizes the boxes, and a second one shown alongside it.'
      });
      done();
      return;
    }

    var dimName = dims[0].name;
    var sizeField = config.size_by === 'second' ? meas[1] : meas[0];
    var otherField = config.size_by === 'second' ? meas[0] : meas[1];

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
      // Still unmeasurable: draw at a usable default rather than nothing.
      try {
        render(size.width || 600, size.height || 400);
      } catch (err) {
        // Without this the tile goes blank with nothing to read.
        vis.addError({
          title: 'Treemap failed to render',
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
      var svg = el('svg', { class: 'tmd-plot', width: width, height: height });
      var text = el('text', {
        class: 'tmd-empty',
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

    // A box can only be drawn for a positive size. Nulls, zeroes and negatives
    // are counted and reported rather than silently dropped.
    var items = [];
    var skipped = 0;
    data.forEach(function (row) {
      var size = cellNumber(row[sizeField.name]);
      if (size === null || size <= 0) {
        skipped++;
        return;
      }
      items.push({
        name: cellText(row[dimName]),
        size: size,
        sizeText: cellText(row[sizeField.name]),
        other: cellNumber(row[otherField.name]),
        otherText: cellText(row[otherField.name]),
        links: (row[dimName] && row[dimName].links) || []
      });
    });

    if (!items.length) {
      drawMessage('No positive values to size boxes by');
      return;
    }

    items.sort(function (a, b) { return b.size - a.size; });

    // Text is measured, not estimated, so a label is never clipped.
    var scratch = document.createElement('canvas').getContext('2d');
    var fonts = {
      name: '600 12px system-ui, -apple-system, "Segoe UI", sans-serif',
      value: '12px system-ui, -apple-system, "Segoe UI", sans-serif',
      second: '11px system-ui, -apple-system, "Segoe UI", sans-serif'
    };

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    // A stub like "C…" tells the reader nothing, so a label that cannot keep at
    // least four of its own characters is dropped rather than truncated. The
    // value stays reachable in the tooltip.
    function fit(text, font, room, wholeOnly) {
      if (textWidth(text, font) <= room) return text;
      if (wholeOnly) return null;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '…', font) > room) {
        cut = cut.slice(0, -1);
      }
      if (cut.length < Math.min(4, text.length)) return null;
      var out = cut + '…';
      return textWidth(out, font) <= room ? out : null;
    }

    var colourByMeasure = config.colour_by !== 'flat';
    var steps = vis._steps;
    var others = items.map(function (d) { return d.other; })
      .filter(function (v) { return v !== null; });
    var otherMin = others.length ? Math.min.apply(null, others) : null;
    var otherMax = others.length ? Math.max.apply(null, others) : null;

    // Returns the pair of tokens for a row: the fill, and the text colour that
    // reads on it. Labels sit inside a coloured fill, which is the one place
    // text takes its colour from the data.
    function tokensFor(d) {
      if (!colourByMeasure) return { fill: 'var(--tmd-flat)', ink: 'var(--tmd-flat-ink)' };
      if (d.other === null) return { fill: 'var(--tmd-null)', ink: 'var(--tmd-null-ink)' };

      var step;
      if (otherMax === otherMin) {
        step = Math.floor(steps / 2);
      } else {
        var t = (d.other - otherMin) / (otherMax - otherMin);
        step = Math.min(steps - 1, Math.max(0, Math.round(t * (steps - 1))));
      }
      return { fill: 'var(--tmd-s' + step + ')', ink: 'var(--tmd-i' + step + ')' };
    }

    // The caption names what area and colour mean, so the boxes do not have to
    // repeat a measure name in every label.
    var captionHeight = 0;
    var caption = null;
    // Below this width the caption ellipsises into meaningless stubs, so it is
    // dropped rather than shown broken.
    if (config.show_legend && width >= 420 && height >= 120) {
      caption = document.createElement('div');
      caption.className = 'tmd-caption';

      var areaItem = document.createElement('div');
      areaItem.className = 'tmd-caption-item';
      var areaLabel = document.createElement('span');
      areaLabel.textContent = 'Area: ' + sizeField.label_short;
      areaItem.appendChild(areaLabel);
      caption.appendChild(areaItem);

      if (colourByMeasure && others.length) {
        var colourItem = document.createElement('div');
        colourItem.className = 'tmd-caption-item';
        var low = document.createElement('span');
        low.textContent = 'Colour: ' + otherField.label_short;
        var strip = document.createElement('div');
        strip.className = 'tmd-ramp';
        for (var step = 0; step < steps; step++) {
          var seg = document.createElement('i');
          seg.style.background = 'var(--tmd-s' + step + ')';
          strip.appendChild(seg);
        }
        var scale = document.createElement('span');
        var lowText = items.filter(function (d) { return d.other === otherMin; })[0];
        var highText = items.filter(function (d) { return d.other === otherMax; })[0];
        scale.textContent = (lowText ? lowText.otherText : '') + ' to ' +
          (highText ? highText.otherText : '');
        colourItem.appendChild(low);
        colourItem.appendChild(strip);
        colourItem.appendChild(scale);
        caption.appendChild(colourItem);

        // Grey boxes are not part of the ramp, so say what they are.
        if (others.length < items.length) {
          var nullItem = document.createElement('div');
          nullItem.className = 'tmd-caption-item';
          var nullSwatch = document.createElement('div');
          nullSwatch.className = 'tmd-swatch';
          nullSwatch.style.background = 'var(--tmd-null)';
          var nullLabel = document.createElement('span');
          nullLabel.textContent = 'no value';
          nullItem.appendChild(nullSwatch);
          nullItem.appendChild(nullLabel);
          caption.appendChild(nullItem);
        }
      }

      root.appendChild(caption);
      captionHeight = caption.offsetHeight || 22;
    }

    var noteHeight = skipped ? 15 : 0;
    var plotHeight = Math.max(10, height - captionHeight - noteHeight);

    var pad = Number(config.box_padding);
    if (!isFinite(pad) || pad < 0) pad = 2;

    // Squarify (Bruls, Huizing and van Wijk). Boxes are added to a row until
    // adding the next one would make the row's worst aspect ratio worse, then
    // the row is placed along the shorter side of the remaining space.
    var total = items.reduce(function (sum, d) { return sum + d.size; }, 0);
    var plotArea = width * plotHeight;
    items.forEach(function (d) { d.area = (d.size / total) * plotArea; });

    function worstRatio(row, rowSum, side) {
      var max = -Infinity;
      var min = Infinity;
      row.forEach(function (d) {
        if (d.area > max) max = d.area;
        if (d.area < min) min = d.area;
      });
      var s2 = rowSum * rowSum;
      var l2 = side * side;
      if (!s2 || !l2 || !min) return Infinity;
      return Math.max((l2 * max) / s2, s2 / (l2 * min));
    }

    function place(queue, x0, y0, x1, y1) {
      if (!queue.length) return;

      var w = x1 - x0;
      var h = y1 - y0;
      if (w <= 0 || h <= 0) return;

      var side = Math.min(w, h);
      var row = [];
      var rowSum = 0;
      var best = Infinity;
      var i = 0;

      while (i < queue.length) {
        var candidate = row.concat([queue[i]]);
        var candidateSum = rowSum + queue[i].area;
        var ratio = worstRatio(candidate, candidateSum, side);
        if (!row.length || ratio <= best) {
          row = candidate;
          rowSum = candidateSum;
          best = ratio;
          i++;
        } else {
          break;
        }
      }

      if (w >= h) {
        var rowWidth = rowSum / h;
        var y = y0;
        row.forEach(function (d) {
          var boxHeight = d.area / rowWidth;
          d.rect = { x0: x0, y0: y, x1: x0 + rowWidth, y1: y + boxHeight };
          y += boxHeight;
        });
        place(queue.slice(row.length), x0 + rowWidth, y0, x1, y1);
      } else {
        var rowHeight = rowSum / w;
        var x = x0;
        row.forEach(function (d) {
          var boxWidth = d.area / rowHeight;
          d.rect = { x0: x, y0: y0, x1: x + boxWidth, y1: y0 + rowHeight };
          x += boxWidth;
        });
        place(queue.slice(row.length), x0, y0 + rowHeight, x1, y1);
      }
    }

    place(items.slice(), 0, 0, width, plotHeight);

    var svg = el('svg', {
      class: 'tmd-plot',
      width: width,
      height: plotHeight + noteHeight
    });

    // One tooltip element, moved and refilled per box.
    var tip = document.createElement('div');
    tip.className = 'tmd-tip';
    var tipName = document.createElement('div');
    tipName.className = 'tmd-tip-name';
    tip.appendChild(tipName);
    var tipRows = [sizeField, otherField].map(function (field) {
      var row = document.createElement('div');
      row.className = 'tmd-tip-row';
      var key = document.createElement('span');
      key.textContent = field.label_short;
      var val = document.createElement('b');
      row.appendChild(key);
      row.appendChild(val);
      tip.appendChild(row);
      return val;
    });

    function showTip(d, clientX, clientY) {
      tipName.textContent = d.name;
      tipRows[0].textContent = d.sizeText || '∅';
      tipRows[1].textContent = d.otherText || '∅';
      tip.setAttribute('data-shown', '1');

      var host = root.getBoundingClientRect();
      var tw = tip.offsetWidth;
      var th = tip.offsetHeight;
      var x = clientX - host.left + 12;
      var y = clientY - host.top + 12;
      if (x + tw > width - 4) x = Math.max(4, clientX - host.left - tw - 12);
      if (y + th > height - 4) y = Math.max(4, clientY - host.top - th - 12);
      tip.style.left = Math.round(x) + 'px';
      tip.style.top = Math.round(y) + 'px';
    }

    function hideTip() {
      tip.removeAttribute('data-shown');
    }

    var inset = pad / 2;
    var lineHeight = 15;

    items.forEach(function (d) {
      if (!d.rect) return;

      var x = Math.round(Math.max(0, d.rect.x0 + inset));
      var y = Math.round(Math.max(0, d.rect.y0 + inset));
      var boxWidth = Math.round(Math.max(0, d.rect.x1 - inset) - x);
      var boxHeight = Math.round(Math.max(0, d.rect.y1 - inset) - y);
      if (boxWidth <= 0 || boxHeight <= 0) return;

      var tokens = tokensFor(d);

      var group = el('g', {
        class: 'tmd-cell',
        transform: 'translate(' + x + ',' + y + ')',
        tabindex: '0',
        role: 'img'
      });
      var described = d.name + '. ' + sizeField.label_short + ': ' + d.sizeText +
        '. ' + otherField.label_short + ': ' + d.otherText + '.';
      group.setAttribute('aria-label', described);

      var rect = el('rect', {
        class: 'tmd-box',
        width: boxWidth,
        height: boxHeight,
        rx: Math.min(3, boxWidth / 2, boxHeight / 2)
      });
      rect.style.fill = tokens.fill;
      group.appendChild(rect);

      group.addEventListener('pointermove', function (event) {
        showTip(d, event.clientX, event.clientY);
      });
      group.addEventListener('pointerleave', hideTip);
      group.addEventListener('focus', function () {
        var box = rect.getBoundingClientRect();
        showTip(d, box.left + box.width / 2, box.top + box.height / 2);
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

      var padX = 8;
      var room = boxWidth - padX * 2;
      var lines = [];
      var named = true;

      if (config.show_labels) {
        var name = fit(d.name, fonts.name, room);
        // A bare number in an unnamed box says nothing, so when the name will
        // not fit the box carries no text at all and the tooltip does the work.
        named = !!name;
        if (name) lines.push({ text: name, cls: 'tmd-name', font: fonts.name });
      }

      var primary = named ? fit(d.sizeText, fonts.value, room) : null;
      if (primary) lines.push({ text: primary, cls: 'tmd-value', font: fonts.value });

      if (named && config.show_secondary) {
        // Prefer the prefixed form, but a truncated prefix tells the reader
        // nothing, so fall back to the bare value before truncating.
        var second = null;
        if (config.secondary_prefix) {
          second = fit(otherField.label_short + ': ' + d.otherText, fonts.second, room, true);
        }
        if (!second) second = fit(d.otherText, fonts.second, room);
        if (second) lines.push({ text: second, cls: 'tmd-second', font: fonts.second, dim: true });
      }

      while (lines.length && lines.length * lineHeight + 9 > boxHeight) {
        lines.pop();
      }

      lines.forEach(function (line, i) {
        var text = el('text', {
          class: line.cls,
          x: padX,
          y: 17 + i * lineHeight
        });
        text.style.fill = tokens.ink;
        if (line.dim) text.setAttribute('opacity', '0.78');
        text.textContent = line.text;
        group.appendChild(text);
      });

      svg.appendChild(group);
    });

    if (skipped) {
      var note = el('text', {
        class: 'tmd-note',
        x: 1,
        y: plotHeight + noteHeight - 4
      });
      note.textContent = skipped + (skipped === 1 ? ' row' : ' rows') +
        ' not shown: no positive ' + sizeField.label_short;
      svg.appendChild(note);
    }

    root.appendChild(svg);
    root.appendChild(tip);
    }

    attempt();
  }
});
