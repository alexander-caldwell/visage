// Treemap: box area from one measure, two measure values printed in the box,
// box colour from the second measure.
//
// Query shape: 1 dimension, 2 measures. The first measure sizes the boxes and
// shades them; flip which one sizes with the "Size by" option.
//
// Self-contained: the squarify layout is inlined, so there are no dependencies
// to declare in the manifest and nothing to load from a CDN at render time.
//
// Build v1.9.0. The version is logged once on load, so the browser console says
// which build a Looker instance is actually running.

if (window.console && console.log) console.log('treemap_dual build v1.9.0');

looker.plugins.visualizations.add({
  id: 'treemap_dual',
  label: 'Treemap (Dual Value)',

  // Declared for the catalogue and the gallery. Looker ignores keys it
  // does not know, so this costs nothing at render time.
  data_shape: '1 dimension + 1 measure (a second measure adds colour)',
  good_for: [
    'Share of a total across many categories, where a pie would be unreadable',
    'Two measures at once: size for the amount, colour for a rate',
    'Spotting the few categories that account for most of the total'
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
    size_by: {
      type: 'string',
      label: 'Size By',
      display: 'select',
      values: [{ 'First Measure': 'first' }, { 'Second Measure': 'second' }],
      default: 'first',
      section: 'Data',
      order: 1
    },
    colour_by: {
      type: 'string',
      label: 'Colour By',
      display: 'select',
      values: [{ 'Second Measure': 'measure' }, { 'One Flat Colour': 'flat' }],
      default: 'measure',
      section: 'Style',
      order: 1
    },
    show_legend: {
      type: 'boolean',
      label: 'Show Caption',
      default: true,
      section: 'Style',
      order: 2
    },
    show_labels: {
      type: 'boolean',
      label: 'Show Names',
      default: true,
      section: 'Style',
      order: 3
    },
    show_secondary: {
      type: 'boolean',
      label: 'Show Second Measure',
      default: true,
      section: 'Style',
      order: 4
    },
    secondary_prefix: {
      type: 'boolean',
      label: 'Prefix Second Measure With Its Name',
      default: false,
      section: 'Style',
      order: 5
    },
    box_padding: {
      type: 'number',
      label: 'Gap Between Boxes (px)',
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
      '  --tmd-surface: #f7f7fa;' +
      '  --tmd-ink: #151d2d;' +
      '  --tmd-ink-2: #475569;' +
      '  --tmd-muted: #94a3b8;' +
      '  --tmd-hairline: rgba(11,11,11,0.10);' +
      '  --tmd-s0: #95acff; --tmd-i0: #151d2d;' +
      '  --tmd-s1: #788cff; --tmd-i1: #151d2d;' +
      '  --tmd-s2: #606dff; --tmd-i2: #151d2d;' +
      '  --tmd-s3: #4c52f4; --tmd-i3: #ffffff;' +
      '  --tmd-s4: #3b3dcb; --tmd-i4: #ffffff;' +
      '  --tmd-s5: #2c2e9b; --tmd-i5: #ffffff;' +
      '  --tmd-s6: #1e2368; --tmd-i6: #ffffff;' +
      '  --tmd-flat: #525aff; --tmd-flat-ink: #ffffff;' +
      '  --tmd-null: #e8e9f2; --tmd-null-ink: #151d2d;' +
      '  position: relative; width: 100%; height: 100%; overflow: hidden;' +
      '  background: var(--tmd-surface);' +
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;' +
      '  -webkit-font-smoothing: antialiased;' +
      '}' +
      '.tmd-root.tmd-dark { --tmd-surface: #12121c; --tmd-ink: #ffffff; --tmd-ink-2: #cbd5e1;' +
      '    --tmd-muted: #94a3b8; --tmd-hairline: rgba(255,255,255,0.10);' +
      '    --tmd-s0: #c1d3ff; --tmd-i0: #151d2d;' +
      '    --tmd-s1: #a5b9ff; --tmd-i1: #151d2d;' +
      '    --tmd-s2: #8ba0ff; --tmd-i2: #151d2d;' +
      '    --tmd-s3: #7286fb; --tmd-i3: #151d2d;' +
      '    --tmd-s4: #7078ff; --tmd-i4: #151d2d;' +
      '    --tmd-s5: #474ee0; --tmd-i5: #ffffff;' +
      '    --tmd-s6: #372ad2; --tmd-i6: #ffffff;' +
      '    --tmd-flat: #7078ff; --tmd-flat-ink: #151d2d;' +
      '    --tmd-null: #2b3040; --tmd-null-ink: #ffffff; }' +
      '.tmd-caption { display: flex; gap: 14px; align-items: center; padding: 2px 6px 9px;' +
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

    if (dark) root.classList.add('tmd-dark');
    else root.classList.remove('tmd-dark');
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
        message: 'Treemap needs one dimension and at least one measure. A second measure is optional: it colours the boxes and prints alongside the first.'
      });
      done();
      return;
    }

    var dimName = dims[0].name;
    var hasSecond = meas.length > 1;
    var sizeField = (hasSecond && config.size_by === 'second') ? meas[1] : meas[0];
    var otherField = hasSecond
      ? (config.size_by === 'second' ? meas[0] : meas[1])
      : null;

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
        other: otherField ? cellNumber(row[otherField.name]) : null,
        otherText: otherField ? cellText(row[otherField.name]) : '',
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

    var colourByMeasure = config.colour_by !== 'flat' && !!otherField;
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

      if (colourByMeasure && otherField && others.length) {
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
    var tipRows = [sizeField, otherField].filter(Boolean).map(function (field) {
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
      if (tipRows[1]) tipRows[1].textContent = d.otherText || '∅';
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
    var thinTargets = [];

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
        (otherField ? '. ' + otherField.label_short + ': ' + d.otherText : '') + '.';
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

      var padX = 6;
      var room = boxWidth - padX * 2;
      var cursor = 4;
      var budget = boxHeight - 8;
      var named = true;

      // The name wraps across lines and shrinks before it is given up, then the
      // figures take whatever room is left. Nothing is clipped, and anything
      // dropped is still in the tooltip.
      if (config.show_labels) {
        var reserve = config.show_secondary ? 26 : 14;
        var nameLayout = layoutLabel(d.name, {
          width: room, height: Math.max(0, budget - reserve),
          sizes: [12, 11, 10, 9], weight: '600', maxLines: 3, keepTail: true
        });
        named = !!nameLayout;
        if (nameLayout) {
          drawLabel(group, nameLayout, {
            cls: 'tmd-name', x: padX, top: cursor, anchor: 'start',
            fill: tokens.ink, weight: '600'
          });
          cursor += nameLayout.height;
          budget -= nameLayout.height;
        }
      }

      // A bare number in an unnamed box says nothing, so the figures only
      // appear once the name has a place.
      if (named) {
        var primaryLayout = layoutLabel(d.sizeText, {
          width: room, height: budget, sizes: [12, 11, 10], maxLines: 1
        });
        if (primaryLayout) {
          drawLabel(group, primaryLayout, {
            cls: 'tmd-value', x: padX, top: cursor, anchor: 'start', fill: tokens.ink
          });
          cursor += primaryLayout.height;
          budget -= primaryLayout.height;
        }

        if (config.show_secondary && otherField) {
          // Prefer the prefixed form, but a truncated prefix tells the reader
          // nothing, so fall back to the bare value.
          var secondText = null;
          if (config.secondary_prefix) {
            var prefixed = otherField.label_short + ': ' + d.otherText;
            if (wrapLines(prefixed, fontOf(11), room, 1)) secondText = prefixed;
          }
          if (!secondText) secondText = d.otherText;

          var secondLayout = layoutLabel(secondText, {
            width: room, height: budget, sizes: [11, 10, 9], maxLines: 1
          });
          if (secondLayout) {
            drawLabel(group, secondLayout, {
              cls: 'tmd-second', x: padX, top: cursor, anchor: 'start',
              fill: tokens.ink, opacity: '0.78'
            });
          }
        }
      }

      svg.appendChild(group);

      // A box too small to point at keeps an invisible target, added after all
      // the boxes so it sits on top.
      if (boxWidth < 10 || boxHeight < 10) {
        thinTargets.push({ group: group, cx: x + boxWidth / 2, cy: y + boxHeight / 2 });
      }
    });

    thinTargets.forEach(function (target) {
      var hit = el('rect', {
        class: 'tmd-hit',
        x: Math.max(0, target.cx - 6),
        y: Math.max(0, target.cy - 6),
        width: 12,
        height: 12,
        fill: 'transparent'
      });
      hit.addEventListener('pointermove', function (event) {
        target.group.dispatchEvent(new PointerEvent('pointermove', {
          clientX: event.clientX, clientY: event.clientY, bubbles: false
        }));
      });
      hit.addEventListener('pointerleave', function () {
        target.group.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
      });
      svg.appendChild(hit);
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
