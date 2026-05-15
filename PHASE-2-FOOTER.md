# Phase 2 — Footer
> **Scope:** `style.css`, `script.js` only.

---

## Fix 1 — Footer CSS

Replace the entire `.site-footer` rule with this:

```css
.site-footer {
  flex-shrink: 0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.22, 1, 0.36, 1);

  display: flex;
  align-items: center;
  justify-content: space-between;

  /* height is exactly 3 tiles — set via --footer-snapped-h in JS */
  padding: 0 calc(var(--dither-cell, 15px) * 2);  /* 2-tile horizontal padding */

  border: 1px solid var(--card-border);
  border-top: none;                                /* shares border with main window bottom */
  border-radius: 0 0 var(--radius) var(--radius); /* rounded at bottom only */

  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);

  font-family: var(--font-body);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.site-footer.open {
  max-height: var(--footer-snapped-h);
}
```

---

## Fix 2 — Footer height in JS (script.js)

The footer height must NOT be measured from `scrollHeight` — that gives an unreliable value for a single line of text. Instead, set it explicitly to **3 tiles** (grid-snapped).

In `snapAllToGrid()`, replace the entire footer block with this:

```js
// ── FOOTER ───────────────────────────────────────────────────────
const footer = document.querySelector('.site-footer');
if (footer) {
  const footerH = cell * 3;  // exactly 3 tiles tall
  document.documentElement.style.setProperty('--footer-snapped-h', footerH + 'px');
  footer.style.width = mainW + 'px';
  footer.style.marginLeft = margin + 'px';
}
```

Also update `openFooter()` to use this same value:

```js
function openFooter() {
  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2;
  const footerH = cell * 3;

  document.querySelector('.site-footer').classList.add('open');

  // Shrink main window to make room — floor to keep right edge on grid
  const nav = document.querySelector('.top-nav');
  const navH = parseFloat(nav.style.height);
  const remainingH = window.innerHeight - navH - footerH;
  const mainH = Math.floor(remainingH / cell) * cell;

  const mainWindow = document.querySelector('.main-window');
  mainWindow.style.height = mainH + 'px';

  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainH + 'px';
  });

  if (typeof DitherBG !== 'undefined' && DitherBG.resize) DitherBG.resize();
}
```

`closeFooter()` already calls `snapAllToGrid()` which restores everything — no change needed there.
