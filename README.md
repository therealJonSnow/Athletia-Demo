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

## Fonts

Both concepts use **Season Collection (TRIAL)**, a single variable font in `fonts/`, loaded by `fonts/season.css`. Pick the style with the `SERF` axis: Sans is the default (`0`), Mix is `font-variation-settings: "SERF" 50`, and Serif is `100`. Weight runs 300 to 900. Replace the trial file with the licensed one before launch.

## Exporting the intros as video

```bash
python3 -m http.server 8123 &
node scripts/export-intros.js
```

The script renders each concept's intro frame by frame at 60fps and saves it as `exports/concept-<n>-1920x1080.mp4`. Exports are gitignored. Pass a concept number to export just that one, or `--w=1080 --h=1920` for portrait. The script header lists the other options. It needs Playwright and ffmpeg.
