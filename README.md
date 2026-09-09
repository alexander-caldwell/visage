# visigoth

Custom visualisations for Looker, hosted for registration by URL.

Each file is a single plain JavaScript file written against the Looker
visualisation API. No build step, no bundler, no dependencies to load.

## Charts

### `treemap_dual.js`

Treemap where box area comes from one measure and each box prints two measure
values. Query shape: one dimension, two measures.

- Area from the first measure by default; the "Size by" option flips to the second.
- Colour carries the second measure on a single-hue scale, light to dark, so the
  chart shows both measures at once. Colour follows the value, never the row's
  rank, so filtering rows out never repaints the rows that remain. Switch to one
  flat colour with the "Colour by" option.
- A caption names what area and colour mean, with the colour range, so no box
  has to repeat a measure name.
- Each box shows the dimension name, the sizing measure, then the other measure.
- Text is measured before it is drawn, never clipped. Lines drop as boxes
  shrink; a label that cannot keep four of its own characters is dropped rather
  than cut to a stub, and a box with no room for its name carries no text at
  all. The tooltip always has the full values.
- Box text is ink or white, whichever reads on that fill. Every pairing clears
  5:1 contrast.
- Dark mode has its own colour steps, not a flipped copy: the light scale's
  darkest blues sit too close to a dark surface to read.
- Hovering a box shows a tooltip with the name and both measures. Tab moves
  between boxes and shows the same tooltip; Enter or Space opens the drill menu.
- Rows with a null, zero or negative sizing value cannot be drawn as a box. They
  are counted in a footnote rather than silently dropped. A row missing the
  second measure gets a grey box, named in the caption.
- Clicking a box opens Looker's drill menu where the row has drill links.

Options: size by, colour by, show caption, show names, show second measure,
prefix second measure with its name, gap between boxes.

### `diagnostic.js`

Paints, as plain text, what Looker hands the visualisation: element size, row
count, field names, and the first row's values. It also draws one small blue
rectangle to confirm inline SVG works.

Register it as ID `diagnostic`, label `Diagnostic`, main
`https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.1.1/diagnostic.js`.

If a tile stays blank with this selected, the file is not being loaded at all,
and the problem is the registration, the URL, or the instance's policy, not the
chart.

## Registering in Looker

Instance-wide, no LookML change. Admin > Platform > Visualizations > Add:

| Field | Value |
|---|---|
| ID | `treemap_dual` |
| Label | `Treemap (Dual Value)` |
| Main | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.1.1/treemap_dual.js` |

Or in a LookML project manifest:

```lkml
visualization: {
  id: "treemap_dual"
  label: "Treemap (Dual Value)"
  url: "https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.1.1/treemap_dual.js"
  sri_hash: "sha384-Ym0QIBQmJ2VkEZzLfCCqEb2qifL2B5YKWYX7wIZeJxYqno/IoYSWtiI0XVx35FfS"
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

Use a **tagged** URL. jsDelivr serves it as immutable and caches it for a year,
so what Looker runs never changes underneath you.

A branch URL such as `@main` is a fixed URL, but it is not usable for iteration.
jsDelivr caches which commit a branch points at for about 12 hours, and its
purge endpoint does not clear that: a purge was measured as reporting success on
both providers while the old file kept being served four minutes later. Browsers
are told to hold the file for 7 days on top of that.

## Releasing a change

1. Edit the chart and check it in the harness (screenshot, both sizes).
2. Bump the build string at the top of the file, which is logged on load so the
   browser console says which build an instance is running.
3. Commit, tag, push both:

```
git commit -am "..." && git tag -a v1.1.2 -m "..." && git push origin main && git push origin v1.1.2
```

4. Confirm the CDN serves the new file, byte for byte:

```
curl -s https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.1.2/treemap_dual.js | shasum -a 256
shasum -a 256 treemap_dual.js
```

5. Paste the new tag's URL into the Looker admin entry, replacing the old one.

Steps 4 and 5 are the price of a pinned URL. The alternative that removes them
is registering the file inside the LookML project with `file:` instead of `url:`,
where Looker serves it same-origin and there is no URL to maintain.

## Source

Written and screenshot-tested with the Vizigoth harness, which renders a chart
headlessly against captured Looker data before it reaches an instance.
