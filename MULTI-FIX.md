# Multi-Fix: Dither Fade + Footer + Nav Buttons
> **Scope:** `style.css`, `script.js` only.

---

## Fix 1 — Delete `snapPillsToGrid` entirely (script.js)

This function is setting fixed pixel widths on nav elements causing overflow and breakage. Delete the entire `snapPillsToGrid()` function body and the call to it at the bottom of `snapAllToGrid()`. Also delete the `logo.style.width` snapping — the logo cell must be content-sized again.

Also remove any `.style.width` assignments on `#nav-showcase`, `#nav-origins`, and `.tab-nav` that were set by this function.

---

## Fix 2 — Nav: fix overflow + button alignment (style.css)

Replace all nav cell and button rules with these:

```css
.top-nav {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  grid-template-areas: 'logo tabs showcase origins';
  align-items: stretch;
  flex-shrink: 0;
  width: 100%;
  position: relative;
  z-index: 100;
  background: transparent;
  border-bottom: 1px solid var(--card-border);
  overflow: hidden; /* prevent last column from escaping */
}

.logo {
  grid-area: logo;
  display: flex;
  align-items: center;
  padding-left: var(--grid-margin, 30px);
  padding-right: var(--dither-cell, 15px);
  border-right: 1px solid var(--card-border);
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.logo img {
  display: block;
  height: 28px;
  width: auto;
}

.tab-cell {
  grid-area: tabs;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--card-border);
  padding: 0 var(--dither-cell, 15px);
}

/* Restored pill — border, frost, rounded */
.tab-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--card-border);
  border-radius: 50px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  align-items: center;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  height: calc(var(--dither-cell, 15px) * 2);
  padding: 0 16px;
  border-radius: 50px;
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  cursor: none;
}

.tab-btn.active {
  background: var(--accent);
  color: var(--bg);
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}

.nav-showcase {
  grid-area: showcase;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--dither-cell, 15px);
  border-right: 1px solid var(--card-border);
}

.nav-origins {
  grid-area: origins;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--grid-margin, 30px) 0 var(--dither-cell, 15px);
}

.nav-pill-btn {
  height: calc(var(--dither-cell, 15px) * 2);
  padding: 0 16px;
  border-radius: 50px;
  border: 1px solid var(--card-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: all 0.3s ease;
  cursor: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-pill-btn:hover,
.nav-pill-btn.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
  color: var(--text);
}
```

---

## Fix 3 — Footer: plain text, no background shape (style.css)

Replace `.site-footer` with a completely stripped version — no background, no border, no glass. Just text floating on the dither:

```css
.site-footer {
  flex-shrink: 0;
  height: calc(var(--dither-cell, 15px) * 3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--dither-cell, 15px) * 2);
  font-family: var(--font-body);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
  opacity: 0.6;
}
```

Delete `.site-footer.open` if it still exists.

---

## Fix 4 — Dither fade: restore via section index (script.js)

Find the film strip scroll function — the one that animates between snap sections. After the animation completes (inside the `else` block when `progress >= 1`), add:

```js
// Restore dither density fade based on section position
const sections = getSnapSections();
const fraction = sections.length > 1 ? currentSnap / (sections.length - 1) : 0;
if (typeof DitherBG !== 'undefined') {
  DitherBG.setColorScale(1.0 - (1.0 - 0.35) * fraction);
}
```

Also call this once on tab switch to reset density to full (section 0):

```js
// On tab switch — reset to full density
if (typeof DitherBG !== 'undefined') {
  DitherBG.setColorScale(1.0);
}
```
