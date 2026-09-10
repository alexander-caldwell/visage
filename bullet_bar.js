// Bullet bar: actual against target, one row per dimension value.
// Query shape: 1 dimension, 2 measures (first = actual, second = target).
// Pure SVG, no dependencies to declare in the manifest.
//
// This is the reference example the skill points at, so it follows every house
// rule: the container is rebuilt each render, a zero-sized tile is drawn anyway,
// no innerHTML, errors surface through addError, labels wrap and shrink, every
// row answers on hover and on keyboard focus, and the theme follows the tile.
//
// Build v2.4.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('bullet_bar build v2.4.0');

looker.plugins.visualizations.add({
  id: 'bullet_bar',
  label: 'Bullet Bar',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 2 measures',

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
    bar_colour: {
      type: 'array',
      label: 'Bar Colour',
      display: 'color',
      default: ['#3b6ea5'],
      section: 'Style',
      order: 1
    },
    over_colour: {
      type: 'array',
      label: 'Colour When Over Target',
      display: 'color',
      default: ['#b5533c'],
      section: 'Style',
      order: 2
    },
    show_target: {
      type: 'boolean',
      label: 'Show Target Marker',
      default: true,
      section: 'Style',
      order: 3
    },
    show_values: {
      type: 'boolean',
      label: 'Show Values',
      default: true,
      section: 'Style',
      order: 4
    },
    label_width: {
      type: 'number',
      label: 'Label Column Width (px)',
      default: 120,
      section: 'Style',
      order: 5
    }
  },

  // Looker re-mounts a tile and hands updateAsync an element whose contents
  // have been wiped, so the container is looked up and rebuilt on every render,
  // never cached. Built with createElement because an instance with a Trusted
  // Types policy rejects an innerHTML assignment by throwing.
  _ensureRoot: function (element) {
    var root = element.querySelector('.bullet-bar-root');
    if (root) return root;

    while (element.firstChild) element.removeChild(element.firstChild);

    var style = document.createElement('style');
    style.textContent =
      '.bullet-bar-root {' +
      '  --bb-surface: #fcfcfb;' +
      '  --bb-ink: #0b0b0b;' +
      '  --bb-ink-2: #52514e;' +
      '  --bb-muted: #898781;' +
      '  --bb-track: #eef0f2;' +
      '  --bb-marker: #2f3437;' +
      '  --bb-hairline: rgba(11,11,11,0.10);' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--bb-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.bullet-bar-root.bb-dark { --bb-surface: #1a1a19; --bb-ink: #ffffff;' +
      '  --bb-ink-2: #c3c2b7; --bb-muted: #898781; --bb-track: #2c2c2a;' +
      '  --bb-marker: #e8e7e1; --bb-hairline: rgba(255,255,255,0.10); }' +
      '.bullet-bar-root text { font-size: 12px; fill: var(--bb-ink); }' +
      '.bullet-bar-root .bb-label { text-anchor: end; }' +
      '.bullet-bar-root .bb-value { text-anchor: start; fill: var(--bb-ink-2);' +
      '  font-variant-numeric: tabular-nums; }' +
      '.bullet-bar-root .bb-track { fill: var(--bb-track); }' +
      '.bullet-bar-root .bb-row { cursor: pointer; }' +
      '.bullet-bar-root .bb-hit { fill: transparent; }' +
      '.bullet-bar-root .bb-band { fill: var(--bb-ink); opacity: 0;' +
      '  transition: opacity 90ms ease-out; }' +
      '.bullet-bar-root .bb-row:hover .bb-band,' +
      '.bullet-bar-root .bb-row:focus-visible .bb-band { opacity: 0.06; }' +
      '.bullet-bar-root .bb-row:focus { outline: none; }' +
      '.bullet-bar-root .bb-target { stroke: var(--bb-marker); stroke-width: 2; }' +
      '.bullet-bar-root .bb-empty { fill: var(--bb-muted); font-style: italic; font-size: 11px; }' +
      '.bb-tip { position: absolute; z-index: 5; pointer-events: none; opacity: 0;' +
      '  transition: opacity 90ms ease-out; max-width: 260px;' +
      '  background: var(--bb-surface); color: var(--bb-ink);' +
      '  border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.45;' +
      '  box-shadow: 0 1px 2px rgba(11,11,11,0.10), 0 4px 14px rgba(11,11,11,0.14),' +
      '    inset 0 0 0 1px var(--bb-hairline); }' +
      '.bb-tip[data-shown="1"] { opacity: 1; }' +
      '.bb-tip-name { font-weight: 600; margin-bottom: 3px; overflow: hidden;' +
      '  text-overflow: ellipsis; white-space: nowrap; }' +
      '.bb-tip-row { display: flex; justify-content: space-between; gap: 14px;' +
      '  color: var(--bb-ink-2); }' +
      '.bb-tip-row b { font-weight: 600; color: var(--bb-ink);' +
      '  font-variant-numeric: tabular-nums; }';
    element.appendChild(style);

    root = document.createElement('div');
    root.className = 'bullet-bar-root';
    element.appendChild(root);
    return root;
  },

  // The tile should match the dashboard it sits in, not the viewer's operating
  // system. Looker's own theme is not exposed to a visualisation, so read the
  // background colour of the first ancestor that paints one, and fall back to
  // the OS preference only when nothing does.
  _hostIsDark: function (element) {
    var node = element;
    while (node && node !== document.documentElement) {
      var colour = window.getComputedStyle(node).backgroundColor;
      var parts = /rgba?\(([^)]+)\)/.exec(colour);
      if (parts) {
        var channels = parts[1].split(',').map(function (v) { return parseFloat(v); });
        var alpha = channels.length > 3 ? channels[3] : 1;
        if (alpha > 0.1) {
          var brightness = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
          return brightness < 0.5;
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

    if (dark) root.classList.add('bb-dark');
    else root.classList.remove('bb-dark');
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
        message: 'Bullet Bar needs one dimension and two measures: the actual value, then the target.'
      });
      done();
      return;
    }

    var dimName = dims[0].name;
    var actualField = meas[0];
    var targetField = meas[1];

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
    this._applyTheme(element, root, config);
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
          title: 'Bullet Bar failed to render',
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

    var scratch = document.createElement('canvas').getContext('2d');

    function textWidth(text, font) {
      scratch.font = font;
      return scratch.measureText(text).width;
    }

    function fit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var cut = text;
      while (cut.length > 1 && textWidth(cut + '\u2026', font) > room) cut = cut.slice(0, -1);
      if (cut.length < Math.min(4, text.length)) return null;
      return cut + '\u2026';
    }

    // Labels wrap, then shrink, and are only dropped when even the smallest
    // size cannot carry something readable. A name lost to a narrow box is
    // information gone, and Looker dimension values are usually long.
    var FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    function fontOf(size, weight) {
      return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
    }

    // Keeps the end of a value when the middle has to go: Looker names are
    // often distinguished only by their tail, "... Phase 2" against
    // "... Phase 3", so cutting the end makes two different rows read alike.
    function middleFit(text, font, room) {
      if (textWidth(text, font) <= room) return text;
      var tail = text.slice(-9);
      while (tail.length > 2 && textWidth('…' + tail, font) > room * 0.55) tail = tail.slice(1);
      var head = text.slice(0, text.length - tail.length);
      while (head.length > 1 && textWidth(head + '…' + tail, font) > room) head = head.slice(0, -1);
      if (head.length < 2) return null;
      return head + '…' + tail;
    }

    function wrapLines(text, font, room, maxRows, keepTail) {
      var words = String(text).split(/\s+/).filter(Boolean);
      if (!words.length || room < 8) return null;

      // A canvas measurement and the same string rendered as SVG text disagree
      // by a pixel or so, because the two resolve the system font stack
      // separately. Measured text sitting exactly on its limit can then render
      // a hair past the tile edge, so keep 2px in hand.
      room = room - 2;

      var lines = [];
      var current = '';
      var tooWide = false;

      words.forEach(function (word) {
        if (tooWide) return;
        var candidate = current ? current + ' ' + word : word;
        if (textWidth(candidate, font) <= room) {
          current = candidate;
          return;
        }
        // A word wider than the line is never split down the middle: breaking
        // "Liberis" into "Lib" and "eris" reads as two words. Fail here so a
        // smaller size is tried, and an ellipsis used as the last resort.
        if (textWidth(word, font) > room) {
          tooWide = true;
          return;
        }
        if (current) lines.push(current);
        current = word;
      });
      if (tooWide) return null;
      if (current) lines.push(current);
      if (!lines.length) return null;

      if (lines.length > maxRows) {
        var kept = lines.slice(0, maxRows - 1);
        var remainder = lines.slice(maxRows - 1).join(' ');
        var lastLine = keepTail
          ? middleFit(remainder, font, room)
          : null;
        if (!lastLine) {
          lastLine = remainder;
          while (lastLine.length > 1 && textWidth(lastLine + '…', font) > room) {
            lastLine = lastLine.slice(0, -1);
          }
          lastLine += '…';
        }
        lines = kept.concat([lastLine]);
      }

      var shortest = lines.reduce(function (min, line) {
        return Math.min(min, line.replace('…', '').length);
      }, Infinity);
      if (shortest < 2) return null;
      if (lines.length === 1 && lines[0].replace('…', '').length < Math.min(3, text.length)) return null;

      return lines;
    }

    // Tries each size in turn, wrapping to whatever rows the height allows.
    function layoutLabel(text, opts) {
      var sizes = opts.sizes || [12, 11, 10, 9];
      var room = opts.width;
      var maxLines = opts.maxLines || 3;

      for (var i = 0; i < sizes.length; i++) {
        var size = sizes[i];
        var font = fontOf(size, opts.weight);
        var lineHeight = Math.ceil(size * 1.22);
        var rows = Math.max(1, Math.min(maxLines, Math.floor(opts.height / lineHeight)));
        if (rows < 1) continue;
        var lines = wrapLines(text, font, room, rows, opts.keepTail);
        if (lines && lines.length * lineHeight <= opts.height) {
          return { lines: lines, size: size, font: font, lineHeight: lineHeight,
                   height: lines.length * lineHeight };
        }
      }

      // Last resort: one line at the smallest size, cut with an ellipsis.
      var smallest = sizes[sizes.length - 1];
      var smallFont = fontOf(smallest, opts.weight);
      var smallHeight = Math.ceil(smallest * 1.22);
      if (smallHeight <= opts.height) {
        var cut = opts.keepTail ? middleFit(text, smallFont, room) : null;
        if (!cut) cut = fit(text, smallFont, room);
        if (cut) {
          return { lines: [cut], size: smallest, font: smallFont,
                   lineHeight: smallHeight, height: smallHeight };
        }
      }
      return null;
    }

    // Draws a laid-out label as one or more <text> rows.
    function drawLabel(parent, layout, opts) {
      layout.lines.forEach(function (line, i) {
        var text = el('text', {
          class: opts.cls || '',
          x: opts.x,
          y: Math.round(opts.top + layout.lineHeight * (i + 0.78)),
          'text-anchor': opts.anchor || 'middle'
        });
        // An inline style beats the class's own font-size; the attribute
        // does not, which silently undid every shrink.
        text.style.fontSize = layout.size + 'px';
        if (opts.weight) text.setAttribute('font-weight', opts.weight);
        if (opts.opacity) text.setAttribute('opacity', opts.opacity);
        if (opts.fill) text.style.fill = opts.fill;
        text.textContent = line;
        parent.appendChild(text);
      });
      return layout.height;
    }


    function compact(value) {
      var abs = Math.abs(value);
      if (abs >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
      if (abs >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
      if (abs >= 1e4) return Math.round(value / 1e3) + 'k';
      if (abs >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
      if (abs >= 10) return String(Math.round(value));
      if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
      if (abs === 0) return '0';
      // Small numbers must not all round to "0": keep two significant digits.
      return Number(value.toPrecision(2)).toString();
    }

    if (!data.length) {
      var svgEmpty = el('svg', { width: width, height: height });
      var msg = el('text', {
        class: 'bb-empty', x: width / 2, y: height / 2, 'text-anchor': 'middle'
      });
      msg.textContent = 'No results';
      svgEmpty.appendChild(msg);
      root.appendChild(svgEmpty);
      return;
    }

    var labelWidth = Math.min(Number(config.label_width) || 120, Math.floor(width * 0.4));
    var valueWidth = config.show_values ? 64 : 8;
    var padTop = 8;
    var padRight = 8;
    var plotLeft = labelWidth + 10;
    var plotWidth = Math.max(10, width - plotLeft - valueWidth - padRight);

    var rowHeight = Math.max(14, (height - padTop * 2) / data.length);
    var barHeight = Math.max(6, Math.min(24, rowHeight * 0.52));

    var maxima = data.map(function (row) {
      return Math.max(cellNumber(row[actualField.name]) || 0, cellNumber(row[targetField.name]) || 0);
    });
    var scaleMax = Math.max.apply(null, maxima) || 1;

    var svg = el('svg', { width: width, height: height });

    // One tooltip element, moved and refilled per row, so every bar answers for
    // itself however narrow it is.
    var tip = document.createElement('div');
    tip.className = 'bb-tip';
    var tipName = document.createElement('div');
    tipName.className = 'bb-tip-name';
    tip.appendChild(tipName);
    var tipValues = [actualField, targetField].map(function (field) {
      var row = document.createElement('div');
      row.className = 'bb-tip-row';
      var key = document.createElement('span');
      key.textContent = field.label_short;
      var val = document.createElement('b');
      row.appendChild(key);
      row.appendChild(val);
      tip.appendChild(row);
      return val;
    });

    function showTip(name, actualText, targetText, clientX, clientY) {
      tipName.textContent = name;
      tipValues[0].textContent = actualText || '\u2205';
      tipValues[1].textContent = targetText || '\u2205';
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

    var barColour = (config.bar_colour && config.bar_colour[0]) || '#3b6ea5';
    var overColour = (config.over_colour && config.over_colour[0]) || '#b5533c';

    data.forEach(function (row, i) {
      var y = padTop + i * rowHeight;
      var midY = y + rowHeight / 2;

      var actual = cellNumber(row[actualField.name]);
      var target = cellNumber(row[targetField.name]);
      var name = cellText(row[dimName]);
      var actualText = cellText(row[actualField.name]);
      var targetText = cellText(row[targetField.name]);

      var group = el('g', { class: 'bb-row', tabindex: '0', role: 'img' });
      group.setAttribute('aria-label', name + '. ' + actualField.label_short + ': ' +
        (actualText || 'no value') + '. ' + targetField.label_short + ': ' +
        (targetText || 'no value') + '.');

      group.appendChild(el('rect', {
        class: 'bb-band',
        x: 2, y: Math.round(y + 1), width: Math.max(1, width - 4),
        height: Math.max(1, Math.round(rowHeight) - 2), rx: 3
      }));
      group.appendChild(el('rect', {
        class: 'bb-hit', x: 0, y: Math.round(y), width: width,
        height: Math.max(1, Math.round(rowHeight))
      }));

      // The row name wraps and shrinks before it is given up, keeping its tail.
      var nameLayout = layoutLabel(name, {
        width: labelWidth, height: Math.min(rowHeight - 2, 30),
        sizes: [12, 11, 10], maxLines: 2, keepTail: true
      });
      if (nameLayout) {
        drawLabel(group, nameLayout, {
          cls: 'bb-label', x: labelWidth, top: midY - nameLayout.height / 2, anchor: 'end'
        });
      }

      group.appendChild(el('rect', {
        class: 'bb-track',
        x: plotLeft, y: midY - barHeight / 2, width: plotWidth, height: barHeight, rx: 2
      }));

      if (actual === null) {
        var none = el('text', { class: 'bb-empty', x: plotLeft + 4, y: midY + 4 });
        none.textContent = 'no data';
        group.appendChild(none);
      } else {
        var barWidth = Math.max(1, (actual / scaleMax) * plotWidth);
        var over = target !== null && actual > target;

        var bar = el('rect', {
          class: 'bb-bar',
          x: plotLeft, y: midY - barHeight / 2, width: barWidth, height: barHeight,
          rx: Math.min(3, barWidth / 2, barHeight / 2)
        });
        bar.style.fill = over ? overColour : barColour;
        group.appendChild(bar);

        if (config.show_target && target !== null) {
          var tx = plotLeft + (target / scaleMax) * plotWidth;
          group.appendChild(el('line', {
            class: 'bb-target', x1: tx, x2: tx,
            y1: midY - barHeight * 0.85, y2: midY + barHeight * 0.85
          }));
        }

        if (config.show_values) {
          var valueLabel = fit(actualText, fontOf(12), valueWidth - 8);
          if (valueLabel) {
            var value = el('text', {
              class: 'bb-value', x: plotLeft + plotWidth + 6, y: midY + 4
            });
            value.textContent = valueLabel;
            group.appendChild(value);
          }
        }
      }

      group.addEventListener('pointermove', function (event) {
        showTip(name, actualText, targetText, event.clientX, event.clientY);
      });
      group.addEventListener('pointerleave', hideTip);
      group.addEventListener('focus', function () {
        var box = group.getBoundingClientRect();
        showTip(name, actualText, targetText,
          box.left + Math.min(box.width / 2, 260), box.top + box.height / 2);
      });
      group.addEventListener('blur', hideTip);

      var links = (row[dimName] && row[dimName].links) || [];
      if (links.length) {
        var drill = function (event) {
          LookerCharts.Utils.openDrillMenu({ links: links, event: event });
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

    root.appendChild(svg);
    root.appendChild(tip);
    }

    attempt();
  }
});
