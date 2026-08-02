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
  // Service section cards
  ['brand-identity',        'design-color-painting-palette'],
  ['digital-design',        'ui-design-website'],
  ['content',               'content-files-pencil-brush'],
  ['strategy',              'interface-essential-pie-chart-poll-report-1'],
  ['photography',           'photography-camera-1'],
  ['social-media',          'logo-social-media-instagram'],
  ['film',                  'entertainment-events-hobbies-film-player'],
  ['web',                   'coding-apps-websites'],
  ['consulting',            'interface-essential-light-bulb'],

  // Navigation / UI
  ['menu',                  'interface-essential-navigation-menu-1'],
  ['arrow-right',           'interface-essential-navigation-right-circle-1'],
  ['arrow-left',            'interface-essential-navigation-left-circle-1'],
  ['eye',                   'interface-essential-view-eye'],
  ['flash',                 'interface-essential-flash'],
  ['cursor',                'interface-essential-cursor'],
  ['star',                  'social-rewards-rating-star-1'],
  ['crown',                 'interface-essential-crown'],
  ['trophy',                'interface-essential-trophy'],
  ['rocket',                'business-product-startup-1'],
  ['target',                'business-product-target'],
  ['check',                 'business-product-check'],
  ['share',                 'interface-essential-share-1'],
  ['search',                'interface-essential-search-1'],
  ['globe',                 'interface-essential-global-public'],
];

const { icons, width: setW = 16, height: setH = 16 } = iconSet;

let exported = 0;
let missing = [];

for (const [name, key] of ICONS) {
  const icon = icons[key];
  if (!icon) {
    missing.push(key);
    continue;
  }
  const w = icon.width ?? setW;
  const h = icon.height ?? setH;
  const body = icon.body;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${body}</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  exported++;
  console.log(`✓ ${name}.svg  ← ${key}`);
}

if (missing.length) {
  console.warn('\nMissing icons (key not found in set):');
  missing.forEach(k => console.warn(`  ✗ ${k}`));
}

console.log(`\nDone. ${exported} icons exported to assets/icons/`);
