# Athletia-Demo

Single-page site concepts for the Athletia Core client preview. Plain static HTML, no build step; deploy to Vercel as-is (Framework preset: **Other**, no build command, output directory = repo root).

| URL   | Concept |
|-------|---------|
| `/`   | Redirects to `/1/` |
| `/1/` | Concept 1 (navy stage, pink band) |
| `/2/` | Concept 2 (growing signet background, white headline) |
| `/3/` | Coming soon |

## Concept switcher

`switcher.js` adds a small `1 2 3` pill at the top of every concept. It shows on load, hides after a few seconds, and comes back when the pointer nears the top edge, on tap, or on any key press. Keys `1`–`3` jump to a concept, `←` / `→` step through them.

## Adding a concept

1. Put the page at `<n>/index.html` (e.g. `2/index.html`).
2. Add `<script src="/switcher.js" defer></script>` just before `</body>`.
3. In `switcher.js`, set `ready: true` for that concept in `DEMOS`.

## Local preview

```bash
npx serve .
```

All pages send `noindex` so previews stay out of search results.
