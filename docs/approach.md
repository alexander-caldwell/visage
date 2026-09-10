# Technical approach

Why the charts are built and served the way they are, and what was tried and
rejected on the way. Written down because most of it was learned by hitting the
failure rather than by reading a document.

## The shape of the problem

Looker's built-in chart suite is fixed. Anything outside it is a plain
JavaScript file registered against Looker's visualisation API: no build step, no
bundler, no module syntax, because the file is loaded as a script tag.

Two things make that harder than it sounds.

**The failures are silent.** A chart that draws nothing looks exactly like a
chart that works, in the logs and in Looker's own error reporting. Four separate
causes of a blank tile turned up in one week of building:

- Looker re-mounts a tile and hands the render function an element whose
  contents have been wiped. A chart that cached its container from `create`
  draws into a node that is no longer on the page.
- Looker can call the render function before layout settles, when the element
  measures zero. A chart that bails out then never draws.
- An instance with a Trusted Types policy rejects an `innerHTML` assignment by
  throwing, on a line that looks completely ordinary.
- Chrome refuses the hosted file outright when the host does not send one
  particular header. Nothing in the console mentions the chart.

**The feedback loop is slow.** Registering a chart, deploying, opening an
Explore and reading a spinner is minutes per attempt.

## The build loop

The answer to both is to render the chart headlessly and look at the picture.

1. Write one file.
2. Point it at captured Looker data.
3. Render it in a real browser, headlessly, and screenshot the result.
4. **Read the screenshot.** Not the logs.
5. Run the checks.
6. Only then serve it to Looker.

Step 4 is the one that matters, and the one that gets skipped. Every visual
fault in this project was found by looking at the image: a hover band painted as
a solid black rectangle, two dots hiding each other where two values were equal,
an axis label reading "-0", labels truncated to "Lib" and "eris", a gap label
printed on top of a row name.

The checks are the other half. There are 22 of them for a chart with axes, and
each one is a failure that actually happened, not a hypothetical: a re-mounted
tile, a replaced element, a repeat render, a tile that measures zero, light and
dark dashboards, a narrow tile, no rows, all-null rows, text escaping the tile,
and static checks on the source for `innerHTML`, colour keyed to row position, a
build version, a declared query shape, and Title Case control labels.

They earn their keep by being unglamorous. They confirm a chart never goes
blank. They tell you nothing about whether the picture makes sense, which is
still a human reading the screenshot.

## Hosting: what was tried

Registered by URL, a chart must come from a host that sends
`Cross-Origin-Resource-Policy: cross-origin`. Without it Chrome blocks the file
with `net::ERR_BLOCKED_BY_ORB` and the tile is blank with nothing in the console
about the chart.

| Considered | Outcome |
|---|---|
| `raw.githubusercontent.com` | Refused. Serves `text/plain` with `nosniff`, so the browser will not execute it |
| GitHub Pages | Blocked by ORB. No such header, and no way to add one. It hosts this documentation instead |
| `cdn.statically.io` | Same. No header |
| `raw.githack.com` | 403 |
| jsDelivr `@main` plus purge | The purge endpoint reported success on both providers while the old file kept being served four minutes later. A branch-to-commit mapping is cached separately from the file, and purging the file does not clear it |
| jsDelivr pinned tag | Works. Immutable, cached for a year, and needs re-registering in Looker on every release |
| **jsDelivr `@1`** | **In use.** One stable URL that tracks 1.x. Accepts a 12-hour lag on the range cache and up to 7 days in a browser |
| Cloudflare Pages or Worker | Better: stable URL, updates in under a minute, own headers. Needs an account and setup |
| Cloud Run | The same, on Google Cloud. Needs a project and an owner |
| LookML manifest `file:` | Best. Looker serves the file itself, so there is no URL, no CDN and no cache. Needs a pull request to the LookML project |

The order of preference, if you are starting again: put the file in the LookML
project. Everything else is managing a CDN in exchange for not opening a pull
request.

## Design decisions worth knowing

A handful of rules came out of specific mistakes, and they are now enforced or
documented rather than remembered.

**Colour follows the entity, never the row's position.** The first treemap
assigned colours by sort order, so filtering one client out repainted every
remaining box. Colour now follows the value or the entity.

**Dark mode is its own set of colour steps.** The darkest steps of a light scale
disappear against a dark surface, so an automatic flip does not work.

**Match the tile, not the operating system.** `prefers-color-scheme` is the
wrong question: it turns a chart dark on a light Looker dashboard whenever the
viewer's laptop is dark. Each chart reads the background of the first ancestor
that paints one.

**Labels wrap, then shrink, then truncate, then drop, in that order.** A name
lost to a narrow box is information gone. Words are never split down the middle,
because "Liberis" as "Lib" and "eris" reads as two words, and a cut comes out of
the middle so the tail survives: Looker values are often distinguished only by
their end, "... Phase 2" against "... Phase 3".

**Anything a label gave up is still on the mark.** Every box, column, cell and
row answers for itself on hover and on keyboard focus, including marks too small
to point at, which carry an invisible target of usable size.

**Say when a chart is the wrong form for the data.** The dumbbell puts both
measures on one scale, so it prints a note when they differ by more than 25
times rather than drawing a column of dots pinned to zero.

## What this is not

There is no server, no build step and no dependency. Each chart is one file that
runs as-is. The harness that renders and checks them is a private repository:
this one holds only the charts and this documentation.
