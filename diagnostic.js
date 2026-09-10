// Diagnostic: paints what Looker hands the visualisation, as plain text.
// Register it as its own entry (ID: diagnostic) and pick it in an Explore.
// If the tile stays blank with this selected, the file is not being loaded at
// all, and the problem is registration, the URL, or the instance's policy.

(function () {
  var loadedAt = new Date().toISOString();

  function line(parent, text) {
    var row = document.createElement('div');
    row.textContent = text;
    parent.appendChild(row);
  }

  looker.plugins.visualizations.add({
    id: 'diagnostic',
    label: 'Diagnostic',

    // Declared for the catalogue and the gallery. Looker ignores keys it
    // does not know, so this costs nothing at render time.
    data_shape: 'any query',

    create: function (element, config) {
      while (element.firstChild) element.removeChild(element.firstChild);
      var style = document.createElement('style');
      style.textContent =
        '.diag { font: 12px/1.5 monospace; padding: 8px; color: #1f2426; background: #fffbe6; ' +
        'height: 100%; overflow: auto; box-sizing: border-box; }' +
        '.diag b { display: block; margin-top: 6px; }';
      element.appendChild(style);
      var box = document.createElement('div');
      box.className = 'diag';
      element.appendChild(box);
      line(box, 'create() ran. Script loaded at ' + loadedAt);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      try {
        this.clearErrors();

        var box = element.querySelector('.diag');
        if (!box) {
          this.create(element, config);
          box = element.querySelector('.diag');
        }
        while (box.firstChild) box.removeChild(box.firstChild);

        var rect = element.getBoundingClientRect();
        line(box, 'script loaded at: ' + loadedAt);
        line(box, 'updateAsync ran at: ' + new Date().toISOString());
        line(box, 'element: ' + element.tagName + '.' + (element.className || '(no class)'));
        line(box, 'measured: ' + Math.round(rect.width) + ' x ' + Math.round(rect.height) +
          '  (clientWidth/Height: ' + element.clientWidth + ' x ' + element.clientHeight + ')');
        line(box, 'rows: ' + (data ? data.length : 'no data array'));

        var fields = (queryResponse && queryResponse.fields) || {};
        var dims = fields.dimension_like || fields.dimensions || [];
        var meas = fields.measure_like || fields.measures || [];
        line(box, 'dimension_like: ' + dims.length + '  measure_like: ' + meas.length);
        dims.forEach(function (f, i) { line(box, '  dim ' + i + ': ' + f.name + '  (' + f.label_short + ')'); });
        meas.forEach(function (f, i) { line(box, '  mea ' + i + ': ' + f.name + '  (' + f.label_short + ')'); });

        if (data && data[0]) {
          line(box, 'first row keys: ' + Object.keys(data[0]).join(', '));
          Object.keys(data[0]).forEach(function (k) {
            var cell = data[0][k];
            line(box, '  ' + k + ' -> value: ' + JSON.stringify(cell && cell.value) +
              '  rendered: ' + JSON.stringify(cell && cell.rendered));
          });
        }

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', 60);
        svg.setAttribute('height', 20);
        var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('width', 60);
        r.setAttribute('height', 20);
        r.setAttribute('fill', '#3b6ea5');
        svg.appendChild(r);
        var svgLabel = document.createElement('b');
        svgLabel.textContent = 'SVG test (a blue bar should appear below):';
        box.appendChild(svgLabel);
        box.appendChild(svg);

        done();
      } catch (err) {
        this.addError({ title: 'Diagnostic failed', message: (err && err.message) || String(err) });
        done();
      }
    }
  });
})();
