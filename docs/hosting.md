# Hosting a Visage chart

A custom Looker visualisation is one JavaScript file. Looker has to fetch it
from somewhere, and that somewhere has to meet one requirement most static
hosts do not. This is how the charts here are served, and what to do when the
default arrangement does not suit.

## Register a chart

Looker admin, Platform, Visualizations, Add Visualization.

| Field | Value |
|---|---|
| ID | the chart's own id, for example `treemap_dual` |
| Label | anything your users will recognise |
| Main | `https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@1/treemap_dual.js` |

The ID must match the `id` inside the file. The chart appears in the Explore's
visualisation picker immediately: instance-wide registration is stored in
Looker, not in LookML, so nothing needs committing or deploying.

## `@1` or a pinned tag

`@1` tracks the newest 1.x release. A fix reaches every instance without anyone
editing a registration, which is why it is the default here.

The cost is lag, and the numbers are measured rather than assumed:

- The CDN caches which release `@1` points at for about **12 hours**.
- Browsers are told to keep the file for up to **7 days**.

So a release is not instant. While iterating on a chart, register the exact tag
(`@v1.5.0`) and you see each change as you publish it. When the chart settles,
move the registration back to `@1` and leave it alone.

A pinned tag is also right when a chart must never change under you: jsDelivr
treats a tagged path as immutable.

## The header that decides everything

A host must send:

```
Cross-Origin-Resource-Policy: cross-origin
```

Without it Chrome refuses the file with `net::ERR_BLOCKED_BY_ORB`. The tile is
blank, Looker reports no error, and nothing in the browser console mentions the
chart. The only visible sign is a failed request in the Network tab.

This rules out several obvious hosts. GitHub Pages does not send the header and
gives you no way to add one, so it can host this documentation but not the
charts. jsDelivr and cdnjs both send it.

If you ever see a blank tile after registering a chart, check the Network tab
for the file before checking anything else.

## Releasing a change

1. Change the chart, and put it through the harness: render it, look at the
   screenshot, run the checks.
2. Bump the build string at the top of the file. It is logged on load, so the
   browser console tells you which build an instance is actually running.
3. Commit, tag, and push both the branch and the tag:

```
git commit -am "..." && git tag -a v1.6.0 -m "..." \
  && git push origin main && git push origin v1.6.0
```

4. Confirm the CDN is serving what you think it is, byte for byte:

```
curl -s https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.6.0/treemap_dual.js \
  | shasum -a 256
shasum -a 256 treemap_dual.js
```

5. Registrations on `@1` pick the release up within about 12 hours. To see it
   now, register the pinned tag.

## Checking what an instance is running

Open the browser console on a dashboard with the chart on it. Each chart logs
one line on load:

```
treemap_dual build v1.5.0
```

If that build is older than you expect, the registration is pinned to an older
tag, or a cached copy is still in play. A hard refresh settles the second case.

## When the lag matters

Three routes give a stable URL that updates immediately. None is set up here.

| Route | What you get | What it costs |
|---|---|---|
| Cloudflare Pages or a Worker | Fixed URL, live in under a minute, correct headers, free | A Cloudflare account, about 15 minutes of first-time setup |
| Cloud Run | The same, on Google Cloud | A project, a service, and someone to own it |
| LookML manifest `file:` | No URL at all. Looker serves the file itself, same origin, no CDN, nothing to re-register ever | A pull request to the LookML project, and the chart then versions and deploys with that repo |

The last is the real end state for a chart in production use. Everything else is
managing a CDN.

For a LookML manifest entry rather than admin registration:

```lkml
visualization: {
  id: "treemap_dual"
  label: "Treemap (Dual Value)"
  url: "https://cdn.jsdelivr.net/gh/alexander-caldwell/visage@v1.5.0/treemap_dual.js"
  sri_hash: "sha384-..."
}
```

Generate the hash from the exact file the tag points at:

```
curl -s <the tagged url> | openssl dgst -sha384 -binary | openssl base64 -A
```

Prefix the result with `sha384-`. Looker then refuses the file if its content
ever differs, which is what makes loading code from a third-party CDN
reasonable. Use it with a pinned tag only: with `@1` the hash breaks on every
release.

## Local development

To iterate against a real Explore without publishing anything, serve the file
from your own machine over HTTPS and register `https://localhost:4443/<id>.js`
as a second, clearly-labelled entry. Visit that URL in the same browser first
and accept the certificate warning, or Looker fails to load the file and tells
you nothing useful.

That server sends the cross-origin header too. It has to: without it the
localhost route fails in exactly the same way as GitHub Pages.
