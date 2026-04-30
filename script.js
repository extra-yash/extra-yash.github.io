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
  initProcessTabs();
  initScrollGuidance();
  initMasteryHover();
  
  // Re-enable CMS load when ready
  // loadPortfolio();
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
}

// ─── PROCESS TABS (HOW WE WORK) ───────────────────────────────────
function initProcessTabs() {
  const processBtns = document.querySelectorAll('.process-btn');
  processBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetProcess = btn.dataset.process;
      
      // Update buttons
      processBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      // Update panels
      const panels = document.querySelectorAll('.process-panel');
      panels.forEach(p => {
        if (p.id === `process-${targetProcess}`) {
          p.classList.add('active');
          p.hidden = false;
        } else {
          p.classList.remove('active');
          p.hidden = true;
        }
      });
    });
  });
}

// ─── SCROLL GUIDANCE ──────────────────────────────────────────────
function initScrollGuidance() {
  const indicator = document.getElementById('scroll-guidance');
  if (!indicator) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      indicator.classList.add('hidden');
    } else {
      indicator.classList.remove('hidden');
    }
  }, { passive: true });
}

// ─── MASTERY HOVER RANDOMIZATION ──────────────────────────────────
function initMasteryHover() {
  const masteryItems = document.querySelectorAll('.mastery-item');
  
  masteryItems.forEach(item => {
    const images = item.querySelectorAll('.h-img');
    const title = item.querySelector('.mastery-title');
    if (!title) return;
    
    title.addEventListener('mouseenter', () => {
      // Define medium regions around the text so they spread nicely without being too far
      const regions = [
        { x: -120, y: -70 }, // Top Left
        { x: 120, y: -60 },  // Top Right
        { x: -110, y: 80 },  // Bottom Left
        { x: 110, y: 90 },   // Bottom Right
        { x: 0, y: -100 },   // Top Center
        { x: 0, y: 110 }     // Bottom Center
      ];
      
      // Shuffle regions to assign distinct areas
      const shuffled = regions.sort(() => 0.5 - Math.random());
      
      images.forEach((img, i) => {
        const region = shuffled[i % shuffled.length];
        
        // Add random noise to the distinct region
        const rX = region.x + (Math.random() * 40 - 20);
        const rY = region.y + (Math.random() * 40 - 20);
        
        // Random rotation (-15 to 15 deg)
        const rRot = Math.random() * 30 - 15;
        
        // Random scale (0.9 to 1.15)
        const rScale = 0.9 + (Math.random() * 0.25);
        
        // Apply inline transform (combines with the CSS top:50% left:50% translate(-50%, -50%))
        img.style.transform = `translate(calc(-50% + ${rX}px), calc(-50% + ${rY}px)) rotate(${rRot}deg) scale(${rScale})`;
      });
    });
    
    title.addEventListener('mouseleave', () => {
      // Images will fade out via CSS opacity. 
      // We also scale them back down slightly for a nice shrink effect.
      images.forEach(img => {
        img.style.transform = `translate(-50%, -50%) scale(0.5)`;
      });
    });
  });
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
  const interactiveSelector = 'a, button, .tab-btn, .info-card, .portfolio-card, details summary, .mastery-title';
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
