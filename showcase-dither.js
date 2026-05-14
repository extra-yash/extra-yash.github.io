// ─── DITHER CONFIG ────────────────────────────────────────────────────────────
// Tweak these values to adjust the look. No other code changes needed.

const DITHER_CONFIG = {
  scale: 1,     // Processing resolution. 1 = pixel-perfect.
  // 0.5 = half-res (coarser, blockier pattern).
  // 0.25 = quarter-res (very chunky).

  shadowCutoff: 0.33,  // Luma below this → dark palette colour.
  highlightCutoff: 0.66,  // Luma above this → light palette colour.
  // Between shadow and highlight → mid palette colour.

  bayerStrength: 0.5,   // How aggressively the Bayer pattern dithers edges.
  // 0 = flat posterisation. 1 = maximum dither noise.

  featherMidpoint: 0.55,  // How far down the hover reveal reaches (0–1).
  // 0 = reveal covers whole image. 1 = no reveal.

  featherSpread: 0.30,  // Height of the dithered transition zone (0–1).
  // Smaller = sharper dithered edge.
  // Larger = wider dithered dissolve.
};

// ─── PALETTE ──────────────────────────────────────────────────────────────────
// Index 0 → darkest tones, index 2 → lightest.

const DITHER_PALETTE = [
  [26, 26, 46],  // #1A1A2E — Extra Dark
  [157, 0, 255],  // #9D00FF — Extra Violet
  [39, 231, 0],  // #27E700 — Extra Contrast
];

// ─── BAYER 8×8 MATRIX ─────────────────────────────────────────────────────────

const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21
];

// ─── CORE DITHER FUNCTION ─────────────────────────────────────────────────────
// Renders a dithered canvas from an img element.
// If withFeather is true, the top portion of the canvas is made transparent
// using a Bayer-dithered alpha — so the original image shows through on hover.

function ditherCanvas(img, withFeather) {
  const cfg = DITHER_CONFIG;
  const scale = Math.max(0.1, Math.min(1, cfg.scale));

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (srcW === 0 || srcH === 0) return null;

  // Process at reduced resolution for coarser dither
  const procW = Math.max(1, Math.round(srcW * scale));
  const procH = Math.max(1, Math.round(srcH * scale));

  // Offscreen canvas at processing resolution
  const proc = document.createElement('canvas');
  proc.width = procW;
  proc.height = procH;
  const pCtx = proc.getContext('2d');
  pCtx.drawImage(img, 0, 0, procW, procH);

  const imageData = pCtx.getImageData(0, 0, procW, procH);
  const data = imageData.data;

  const levels = DITHER_PALETTE.length - 1; // 2
  const stp = cfg.bayerStrength / levels;

  // Feather zone boundaries in processing-resolution pixel rows
  const featherTop = (cfg.featherMidpoint - cfg.featherSpread / 2) * procH;
  const featherBottom = (cfg.featherMidpoint + cfg.featherSpread / 2) * procH;

  for (let y = 0; y < procH; y++) {
    for (let x = 0; x < procW; x++) {
      const i = (y * procW + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // ── Colour dither ──────────────────────────────────────────────────────
      const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      const bayerV = BAYER_8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5;
      const shifted = Math.max(0, Math.min(1, luma + bayerV * stp));

      let level;
      if (shifted < cfg.shadowCutoff) level = 0;
      else if (shifted < cfg.highlightCutoff) level = 1;
      else level = 2;

      const color = DITHER_PALETTE[level];
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];

      // ── Alpha feather (hover canvas only) ──────────────────────────────────
      if (withFeather) {
        if (y <= featherTop) {
          // Above feather zone: fully transparent (photo shows through)
          data[i + 3] = 0;
        } else if (y >= featherBottom) {
          // Below feather zone: fully opaque dither
          data[i + 3] = 255;
        } else {
          // Inside feather zone: Bayer-thresholded alpha
          // revealRatio: 0 at featherTop (transparent), 1 at featherBottom (opaque)
          const revealRatio = (y - featherTop) / (featherBottom - featherTop);
          // Use same Bayer matrix value (normalised 0–1) as threshold
          const bayerAlpha = BAYER_8[(y % 8) * 8 + (x % 8)] / 63.0;
          data[i + 3] = bayerAlpha < revealRatio ? 255 : 0;
        }
      } else {
        data[i + 3] = 255;
      }
    }
  }

  pCtx.putImageData(imageData, 0, 0);

  // Scale back up to natural dimensions
  const out = document.createElement('canvas');
  out.width = srcW;
  out.height = srcH;
  const outCtx = out.getContext('2d');
  outCtx.imageSmoothingEnabled = false; // hard pixel edges at low scale
  outCtx.drawImage(proc, 0, 0, srcW, srcH);

  return out;
}

// ─── PROCESS ONE CARD ─────────────────────────────────────────────────────────
// Keeps the original <img> in the DOM as the bottom layer.
// Adds canvasRest (full dither) and canvasHover (Bayer-feathered dither) on top.
// CSS controls which canvas is visible.

function processCard(img) {
  try {
    const canvasRest = ditherCanvas(img, false);
    const canvasHover = ditherCanvas(img, true);
    if (!canvasRest || !canvasHover) return;

    // Style both canvases
    [canvasRest, canvasHover].forEach(c => {
      c.className = img.className; // inherits showcase-card__cover
      c.setAttribute('aria-hidden', 'true');
    });

    canvasRest.classList.add('dither-rest');
    canvasHover.classList.add('dither-hover');

    // Position img behind both canvases
    img.classList.add('dither-original');
    img.removeAttribute('loading'); // already loaded, remove lazy attr

    const parent = img.parentNode;
    if (!parent) return;

    // Insert order: img (bottom) → canvasHover → canvasRest (top)
    parent.insertBefore(canvasRest, img);
    parent.insertBefore(canvasHover, canvasRest);

  } catch (e) {
    console.warn('Dither failed:', e);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function initShowcaseDither() {
  const images = document.querySelectorAll('img.showcase-card__cover');

  images.forEach(img => {
    const parent = img.closest('.showcase-card__media');
    if (parent && parent.classList.contains('showcase-card__media--missing')) return;
    if (!img.src) return;

    try {
      const srcUrl = new URL(img.src, window.location.href);
      if (srcUrl.origin !== window.location.origin && srcUrl.protocol !== 'file:') return;
    } catch (e) { return; }

    if (img.complete && img.naturalWidth > 0) {
      processCard(img);
    } else {
      img.addEventListener('load', () => processCard(img), { once: true });
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
