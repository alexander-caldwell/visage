# visigoth

Custom visualisations for Looker, hosted for registration by URL.

Each file is a single plain JavaScript file written against the Looker
visualisation API. No build step, no bundler, no dependencies to load.

## Charts

### `treemap_dual.js`

Treemap where box area comes from one measure and each box prints two measure
values. Query shape: one dimension, two measures.

- Area from the first measure by default; the "Size by" option flips to the second.
- Each box shows the dimension name, the sizing measure, then the other measure.
- Text drops line by line as boxes shrink, and truncates to the box width.
- Box text is dark on pale fills and white on dark ones.
- Rows with a null, zero or negative sizing value cannot be drawn as a box. They
  are counted in a footnote rather than silently dropped.
- Clicking a box opens Looker's drill menu where the row has drill links.

Options: size by, colours, show names, show second measure, prefix second
measure with its name, gap between boxes.

### `diagnostic.js`

Paints, as plain text, what Looker hands the visualisation: element size, row
count, field names, and the first row's values. It also draws one small blue
rectangle to confirm inline SVG works.

Register it as ID `diagnostic`, label `Diagnostic`, main
`https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.0.0/diagnostic.js`.

If a tile stays blank with this selected, the file is not being loaded at all,
and the problem is the registration, the URL, or the instance's policy, not the
chart.

## Registering in Looker

Instance-wide, no LookML change. Admin > Platform > Visualizations > Add:

| Field | Value |
|---|---|
| ID | `treemap_dual` |
| Label | `Treemap (Dual Value)` |
| Main | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.0.0/treemap_dual.js` |

Or in a LookML project manifest:

```lkml
visualization: {
  id: "treemap_dual"
  label: "Treemap (Dual Value)"
  url: "https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.0.0/treemap_dual.js"
  sri_hash: "sha384-njSpEVPRmkUzJHAOwgiNGfmtj5fuSIMA+qtfr2o0KBcGaPBs4jIYilkfAObs25iY"
}
```

A manifest change must be committed and deployed to production before the chart
appears in an Explore. Instance-wide registration takes effect immediately.

## Serve from jsDelivr, not GitHub Pages

Use `https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@<tag>/<file>.js`.

GitHub Pages does not work for this. Chrome refuses the file with
`net::ERR_BLOCKED_BY_ORB` and the tile stays blank with no Looker error,
because Pages does not send a `Cross-Origin-Resource-Policy` header and the
Looker page will not accept a cross-origin script without one. jsDelivr sends
`cross-origin-resource-policy: cross-origin`, as does cdnjs, which is why
Looker can already load d3 and Highcharts from there.

jsDelivr serves a tagged URL as immutable and caches it for a year. So a change
needs a new tag and a new URL in Looker:

```
git tag -a v1.0.1 -m "..." && git push origin v1.0.1
```

A branch URL such as `@main` avoids re-registering but caches for about 12
hours, which makes a fix look like it did not work.

## Source

Written and screenshot-tested with the Vizigoth harness, which renders a chart
headlessly against captured Looker data before it reaches an instance.
