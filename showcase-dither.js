const BAYER_8 = [
   0, 48, 12, 60,  3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
   8, 56,  4, 52, 11, 59,  7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
   2, 50, 14, 62,  1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58,  6, 54,  9, 57,  5, 53,
  42, 26, 38, 22, 41, 25, 37, 21
];

// Index 0 → darkest tones, index 2 → lightest
const DITHER_PALETTE = [
  [26,  26,  46],   // #1A1A2E — Extra Dark
  [157,  0, 255],   // #9D00FF — Extra Violet
  [ 39, 231,  0],   // #27E700 — Extra Contrast
];

function ditherCanvas(img) {
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  if (width === 0 || height === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const stp = 1.0 / (3 - 1); // 0.5

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

      const thr = BAYER_8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.25;

      let dithered = luma + thr * stp;
      if (dithered < 0.0) dithered = 0.0;
      if (dithered > 1.0) dithered = 1.0;

      let level = Math.round(dithered * 2);
      if (level < 0) level = 0;
      if (level > 2) level = 2;

      const color = DITHER_PALETTE[level];

      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function initShowcaseDither() {
  const images = document.querySelectorAll('img.showcase-card__cover');

  function processCard(img) {
    try {
      const canvas = ditherCanvas(img);
      if (!canvas) return;

      canvas.className = img.className;
      canvas.style.cssText = img.style.cssText;
      canvas.setAttribute('aria-label', img.alt);

      if (img.parentNode) {
        img.parentNode.replaceChild(canvas, img);
      }
    } catch (e) {
      console.warn('Dither failed (likely CORS):', e);
    }
  }

  images.forEach(img => {
    const parent = img.closest('.showcase-card__media');
    if (parent && parent.classList.contains('showcase-card__media--missing')) {
      return;
    }

    if (!img.src) return;

    try {
      const srcUrl = new URL(img.src, window.location.href);
      if (srcUrl.origin !== window.location.origin && srcUrl.protocol !== 'file:') {
        return; // External image
      }
    } catch (e) {
      return; // Invalid URL
    }

    if (img.complete && img.naturalWidth > 0) {
      processCard(img);
    } else {
      img.addEventListener('load', () => processCard(img));
      img.addEventListener('error', () => {
        img.closest('.showcase-card__media')
          ?.classList.add('showcase-card__media--missing');
      });
    }
  });
}

document.addEventListener('showcaseActivated', () => {
  if (typeof initShowcaseDither === 'function') initShowcaseDither();
}, { once: true });
