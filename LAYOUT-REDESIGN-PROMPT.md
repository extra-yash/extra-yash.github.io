# Layout Redesign Prompt — Extra Collective Site

> **Scope:** `index.html`, `style.css`, `script.js`, `dither.js` only.
> **Do NOT touch:** `brand/`, `strategy/`, `strategy-source/`, `onboarding/`.
> **Do NOT empty any HTML file.** Run the audit command at the end before committing.

---

## The Core Concept

The page is a rigid shell: `100dvh`, no body scroll. Inside it lives:
1. A **nav bar** — exposed grid, logo + tabs + links
2. A **main window** — the "TV screen", bordered box, all content and dither live inside
3. A **footer** — collapsed pill bar that pushes the main window up when revealed

All three elements snap their heights to the dither grid unit (`--dither-cell`). This is the single rule that makes everything feel structurally coherent.

---

## Step 1 — Expose `CELL_SIZE` as a CSS Variable (dither.js)

In `dither.js`, immediately after `CELL_SIZE` is defined (around line 31), add:

```js
document.documentElement.style.setProperty('--dither-cell', CELL_SIZE + 'px');
```

This must run before any layout snapping. Everything downstream reads `--dither-cell`.

---

## Step 2 — The Universal Grid-Snap Function (script.js)

Add this function. It must run:
- Once after dither initialises (call it at the end of `DitherBG.init()` or in a `DOMContentLoaded` handler after dither is set up)
- Again on every `window.resize`

```js
function snapAllToGrid() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  if (!cell || cell <= 0) return;

  // ── NAV ──────────────────────────────────────────────────────────
  const nav = document.querySelector('.top-nav');
  nav.style.height = '';                                      // reset to measure
  const navSnapped = Math.ceil(nav.getBoundingClientRect().height / cell) * cell;
  nav.style.height = navSnapped + 'px';

  // ── FOOTER ────────────────────────────────────────────────────────
  // Measure footer's natural open height without triggering a transition
  const footer = document.querySelector('.site-footer');
  footer.style.transition = 'none';
  footer.style.maxHeight = 'none';
  const footerSnapped = Math.ceil(footer.scrollHeight / cell) * cell;
  footer.style.maxHeight = '';                               // restore collapsed
  requestAnimationFrame(() => { footer.style.transition = ''; }); // re-enable
  document.documentElement.style.setProperty('--footer-snapped-h', footerSnapped + 'px');

  // ── MAIN WINDOW ──────────────────────────────────────────────────
  // Floor remaining space to nearest cell — any sub-cell remainder is
  // absorbed as dark background below the box (invisible against --bg).
  const remaining = window.innerHeight - navSnapped;
  const mainSnapped = Math.floor(remaining / cell) * cell;
  const mainWindow = document.querySelector('.main-window');
  mainWindow.style.height = mainSnapped + 'px';

  // ── SNAP SECTIONS ─────────────────────────────────────────────────
  // Each snap section = exactly the main window's visible height.
  // Since mainSnapped is already a grid multiple, sections inherit it.
  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainSnapped + 'px';
  });
}

window.addEventListener('resize', snapAllToGrid);
```

When the footer opens, call this to shrink the main window:

```js
function openFooter() {
  const footer = document.querySelector('.site-footer');
  footer.classList.add('open');
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const footerH = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--footer-snapped-h')
  );
  const nav = document.querySelector('.top-nav');
  const navH = nav.getBoundingClientRect().height;
  const remaining = window.innerHeight - navH - footerH;
  const mainSnapped = Math.floor(remaining / cell) * cell;
  const mainWindow = document.querySelector('.main-window');
  mainWindow.style.height = mainSnapped + 'px';
  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainSnapped + 'px';
  });
}

function closeFooter() {
  const footer = document.querySelector('.site-footer');
  footer.classList.remove('open');
  snapAllToGrid(); // restore full main window height
}
```

---

## Step 3 — Body & Page Shell (style.css)

Replace the existing `body` rule with:

```css
body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: var(--body-font-size);
  line-height: 1.6;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  align-items: stretch;
  position: relative;
}
```

---

## Step 4 — Nav Bar: Exposed Grid (style.css + index.html)

**CSS — replace `.top-nav`:**

```css
.top-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-areas: 'logo tabs cta';
  align-items: center;
  /* height set by JS snapAllToGrid() */
  flex-shrink: 0;
  width: 100%;
  position: relative;

  /* Structural borders */
  border: 1px solid var(--card-border);
  border-bottom: none; /* main window provides the shared border */

  /* Exposed dither grid echo — lines at --dither-cell intervals */
  background-image:
    repeating-linear-gradient(
      90deg,
      var(--card-border) 0px,
      var(--card-border) 1px,
      transparent 1px,
      transparent var(--dither-cell)
    ),
    repeating-linear-gradient(
      0deg,
      var(--card-border) 0px,
      var(--card-border) 1px,
      transparent 1px,
      transparent var(--dither-cell)
    );

  /* Column cell dividers */
  border-right: none;
  border-left: none;
}

/* Vertical dividers between grid areas */
.logo {
  grid-area: logo;
  padding: 0 24px;
  border-right: 1px solid var(--card-border);
  height: 100%;
  display: flex;
  align-items: center;
}

.tab-nav {
  grid-area: tabs;
  padding: 0 24px;
  border-right: 1px solid var(--card-border);
  height: 100%;
  display: flex;
  align-items: center;
  /* keep existing pill container styling */
}

.nav-links {
  grid-area: cta;
  justify-self: end;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 20px;
}
```

---

## Step 5 — Main Window: The TV Screen (index.html + style.css)

**index.html** — Wrap everything between `</nav>` and `<footer>` in a `<main>` element. Also move the dither `<canvas>` (currently a direct child of `<body>`) to be the FIRST child of `.main-window`:

```html
<nav class="top-nav">…</nav>

<main class="main-window" id="main-window">
  <canvas id="dither-canvas" aria-hidden="true"></canvas>  <!-- moved here -->
  <!-- all .tab-panel sections -->
</main>

<footer class="site-footer">…</footer>
```

**CSS:**

```css
.main-window {
  /* height set by JS snapAllToGrid() */
  flex-shrink: 0;
  overflow: hidden;                         /* JS drives scroll, not CSS */
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  position: relative;
  background: var(--bg);
}

/* Dither canvas fills the whole window */
#dither-canvas,
.dither-canvas {                            /* match whatever id/class dither.js assigns */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* All tab panels sit above the canvas */
.tab-panel {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

---

## Step 6 — Snap Sections: Film Strip (index.html + style.css)

Wrap each logical content block inside every `.tab-panel` in a `.snap-section` div. The hero is one snap section. Each subsequent content section (How We Work, What We Master, The Difference, etc.) is its own snap section.

Example structure for `#panel-brands`:

```html
<section class="tab-panel active" id="panel-brands">

  <div class="snap-section" data-snap="hero">
    <header class="hero-section">…</header>
  </div>

  <div class="snap-section" data-snap="how-we-work">
    <section class="content-section">…HOW WE WORK…</section>
  </div>

  <div class="snap-section" data-snap="what-we-master">
    <section class="content-section mastery-section">…</section>
  </div>

  <div class="snap-section" data-snap="the-difference">
    <section class="content-section comparison-section">…</section>
  </div>

  <!-- etc. -->

</section>
```

**CSS:**

```css
.snap-section {
  /* height set by JS snapAllToGrid() */
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;   /* vertically centre content within the frame */
}
```

---

## Step 7 — Film Strip Scroll: Ease-Out JS (script.js)

Replace any existing scroll logic on the main window with this. Do NOT use CSS `scroll-snap`.

```js
(function () {
  let isAnimating = false;
  let currentSnap = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function getActivePanel() {
    return document.querySelector('.tab-panel.active');
  }

  function getSnapSections() {
    return Array.from(getActivePanel()?.querySelectorAll('.snap-section') || []);
  }

  function scrollToSnap(index, duration = 600) {
    const panel = getActivePanel();
    if (!panel || isAnimating) return;
    const sections = getSnapSections();
    if (!sections[index]) return;

    const targetY = sections[index].offsetTop;
    const startY = panel.scrollTop;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    isAnimating = true;
    currentSnap = index;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      panel.scrollTop = startY + distance * easeOutCubic(progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        isAnimating = false;
        // Check if we're at the last section — reveal footer
        if (index === sections.length - 1) {
          openFooter();
        } else {
          closeFooter();
        }
      }
    }
    requestAnimationFrame(step);
  }

  function onWheel(e) {
    if (isAnimating) return;
    e.preventDefault();
    const sections = getSnapSections();
    if (e.deltaY > 0 && currentSnap < sections.length - 1) {
      scrollToSnap(currentSnap + 1);
    } else if (e.deltaY < 0 && currentSnap > 0) {
      scrollToSnap(currentSnap - 1);
    } else if (e.deltaY < 0 && currentSnap === 0) {
      closeFooter();
    }
  }

  document.getElementById('main-window').addEventListener('wheel', onWheel, { passive: false });

  // Reset on tab switch
  document.querySelectorAll('.tab-btn, .nav-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSnap = 0;
      closeFooter();
      requestAnimationFrame(() => {
        const panel = getActivePanel();
        if (panel) panel.scrollTop = 0;
      });
    });
  });
})();
```

---

## Step 8 — Footer: Push Behaviour (style.css)

```css
.site-footer {
  flex-shrink: 0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.22, 1, 0.36, 1);

  /* Pill bar styling */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border: 1px solid var(--card-border);
  border-top: none;                         /* main window provides shared border */
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  font-family: var(--font-body);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.site-footer.open {
  max-height: var(--footer-snapped-h);
}
```

---

## Step 9 — Touch Support (script.js)

Add basic touch swipe to the main window (same logic as wheel):

```js
(function () {
  let touchStartY = 0;
  const mainWindow = document.getElementById('main-window');

  mainWindow.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  mainWindow.addEventListener('touchend', e => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 40) return; // ignore tiny swipes
    const event = { deltaY: delta, preventDefault: () => {} };
    // reuse wheel logic — dispatch synthetic
    mainWindow.dispatchEvent(new WheelEvent('wheel', { deltaY: delta, cancelable: true }));
  }, { passive: true });
})();
```

---

## Step 10 — Audit Before Commit

```bash
find . -name "*.html" \
  -not -path "./.git/*" \
  -not -path "./strategy-source/node_modules/*" \
  -exec wc -c {} \; | sort -n
```

Any file at `0` bytes must be fixed before pushing.

---

## Summary of Files Changed

| File | What changes |
|------|-------------|
| `dither.js` | Set `--dither-cell` CSS var from `CELL_SIZE` |
| `style.css` | Body, nav, main-window, snap-section, footer rules |
| `index.html` | Wrap content in `.main-window`, add `.snap-section` divs, move canvas |
| `script.js` | `snapAllToGrid()`, film strip scroll, footer open/close |
