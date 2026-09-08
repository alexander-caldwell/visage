// Treemap: box area from one measure, two measure values printed in the box.
// Query shape: 1 dimension, 2 measures. By default the first measure sizes the
// boxes and both measures are printed. Flip with the "Size by" option.
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
    palette: {
      type: 'array',
      label: 'Colours',
      display: 'colors',
      default: ['#3b6ea5', '#4f8fbf', '#6aa6ce', '#88bcd9', '#b5533c', '#c9765f', '#5b7f6b', '#7d9c8a'],
      section: 'Style',
      order: 1
    },
    show_labels: {
      type: 'boolean',
      label: 'Show names',
      default: true,
      section: 'Style',
      order: 2
    },
    show_secondary: {
      type: 'boolean',
      label: 'Show second measure',
      default: true,
      section: 'Style',
      order: 3
    },
    secondary_prefix: {
      type: 'boolean',
      label: 'Prefix second measure with its name',
      default: true,
      section: 'Style',
      order: 4
    },
    box_padding: {
      type: 'number',
      label: 'Gap between boxes (px)',
      default: 2,
      section: 'Style',
      order: 5
    }
  },

  create: function (element, config) {
    element.innerHTML =
      '<style>' +
      '.tmd-root { width: 100%; height: 100%; overflow: hidden; font-family: inherit; }' +
      '.tmd-root text { font-size: 11px; }' +
      '.tmd-root .tmd-box { cursor: pointer; }' +
      '.tmd-root .tmd-box:hover { opacity: 0.85; }' +
      '.tmd-root .tmd-name { font-weight: 600; }' +
      '.tmd-root .tmd-note { font-size: 10px; fill: #6c7477; font-style: italic; }' +
      '.tmd-root .tmd-empty { fill: #9aa1a4; font-style: italic; }' +
      '</style>' +
      '<div class="tmd-root"></div>';
    this._root = element.querySelector('.tmd-root');
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
    var root = this._root;
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
    root.innerHTML = '';
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
      var svg = el('svg', { width: width, height: height });
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
        otherText: cellText(row[otherField.name]),
        links: (row[dimName] && row[dimName].links) || []
      });
    });

    if (!items.length) {
      drawMessage('No positive values to size boxes by');
      return;
    }

    items.sort(function (a, b) { return b.size - a.size; });

    var noteHeight = skipped ? 14 : 0;
    var plotHeight = Math.max(10, height - noteHeight);

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

    var palette = (config.palette && config.palette.length)
      ? config.palette
      : ['#3b6ea5', '#4f8fbf', '#6aa6ce', '#88bcd9', '#b5533c', '#c9765f', '#5b7f6b', '#7d9c8a'];

    // Pale boxes need dark text. Pick per box from the fill's brightness rather
    // than always writing white.
    function textColour(fill) {
      var hex = String(fill || '').trim().replace('#', '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
      var r = parseInt(hex.slice(0, 2), 16);
      var g = parseInt(hex.slice(2, 4), 16);
      var b = parseInt(hex.slice(4, 6), 16);
      var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return brightness > 0.62 ? '#1f2426' : '#ffffff';
    }

    // Text is only drawn where the box can hold it. Each line is truncated to
    // the box width so nothing spills over a neighbour.
    var charWidth = 6.2;
    var lineHeight = 13;

    function fit(text, boxWidth, wholeOnly) {
      var room = Math.floor((boxWidth - 12) / charWidth);
      if (room < 3) return null;
      if (text.length <= room) return text;
      if (wholeOnly) return null;
      return text.slice(0, Math.max(1, room - 1)) + '…';
    }

    var svg = el('svg', { width: width, height: height });
    var inset = pad / 2;

    items.forEach(function (d, index) {
      if (!d.rect) return;

      var x = Math.round(Math.max(0, d.rect.x0 + inset));
      var y = Math.round(Math.max(0, d.rect.y0 + inset));
      var boxWidth = Math.round(Math.max(0, d.rect.x1 - inset) - x);
      var boxHeight = Math.round(Math.max(0, d.rect.y1 - inset) - y);
      if (boxWidth <= 0 || boxHeight <= 0) return;

      var fill = palette[index % palette.length];

      var group = el('g', { transform: 'translate(' + x + ',' + y + ')' });

      var rect = el('rect', {
        class: 'tmd-box',
        width: boxWidth,
        height: boxHeight,
        fill: fill
      });

      var tip = el('title', {});
      tip.textContent = d.name +
        '\n' + sizeField.label_short + ': ' + d.sizeText +
        '\n' + otherField.label_short + ': ' + d.otherText;
      rect.appendChild(tip);

      if (d.links.length) {
        rect.addEventListener('click', function (event) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        });
      }
      group.appendChild(rect);

      var lines = [];

      if (config.show_labels) {
        var name = fit(d.name, boxWidth);
        if (name) lines.push({ text: name, cls: 'tmd-name' });
      }

      var primary = fit(d.sizeText, boxWidth);
      if (primary) lines.push({ text: primary, cls: 'tmd-value' });

      if (config.show_secondary) {
        // Prefer the prefixed form, but a truncated prefix tells the reader
        // nothing, so fall back to the bare value before truncating.
        var secondFitted = null;
        if (config.secondary_prefix) {
          secondFitted = fit(otherField.label_short + ': ' + d.otherText, boxWidth, true);
        }
        if (!secondFitted) secondFitted = fit(d.otherText, boxWidth);
        if (secondFitted) lines.push({ text: secondFitted, cls: 'tmd-value' });
      }

      while (lines.length && lines.length * lineHeight + 6 > boxHeight) {
        lines.pop();
      }

      var colour = textColour(fill);
      lines.forEach(function (line, i) {
        var text = el('text', {
          class: line.cls,
          x: 6,
          y: 14 + i * lineHeight,
          fill: colour
        });
        text.textContent = line.text;
        group.appendChild(text);
      });

      svg.appendChild(group);
    });

    if (skipped) {
      var note = el('text', { class: 'tmd-note', x: 2, y: height - 3 });
      note.textContent = skipped + (skipped === 1 ? ' row' : ' rows') +
        ' not shown: no positive ' + sizeField.label_short;
      svg.appendChild(note);
    }

    root.appendChild(svg);
    }

    attempt();
  }
});
