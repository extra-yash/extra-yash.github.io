/**
 * Export Streamline Pixel icons to assets/icons/ as standalone SVG files.
 * Run: node scripts/export-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconSet = require('../node_modules/@iconify-json/streamline-pixel/icons.json');
const outDir = path.resolve(__dirname, '../assets/icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Icons to export: [outputName, iconSetKey]
const ICONS = [
  // ── Service card icons ──────────────────────────────────────────────────
  ['campaign-direction',    'design-magic-wand'],                             // art direction = magic
  ['strategy',              'interface-essential-speaker-announce'],          // messaging / broadcast
  ['print-design',          'design-stamp'],                                  // print = stamp
  ['digital-platforms',     'coding-apps-websites-programming-browser'],      // browser window
  ['digital-tools',         'interface-essential-direction-button'],          // d-pad, playful for apps
  ['motion-video',          'video-movies-set-equipment'],                    // film clapperboard
  ['content-systems',       'interface-essential-paginate-filter-picture'],   // content grid
  ['spatial-design',        'interface-essential-expand-1'],                  // spatial / 3D expand
  ['photography',           'photography-retouch-wand-star'],                 // wand + star = magic shot

  // ── Navigation / Hero ───────────────────────────────────────────────────
  ['arrow-down',            'interface-essential-cursor-click-point'],        // hero scroll cue
  ['arrow-right',           'interface-essential-navigation-right-circle-1'], // CTA arrow
  ['arrow-left',            'interface-essential-navigation-left-circle-1'],
  ['menu',                  'interface-essential-navigation-menu-1'],

  // ── Decorative / Extras ─────────────────────────────────────────────────
  ['flash',                 'interface-essential-flash'],
  ['crown',                 'interface-essential-crown'],
  ['trophy',                'interface-essential-trophy'],
  ['magic-rabbit',          'business-products-magic-rabbit'],
  ['eye',                   'interface-essential-view-eye'],
  ['star',                  'social-rewards-rating-star-1'],
  ['target',                'business-product-target'],
  ['check',                 'business-product-check'],
  ['globe',                 'interface-essential-global-public'],
  ['cursor',                'interface-essential-cursor'],
];

const { icons, width: setW = 16, height: setH = 16 } = iconSet;

let exported = 0;
const missing = [];

for (const [name, key] of ICONS) {
  const icon = icons[key];
  if (!icon) { missing.push(`${key}  →  ${name}`); continue; }

  const w = icon.width ?? setW;
  const h = icon.height ?? setH;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${icon.body}</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  exported++;
  console.log(`✓ ${name}.svg  ←  ${key}`);
}

if (missing.length) {
  console.warn('\n⚠ Missing (key not in set):');
  missing.forEach(m => console.warn('  ✗', m));
}

console.log(`\nDone. ${exported} icons → assets/icons/`);
