# Phase 2 — Footer Smooth Transition Fix
> **Scope:** `style.css`, `script.js` only.

---

## Fix 1 — style.css

Add a transition to `.main-window` so it shrinks smoothly when the footer opens.
Match the easing and duration exactly to the footer transition:

```css
.main-window {
  transition: height 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.main-window.no-transition {
  transition: none;
}
```

---

## Fix 2 — script.js

### Disable transition during layout snaps

`snapAllToGrid()` sets the main window height instantly (resize, init). Add and remove `.no-transition` around it so the CSS transition never fires during layout calculations:

At the very top of `snapAllToGrid()`, add:

```js
const mainWindow = document.querySelector('.main-window');
if (mainWindow) mainWindow.classList.add('no-transition');
```

At the very bottom of `snapAllToGrid()` (after `snapPillsToGrid()`), add:

```js
requestAnimationFrame(() => {
  if (mainWindow) mainWindow.classList.remove('no-transition');
});
```

### Update `openFooter()` — let CSS transitions do the work

Remove the snap section height updates from inside `openFooter()`. The main window height change triggers the CSS transition. Snap sections update after the transition completes:

```js
function openFooter() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2;
  const footerH = cell * 3;

  const footer = document.querySelector('.site-footer');
  const mainWindow = document.querySelector('.main-window');
  const nav = document.querySelector('.top-nav');

  const navH = parseFloat(nav.style.height);
  const remainingH = window.innerHeight - navH - footerH;
  const mainH = Math.floor(remainingH / cell) * cell;

  // Both of these trigger their CSS transitions simultaneously
  footer.classList.add('open');
  mainWindow.style.height = mainH + 'px';

  // Update snap section heights AFTER transition completes (500ms)
  setTimeout(() => {
    document.querySelectorAll('.snap-section').forEach(s => {
      s.style.height = mainH + 'px';
    });
    if (typeof DitherBG !== 'undefined' && DitherBG.resize) DitherBG.resize();
  }, 500);
}
```

### Update `closeFooter()` — same pattern in reverse

```js
function closeFooter() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2;

  const footer = document.querySelector('.site-footer');
  const mainWindow = document.querySelector('.main-window');
  const nav = document.querySelector('.top-nav');

  const navH = parseFloat(nav.style.height);
  const remainingH = window.innerHeight - navH;
  const mainH = Math.floor(remainingH / cell) * cell;

  // Both trigger simultaneously
  footer.classList.remove('open');
  mainWindow.style.height = mainH + 'px';

  setTimeout(() => {
    document.querySelectorAll('.snap-section').forEach(s => {
      s.style.height = mainH + 'px';
    });
    if (typeof DitherBG !== 'undefined' && DitherBG.resize) DitherBG.resize();
  }, 500);
}
```
