# Phase 2 — Footer: Always Visible, 3 Tiles Tall
> **Scope:** `style.css`, `script.js` only.

---

## The Design

Footer is always visible. Always 3 tiles tall:
- Tile 1: top padding
- Tile 2: text (centered)
- Tile 3: bottom padding

Main window is always sized to leave room for it. No animation, no open/close, no classes.

---

## Fix 1 — style.css

Replace the entire `.site-footer` and `.site-footer.open` rules with:

```css
.site-footer {
  flex-shrink: 0;
  height: calc(var(--dither-cell, 15px) * 3);   /* always 3 tiles */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--dither-cell, 15px) * 2); /* 2-tile horizontal padding */
  border: 1px solid var(--card-border);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  font-family: var(--font-body);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}
```

Also remove the `.main-window` transition that was added in the previous prompt — it's no longer needed:

```css
.main-window {
  transition: none;
}
```

And remove `.main-window.no-transition` if it exists.

---

## Fix 2 — script.js

### Update `snapAllToGrid()`

The footer height is always `cell * 3`. Always subtract it when calculating the main window height. Replace the footer block and main window height calculation with:

```js
const footerH = cell * 3;

// Footer geometry
const footer = document.querySelector('.site-footer');
if (footer) {
  footer.style.width = mainW + 'px';
  footer.style.marginLeft = margin + 'px';
}

// Main window height always accounts for footer
const remainingH = window.innerHeight - navSnapped - footerH;
const mainH = Math.floor(remainingH / cell) * cell;

const mainWindow = document.querySelector('.main-window');
mainWindow.style.width = mainW + 'px';
mainWindow.style.marginLeft = margin + 'px';
mainWindow.style.marginRight = 'auto';
mainWindow.style.height = mainH + 'px';
mainWindow.style.flex = 'none';
```

### Delete `openFooter()` and `closeFooter()` entirely

Remove both functions. Remove any calls to them anywhere in the file.

### Remove footer scroll trigger

Find and remove any scroll or wheel listener logic that calls `openFooter()` or `closeFooter()`. The footer no longer responds to scroll.
