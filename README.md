# Visage

Custom visualisations for Looker, hosted for registration by URL. Some draw what
Looker's built-in options cannot; others are everyday charts, included so a
dashboard can use one consistent set rather than mixing sources.

Each file is a single plain JavaScript file written against the Looker
visualisation API. No build step, no bundler, no dependencies to load.

## Gallery

**https://alexander-caldwell.github.io/visage/**

Every chart rendered live from this repo, tiled, searchable, with a page each
where the controls are real: change one and the chart redraws exactly as it
would in an Explore. Nothing to keep in step, because the page loads the charts
the same way Looker does and reads their controls out of the files.

## Documentation

- [Hosting](docs/hosting.md) — registering a chart, `@2` against a pinned tag,
  the one header a host must send, and how to release a change.
- [Technical approach](docs/approach.md) — why the charts are built and served
  this way, and what was tried and rejected.

## House rules

Every chart here follows the same rules, because each was learned from a chart
that failed in a real Looker instance.

**Labels.** Wrap, then shrink (12, 11, 10, 9px), then truncate, then drop, in
that order. Words are never split down the middle: "Visage" as "Vis" and
"age" reads as two words. When a cut is unavoidable it comes out of the middle
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
dark; categorical is eight hues in fixed order, never cycled. Chart defaults
follow the tile’s light or dark palette. Custom colours selected in the
controls override those defaults.

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

One line per series across an ordered dimension, and the whole area family as a
fill mode. Query shape: one dimension and one measure; a second dimension
becomes one line per value.

- **Fill** is Lines Only, Area Under Each Line, Stacked Bands, or Stacked to
  100%. The stacked modes replace the separate `stacked_area.js`, retired at
  v2.0.0.
- **Missing Periods** leaves a gap, treats the period as zero, or joins across
  it. A gap breaks the line rather than pretending the value was never missing.
  Stacking forces zero, because a band with a hole in it already reads as zero.
- **Rolling Average over N Periods** smooths the plotted line; the tooltip keeps
  the actual figure beside the mean.
- The tooltip sits on a full-height band per x position, so the pointer never
  has to land on a 2px stroke, and one readout lists every series.
- X labels thin out until they fit; the first and last anchor inwards.
- Drawing more than one area over another hides what is behind, so the chart
  says so on the tile rather than leaving the reader to work it out.

Options: fill, start scale at zero, missing periods, rolling average, theme,
show point markers, series colours, legend, axis titles.

### `slope.js`

Two endpoints per category on one vertical scale, joined by a line to show
the direction and size of change. Query shape: one category dimension and two
measures in query order, or one category dimension, one date dimension and one
measure. With a date dimension the chart compares the first and last periods.

- Labels give the values at both ends. The tooltip shows the change in absolute
  and percentage terms.
- **Good Direction** sets whether rising or falling values count as improvement,
  or uses a single hue when neither direction is preferred.
- The chart shows up to 25 categories and reports when it has omitted rows.
- For date queries, configure how to handle missing periods and optionally
  average a number of periods at each end.

Options: start scale at zero, missing periods, average periods at each end,
good direction, series colours, legend, theme and axis titles.

### `grouped_column.js`

One group per dimension value, one column per measure, with orientation,
stacking and mark style as modes. Query shape: one dimension and one or more
measures.

- **Orientation** is Columns or Bars. Bars exist because long category names
  read straight across.
- **Stacking** is Side by Side, Stacked, or Stacked to 100%. Negative values are
  left out of a stack and said so, rather than quietly cancelling part of a bar.
- **Mark Style** is Bars or Lollipop, a thin stem and a dot, which reads better
  when the set is sparse.
- A column too narrow for its name flat gets the name turned on its side. Where
  a name still has to be cut, the cut comes out of the middle and the tail is
  kept, because Looker values are often distinguished only by their end.
- Stacked segments take ink or white by measured contrast against their own
  fill, and a label that would land on another is dropped, with the tooltip
  carrying it.
- Measures more than 25x apart on one shared scale make the smaller ones read
  flat, so the chart says so.

Options: orientation, stacking, mark style, sort, start scale at zero, theme,
show value on each mark, series colours, legend, axis titles.

### `scatter_plot.js`

One dot per row, two measures placing it, a third sizing it, with quadrant and
trend lines as modes. Query shape: one dimension and two measures.

- **Measure That Sizes the Points** picks the size measure rather than taking
  whatever the third measure happens to be. Area carries the value, not radius,
  so twice the number is twice the ink, and a legend states the scale at both
  ends using the values Looker rendered.
- **Quadrant Lines** split the plot on the mean, the median, or a chosen value.
  Each line labels itself where it sits.
- **Trend Line** is least squares, fitted in the space the axis is drawn in, so
  it is straight on the chart the reader is looking at.
- **Logarithmic Scale** ticks in whole powers of ten. Rows at or below zero
  cannot be placed on it, so they are left out and counted on the tile.
- One hue for every dot: a dozen unrelated points cannot be told apart by a
  dozen cycled colours, so identity comes from the label beside the dot.
- Labels skip where they would collide or leave the plot, and flip side when
  the right edge is close.

Options: size measure, start scale at zero, log scale, trend line, quadrant
lines and midpoint, theme, point colour, point labels, legend, axis titles.

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
- Axis titles on both axes, defaulting to the field's own name.
- Theme follows the tile, with its own colour steps in dark mode.

Options: measure to bin, bar height, measure to sum, extreme values, bin width
mode, number of bins, bin width, first bin start, theme, bar colour, bar
shading, show values, show axes, show caption, mean line, median line,
percentile line.

### `violin.js`

The distribution of one measure, drawn as a smoothed density mirrored about its
own centre line, with one violin per group. Query shape: one dimension, one
measure, and optionally a second dimension that splits the rows into groups.

Where the histogram answers "what does this measure look like", the violin
answers "and how does that differ between these groups". It needs one row per
observation rather than a pre-aggregated total, so it wants a query that returns
the detail rather than the summary.

- Which dimension makes the groups is worked out from the data: the one with
  fewer distinct values. Neither "the first" nor "the last" is right, because a
  query of client by engagement puts the grouping dimension first and a query of
  month by client puts it last. Overridable, including to a single violin of
  everything.
- The density is a Gaussian kernel with Silverman's rule for the bandwidth, and
  a smoothing control that widens or narrows it.
- The curve is drawn only between the lowest and highest value in the query. A
  kernel estimate normally runs on past both ends, which would put a tail where
  there is no data and take a duration violin below zero. The ends are blunt
  instead, which is the shape saying the data stops here.
- Violins are all one width, or scaled by how many rows are in each, so area
  carries group size.
- A group whose values are nearly identical has no shape to show. Below six
  pixels of height it becomes a single flat mark rather than a hairline that
  reads as an empty slot.
- Extreme values kept, pulled into the 1st to 99th percentile range, or left out
  beyond 1.5 times the interquartile range, and the caption says how many moved.
- Optional quartile box, median, mean and percentile lines, each taking ink or
  white by measured contrast against the fill.
- Every row can be drawn as a dot over the curve, which is what to do when the
  groups are small: a density curve over thirty values implies a smoothness the
  data does not have, and the dots show how much of the shape is real. Each dot
  is nudged sideways within the width of the body at its own value, so none land
  outside the outline, and the nudge comes from the row's own name rather than
  its position, so filtering never reshuffles them.
- Every violin prints its median and its row count, and the value axis carries
  absolute figures, so the size of a group never needs a hover to find.
- Group names wrap, then shrink, then turn on their side, then cut from the
  middle keeping the tail, then drop into the tooltip. Nothing is clipped.
- Every violin answers on hover and on keyboard focus with its row count, its
  lowest and highest value, both quartiles, its median and its mean. Enter or
  Space opens the drill menu for the rows in that group.
- A caption names what the width and each line mean, gives the row count, the
  group count and the range, and says when a group has too few rows for a
  density curve to be honest.
- One hue for every violin. The groups are already told apart by their position
  and their name, so a colour each would carry nothing, and colour keyed to sort
  position repaints the chart whenever a group is filtered out.
- Axis titles on both axes, defaulting to the field's own name.
- Theme follows the tile, with its own colour steps in dark mode.

Options: measure to plot, grouping dimension, violin order, extreme values,
smoothing, violin width, fewest rows a violin needs, theme, violin colour, show
median and row count, show axes, show caption, axis titles, quartile box, median
line, mean line, percentile line, show every row as a dot.

### `marimekko.js`

Column widths carry one measure and heights carry another, so each column's
area is a third quantity you can compare by eye. Two query shapes, picked
automatically.

**One dimension, two measures.** A variwide, which is a different chart that
shares the name. Width is each row's share of one measure, height is the other
measure divided by the first, so a column's area is the second measure: a wide
short column is a lot of the first measure at a low rate, a narrow tall one the
opposite. The chart picks which measure sets the width so the height reads as a
number above 1 rather than a fraction; override with "Column width from".

**Two dimensions, one measure.** Width is each column's share of the measure,
each column is full height and split by the second dimension, so every cell's
area is its share of the grand total.

- When the second dimension nests inside the first, so every engagement belongs
  to one column, colour follows the column instead of the second dimension.
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
actual against budget, this year against last, a score before against after.
Two measures of different magnitude, a currency against a rating for instance,
put one dot against zero on every row and say nothing. The chart
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

### `bullet_bar.js`

A bar per row against a target marker, turning to the second colour past the
target. Query shape: one dimension and two measures, the first the actual and
the second the target.

- The compact form of actual-against-plan down a list, where a gauge per metric
  would not fit.
- Row names wrap and shrink before they are given up.
- Clicking a row opens Looker's drill menu where the row has drill links.

Options: theme, bar colour, colour when over target, show target marker, show
values, label column width.

### `kpi_tile.js`

One measure as a headline number. Query shape: one measure, optionally a second
measure to compare against, and optionally a date dimension.

- The number leads. It is Looker's own rendered value, shrunk to fit the width
  and then shortened ("48k") rather than cut.
- Compare To: a target (the second measure), the previous period (the row
  before the latest one in date order), or Automatic, which picks the target
  when there is a second measure and the previous period when there is a date.
  The change is stated as an amount and a percentage.
- Previous Period skips back over periods with no value and names the period it
  used. A comparison of zero gives the amount and no percentage.
- When there is nothing to compare against, the caption says so rather than
  leaving a gap.
- The change is marked up, down or flat, coloured by Good Direction: higher is
  better, lower is better, or neither. The text stays in ink.
- A date dimension adds a sparkline, with the headline period marked and the
  first and last periods labelled. Any other dimension adds no line, because a
  line across categories implies an order that is not there. On a short tile the
  sparkline gives way to the number.
- The number and every sparkline point answer on hover and on keyboard focus.
  Enter or Space opens the drill menu.
- Theme follows the tile, with its own colour steps in dark mode.

Options: compare to, good direction, theme, main colour (the sparkline), show
legend (the comparison caption), show axis titles, number label, sparkline title.

### `progress_bar.js`

A measure against a target, drawn as a bar filling toward it. Query shape: one
measure and a second measure as the target, optionally one dimension.

- With no dimension: one large number, its share of the target, and one bar.
- With a dimension: one bar per row down the tile, in query order. Each track
  ends at that row's own target, so this reads progress, not size. For rows on
  one shared scale, use the bullet bar.
- The number leads: each row states its value, then its share of the target.
- Past the target the bar fills, takes the second colour, and says "over". Near
  100% the share keeps one decimal, so a row 0.3% over never reads "100% over".
- No share is given against a target that is missing, zero or below zero, or for
  a missing value. The row says which instead.
- The over-target colour follows Good Direction by default: green when higher is
  better, red when lower is better. A chosen colour always wins.
- Names wrap, shrink, then cut from the middle keeping the end. When the tile is
  too short for every row, it shows the rows that fit and says how many.
- Each row answers on hover and keyboard focus with the value, the target, the
  share, and how far to go or how far over. Enter or Space opens the drill menu.
- Theme follows the tile, with its own colour steps in dark mode.

Options: good direction, theme, main colour, colour when over target, show
header, show field names, target label, measure label.

### `box_plot.js`

The distribution of one measure as a box per group. Query shape: one measure
and a dimension naming each row, optionally a second dimension that splits the
rows into groups. The sibling of the violin, laid out the same way: the measure
on the vertical axis, one group per column.

- Which dimension makes the groups is worked out from the data, by the same rule
  as the violin: the one with fewer distinct values. Overridable.
- The box is the middle half of the rows, the line the median. Whiskers reach
  the furthest row within 1.5 times the interquartile range, and each row beyond
  is drawn as its own circle; or whiskers run lowest to highest. The caption
  states which.
- A group of fewer than five rows is drawn as its rows with a median tick, not a
  box, since a box over three values implies a spread nobody measured.
- Every group prints its median and row count above it.
- Optional mean line, median line, percentile line, and every row as a dot.
- Extreme values kept, pulled in, or left out, as in the violin.
- Group names wrap, shrink, turn on their side, then cut from the middle keeping
  the end. The full name is in the tooltip.
- Each group answers on hover and keyboard focus with its row count, quartiles,
  median, mean, whisker ends and how many rows lie beyond. Each outlier answers
  for its own row. Enter or Space opens the drill menu.
- One hue for every box. Theme follows the tile.

Options: measure to plot, one box per group, order the boxes by, extreme values,
whiskers reach, mean line, median line, percentile line, show every row as a
dot, theme, box colour, show median and row count, show axes, show legend, show
axis titles, axis titles.

### `strip.js`

One dot per row on a shared measure axis. Query shape: one measure, with an
optional dimension to name rows and a second dimension to split them into
groups.

- Beeswarm packs neighbouring dots side by side. Jitter offsets dots by row
  name. A dense group can fall back to jitter.
- Each group shows its median and row count. Large results draw an even sample
  of dots while summaries still use all rows.
- Arrow keys move between groups and rows. Enter or Space drills.

Options: measure to plot, grouping dimension, group order, extreme values,
layout, mean and median lines, percentile line, theme, dot colour, summary,
axes, legend and axis titles.

### `pie.js`

Slices show how one measure divides across the values of a dimension. Query
shape: one dimension and one measure. A second measure can appear in tooltips.

- Slices run clockwise from the largest. By default the five largest are shown
  individually and the rest are grouped into Other.
- The legend gives absolute values and shares. The donut option shows the
  total in the centre.
- The caption reports rows omitted for null or negative values.

Options: group the tail, share or absolute labels, donut, label strategy, show
values, series colours, legend and theme.

### `waffle.js`

A 10 by 10 grid with one square per percentage point. Query shape: one
dimension and one measure, or no dimension and two measures (part and whole).

- Category shares are rounded together so the grid always fills exactly 100
  squares. Tiny shares remain in the legend even when they round to zero cells.
- In part-and-whole mode the grid fills to the part's share and reports any
  amount over the whole.

Options: group the tail, share or absolute labels, label strategy, show values,
series colours, legend and theme.

Under **Style**, enter a direct HTTPS PNG URL or a base64 PNG data URL in
**Cell Icon PNG URL** to repeat an icon in each filled square. A transparent
PNG lets the series colour show through. Leave the field blank for plain cells.

### `funnel.js`

Centred bars show volume through an ordered process. Query shape: one stage
dimension and one count measure. Sort the query into process order. A second
measure can appear in tooltips.

- Each stage shows its count and share of the first stage. The gaps show
  conversion and drop-off between adjacent stages.
- Missing counts interrupt the conversion readout. Increases are reported and
  drawn at their actual size.

Options: number of stages shown, share or absolute labels, label strategy,
show values, main colour, legend and theme.

### `table.js`

Looker-formatted figures, one column per field. Query shape: one or two
dimensions and one or more measures in an unpivoted query.

- Each measure column can show a value, a value with colour, or a value with
  an in-cell bar.
- Sort with a column header or the sort control. The header stays visible,
  and dimension columns stay in place while measure columns scroll.
- The totals option uses the totals from Looker when the query provides them.

Options: per-measure display, sort, show totals, show values, colour scale,
midpoint, reverse scale, main colour, legend, theme and axis titles.

### `heatmap.js`

A matrix of measure values and colours. Query shape: two dimensions and one
measure, or one row dimension and one measure pivoted by a second dimension.

- The first dimension gives the rows. The second dimension or pivot gives the
  columns. Both axes can be sorted by name, total or query order.
- Empty pairs in an unpivoted query get an outline, while null values and
  zeroes have distinct treatments.
- With a pivot, enable row totals and totals in Looker to show them here.
  Arrow keys move between cells and Enter drills.

Options: sequential or diverging scale, midpoint, reverse scale, row and
column order, totals, show values, main colour, legend, theme and axis titles.

### `calendar_heatmap.js`

Daily measures arranged as weeks across and weekdays down. Query shape: one
date dimension at day grain and one measure. Additional measures can appear
in tooltips.

- The three most recent calendar years can appear as separate bands aligned
  by week. Weeks can start on Monday or Sunday.
- Missing days within the result range, nulls and zeroes are shown distinctly.
  Arrow keys move by day or week and Enter drills.
- The totals option displays Looker's query total when it is available.

Options: week start, year order, sequential or diverging scale, midpoint,
reverse scale, totals, show values, main colour, legend, theme and axis titles.

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
| `treemap_dual` | Treemap (Dual Value) | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/treemap_dual.js` |
| `marimekko` | Marimekko | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/marimekko.js` |
| `grouped_column` | Column | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/grouped_column.js` |
| `bullet_bar` | Bullet Bar | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/bullet_bar.js` |
| `dumbbell` | Dumbbell | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/dumbbell.js` |
| `line_series` | Line | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/line_series.js` |
| `slope` | Slope | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/slope.js` |
| `scatter_plot` | Scatter | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/scatter_plot.js` |
| `histogram` | Histogram | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/histogram.js` |
| `violin` | Violin | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/violin.js` |
| `kpi_tile` | KPI Tile | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/kpi_tile.js` |
| `progress_bar` | Progress Bar | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/progress_bar.js` |
| `box_plot` | Box Plot | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/box_plot.js` |
| `strip` | Strip / Beeswarm | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/strip.js` |
| `pie` | Pie / Donut | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/pie.js` |
| `waffle` | Waffle | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/waffle.js` |
| `funnel` | Funnel | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/funnel.js` |
| `table` | Table | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/table.js` |
| `heatmap` | Heatmap | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/heatmap.js` |
| `calendar_heatmap` | Calendar Heatmap | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/calendar_heatmap.js` |
| `diagnostic` | Diagnostic | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@2/diagnostic.js` |

`@2` tracks the newest 2.x release, so a registration picks up fixes without
anyone revisiting it. It caches which release that is for around 12 hours, so
give someone a pinned tag while they are watching a fix land.

**If you registered against `@1`, nothing has broken and nothing has changed.**
`@1` still resolves to v1.17.0 and serves the old set, `stacked_area.js`
included. Repoint to `@2` to pick up the column, line and scatter modes; that
is the moment a `stacked_area` tile stops resolving, so repoint those at
`line_series` with Fill set to Stacked Bands at the same time.

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

Use **`@2`** for a registration you do not want to revisit. It tracks the newest
2.x release, so a fix reaches Looker without anyone editing the entry. The cost
is lag: the CDN caches which release `@2` points at for about 12 hours, and
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
3. Set `data-chart-release` in `index.html` and `chart.html` to the new tag so
   the gallery requests the updated chart files. Commit, tag, push both:

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

Written and screenshot-tested with the Visage harness, which renders a chart
headlessly against captured Looker data before it reaches an instance.
