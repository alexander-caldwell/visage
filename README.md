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
- The theme follows the tile, not the viewer's machine. The chart reads the
  background colour it is sitting on, so a light dashboard stays light even for
  someone whose laptop is in dark mode. The "Theme" option forces Light or Dark
  when you want to override that.
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

### `dumbbell.js`

Two measures per row on one shared scale, joined by a connector. Reads as
"where is each row on each measure, and how big is the gap". Query shape: one
dimension, two measures, the same shape as the treemap.

**Both measures share one scale, so they must be the same kind of quantity**:
hours logged against hours budgeted, revenue this year against last year, NPS
before against after. Two measures of different magnitude (revenue against an
NPS score) put one dot against zero on every row and say nothing. The chart
detects that, prints a note beside the legend, and still draws. For two
unrelated measures use the treemap instead, where area carries one and colour
the other.

- The theme follows the tile, not the viewer's machine, with a "Theme" option
  to force Light or Dark.
- Two categorical hues in fixed order, one per measure, with a legend, so
  identity never rests on colour alone.
- Long row labels lose their middle, not their end: Looker values are often
  distinguished only by a tail such as "... : M1" against "... : M2".
- Rows sorted by either measure, by the size of the gap, or left in query order.
- Where the two values are equal, one marker is split down the middle rather
  than one dot hiding behind the other.
- Only the largest gap is labelled directly; a number on every row goes unread.
  The label moves to the other side of the pair when the edge is close, and is
  dropped rather than clipped.
- A row missing one measure draws a single dot. A row missing both is counted in
  a footnote.
- Hovering a row washes it and shows a tooltip with both values and the gap.
  Tab moves between rows; Enter or Space opens the drill menu.
- Scale starts at zero by default; the "Start scale at zero" option turns that
  off for tightly clustered values.

Options: sort rows by, start scale at zero, row label width, label the largest
gap, show scale.

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

| ID | Label | Main |
|---|---|---|
| `treemap_dual` | Treemap (Dual Value) | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.3.0/treemap_dual.js` |
| `dumbbell` | Dumbbell | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visigoth@v1.3.0/dumbbell.js` |

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
