# Phase 1 — Pill Grid Snapping
> **Scope:** `style.css`, `script.js` only.

---

## The Logic

Grid lines sit at x = `--grid-margin` + n × `--dither-cell` across the full browser.
For a pill's edges to land on grid lines:
- Its **left edge** must be on a grid line
- Its **width** must be a multiple of `--dither-cell` (right edge is then automatically on a grid line)

Left edges cascade left→right: if the logo cell's right edge is grid-aligned, the tab cell starts grid-aligned. With whole-tile padding inside each cell, the pill left edge is grid-aligned. Pill width snapped to cell multiple → right edge grid-aligned. Repeat for each cell.

---

## Step 1 — Fix cell paddings to whole tiles only (style.css)

All horizontal padding in nav cells must be exact multiples of `--dither-cell`. No 1.5-tile values.

```css
.logo {
  grid-area: logo;
  display: flex;
  align-items: center;
  padding-left: calc(var(--dither-cell, 15px) * 2);   /* 2 tiles */
  padding-right: var(--dither-cell, 15px);              /* 1 tile */
  border-right: 1px solid var(--card-border);
  height: 100%;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.tab-cell {
  grid-area: tabs;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: var(--dither-cell, 15px);               /* 1 tile */
  padding-right: var(--dither-cell, 15px);              /* 1 tile */
  border-right: 1px solid var(--card-border);
}

.nav-showcase {
  grid-area: showcase;
  display: flex;
  align-items: center;
  padding-left: var(--dither-cell, 15px);               /* 1 tile */
  padding-right: var(--dither-cell, 15px);              /* 1 tile */
  border-right: 1px solid var(--card-border);
}

.nav-origins {
  grid-area: origins;
  display: flex;
  align-items: center;
  padding-left: var(--dither-cell, 15px);               /* 1 tile — right padding set by JS */
}
```

---

## Step 2 — `snapPillsToGrid()` function (script.js)

Add this function. It must be called at the END of `snapAllToGrid()`, after nav height and main window width are already set.

```js
function snapPillsToGrid() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const gridMargin = cell * 2;
  if (!cell || cell <= 0) return;

  // ── 1. Snap logo cell width ──────────────────────────────────────
  // Ensures the tab cell starts on a grid line.
  const logo = document.querySelector('.logo');
  logo.style.width = '';                                 // reset to measure natural
  const logoSnapped = Math.ceil(logo.getBoundingClientRect().width / cell) * cell;
  logo.style.width = logoSnapped + 'px';

  // ── 2. Snap tab-nav pill width ───────────────────────────────────
  // tab cell left edge = logoSnapped (grid-aligned) ✓
  // tab cell padding-left = 1 tile → pill left edge on grid line ✓
  // pill width snapped → pill right edge on grid line ✓
  const tabNav = document.querySelector('.tab-nav');
  tabNav.style.width = '';
  const tabSnapped = Math.ceil(tabNav.getBoundingClientRect().width / cell) * cell;
  tabNav.style.width = tabSnapped + 'px';

  // ── 3. Snap showcase pill width ──────────────────────────────────
  const showcase = document.querySelector('#nav-showcase');
  if (showcase) {
    showcase.style.width = '';
    showcase.style.width =
      Math.ceil(showcase.getBoundingClientRect().width / cell) * cell + 'px';
  }

  // ── 4. Snap origins pill width + align right edge to main window ─
  // The main window's right edge is already grid-aligned (set by snapAllToGrid).
  // We want the origins pill right edge to land exactly there.
  // So: origins cell padding-right = browser_width − gridMargin − mainW
  const origins = document.querySelector('#nav-origins');
  const mainWindow = document.querySelector('.main-window');
  if (origins && mainWindow) {
    origins.style.width = '';
    origins.style.width =
      Math.ceil(origins.getBoundingClientRect().width / cell) * cell + 'px';

    const mainW = parseFloat(mainWindow.style.width);
    const rightGap = window.innerWidth - gridMargin - mainW;
    document.querySelector('.nav-origins').style.paddingRight = rightGap + 'px';
  }
}
```

Then at the bottom of `snapAllToGrid()`, add:

```js
  // Snap pill edges to grid lines — must run after nav height + main window width are set
  snapPillsToGrid();
```

---

## Why this works

| Element | Left edge | Width | Right edge |
|---------|-----------|-------|------------|
| Logo cell | x=0 (browser edge) | snapped to cell multiple | grid-aligned ✓ |
| Tab pill | logo_width + 1 tile | snapped to cell multiple | grid-aligned ✓ |
| Showcase pill | tab_cell_end + 1 tile | snapped to cell multiple | grid-aligned ✓ |
| Origins pill | showcase_cell_end + 1 tile | snapped to cell multiple | = main window right edge ✓ |
