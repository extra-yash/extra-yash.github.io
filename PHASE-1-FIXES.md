# Phase 1 — Fixes
> **Scope:** `dither.js`, `script.js`, `style.css` only.
> **Do NOT touch:** any HTML files, `brand/`, `strategy/`, `strategy-source/`.

---

## Fix 1 — Dither distortion on reload (ordering + public resize)

### dither.js — expose `resize` as public API

At the bottom of the `DitherBG` IIFE, add `resize` to the returned public object:

```js
// Change this:
return { init, setColor, setBgColor, setColorScale, clearColorScale, stop };

// To this:
return { init, resize, setColor, setBgColor, setColorScale, clearColorScale, stop };
```

Also remove the internal `window.addEventListener('resize', resize)` line from inside `init()`. Resize will now be driven entirely by `snapAllToGrid()` in script.js to guarantee ordering:

```js
// DELETE this line inside init():
window.addEventListener('resize', resize);
```

### script.js — guaranteed init order

Find wherever `DitherBG.init(...)` is called and restructure so `snapAllToGrid()` runs first:

```js
// 1. Set main-window geometry BEFORE dither canvas is created
snapAllToGrid();

// 2. NOW init dither — resize() reads correct main-window dimensions
DitherBG.init({ color: '...', bgColor: '...' }); // keep existing options

// 3. Re-snap after init (canvas is now in DOM, measurements are final)
snapAllToGrid();
```

Update `snapAllToGrid()` to call `DitherBG.resize()` at the end (after setting all dimensions), so the canvas always matches the main-window:

```js
function snapAllToGrid() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2;
  if (!cell || cell <= 0) return;

  // NAV
  const nav = document.querySelector('.top-nav');
  nav.style.height = '';
  const navSnapped = Math.ceil(nav.getBoundingClientRect().height / cell) * cell;
  nav.style.height = navSnapped + 'px';

  // MAIN WINDOW — width snapped so right edge lands on a grid line
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

  // FOOTER
  const footer = document.querySelector('.site-footer');
  if (footer) {
    footer.style.transition = 'none';
    footer.style.maxHeight = 'none';
    const footerSnapped = Math.ceil(footer.scrollHeight / cell) * cell;
    footer.style.maxHeight = '';
    requestAnimationFrame(() => { footer.style.transition = ''; });
    document.documentElement.style.setProperty('--footer-snapped-h', footerSnapped + 'px');
    footer.style.width = mainW + 'px';
    footer.style.marginLeft = margin + 'px';
  }

  // SNAP SECTIONS
  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainH + 'px';
  });

  // DITHER CANVAS — resize after layout is final
  if (typeof DitherBG !== 'undefined' && DitherBG.resize) {
    DitherBG.resize();
  }
}

// Drive resize from one place only
window.addEventListener('resize', snapAllToGrid);
```

---

## Fix 2 — Hero void offset (canvas-relative coordinates)

### dither.js — subtract canvas origin from hero rect

Find the section that calculates the hero void (around lines 580–605). The `getBoundingClientRect()` calls return viewport-relative coordinates, but the shader expects canvas-relative coordinates (canvas top-left = 0,0).

Replace this block:

```js
els.forEach(el => {
  const r = el.getBoundingClientRect();
  x1 = Math.min(x1, r.left);
  y1 = Math.min(y1, r.top);
  x2 = Math.max(x2, r.right);
  y2 = Math.max(y2, r.bottom);
});
// Ellipse centre in GL coords (Y-flipped)
const cx = (x1 + x2) / 2;
const cy = h - (y1 + y2) / 2;
```

With:

```js
const canvasOrigin = canvas.getBoundingClientRect(); // canvas position in viewport
els.forEach(el => {
  const r = el.getBoundingClientRect();
  // Convert from viewport-relative to canvas-relative
  x1 = Math.min(x1, r.left   - canvasOrigin.left);
  y1 = Math.min(y1, r.top    - canvasOrigin.top);
  x2 = Math.max(x2, r.right  - canvasOrigin.left);
  y2 = Math.max(y2, r.bottom - canvasOrigin.top);
});
// Ellipse centre in GL coords (Y-flipped relative to canvas height)
const cx = (x1 + x2) / 2;
const cy = h - (y1 + y2) / 2;
```

Similarly, find the mouse position uniform — `mouseX` and `mouseY` are set from `e.clientX / e.clientY`. These are viewport-relative and the shader currently expects them in canvas-relative space. Update the mousemove listener:

```js
window.addEventListener('mousemove', e => {
  const cr = canvas.getBoundingClientRect();
  mouseX = e.clientX - cr.left;
  mouseY = e.clientY - cr.top;  // NO JS flip — shader converts to GL space
});
```

---

## Fix 3 — WHY IS EXTRA right alignment (style.css)

Add right padding to `.nav-origins` so the pill aligns with the main window's right edge:

```css
.nav-origins {
  grid-area: origins;
  display: flex;
  align-items: center;
  padding: calc(var(--dither-cell, 15px) * 0.5) var(--grid-margin, 30px)
           calc(var(--dither-cell, 15px) * 0.5) calc(var(--dither-cell, 15px) * 1.5);
  /* top | right(=grid-margin) | bottom | left */
}
```

---

## Fix 4 — Frost on tab pills and nav pills (style.css)

Restore frosted glass on the tab-nav pill container. The background must be semi-transparent and backdrop-filter must be present:

```css
.tab-nav {
  grid-area: tabs;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--dither-cell, 15px) * 0.5) calc(var(--dither-cell, 15px) * 2);
  border-right: 1px solid var(--card-border);
  gap: 4px;
  /* Frosted pill container */
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border-radius: 50px;
  /* inner padding creates the pill shape around the buttons */
}
```

Restore frost on the active state for `.tab-btn`:

```css
.tab-btn.active {
  background: var(--accent);
  color: var(--bg);
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}
```

Restore frost on `.nav-pill-btn` default state (not just hover):

```css
.nav-pill-btn {
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
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
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
  color: var(--text);
}
```
