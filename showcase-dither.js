const DITHER_CONFIG = {
  scale: 1,
  shadowCutoff: 0.33,
  highlightCutoff: 0.66,
  bayerStrength: 1,
};

const DITHER_PALETTE = [
  [26, 26, 46],
  [157, 0, 255],
  [39, 231, 0],
];

const BAYER_8 = [
   0, 48, 12, 60,  3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
   8, 56,  4, 52, 11, 59,  7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
   2, 50, 14, 62,  1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58,  6, 54,  9, 57,  5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
];

// ─── Config ───────────────────────────────────────────────────────
const REVEAL_DURATION = 1100;  // ms total animation time
const FRAME_STEP_MS   = 66;    // ~15fps — animates "on 2s", old screen stutter
const EDGE_ROUGHNESS  = 0.38;  // Bayer noise strength — higher = rougher curtain edge

// ─── Per-card state ───────────────────────────────────────────────
const cardState = new WeakMap();

// ─── Easing ───────────────────────────────────────────────────────
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// ─── Curtain reveal frame ─────────────────────────────────────────
// Sweeps radially outward from the mouse entry point.
// The curtain edge is dithered using the Bayer matrix.
function drawRevealFrame(state) {
  const {
    outCtx, ditherData, origData,
    procW, procH, displayW, displayH,
    progress, entryX, entryY, maxDist,
    tmpCanvas, tmpCtx,
  } = state;

  const frame = tmpCtx.createImageData(procW, procH);
  const fd    = frame.data;
  const dd    = ditherData.data;
  const od    = origData.data;

  for (let y = 0; y < procH; y++) {
    for (let x = 0; x < procW; x++) {
      const i = (y * procW + x) * 4;

      // Normalised pixel position within the card (0–1)
      const nx = x / (procW - 1 || 1);
      const ny = y / (procH - 1 || 1);

      // Distance from entry point, normalised so the farthest corner = 1
      const dx   = nx - entryX;
      const dy   = ny - entryY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

      // Bayer noise — dithers the curtain edge (EDGE_ROUGHNESS controls raggedness)
      const bayer = (BAYER_8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5) * EDGE_ROUGHNESS;

      if (progress > dist + bayer) {
        // Reveal original
        fd[i]     = od[i];
        fd[i + 1] = od[i + 1];
        fd[i + 2] = od[i + 2];
        fd[i + 3] = 255;
      } else {
        // Keep dithered
        fd[i]     = dd[i];
        fd[i + 1] = dd[i + 1];
        fd[i + 2] = dd[i + 2];
        fd[i + 3] = 255;
      }
    }
  }

  tmpCtx.putImageData(frame, 0, 0);
  outCtx.imageSmoothingEnabled = false;
  outCtx.clearRect(0, 0, displayW, displayH);
  outCtx.drawImage(tmpCanvas, 0, 0, displayW, displayH);
}

// ─── Animation driver ─────────────────────────────────────────────
function animateReveal(card, toProgress) {
  const state = cardState.get(card);
  if (!state) return;

  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  const fromProgress = state.progress;
  const delta        = toProgress - fromProgress;
  if (Math.abs(delta) < 0.001) return;

  const startTime = performance.now();
  let   lastDraw  = 0;

  function tick(now) {
    const t     = Math.min((now - startTime) / REVEAL_DURATION, 1);
    const eased = easeOutQuart(t);
    state.progress = fromProgress + delta * eased;

    // Only redraw on FRAME_STEP_MS intervals — gives the old-screen stutter
    if (now - lastDraw >= FRAME_STEP_MS || t >= 1) {
      lastDraw = now;
      drawRevealFrame(state);
    }

    if (t < 1) {
      state.rafId = requestAnimationFrame(tick);
    } else {
      state.progress = toProgress;
      drawRevealFrame(state); // guarantee final frame is clean
      state.rafId = null;
    }
  }

  state.rafId = requestAnimationFrame(tick);
}

// ─── Capture mouse entry/exit point ──────────────────────────────
// Called on both mouseenter and mouseleave so the sweep always
// originates from where the cursor crossed the card boundary.
function captureEntryPoint(card, e) {
  const state = cardState.get(card);
  if (!state) return;

  const rect = card.getBoundingClientRect();
  const ex   = (e.clientX - rect.left)  / rect.width;
  const ey   = (e.clientY - rect.top)   / rect.height;

  // Max distance to farthest corner — used to normalise dist 0→1
  const corners  = [[0, 0], [1, 0], [0, 1], [1, 1]];
  const maxDist  = Math.max(...corners.map(([cx, cy]) =>
    Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2)
  ));

  state.entryX  = ex;
  state.entryY  = ey;
  state.maxDist = maxDist || 1;
}

// ─── Process card ─────────────────────────────────────────────────
function processCard(img) {
  if (img.dataset.ditherDone) return;
  img.dataset.ditherDone = 'true';

  try {
    const card = img.closest('.showcase-card');
    const rect = card.getBoundingClientRect();
    const displayW = Math.round(rect.width);
    const displayH = Math.round(rect.height);

    if (displayW === 0 || displayH === 0) {
      delete img.dataset.ditherDone;
      const ro = new ResizeObserver((entries, observer) => {
        if (entries[0].contentRect.width > 0) {
          observer.disconnect();
          processCard(img);
        }
      });
      ro.observe(card);
      return;
    }

    const scale = Math.max(0.1, Math.min(1, DITHER_CONFIG.scale));
    const procW = Math.max(1, Math.round(displayW * scale));
    const procH = Math.max(1, Math.round(displayH * scale));

    const imgAspect   = img.naturalWidth / img.naturalHeight;
    const canvasAspect = displayW / displayH;

    let sx, sy, sw, sh;
    if (imgAspect > canvasAspect) {
      sh = img.naturalHeight;
      sw = sh * canvasAspect;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / canvasAspect;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    const proc  = document.createElement('canvas');
    proc.width  = procW;
    proc.height = procH;
    const pCtx  = proc.getContext('2d');
    pCtx.drawImage(img, sx, sy, sw, sh, 0, 0, procW, procH);

    // Save original pixel data BEFORE dithering
    const origRaw  = pCtx.getImageData(0, 0, procW, procH);
    const origData = new ImageData(
      new Uint8ClampedArray(origRaw.data), procW, procH
    );

    // Dither pass
    const procImageData = pCtx.getImageData(0, 0, procW, procH);
    const data = procImageData.data;

    for (let y = 0; y < procH; y++) {
      for (let x = 0; x < procW; x++) {
        const i = (y * procW + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const luma    = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        const bayerV  = BAYER_8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5;
        const shifted = Math.max(0, Math.min(1, luma + bayerV * (DITHER_CONFIG.bayerStrength / 2)));

        let level;
        if (shifted < DITHER_CONFIG.shadowCutoff)        level = 0;
        else if (shifted < DITHER_CONFIG.highlightCutoff) level = 1;
        else                                               level = 2;

        const color = DITHER_PALETTE[level];
        data[i]     = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
    pCtx.putImageData(procImageData, 0, 0);

    // Snapshot dithered pixel data
    const ditherData = new ImageData(
      new Uint8ClampedArray(procImageData.data), procW, procH
    );

    // Output canvas — lives in the DOM, gets redrawn on hover frames
    const out    = document.createElement('canvas');
    out.width    = displayW;
    out.height   = displayH;
    const outCtx = out.getContext('2d');
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(proc, 0, 0, displayW, displayH);

    out.className = img.className;
    out.classList.add('dither-canvas');
    out.setAttribute('aria-hidden', 'true');
    img.classList.add('dither-original');
    img.removeAttribute('loading');
    img.parentNode.appendChild(out);

    // Temp canvas for per-frame compositing (never in DOM)
    const tmpCanvas  = document.createElement('canvas');
    tmpCanvas.width  = procW;
    tmpCanvas.height = procH;
    const tmpCtx     = tmpCanvas.getContext('2d');

    // Default entry point: centre of card
    cardState.set(card, {
      outCtx,
      ditherData,
      origData,
      procW, procH,
      displayW, displayH,
      tmpCanvas, tmpCtx,
      progress: 0,
      rafId:    null,
      entryX:   0.5,
      entryY:   0.5,
      maxDist:  Math.sqrt(0.5 * 0.5 + 0.5 * 0.5),
    });

    // Capture entry point BEFORE triggering the animation
    card.addEventListener('mouseenter', (e) => {
      captureEntryPoint(card, e);
      animateReveal(card, 1);
    });
    card.addEventListener('mouseleave', (e) => {
      captureEntryPoint(card, e);
      animateReveal(card, 0);
    });

  } catch (e) {
    console.warn('Dither failed:', e);
  }
}

// ─── Init ─────────────────────────────────────────────────────────
function initShowcaseDither() {
  const images = document.querySelectorAll('img.showcase-card__cover');

  images.forEach(img => {
    const parent = img.closest('.showcase-card__media');
    if (parent && parent.classList.contains('showcase-card__media--missing')) return;
    if (!img.src) return;

    if (img.complete && img.naturalWidth > 0) {
      processCard(img);
    } else {
      img.addEventListener('load',  () => processCard(img), { once: true });
      img.addEventListener('error', () => {
        img.closest('.showcase-card__media')
          ?.classList.add('showcase-card__media--missing');
      }, { once: true });
    }
  });
}

document.addEventListener('showcaseActivated', () => {
  if (typeof initShowcaseDither === 'function') initShowcaseDither();
}, { once: true });
