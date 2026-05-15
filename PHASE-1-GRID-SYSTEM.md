# Phase 1 — Grid System
> **Scope:** `index.html`, `style.css`, `dither.js`, `script.js` only.
> **Do NOT touch:** `brand/`, `strategy/`, `strategy-source/`, `onboarding/`.
> **Do NOT empty any HTML file.**

---

## The Goal

A single continuous grid covers the entire browser window. It is the same grid as the dither canvas — same pitch, same origin. The nav, margins, and exposed body areas all echo this grid. The main window, nav pills, and footer sit *on top* of it. The grid is the substrate for everything.

---

## Step 1 — Grid Origin Variables (dither.js + script.js)

### dither.js
After `CELL_SIZE` is defined (around line 31), set two CSS variables:

```js
document.documentElement.style.setProperty('--dither-cell', CELL_SIZE + 'px');
document.documentElement.style.setProperty('--grid-margin', (CELL_SIZE * 2) + 'px');
```

`--grid-margin` = exactly 2 tiles. This is the persistent margin on both sides of the main window and the logo nudge. Everything derives from these two values.

### script.js — update `snapAllToGrid()`
Add width-snapping for the main window so its RIGHT edge also falls on a grid line:

```js
function snapAllToGrid() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2; // --grid-margin in px

  if (!cell || cell <= 0) return;

  // ── NAV height ───────────────────────────────────────────────────
  const nav = document.querySelector('.top-nav');
  nav.style.height = '';
  const navSnapped = Math.ceil(nav.getBoundingClientRect().height / cell) * cell;
  nav.style.height = navSnapped + 'px';

  // ── MAIN WINDOW size ─────────────────────────────────────────────
  // Left edge = exactly 2 cells from browser left.
  // Width = largest multiple of cell that fits in (viewport - 2 margins).
  // Right edge therefore also lands on a grid line.
  const availableW = window.innerWidth - 2 * margin;
  const mainW = Math.floor(availableW / cell) * cell;
  const remainingH = window.innerHeight - navSnapped;
  const mainH = Math.floor(remainingH / cell) * cell;

  const mainWindow = document.querySelector('.main-window');
  mainWindow.style.width = mainW + 'px';
  mainWindow.style.marginLeft = margin + 'px';
  mainWindow.style.marginRight = 'auto';
  mainWindow.style.height = mainH + 'px';
  mainWindow.style.flex = 'none';

  // ── FOOTER ───────────────────────────────────────────────────────
  const footer = document.querySelector('.site-footer');
  footer.style.transition = 'none';
  footer.style.maxHeight = 'none';
  const footerSnapped = Math.ceil(footer.scrollHeight / cell) * cell;
  footer.style.maxHeight = '';
  requestAnimationFrame(() => { footer.style.transition = ''; });
  document.documentElement.style.setProperty('--footer-snapped-h', footerSnapped + 'px');
  // Footer matches main window width exactly
  footer.style.width = mainW + 'px';
  footer.style.marginLeft = margin + 'px';

  // ── SNAP SECTIONS ────────────────────────────────────────────────
  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainH + 'px';
  });
}
```

---

## Step 2 — Global Grid Background (style.css)

The grid lives on `body`. It covers the entire browser at all times using a fixed `background-attachment` so it never moves regardless of scroll or layout shifts.

Remove any existing `background-image` from `.top-nav`.

```css
body {
  /* existing properties stay — ADD these: */
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 0px,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent var(--dither-cell, 15px)
    ),
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.04) 0px,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent var(--dither-cell, 15px)
    );
  background-position: var(--grid-margin, 30px) 0;
  background-attachment: fixed;
  background-size: var(--dither-cell, 15px) var(--dither-cell, 15px);
}
```

**Why `background-position: var(--grid-margin) 0`:** The left edge of the main window sits at exactly `--grid-margin` from the browser left. By offsetting the grid origin by the same amount, the first vertical grid line lands exactly on the main window's left border. All subsequent lines are multiples of `--dither-cell`, so they cascade perfectly across both the nav area and the dither canvas below.

**Why `background-attachment: fixed`:** The grid is a viewport-fixed texture. It doesn't scroll with content. This ensures the nav's grid and the dither canvas's grid share the same absolute pixel origin.

---

## Step 3 — Nav Bar: Grid Echo + Structure (style.css + index.html)

The nav already has the body grid behind it (body background shows through). The nav's own background is now just structure — it does NOT add a second grid. Remove `background-image` from `.top-nav` entirely. Keep only:

```css
.top-nav {
  display: grid;
  grid-template-columns: auto 1fr auto auto; /* logo | tabs | showcase | why-is-extra */
  grid-template-areas: 'logo tabs showcase origins';
  align-items: stretch;           /* cells fill full nav height — dividers go edge to edge */
  flex-shrink: 0;
  width: 100%;
  background: var(--bg);          /* solid dark — grid shows through from body behind */
  background-color: transparent;  /* actually keep transparent so body grid shows */
  border-bottom: 1px solid var(--card-border);  /* ticker line under header */
  position: relative;
  z-index: 100;
}
```

**Make nav background transparent** so the body grid shows through:
```css
.top-nav {
  background: transparent;
}
```

### Column dividers
Each grid area cell gets a right border to act as a structural divider:

```css
.logo {
  grid-area: logo;
  display: flex;
  align-items: center;
  padding: 0 calc(var(--dither-cell, 15px) * 1.5);
  padding-left: var(--grid-margin, 30px);   /* 2-tile nudge from browser edge */
  border-right: 1px solid var(--card-border);
}

.tab-nav {
  grid-area: tabs;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--dither-cell, 15px) * 0.5) calc(var(--dither-cell, 15px) * 2);
  border-right: 1px solid var(--card-border);
  /* keep existing pill container styling (border, border-radius, background, backdrop-filter) */
  /* but remove the outer container border — it's now on the cell, not the pill group */
}

.nav-showcase {
  grid-area: showcase;
  display: flex;
  align-items: center;
  padding: calc(var(--dither-cell, 15px) * 0.5) calc(var(--dither-cell, 15px) * 1.5);
  border-right: 1px solid var(--card-border);
}

.nav-origins {
  grid-area: origins;
  display: flex;
  align-items: center;
  padding: calc(var(--dither-cell, 15px) * 0.5) calc(var(--dither-cell, 15px) * 1.5);
  /* no right border — right edge of nav is the browser margin */
}
```

### index.html — Nav restructure
Split `.nav-links` into two separate elements and update grid areas:

```html
<nav class="top-nav" role="navigation" aria-label="Main navigation">

  <a href="#brands" class="logo" id="brand-logo" aria-label="Extra Collective — Home">
    <img src="./assets/EXTRA LOGO LIGHT.svg" alt="Extra Collective" height="28">
  </a>

  <div class="tab-nav" role="tablist" aria-label="Audience tabs">
    <button class="tab-btn active" data-tab="brands" role="tab" aria-selected="true"
      id="tab-brands" aria-controls="panel-brands">BUILD A BRAND</button>
    <button class="tab-btn" data-tab="agencies" role="tab" aria-selected="false"
      id="tab-agencies" aria-controls="panel-agencies">EXTEND YOUR TEAM</button>
    <button class="tab-btn" data-tab="creatives" role="tab" aria-selected="false"
      id="tab-creatives" aria-controls="panel-creatives">JOIN THE COLLECTIVE</button>
  </div>

  <div class="nav-showcase">
    <button class="nav-pill-btn" data-tab="showcase" id="nav-showcase">SHOWCASE</button>
  </div>

  <div class="nav-origins">
    <button class="nav-pill-btn" data-tab="origins" id="nav-origins">WHY IS EXTRA</button>
  </div>

</nav>
```

### Pill styling for Showcase + Why Is Extra
These should look like secondary pills — smaller, outlined, matching the tab pill family:

```css
.nav-pill-btn {
  background: transparent;
  border: 1px solid var(--card-border);
  border-radius: 50px;
  color: var(--text-muted);
  padding: 8px 18px;
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: all 0.3s ease;
  cursor: none;
}

.nav-pill-btn:hover,
.nav-pill-btn.active {
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  color: var(--text);
  border-color: var(--accent);
}
```

Also update JS tab-switching to handle `.nav-pill-btn` active state alongside `.tab-btn`.

---

## Step 4 — Main Window & Margins (style.css)

The main window width and left margin are set by JS in `snapAllToGrid()`. The CSS only defines shape and containment:

```css
.main-window {
  /* width, height, marginLeft set by JS */
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  position: relative;
  background: var(--bg);
}
```

Remove any existing `max-width`, `margin: 0 auto`, or `padding` from `.main-window`. JS owns its geometry.

The body grid (Step 2) is already visible in the 2-tile margins on both sides and above/below the main window. No additional CSS needed.

---

## Step 5 — Inner Content Margin (style.css)

All content within snap sections must respect a 5-tile inner margin from the main window edges. Add this once:

```css
.snap-section {
  padding: calc(var(--dither-cell, 15px) * 5);
}
```

This replaces any existing padding on `.hero-section`, `.content-section`, etc. Remove those individual paddings — the snap-section padding handles it universally.

Exception classes can override later (e.g., full-bleed elements): `.snap-section > .full-bleed { margin: calc(var(--dither-cell, 15px) * -5); }`.

---

## Step 6 — Audit Before Commit

```bash
find . -name "*.html" \
  -not -path "./.git/*" \
  -not -path "./strategy-source/node_modules/*" \
  -exec wc -c {} \; | sort -n
```

Any file at `0` bytes must be fixed before committing.

---

## Summary

| File | What changes |
|------|-------------|
| `dither.js` | Sets `--dither-cell` and `--grid-margin` CSS vars |
| `style.css` | Body gets global fixed grid; nav transparent + border dividers; main-window CSS-only shape; nav-pill-btn styles; snap-section inner padding |
| `index.html` | Nav restructured to 4 grid areas; showcase + origins become `.nav-pill-btn` inside their own grid cells |
| `script.js` | `snapAllToGrid()` calculates main-window width (grid-aligned right edge), height, footer, and snap sections all from the same cell unit |
