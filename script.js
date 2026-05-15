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
    wave: '#FF2C00',  // EXTRA BRIGHT
    accent: '#FF2C00',
    bg: '#1A1A2E',  // EXTRA DARK
    theme: 'dark',
  },
  agencies: {
    wave: '#5766ED',  // EXTRA CRISP — blue symbols on dark
    accent: '#5766ED',
    bg: '#1A1A2E',  // EXTRA DARK
    theme: 'dark',
  },
  creatives: {
    wave: '#9D00FF',  // EXTRA VIOLET
    accent: '#9D00FF',
    bg: '#1A1A2E',  // EXTRA DARK
    theme: 'dark',
  },
  showcase: {
    wave: '#27E700',  // EXTRA CONTRAST — green
    accent: '#27E700',
    bg: '#1A1A2E',  // EXTRA DARK
    theme: 'dark',
  },
  origins: {
    wave: '#FFFFF0',  // EXTRA LIGHT — cream, reflective tone for the essay
    accent: '#FFFFF0',
    bg: '#1A1A2E',  // EXTRA DARK
    theme: 'dark',
    ditherScale: 0.35,  // Controls background density (1.0 = full, 0.25 = sparse)
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
let showcaseActivated = false;

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Resolve the active tab from the hash BEFORE initialising DitherBG,
  // so the background starts in the correct colour and never flashes brands-red.
  const hashTab = window.location.hash.replace('#', '');
  const initTab = (hashTab && TAB_COLORS[hashTab]) ? hashTab : 'brands';
  const initColors = TAB_COLORS[initTab];
  // 1. Set main-window geometry BEFORE dither canvas is created
  snapAllToGrid();

  // 2. NOW init dither — resize() reads correct main-window dimensions
  DitherBG.init({ color: initColors.wave, bgColor: initColors.bg });

  // 3. Re-snap after init (canvas is now in DOM, measurements are final)
  snapAllToGrid();

  initCursor();

  // Render showcase cards BEFORE initTabs so that when initTabs dispatches
  // the showcaseActivated event (on hash-reload), the card images already
  // exist in the DOM and showcase-dither.js can process them immediately.
  if (typeof initShowcase === 'function') initShowcase();
  if (typeof initShowcaseCards === 'function') initShowcaseCards();
  if (typeof initShowcaseAnimations === 'function') initShowcaseAnimations();

  initTabs();
  initProcessTabs();
  initScrollGuidance();
  initMasteryHover();

  // Re-enable CMS load when ready
  // loadPortfolio();
});

// ─── GRID SNAP SYSTEM ────────────────────────────────────────────
function snapAllToGrid() {
  const mainWindow = document.querySelector('.main-window');

  const cell = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dither-cell')
  );
  const margin = cell * 2; // --grid-margin in px

  if (!cell || cell <= 0) return;

  // ── NAV height ───────────────────────────────────────────────────
  const nav = document.querySelector('.top-nav');
  nav.style.height = '';
  const navSnapped = Math.ceil(nav.getBoundingClientRect().height / cell) * cell;
  nav.style.height = navSnapped + 'px';

  // ── MAIN WINDOW size ─────────────────────────────────────────────
  const availableW = window.innerWidth - 2 * margin;
  const mainW = Math.floor(availableW / cell) * cell;
  
  const footerH = cell * 3;

  // Footer geometry
  const footer = document.querySelector('.site-footer');
  if (footer) {
    footer.style.width = mainW + 'px';
    footer.style.marginLeft = margin + 'px';
  }

  // Main window height always accounts for footer
  const remainingH = window.innerHeight - navSnapped - footerH;
  const mainH = Math.floor(remainingH / cell) * cell;

  if (mainWindow) {
    mainWindow.style.width = mainW + 'px';
    mainWindow.style.marginLeft = margin + 'px';
    mainWindow.style.marginRight = 'auto';
    mainWindow.style.height = mainH + 'px';
    mainWindow.style.flex = 'none';
  }

  // ── SNAP SECTIONS ────────────────────────────────────────────────
  document.querySelectorAll('.snap-section').forEach(s => {
    s.style.height = mainH + 'px';
  });

  // DITHER CANVAS — resize after layout is final
  if (typeof DitherBG !== 'undefined' && DitherBG.resize) {
    DitherBG.resize();
  }

  // Snap pill edges to grid lines — must run after nav height + main window width are set
}

window.addEventListener('resize', snapAllToGrid);

// ─── FILM STRIP SCROLL ────────────────────────────────────────────
(function () {
  let isAnimating = false;
  let currentSnap = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function getActivePanel() {
    return document.querySelector('.tab-panel.active');
  }

  function getSnapSections() {
    return Array.from(getActivePanel()?.querySelectorAll('.snap-section') || []);
  }

  function scrollToSnap(index, duration = 600) {
    const panel = getActivePanel();
    if (!panel || isAnimating) return;
    const sections = getSnapSections();
    if (!sections[index]) return;

    const targetY = sections[index].offsetTop;
    const startY = panel.scrollTop;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    isAnimating = true;
    currentSnap = index;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      panel.scrollTop = startY + distance * easeOutCubic(progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        isAnimating = false;
        // Restore dither density fade based on section position
        const sections = getSnapSections();
        const fraction = sections.length > 1 ? currentSnap / (sections.length - 1) : 0;
        if (typeof DitherBG !== 'undefined') {
          DitherBG.setColorScale(1.0 - (1.0 - 0.35) * fraction);
        }
      }
    }
    requestAnimationFrame(step);
  }

  function onWheel(e) {
    if (isAnimating) return;
    e.preventDefault();
    const sections = getSnapSections();
    if (e.deltaY > 0 && currentSnap < sections.length - 1) {
      scrollToSnap(currentSnap + 1);
    } else if (e.deltaY < 0 && currentSnap > 0) {
      scrollToSnap(currentSnap - 1);
    }
  }

  const mainWin = document.getElementById('main-window');
  if (mainWin) {
    mainWin.addEventListener('wheel', onWheel, { passive: false });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const mw = document.getElementById('main-window');
      if (mw) mw.addEventListener('wheel', onWheel, { passive: false });
    });
  }

  // Reset on tab switch — defer until DOM is ready
  function bindTabResets() {
    document.querySelectorAll('.tab-btn, .nav-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSnap = 0;
        requestAnimationFrame(() => {
          const panel = getActivePanel();
          if (panel) panel.scrollTop = 0;
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTabResets);
  } else {
    bindTabResets();
  }
})();

// ─── TOUCH SUPPORT ────────────────────────────────────────────────
(function () {
  let touchStartY = 0;

  function setup() {
    const mainWindow = document.getElementById('main-window');
    if (!mainWindow) return;

    mainWindow.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    mainWindow.addEventListener('touchend', e => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 40) return;
      mainWindow.dispatchEvent(new WheelEvent('wheel', { deltaY: delta, cancelable: true }));
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();


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

  // Nav pill buttons (Showcase, Origins) — same tab system, own grid cells
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
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

  // Update nav-pill-btn active state
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update panels
  panels.forEach(panel => {
    const isActive = panel.id === `panel-${tab}`;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  if (tab === 'showcase' && !showcaseActivated) {
    showcaseActivated = true;
    document.dispatchEvent(new CustomEvent('showcaseActivated'));
  }

  // Update URL hash
  history.replaceState(null, '', `#${tab}`);

  // Update dither wave colour, bg colour, CSS accent token, and body theme
  const colors = TAB_COLORS[tab];
  DitherBG.setColor(colors.wave);
  DitherBG.setBgColor(colors.bg);
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.body.dataset.theme = colors.theme;

  if (colors.ditherScale !== undefined) {
    DitherBG.setColorScale(colors.ditherScale);
  } else {
    DitherBG.clearColorScale();
  }
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

  // Helper to close all active items on mobile
  function closeAllMastery() {
    document.querySelectorAll('.mastery-item.is-active').forEach(activeItem => {
      activeItem.classList.remove('is-active');
      activeItem.querySelectorAll('.h-img').forEach(img => {
        img.style.transform = `translate(-50%, -50%) scale(0.5)`;
      });
    });
  }

  // Close when tapping outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768 && !e.target.closest('.mastery-item')) {
      closeAllMastery();
    }
  });

  masteryItems.forEach(item => {
    const images = item.querySelectorAll('.h-img');
    const title = item.querySelector('.mastery-title');
    const masteryKey = item.getAttribute('data-mastery');
    if (!title) return;

    // Load images from data.js
    if (typeof MASTERY_DATA !== 'undefined' && MASTERY_DATA[masteryKey]) {
      const urls = MASTERY_DATA[masteryKey];
      images.forEach((img, i) => {
        let rawUrl = urls[i];
        if (rawUrl && rawUrl.trim() !== '') {
          // Auto-convert Google Drive viewer links to direct image links
          const gDriveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
          if (gDriveMatch) {
            // Use the thumbnail API endpoint to bypass strict hotlinking rules
            rawUrl = `https://drive.google.com/thumbnail?id=${gDriveMatch[1]}&sz=w800`;
          }

          // Preload the image to calculate its true aspect ratio
          const preloader = new Image();
          preloader.src = rawUrl;
          preloader.onload = () => {
            const aspect = preloader.naturalWidth / preloader.naturalHeight;

            // Start with a target height (original was 160px)
            let h = 160;
            let w = h * aspect;

            // If the image is extremely wide (like a landscape banner), cap the width
            if (w > 240) {
              w = 240;
              h = w / aspect;
            }

            img.style.width = `${w}px`;
            img.style.height = `${h}px`;
            img.style.backgroundImage = `url('${rawUrl}')`;
            img.classList.remove('placeholder');
          };

        } else {
          img.style.display = 'none'; // Hide if no link provided
        }
      });
    } else {
      images.forEach(img => img.style.display = 'none'); // Hide all if category missing
    }

    function openImages() {
      // On mobile, close others first
      if (window.innerWidth < 768) {
        closeAllMastery();
      }

      item.classList.add('is-active');
      const isMobile = window.innerWidth < 768;

      // Define regions. Shrink them by ~60% on mobile to prevent screen edge bleeding.
      const regions = isMobile ? [
        { x: -50, y: -40 },
        { x: 50, y: -30 },
        { x: -40, y: 50 },
        { x: 40, y: 60 },
        { x: 0, y: -60 },
        { x: 0, y: 70 }
      ] : [
        { x: -120, y: -70 },
        { x: 120, y: -60 },
        { x: -110, y: 80 },
        { x: 110, y: 90 },
        { x: 0, y: -100 },
        { x: 0, y: 110 }
      ];

      // Shuffle regions
      const shuffled = regions.sort(() => 0.5 - Math.random());

      images.forEach((img, i) => {
        const region = shuffled[i % shuffled.length];

        // Add random noise to the distinct region (less noise on mobile)
        const variance = isMobile ? 20 : 40;
        const offset = isMobile ? 10 : 20;
        const rX = region.x + (Math.random() * variance - offset);
        const rY = region.y + (Math.random() * variance - offset);

        const rRot = Math.random() * 30 - 15;
        const rScale = 0.9 + (Math.random() * 0.25);

        img.style.transform = `translate(calc(-50% + ${rX}px), calc(-50% + ${rY}px)) rotate(${rRot}deg) scale(${rScale})`;
      });
    }

    function closeImages() {
      item.classList.remove('is-active');
      images.forEach(img => {
        img.style.transform = `translate(-50%, -50%) scale(0.5)`;
      });
    }

    // Desktop Interaction
    title.addEventListener('mouseenter', () => {
      if (window.innerWidth >= 768) openImages();
    });

    title.addEventListener('mouseleave', () => {
      if (window.innerWidth >= 768) closeImages();
    });

    // Mobile Interaction
    title.addEventListener('click', (e) => {
      if (window.innerWidth < 768) {
        e.preventDefault();
        if (item.classList.contains('is-active')) {
          closeImages();
        } else {
          openImages();
        }
      }
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

  // Hide until the first mousemove so the cursor doesn't snap from (0,0) on reload.
  cursor.style.opacity = '0';

  // Use transform for positioning — runs on GPU compositor, zero layout lag.
  document.addEventListener('mousemove', e => {
    cursor.style.opacity = '1';
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
