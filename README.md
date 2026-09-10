# Visage

Custom visualisations for Looker, hosted for registration by URL.

Each file is a single plain JavaScript file written against the Looker
visualisation API. No build step, no bundler, no dependencies to load.

## Gallery

**https://alexander-caldwell.github.io/visage/**

Every chart rendered live from this repo, with its controls listed straight out
of the file, and a switch to see all of them on a dark dashboard. Nothing to
keep in step: the page loads the charts the same way Looker does.

## House rules

Every chart here follows the same rules, because each was learned from a chart
that failed in a real Looker instance.

**Labels.** Wrap, then shrink (12, 11, 10, 9px), then truncate, then drop, in
that order. Words are never split down the middle: "Liberis" as "Lib" and
"eris" reads as two words. When a cut is unavoidable it comes out of the middle
so the tail survives, because Looker values are often distinguished only by
their end ("... Phase 2" against "... Phase 3"). A column too narrow for flat
text gets its name turned on its side. Text is measured with the real font
before it is drawn, never estimated, never clipped.

**Hover.** Anything a label had to give up is still on the mark. Every tile,
box, column and cell answers for itself on hover and on keyboard focus,
including marks too small to point at, which carry an invisible target of usable
size. Verified by hovering every mark in the chart, smallest first.

**Never a blank tile.** The container is rebuilt on every render, never cached,
because Looker re-mounts a tile and hands over a wiped element. A tile that
measures zero is measured again across a few frames and then drawn at a
fallback size. No `innerHTML`, which a Trusted Types policy rejects by throwing.
Drawing is wrapped so any error appears in Looker's own error box.

**Theme.** The chart reads the background of the tile it sits in, so a light
dashboard stays light for a viewer whose machine is in dark mode. Dark mode has
its own colour steps, not a flipped copy.

**Axes and labels.** Any chart with an axis exposes Show Axis Titles, X Axis
Title and Y Axis Title. Leaving a title blank uses the field's own name, so a
chart arrives labelled; type your own wording to override it, or switch titles
off. Option labels in the Looker config panel are Title Case.

**Colour.** Follows the value or the entity, never the row's position, so
filtering never repaints the rows that remain. Sequential is one hue light to
dark; categorical is eight hues in fixed order, never cycled.

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
  Names wrap onto up to three lines and shrink before they are given up.
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

### `line_series.js`

One line per series across an ordered dimension. Query shape: one dimension and
one measure; a second dimension becomes one line per value.

- The tooltip sits on a full-height band per x position, so the pointer never
  has to land on a 2px stroke, and one readout lists every series.
- X labels thin out until they fit; the first and last anchor inwards.
- A marker closes each line, or every point when Show Point Markers is on.

Options: theme, start scale at zero, show point markers, axis titles.

### `grouped_column.js`

One group per dimension value, one column per measure. Query shape: one
dimension and one or more measures.

- Columns cap at 24px and never fill their slot; tops rounded 4px, square at
  the baseline.
- The hit target is the whole group, so a narrow column is still easy to point
  at.
- Show Value on Each Column prints the figure on the cap where it fits.

Options: theme, show value on each column, axis titles.

### `stacked_area.js`

One band per series, stacked, across an ordered dimension. Query shape: one
dimension and one measure, with a second dimension for the bands.

- Bands are a wash of their hue with a 2px line on top, so boundaries stay
  visible.
- Stack Mode switches between absolute values and share of total, where the
  axis runs 0 to 100% and the tooltip gives both the figure and the share.
- Bands stack by their own totals, so colour follows the series.

Options: theme, stack mode, axis titles.

### `scatter_plot.js`

One dot per row, two measures placing it, a third sizing it. Query shape: one
dimension and two measures.

- One hue for every dot: a dozen unrelated points cannot be told apart by a
  dozen cycled colours, so identity comes from the label beside the dot.
- Labels skip where they would collide or leave the plot, and flip side when
  the right edge is close.
- Where a third measure sizes the dots, it drives area rather than radius.
- Start Axes at Zero off spreads a tight cluster out.

Options: theme, show point labels, start axes at zero, axis titles.

### `histogram.js`

Buckets one measure across the rows of the query and draws how many rows land
in each bucket. Query shape: one dimension, one or more measures.

Looker's own charts cannot draw this. They draw one bar per row, so a
distribution has to be bucketed in SQL first, which makes the bin width a model
change. Here it is a visualisation option.

- The bin width is chosen by Freedman-Diaconis, or set by hand as a fixed number
  of bins or a fixed width, with an optional start value for aligning the first
  bin to a round number.
- The width stays as computed even when one far value leaves most bins empty:
  widening the bins to close the gap hides the shape of the bulk of the data,
  and the empty span is itself worth seeing. The "Extreme values" option is how
  a reader closes it, either pulling the outliers into the 1st to 99th
  percentile or leaving out anything beyond 1.5 times the interquartile range.
  Either way the caption says how many were affected.
- Bar height is the number of rows, their share of all rows, or a second
  measure summed inside the bin.
- Optional mean, median and percentile lines. Each is named where it stands, on
  two rows when two lines fall close together, so no line is left unlabelled.
- Bars are one colour, or shaded light to dark with their own height. Shading
  follows the height, never the bin's position, so filtering never repaints the
  bars that remain.
- The value axis carries absolute figures and each bar prints its own, dropped
  only where two numbers would touch and always still in the tooltip.
- Bin edge numbers thin out as the tile narrows, and turn on their side rather
  than disappear when the numbers are long and the tile is not.
- Every column answers on hover and on keyboard focus, empty ones included,
  with its range, its row count, its share, and the first few rows in it by
  name. Enter or Space opens the drill menu for the rows in that bin.
- A caption names what the bars and the lines mean, gives the row count, the
  range and the bin width, and says when there are too few values for a
  histogram to mean anything.
- Theme follows the tile, with its own colour steps in dark mode.

Options: measure to bin, bar height, measure to sum, extreme values, bin width
mode, number of bins, bin width, first bin start, theme, bar colour, bar
shading, show values, show axes, show caption, mean line, median line,
percentile line.

### `histogram.js`

Distribution of one measure: rows are binned by value and each bar's height is
the number of rows, their share, or the sum of a second measure. Query shape:
at least one measure; a dimension is optional.

- Bin width automatic, a fixed number of bins, or a fixed width, with a
  configurable first bin.
- Extreme values kept, pulled into the 1st to 99th percentile range, or left out
  beyond 1.5 times the interquartile range, and the caption says which.
- Optional mean, median and percentile lines.
- Axis titles on both axes, defaulting to the measure's own name.

### `marimekko.js`

Column widths carry one measure and heights carry another, so each column's
area is a third quantity you can compare by eye. Two query shapes, picked
automatically.

**One dimension, two measures.** Width is each row's share of one measure,
height is the other measure divided by the first, so area is the second
measure. Clients by hours and revenue: width is share of hours, height is
revenue per hour, area is revenue. A wide short column is a lot of hours at a
low rate; a narrow tall one is a small job at a high rate. The chart picks which
measure sets the width so the height reads as a number above 1, rather than as
"0.008 hours per pound"; override with "Column width from".

**Two dimensions, one measure.** Width is each column's share of the measure,
each column is full height and split by the second dimension, so every cell's
area is its share of the grand total.

- When the second dimension nests inside the first, so every engagement belongs
  to one client, colour follows the column instead of the second dimension.
  Colouring by a second dimension that is never shared between columns puts most
  of the chart in a grey "Other" and says nothing.
- When the second dimension is shared across columns, such as a status, colour
  follows it and a legend appears. Eight hues in fixed order; the rest fold into
  one "Other".
- Columns past the limit (8 by default) are grouped into "Other" rather than
  drawn as unreadable slivers, and the footnote says how many.
- Cells name themselves where they are tall enough, wrapping and shrinking to
  fit, show the figure and share where they are not, and are read from the
  tooltip when they are smaller still. Every cell has its own tooltip giving its
  figure, its share of its column and its share of the whole.
- Columns carry the absolute figures inside them: the area measure, the width
  measure, then the rate. The caption gives both totals, so the scale of the
  whole chart is stated once.
- Text inside a fill is ink or white by measured contrast; the lowest pairing is
  4.8:1.
- Theme follows the tile. Hover, keyboard focus and drill work as in the other
  charts.

Options: theme, layout, column width from, columns before grouping, shade
columns by height, show caption, show scale, show column names.

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
`https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.1.1/diagnostic.js`.

If a tile stays blank with this selected, the file is not being loaded at all,
and the problem is the registration, the URL, or the instance's policy, not the
chart.

## Registering in Looker

Instance-wide, no LookML change. Admin > Platform > Visualizations > Add:

| ID | Label | Main |
|---|---|---|
| `treemap_dual` | Treemap (Dual Value) | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/treemap_dual.js` |
| `dumbbell` | Dumbbell | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/dumbbell.js` |
| `marimekko` | Marimekko | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/marimekko.js` |
| `histogram` | Histogram | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/histogram.js` |
| `line_series` | Line | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/line_series.js` |
| `grouped_column` | Grouped Column | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/grouped_column.js` |
| `stacked_area` | Stacked Area | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/stacked_area.js` |
| `scatter_plot` | Scatter | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/scatter_plot.js` |
| `histogram` | Histogram | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.8.0/histogram.js` |

Or in a LookML project manifest:

```lkml
visualization: {
  id: "treemap_dual"
  label: "Treemap (Dual Value)"
  url: "https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.1.1/treemap_dual.js"
  sri_hash: "sha384-Ym0QIBQmJ2VkEZzLfCCqEb2qifL2B5YKWYX7wIZeJxYqno/IoYSWtiI0XVx35FfS"
}
```

A manifest change must be committed and deployed to production before the chart
appears in an Explore. Instance-wide registration takes effect immediately.

## Serve from jsDelivr, not GitHub Pages

Use `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@<tag>/<file>.js`.

GitHub Pages does not work for this. Chrome refuses the file with
`net::ERR_BLOCKED_BY_ORB` and the tile stays blank with no Looker error,
because Pages does not send a `Cross-Origin-Resource-Policy` header and the
Looker page will not accept a cross-origin script without one. jsDelivr sends
`cross-origin-resource-policy: cross-origin`, as does cdnjs, which is why
Looker can already load d3 and Highcharts from there.

Use **`@1`** for a registration you do not want to revisit. It tracks the newest
1.x release, so a fix reaches Looker without anyone editing the entry. The cost
is lag: the CDN caches which release `@1` points at for about 12 hours, and
browsers hold the file for up to 7 days.

Use an **exact tag** such as `@v1.8.0` when the file must never change under
you, or while iterating and you need the change now. jsDelivr treats a pinned
tag as immutable and caches it for a year.

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
curl -s https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.1.2/treemap_dual.js | shasum -a 256
shasum -a 256 treemap_dual.js
```

5. Paste the new tag's URL into the Looker admin entry, replacing the old one.

Steps 4 and 5 are the price of a pinned URL. The alternative that removes them
is registering the file inside the LookML project with `file:` instead of `url:`,
where Looker serves it same-origin and there is no URL to maintain.

## Source

Written and screenshot-tested with the Vizigoth harness, which renders a chart
headlessly against captured Looker data before it reaches an instance.
