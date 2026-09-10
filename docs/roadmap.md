# The suite, by family

A structure for growing Visage rather than accumulating charts. Each family
answers one question a reader arrives with, shares a query shape, and shares a
set of controls. That last part matters most: a chart's controls should be
inherited from its family, so the suite stays predictable and nobody has to
guess what a new chart will offer.

Nothing below is a commitment. It is the order we would work in, and what each
piece is worth.

## Why families rather than a list

Two reference points. [Highcharts](https://www.highcharts.com/demo) groups its
demos by family — line, area, column and bar, pie, scatter and bubble, heat and
tree maps, trees and networks — and each family shares an axis model and an
options set. [Omni's showcase](https://docs.omni.co/showcase) does the opposite,
listing about fifty individual pieces with no grouping, which reads as a gallery
of one-offs and gives no hint what controls any of them has.

The first approach is right for a suite that will be maintained. It also tells
us where a request belongs: a stacked column is not a new chart, it is a mode of
the column family.

## Control tiers

How much control a chart should expose, by family. This is the part that
answers "what level of control should this have".

| Tier | Controls | Applies to |
|---|---|---|
| **Baseline** | Theme, axis titles, legend on or off | Everything, no exceptions |
| **Comparison** | Sort order, zero baseline, value labels, series colours | Column, bar, dumbbell, bullet |
| **Distribution** | Binning or bandwidth, outlier handling, summary lines (mean, median, percentile) | Histogram, box, violin, strip |
| **Part-to-whole** | Grouping threshold ("Other" after N), label strategy, share against absolute | Treemap, marimekko, pie, waffle, funnel |
| **Time** | Interval, missing-value handling (gap, zero, connect), rolling average, forecast band | Line, area, slope |
| **Relationship** | Point size measure, trend line, quadrant reference lines, log scale | Scatter, bubble, connected scatter |
| **Flow** | Node order, node padding, link curvature, colour by source or target | Sankey, alluvial, chord |

A chart in a family gets its family's tier plus the baseline. Anything beyond
that needs a reason.

## The families

### 1. Comparison — how do these categories differ?

*Shape: 1 dimension + 1 or more measures. Tier: baseline + comparison.*

| Chart | State | Notes |
|---|---|---|
| Grouped column | **Built** | Already handles n measures |
| Stacked column | Backlog | A mode of the column chart, not a new file: absolute and 100% |
| Bar (horizontal) | Backlog | A mode of the same file, since long category names need it |
| Bullet bar | **Built** | |
| Dumbbell | **Built** | |
| Lollipop | Backlog | Cheap variant of the bar mode |
| Radial bar | Later | Looks good, reads poorly; only worth it for cyclical data |

Doing the column family properly means one file with **orientation** (column or
bar) and **stacking** (none, stacked, 100%) as modes. That collapses four
requests into two controls.

### 2. Distribution — how is this measure spread?

*Shape: 1 measure, dimension optional. Tier: baseline + distribution.*

| Chart | State | Notes |
|---|---|---|
| Histogram | **Built** | Bins, outlier handling, mean, median, percentile lines |
| Violin | Backlog | Your request. A kernel density estimate mirrored about its axis; needs a bandwidth control, and reads as a family with box and strip |
| Box plot | Backlog | Quartiles and whiskers; the compact sibling of the violin |
| Strip / beeswarm | Backlog | Every row as a dot; honest for small n, where a violin implies smoothness that is not there |
| Ridgeline | Later | Stacked densities across a dimension; striking, narrow use |

Worth deciding once for the family: whether the y-axis is count, density or
share. A violin implies density, so mixing it with a count histogram in one
dashboard invites misreading.

### 3. Part-to-whole — what is this total made of?

*Shape: 1 or 2 dimensions + 1 or 2 measures. Tier: baseline + part-to-whole.*

| Chart | State | Notes |
|---|---|---|
| Treemap | **Built** | Second measure optional, colours the boxes |
| Marimekko (mosaic) | **Built** | Two dimensions, one measure |
| Variwide | **Built** | Same file, two-measure layout |
| Pie / donut | Backlog | Reluctantly. Asked for constantly; cap at 5 slices plus Other and it behaves |
| Waffle | Backlog | Better than a pie for a single share, and reads at tile size |
| Funnel | Backlog | Stage-to-stage conversion, with drop-off labelled |
| Sunburst | Later | Hierarchy beyond two levels; the treemap usually wins |

### 4. Time — what happened over this period?

*Shape: 1 date dimension + 1 or more measures. Tier: baseline + time.*

| Chart | State | Notes |
|---|---|---|
| Line | **Built** | |
| Stacked area | **Built** | Absolute and share modes |
| Area (single series) | Backlog | Your reorganisation: fold area into the line family as a **fill** mode, rather than keeping a separate chart |
| Slope | Backlog | Two periods only, one line per row; the sibling of the dumbbell |
| Small multiples | Later | A grid of one chart per series; the answer when a line chart has twelve series |

Folding area into line is right. They share an axis model, a series model and
their whole options set; the difference is a fill and a stacking rule. One file
with `fill: none | area | stacked | share` replaces two, and the stacked area we
have becomes a mode of it.

### 5. Relationship — do these two measures move together?

*Shape: 1 dimension + 2 or 3 measures. Tier: baseline + relationship.*

| Chart | State | Notes |
|---|---|---|
| Scatter | **Built** | Third measure sizes the dots |
| Bubble | Backlog | Your request. Really the scatter's size mode with a legend for the size scale, so a mode rather than a file |
| Connected scatter | Later | Two measures over time, joined in order; niche but nothing else shows a trajectory |
| Quadrant | Backlog | Scatter plus two reference lines and quadrant labels: a control, not a chart |

Bubble is the clearest case for a mode rather than a file: the scatter already
sizes by a third measure, and what is missing is a size legend and a control for
how the scale maps.

### 6. Flow — how does volume move between states?

*Shape: 2 dimensions + 1 measure. Tier: baseline + flow.*

| Chart | State | Notes |
|---|---|---|
| Sankey | Backlog | Your request, and the biggest single build here: node layout, link routing, label placement, cycles to detect and refuse |
| Alluvial | Later | A Sankey across more than two stages |
| Chord | Later | Flows between members of one set |

Sankey deserves its own estimate. Everything else in this document is a day or
two; a Sankey that behaves on real data is a week, most of it spent on node
ordering and label collisions.

### 7. Single value — what is this number, and is it good?

*Shape: 1 measure, comparison measure optional. Tier: baseline only.*

| Chart | State | Notes |
|---|---|---|
| KPI tile | Backlog | Number, comparison, sparkline. Looker's own is weak, so this gets used constantly |
| Gauge | Backlog | One value against a range; asked for more than it should be |
| Progress bar | Backlog | The honest version of a gauge, and it fits a narrow tile |

Small builds, disproportionate use. Worth doing before the exotic families.

## Suggested order

1. **Column family reorganisation.** Orientation and stacking modes on the
   existing file. Answers stacked column, bar and lollipop at once.
2. **Line family reorganisation.** Fold area in as a fill mode. Removes a file.
3. **Bubble as a scatter mode**, with a size legend. Small.
4. **KPI tile and progress bar.** Small, heavily used.
5. **Box plot, then violin, then strip.** One family, one axis decision, three
   charts that share a control set.
6. **Waffle and funnel**, then pie under protest with a slice cap.
7. **Sankey.** On its own, with its own estimate.

The first two reduce the number of files while adding four chart types, which is
the whole argument for families.

## What this means for the harness

Modes inside one file need the checks to cover each mode, not just each file.
Today a run names a chart and a fixture; it should name a chart, a fixture and a
config, so "grouped column, stacked, share mode" is a checked combination. That
is a small change to the check runner and worth making before the column family
grows a third mode.
