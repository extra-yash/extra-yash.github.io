/* ═══════════════════════════════════════════════════════════════
   EXTRA COLLECTIVE — script.js
   ═══════════════════════════════════════════════════════════════

   GOOGLE SHEETS CMS SETUP
   ─────────────────────────────────────────────────────────────
   1. Create a Google Sheet with these exact column headers:
      title | client | category | image_url | tags | tab | visible

   2. Go to Extensions > Apps Script. Paste this code:

      function doGet() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const [headers, ...rows] = sheet.getDataRange().getValues();
        const data = rows
          .filter(row => row[headers.indexOf('visible')] === true)
          .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
        return ContentService
          .createTextOutput(JSON.stringify(data))
          .setMimeType(ContentService.MimeType.JSON);
      }

   3. Deploy > New deployment > Web app
      - Execute as: Me
      - Who has access: Anyone
      Copy the /exec URL and paste it below as SHEETS_ENDPOINT.

   4. To update the portfolio: edit the Google Sheet. Done.
      To swap a placeholder image for real work: change the
      image_url value in the Sheet. No code changes needed.
   ═══════════════════════════════════════════════════════════════ */

// ─── PORTFOLIO DATA SOURCE ────────────────────────────────────────
// Paste your Google Apps Script /exec URL here when ready.
// Leave as empty string to use the fallback placeholder data below.
const SHEETS_ENDPOINT = '';

// ─── OFFICIAL EXTRA PALETTE — TAB COLOR MAP ─────────────────────────
// Only colors from the Brand Starter Kit (Slide 10/23) are used.
// Each tab drives the dither wave color AND the CSS --accent token.
const TAB_COLORS = {
  brands: {
    wave:   '#FF2C00',  // EXTRA BRIGHT
    accent: '#FF2C00',
    bg:     '#1A1A2E',  // EXTRA DARK
    theme:  'dark',
  },
  agencies: {
    wave:   '#5766ED',  // EXTRA CRISP — blue symbols on dark
    accent: '#5766ED',
    bg:     '#1A1A2E',  // EXTRA DARK
    theme:  'dark',
  },
  creatives: {
    wave:   '#9D00FF',  // EXTRA VIOLET
    accent: '#9D00FF',
    bg:     '#1A1A2E',  // EXTRA DARK
    theme:  'dark',
  },
};

// ─── FALLBACK PORTFOLIO DATA ──────────────────────────────────────
// These placeholder items use Unsplash photo IDs.
// SWAP: Change image_url in your Google Sheet to replace any item.
// The image_url format: https://images.unsplash.com/photo-{ID}?w=800&q=80&fit=crop
const FALLBACK_PORTFOLIO = [
  {
    title: 'Brand Identity',
    client: 'Client Name',
    category: 'Branding',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&fit=crop',
    tags: 'Art Direction, Visual Identity',
    tab: 'all',
    visible: true,
  },
  {
    title: 'Campaign Direction',
    client: 'Client Name',
    category: 'Art Direction',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop',
    tags: 'Photography, Styling',
    tab: 'all',
    visible: true,
  },
  {
    title: 'Digital Experience',
    client: 'Client Name',
    category: 'Digital',
    image_url: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80&fit=crop',
    tags: 'UX, Web Design',
    tab: 'all',
    visible: true,
  },
  {
    title: 'Product Visualization',
    client: 'Client Name',
    category: '3D',
    image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80&fit=crop',
    tags: '3D Rendering, CGI',
    tab: 'all',
    visible: true,
  },
];

// ─── STATE ────────────────────────────────────────────────────────
let portfolioData = [];
let activeTab = 'brands';

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  DitherBG.init();
  initCursor();
  initTabs();
  loadPortfolio();
});

// ─── TAB SYSTEM ───────────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  // Read hash on load — deep linking support
  const hashTab = window.location.hash.replace('#', '');
  if (hashTab && TAB_COLORS[hashTab]) {
    activeTab = hashTab;
  }

  activateTab(activeTab, tabs, panels, false);

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === activeTab) return;
      activeTab = tab;
      activateTab(tab, tabs, panels, true);
    });
  });
}

function activateTab(tab, tabs, panels, animate) {
  // Update tab buttons
  tabs.forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  // Update panels
  panels.forEach(panel => {
    const isActive = panel.id === `panel-${tab}`;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  // Update URL hash
  history.replaceState(null, '', `#${tab}`);

  // Update dither wave colour, bg colour, CSS accent token, and body theme
  const colors = TAB_COLORS[tab];
  DitherBG.setColor(colors.wave);
  DitherBG.setBgColor(colors.bg);
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.body.dataset.theme = colors.theme;

  // Re-render portfolio for new tab
  if (portfolioData.length > 0) {
    renderPortfolio(tab);
  }
}

// ─── PORTFOLIO ────────────────────────────────────────────────────
async function loadPortfolio() {
  if (!SHEETS_ENDPOINT) {
    // No endpoint configured — use fallback data
    portfolioData = FALLBACK_PORTFOLIO.filter(item => item.visible);
    renderPortfolio(activeTab);
    return;
  }

  try {
    const res = await fetch(SHEETS_ENDPOINT);
    if (!res.ok) throw new Error('Sheet fetch failed');
    portfolioData = await res.json();
    renderPortfolio(activeTab);
  } catch (err) {
    console.warn('Portfolio: Sheet unreachable, using fallback data.', err);
    portfolioData = FALLBACK_PORTFOLIO.filter(item => item.visible);
    renderPortfolio(activeTab);
  }
}

function renderPortfolio(tab) {
  const grid = document.getElementById('portfolio-brands');
  if (!grid) return;

  // Filter: show items matching this tab or tagged 'all'
  const filtered = portfolioData.filter(item => {
    const itemTab = (item.tab || 'all').toLowerCase().trim();
    return itemTab === 'all' || itemTab === tab;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="loading-state">Portfolio coming soon — contact us for the full deck.</p>';
    return;
  }

  grid.innerHTML = filtered.map((item, i) => `
    <article class="portfolio-card" id="portfolio-card-${i}">
      <div class="portfolio-card-img">
        <img
          src="${escapeHtml(item.image_url)}"
          alt="${escapeHtml(item.title)} — ${escapeHtml(item.client)}"
          loading="lazy"
        >
      </div>
      <div class="portfolio-card-info">
        <p class="portfolio-card-cat">${escapeHtml(item.category)}</p>
        <h3 class="portfolio-card-title">Extra × ${escapeHtml(item.client)}</h3>
        <p class="portfolio-card-tags">${escapeHtml(item.tags)}</p>
      </div>
    </article>
  `).join('');
}

// ─── CUSTOM CURSOR ────────────────────────────────────────────────
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  // Hide on touch devices
  if ('ontouchstart' in window) {
    cursor.style.display = 'none';
    return;
  }

  // Use transform for positioning — runs on GPU compositor, zero layout lag.
  document.addEventListener('mousemove', e => {
    cursor.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
  });

  // Expand on interactive elements
  const interactiveSelector = 'a, button, .tab-btn, .info-card, .portfolio-card, details summary';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactiveSelector)) {
      cursor.classList.add('hovered');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactiveSelector)) {
      cursor.classList.remove('hovered');
    }
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
}

// ─── UTILITY ──────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
