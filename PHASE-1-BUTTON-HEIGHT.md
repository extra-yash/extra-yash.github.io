# Phase 1 — Uniform Button Height + Remove Tab Nav Container Border
> **Scope:** `style.css` only.

---

## Fix 1 — Remove the outer border/background from `.tab-nav`

The tab-nav container pill border is not needed. Strip it back to a transparent flex row:

```css
.tab-nav {
  display: flex;
  gap: 4px;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  align-items: center;
}
```

---

## Fix 2 — All buttons exactly 2 tiles high

Every button in the nav — tab buttons AND the showcase/origins pills — must be exactly `2 × --dither-cell` tall. Remove any padding-top/bottom that conflicts and use explicit height + line-height to centre the label:

```css
.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  height: calc(var(--dither-cell, 15px) * 2);
  padding: 0 22px;
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
}

.tab-btn.active {
  background: var(--accent);
  color: var(--bg);
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}

.nav-pill-btn {
  height: calc(var(--dither-cell, 15px) * 2);
  padding: 0 18px;
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
}

.nav-pill-btn:hover,
.nav-pill-btn.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
  color: var(--text);
}
```
