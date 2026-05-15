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
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
];

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

    const imgAspect = img.naturalWidth / img.naturalHeight;
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

    const proc = document.createElement('canvas');
    proc.width = procW;
    proc.height = procH;
    const pCtx = proc.getContext('2d');
    pCtx.drawImage(img, sx, sy, sw, sh, 0, 0, procW, procH);

    const procImageData = pCtx.getImageData(0, 0, procW, procH);
    const data = procImageData.data;

    for (let y = 0; y < procH; y++) {
      for (let x = 0; x < procW; x++) {
        const i = (y * procW + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        const bayerV = BAYER_8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5;
        const shifted = Math.max(0, Math.min(1, luma + bayerV * (DITHER_CONFIG.bayerStrength / 2)));

        let level;
        if (shifted < DITHER_CONFIG.shadowCutoff) level = 0;
        else if (shifted < DITHER_CONFIG.highlightCutoff) level = 1;
        else level = 2;

        const color = DITHER_PALETTE[level];
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
    pCtx.putImageData(procImageData, 0, 0);

    const out = document.createElement('canvas');
    out.width = displayW;
    out.height = displayH;
    const outCtx = out.getContext('2d');
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(proc, 0, 0, displayW, displayH);

    out.className = img.className;
    out.classList.add('dither-canvas');
    out.setAttribute('aria-hidden', 'true');
    img.classList.add('dither-original');
    img.removeAttribute('loading');
    img.parentNode.appendChild(out);

  } catch (e) {
    console.warn('Dither failed:', e);
  }
}

function initShowcaseDither() {
  const images = document.querySelectorAll('img.showcase-card__cover');

  images.forEach(img => {
    const parent = img.closest('.showcase-card__media');
    if (parent && parent.classList.contains('showcase-card__media--missing')) return;
    if (!img.src) return;

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
