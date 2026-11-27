/*
  Export each concept's intro animation as an MP4.

  Frame-accurate: the intro is paused and stepped forward 1/FPS seconds at a time, with a
  screenshot per step, so the video is perfectly smooth however slow the machine is.

  Usage (from the repo root, needs Playwright + ffmpeg):
    python3 -m http.server 8123 &          # or: npx serve -l 8123 .
    node scripts/export-intros.js            # all concepts, 1920×1080
    node scripts/export-intros.js 2 --w=1080 --h=1920   # concept 2, portrait

  Options: --w, --h (viewport, default 1920×1080), --scale (pixel density, default 1),
           --fps (default 60), --hold (seconds on the final frame, default 1.5),
           --url (default http://localhost:8123)
  Output: exports/concept-<n>-<w>x<h>.mp4
*/
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const W = +opt('w', 1920), H = +opt('h', 1080), SCALE = +opt('scale', 1);
const FPS = +opt('fps', 60), HOLD = +opt('hold', 1.5), BASE = opt('url', 'http://localhost:8123');
const concepts = args.filter(a => /^\d+$/.test(a)).map(Number);
const list = concepts.length ? concepts : fs.readdirSync('.').filter(d => /^\d+$/.test(d) && fs.existsSync(`${d}/index.html`)).map(Number);

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync('exports', { recursive: true });

  for (const n of list) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, reducedMotion: 'no-preference' });
    await page.goto(`${BASE}/${n}/`);

    // Wait for the intro to start, then freeze every animation at t = 0
    await page.waitForFunction(() => document.getAnimations().length > 5, null, { timeout: 15000 });
    const end = await page.evaluate(() => {
      const anims = document.getAnimations();
      anims.forEach(a => { a.pause(); a.currentTime = 0; });
      window.__anims = anims;
      // Hide preview-only chrome: the concept switcher and any replay button
      document.querySelector('[data-demo-switcher]')?.remove();
      const s = document.createElement('style'); s.textContent = '.replay{display:none!important}'; document.head.appendChild(s);
      return Math.max(...anims.map(a => a.effect.getComputedTiming().endTime));
    });

    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), `intro-${n}-`));
    const frames = Math.ceil((end / 1000) * FPS);
    for (let i = 0; i <= frames; i++) {
      // Stop just short of the end so the pages' "intro finished" clean-up doesn't fire mid-capture
      const t = Math.min((i * 1000) / FPS, end - 0.5);
      await page.evaluate(t => window.__anims.forEach(a => { a.currentTime = t; }), t);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`) });
      if (i % FPS === 0) process.stdout.write(`concept ${n}: ${(i / FPS).toFixed(0)}s / ${(end / 1000).toFixed(1)}s\r`);
    }

    const out = `exports/concept-${n}-${W * SCALE}x${H * SCALE}.mp4`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'),
      '-vf', `tpad=stop_mode=clone:stop_duration=${HOLD}`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`concept ${n}: ${out} (${(end / 1000 + HOLD).toFixed(1)}s)          `);
    await page.close();
  }
  await browser.close();
})();
