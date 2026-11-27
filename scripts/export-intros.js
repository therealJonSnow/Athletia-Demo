/*
  Export each concept's animation as an MP4.

  Frame-accurate: the page runs on a fake clock. Each frame the clock moves forward exactly
  1/FPS seconds (firing any timers and animation frames due), every running animation or CSS
  transition is set to that same moment, and a screenshot is taken. So the video is perfectly
  smooth however slow the machine is, and works for script-timed intros (Web Animations) and
  timer-driven loops (setTimeout + CSS transitions) alike.

  Usage (from the repo root, needs Playwright + ffmpeg):
    python3 -m http.server 8123 &          # or: npx serve -l 8123 .
    node scripts/export-intros.js                    # all concepts, 1920×1080
    node scripts/export-intros.js 2 --w=1080 --h=1920  # concept 2, portrait

  Options: --w, --h       viewport (default 1920×1080)
           --scale        pixel density (default 1; 2 = 4K from 1920×1080)
           --fps          default 60
           --hold         seconds to hold the final frame (default 1.5; 0 for looping concepts)
           --from, --to   capture window in ms from page start (default: from 0 to when the
                          intro has finished; looping concepts use LOOPS below)
           --suffix       added to the file name
           --url          default http://localhost:8123
  Output: exports/concept-<n>-<w>x<h><suffix>.mp4
*/
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Concepts that loop forever: one full cycle length in ms (capture stops there)
const LOOPS = { 3: 19500 };

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const W = +opt('w', 1920), H = +opt('h', 1080), SCALE = +opt('scale', 1), FPS = +opt('fps', 60);
const BASE = opt('url', 'http://localhost:8123'), SUFFIX = opt('suffix', '');
const concepts = args.filter(a => /^\d+$/.test(a)).map(Number);
const list = concepts.length ? concepts : fs.readdirSync('.').filter(d => /^\d+$/.test(d) && fs.existsSync(`${d}/index.html`)).map(Number).sort();

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync('exports', { recursive: true });

  for (const n of list) {
    const loop = LOOPS[n];
    const FROM = +opt('from', 0), TO = opt('to', loop ? FROM + loop : null), HOLD = +opt('hold', loop ? 0 : 1.5);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, reducedMotion: 'no-preference' });
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);   // without this the fake clock still runs in real time between frames
    await page.goto(`${BASE}/${n}/`);

    // Let fonts and images load in real time while the page clock stays at 0
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    // Hide preview-only chrome: the concept switcher and any replay button
    await page.addStyleTag({ content: '[data-demo-switcher], .replay { display: none !important; }' });

    // Pin every animation to the fake clock; returns true once the intro has fully settled
    const sync = () => page.evaluate(() => {
      const now = performance.now();
      let seen = (window.__seen ||= 0), running = 0;
      for (const a of document.getAnimations()) {
        if (a.__born === undefined) { a.__born = now; a.pause(); window.__seen = ++seen; }
        const end = a.effect.getComputedTiming().endTime;
        a.currentTime = Math.min(now - a.__born, end);
        if (now - a.__born < end) running++;
      }
      return seen > 0 && running === 0;
    });

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `export-${n}-`));
    let t = 0, frame = 0, idle = 0;
    const step = async ms => { if (ms > 0) await page.clock.runFor(ms); t += ms; return sync(); };

    // Fast-forward to the start of the capture window
    for (let target = 16; target <= FROM; target += 16) await step(target - t);
    await step(FROM - t);

    for (let i = 0; ; i++) {
      const target = FROM + Math.round((i * 1000) / FPS);
      if (TO !== null && target > +TO) break;
      const settled = await step(target - t);
      await page.screenshot({ path: path.join(dir, `f${String(frame++).padStart(5, '0')}.png`) });
      if (TO === null && settled && ++idle > 2) break;   // intro done: stop a couple of frames later
      if (target > 60000) break;                          // safety net
      if (i % FPS === 0) process.stdout.write(`concept ${n}: ${(target / 1000).toFixed(0)}s\r`);
    }

    const out = `exports/concept-${n}-${W * SCALE}x${H * SCALE}${SUFFIX}.mp4`;
    const vf = HOLD > 0 ? ['-vf', `tpad=stop_mode=clone:stop_duration=${HOLD}`] : [];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'), ...vf,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`concept ${n}: ${out} (${(frame / FPS + HOLD).toFixed(1)}s)          `);
    await page.close();
  }
  await browser.close();
})();
