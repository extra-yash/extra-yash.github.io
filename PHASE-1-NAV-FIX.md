# Phase 1 — Nav Pill + Right Alignment Fix
> **Scope:** `index.html`, `style.css` only. Two fixes.

---

## Fix 1 — Tab Nav: Restore Floating Pill

The `.tab-nav` is currently both the grid area cell AND the pill shape, which forces it to stretch full nav height and look like a solid block. The fix is to separate concerns: a transparent full-height cell handles the grid area and right divider, and `.tab-nav` inside it is the pill.

### index.html
Wrap the existing `.tab-nav` div in a new `.tab-cell` div. Do not change anything inside `.tab-nav`:

```html
<!-- BEFORE -->
<div class="tab-nav" role="tablist" aria-label="Audience tabs">
  <button class="tab-btn active" ...>BUILD A BRAND</button>
  <button class="tab-btn" ...>EXTEND YOUR TEAM</button>
  <button class="tab-btn" ...>JOIN THE COLLECTIVE</button>
</div>

<!-- AFTER -->
<div class="tab-cell">
  <div class="tab-nav" role="tablist" aria-label="Audience tabs">
    <button class="tab-btn active" ...>BUILD A BRAND</button>
    <button class="tab-btn" ...>EXTEND YOUR TEAM</button>
    <button class="tab-btn" ...>JOIN THE COLLECTIVE</button>
  </div>
</div>
```

### style.css
Replace the current `.tab-nav` grid area rule with two rules — one for the cell, one for the pill:

```css
/* Grid area cell — transparent, full height, provides the right divider */
.tab-cell {
  grid-area: tabs;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--card-border);
  padding: 0 calc(var(--dither-cell, 15px) * 2);
}

/* The pill — restored to original floating style */
.tab-nav {
  display: flex;
  gap: 0;
  border: 1px solid var(--card-border);
  border-radius: 50px;
  padding: 4px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
}
```

Also update `grid-template-areas` in `.top-nav` to use `tab-cell` as the area name — but since the grid area is now on `.tab-cell` (not `.tab-nav`), just ensure the grid column is still named `tabs`:

```css
.top-nav {
  grid-template-areas: 'logo tabs showcase origins';
  /* everything else unchanged */
}
```

`.tab-cell` uses `grid-area: tabs` so this matches without any other change.

---

## Fix 2 — WHY IS EXTRA: Right Edge Alignment

Add right padding to `.nav-origins` equal to `--grid-margin` so the pill aligns with the main window's right edge:

```css
.nav-origins {
  grid-area: origins;
  display: flex;
  align-items: center;
  padding-top: calc(var(--dither-cell, 15px) * 0.5);
  padding-bottom: calc(var(--dither-cell, 15px) * 0.5);
  padding-left: calc(var(--dither-cell, 15px) * 1.5);
  padding-right: var(--grid-margin, 30px);  /* aligns with main window right edge */
}
```
