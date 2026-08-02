/* Extra Collective — script.js */

// ═══════════════════════════════════════
// Add data-reveal attributes to animate-in elements
// ═══════════════════════════════════════
const revealTargets = [
  { selector: '.hero-headline',   delay: 0 },
  { selector: '.hero-desc',       delay: 1 },
  { selector: '.s01-heading',     delay: 0 },
  { selector: '.services-grid',   delay: 1 },
  { selector: '.s02-card',        delay: 0 },
  { selector: '.s03-heading',     delay: 0 },
  { selector: '.s03-story-top',   delay: 1 },
  { selector: '.s03-story-cols',  delay: 2 },
  { selector: '.s03-pullquote',   delay: 0 },
  { selector: '.s03-closing',     delay: 1 },
  { selector: '.s04-card',        delay: 0 },
  { selector: '.s05-card',        delay: 0 },
];

revealTargets.forEach(({ selector, delay }) => {
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute('data-reveal', '');
    if (delay) el.setAttribute('data-delay', String(delay));
  }
});

// ═══════════════════════════════════════
// IntersectionObserver for scroll reveals
// ═══════════════════════════════════════
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
);

document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

// ═══════════════════════════════════════
// NAV — frosted bg on scroll
// ═══════════════════════════════════════
const nav = document.getElementById('nav');

const updateNav = () => {
  if (window.scrollY > 50) {
    nav.style.cssText = `
      background-color: rgba(16,20,14,0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    `;
  } else {
    nav.style.cssText = '';
  }
};

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ═══════════════════════════════════════
// LOGO MARQUEE — pause on hover (via CSS class)
// ═══════════════════════════════════════
// (handled via CSS .logos-track:hover selector)
// No extra JS needed.

// ═══════════════════════════════════════
// CUSTOM CURSOR
// ═══════════════════════════════════════
const cursorDot = document.querySelector('.cursor-dot');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let currentX = mouseX;
let currentY = mouseY;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Add hover effect for links and buttons
const interactiveElements = document.querySelectorAll('a, button, input, [role="button"], .hero-arrow');
interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    if (cursorDot) cursorDot.classList.add('is-hovering');
  });
  el.addEventListener('mouseleave', () => {
    if (cursorDot) cursorDot.classList.remove('is-hovering');
  });
});

const renderCursor = () => {
  // Add a very subtle spring/easing effect (0.15 interpolation)
  currentX += (mouseX - currentX) * 0.15;
  currentY += (mouseY - currentY) * 0.15;

  if (cursorDot) {
    cursorDot.style.transform = `translate3d(calc(${currentX}px - 50%), calc(${currentY}px - 50%), 0)`;
  }
  requestAnimationFrame(renderCursor);
};
requestAnimationFrame(renderCursor);
