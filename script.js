/* script.js — Extra Collective */

// ===== SCROLL FADE-IN =====
const fadeEls = document.querySelectorAll(
  '.hero-headline, .hero-bottom, .s01-heading, .services-grid, ' +
  '.s02-card, .s03-heading, .s03-body, .s03-pullquote, .s03-closing, ' +
  '.s04-card, .s05-card'
);

fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

fadeEls.forEach(el => observer.observe(el));

// ===== NAV BG ON SCROLL =====
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.backgroundColor = 'rgba(16, 20, 14, 0.92)';
    nav.style.backdropFilter = 'blur(12px)';
    nav.style.webkitBackdropFilter = 'blur(12px)';
    nav.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
  } else {
    nav.style.backgroundColor = 'transparent';
    nav.style.backdropFilter = 'none';
    nav.style.webkitBackdropFilter = 'none';
    nav.style.borderBottom = 'none';
  }
}, { passive: true });

// ===== PAUSE MARQUEE ON HOVER =====
const track = document.querySelector('.logos-track');
if (track) {
  const marqueeWrap = document.querySelector('.logos-marquee-wrap');
  if (marqueeWrap) {
    marqueeWrap.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    marqueeWrap.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });
  }
}
