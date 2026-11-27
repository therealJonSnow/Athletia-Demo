/*
  Demo switcher: a small "1 2 3" pill that lets the client flip between concepts.
  - Shows on load, then hides itself after a few seconds of inactivity.
  - Comes back when the pointer moves near the top edge, on touch, or on any key.
  - Keyboard: 1 / 2 / 3 jump to a concept, ← / → step through them.
  Lives in a Shadow DOM so the demos' own CSS can't affect it (and vice versa).
  To add a concept: drop its folder in the repo and set `ready: true` below.
*/
(() => {
  const DEMOS = [
    { n: 1, path: '/1/', label: 'Concept 1', ready: true },
    { n: 2, path: '/2/', label: 'Concept 2', ready: true },
    { n: 3, path: '/3/', label: 'Concept 3', ready: true },
  ];
  const HIDE_AFTER = 2500;     // ms of inactivity before the pill hides
  const FIRST_HIDE = 4000;     // a little longer on first load so it gets noticed
  const REVEAL_ZONE = 96;      // px from the top edge that brings it back

  const seg = location.pathname.split('/').filter(Boolean)[0];
  const current = DEMOS.find(d => String(d.n) === seg) || DEMOS[0];
  const ready = DEMOS.filter(d => d.ready);

  const host = document.createElement('div');
  host.setAttribute('data-demo-switcher', '');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .bar {
        position: fixed; top: 14px; left: 50%; z-index: 2147483647;
        display: flex; gap: 2px; padding: 4px;
        background: rgba(20, 20, 24, 0.72);
        -webkit-backdrop-filter: blur(12px) saturate(1.4); backdrop-filter: blur(12px) saturate(1.4);
        border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 999px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
        font: 500 13px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        transform: translate(-50%, 0); opacity: 1;
        transition: transform .35s cubic-bezier(0.16, 1, 0.3, 1), opacity .25s ease;
      }
      .bar.hidden { transform: translate(-50%, -140%); opacity: 0; pointer-events: none; }
      a, span {
        display: grid; place-items: center; width: 32px; height: 32px; border-radius: 999px;
        color: rgba(255, 255, 255, 0.75); text-decoration: none; font-variant-numeric: tabular-nums;
        transition: background-color .15s ease, color .15s ease;
      }
      a:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
      a:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
      a[aria-current="page"] { background: #fff; color: #111; }
      span { color: rgba(255, 255, 255, 0.28); cursor: not-allowed; }
      @media (prefers-reduced-motion: reduce) { .bar { transition: opacity .2s ease; } .bar.hidden { transform: translate(-50%, 0); } }
    </style>
    <nav class="bar" aria-label="Design concepts">
      ${DEMOS.map(d => d.ready
        ? `<a href="${d.path}" title="${d.label}"${d === current ? ' aria-current="page"' : ''}>${d.n}</a>`
        : `<span title="${d.label} (coming soon)" aria-disabled="true">${d.n}</span>`).join('')}
    </nav>`;
  document.body.appendChild(host);

  const bar = root.querySelector('.bar');
  let timer, hovering = false;

  const show = (ms = HIDE_AFTER) => {
    bar.classList.remove('hidden');
    clearTimeout(timer);
    timer = setTimeout(() => { if (!hovering && !root.activeElement) bar.classList.add('hidden'); }, ms);
  };

  bar.addEventListener('pointerenter', () => { hovering = true; show(); });
  bar.addEventListener('pointerleave', () => { hovering = false; show(); });
  bar.addEventListener('focusout', () => show());
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.clientY < REVEAL_ZONE) show(); }, { passive: true });
  window.addEventListener('touchstart', () => show(3000), { passive: true });

  const go = d => { if (d && d.ready && d !== current) location.href = d.path; };
  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    const i = ready.indexOf(current);
    if (/^[1-9]$/.test(e.key)) go(DEMOS.find(d => d.n === +e.key));
    else if (e.key === 'ArrowRight') go(ready[(i + 1) % ready.length]);
    else if (e.key === 'ArrowLeft') go(ready[(i - 1 + ready.length) % ready.length]);
    show();
  });

  // Warm the other concepts so switching feels instant
  ready.filter(d => d !== current).forEach(d => {
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = d.path; document.head.appendChild(l);
  });

  show(FIRST_HIDE);
})();
