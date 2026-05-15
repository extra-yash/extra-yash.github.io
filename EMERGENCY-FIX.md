# Emergency Fix — Dither Crash + Tab Nav Border Radius
> **Scope:** `dither.js`, `style.css` only. Two changes. Nothing else.

---

## Fix 1 — dither.js: null guard in `resize()`

Find the `resize()` function (around line 369). Add `if (!canvas) return;` as the **very first line** inside the function body:

```js
function resize() {
  if (!canvas) return;  // guard: called before init() creates the canvas
  const host = canvas.parentElement || document.getElementById('main-window') || document.documentElement;
  // ... rest of function unchanged
}
```

Do not change anything else in this function.

---

## Fix 2 — style.css: remove `border-radius` from `.tab-nav`

Find the `.tab-nav` rule. Remove the `border-radius: 50px` line from it entirely. That property must only exist on `.tab-btn` elements, not on the `.tab-nav` container cell.
