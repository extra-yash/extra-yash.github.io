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
// CUSTOM CURSOR (Hardware-accelerated)
// ═══════════════════════════════════════
const cursorDot = document.querySelector('.cursor-dot');

if (cursorDot) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;
  let isHovered = false;
  let currentScale = 0.5;
  let isAnimating = false;

  const renderCursor = () => {
    const dx = mouseX - currentX;
    const dy = mouseY - currentY;
    const targetScale = isHovered ? 0.875 : 0.5;
    const ds = targetScale - currentScale;

    currentX += dx * 0.2;
    currentY += dy * 0.2;
    currentScale += ds * 0.2;

    cursorDot.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translate(-50%, -50%) scale(${currentScale.toFixed(3)})`;

    // Continue animation loop as long as position or scale is moving
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05 || Math.abs(ds) > 0.005) {
      requestAnimationFrame(renderCursor);
    } else {
      currentX = mouseX;
      currentY = mouseY;
      currentScale = targetScale;
      cursorDot.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${currentScale})`;
      isAnimating = false;
    }
  };

  const startAnimation = () => {
    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(renderCursor);
    }
  };

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    startAnimation();
  }, { passive: true });

  const interactiveSelector = 'a, button, input, [role="button"], .hero-arrow';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      isHovered = true;
      startAnimation();
    }
  });

  document.addEventListener('mouseout', (e) => {
    const currentTarget = e.target.closest(interactiveSelector);
    const nextTarget = e.relatedTarget ? e.relatedTarget.closest(interactiveSelector) : null;
    if (currentTarget && currentTarget !== nextTarget) {
      isHovered = false;
      startAnimation();
    }
  });
}
