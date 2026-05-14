function initShowcaseAnimations() {
  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      observer.unobserve(card);

      const siblings = Array.from(card.parentElement.children);
      const index = siblings.indexOf(card);
      const delay = (index % 6) * 60;

      if (typeof anime !== 'undefined') {
        anime({
          targets: card,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 480,
          delay: delay,
          easing: 'easeOutQuart',
        });
      } else {
        card.style.transition = 'opacity 0.48s ease-out, transform 0.48s ease-out';
        card.style.transitionDelay = `${delay}ms`;
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  cards.forEach(card => observer.observe(card));
}
