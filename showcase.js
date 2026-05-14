function initShowcase() {
  const root = document.getElementById('showcase-root');
  if (!root) return;

  if (typeof SHOWCASE_DATA === 'undefined') {
    console.error('SHOWCASE_DATA is not defined.');
    return;
  }

  let html = '';

  SHOWCASE_DATA.forEach(client => {
    // Filter visible projects
    const visibleProjects = client.projects.filter(p => p.visible !== false);
    if (visibleProjects.length === 0) return;

    html += `
      <div class="showcase-client" data-client="${client.id}">
        <div class="showcase-client-header">
          <img class="showcase-client-logo"
               src="${client.logo}"
               alt="${client.name}"
               onerror="this.style.display='none'">
          <span class="showcase-client-name">${client.name}</span>
        </div>
        <div class="showcase-grid">
    `;

    visibleProjects.forEach(project => {
      html += `
          <article class="showcase-card showcase-card--${project.format}"
                   data-project="${project.id}"
                   role="button"
                   tabindex="0"
                   aria-label="${project.title}">
            <div class="showcase-card__media">
              <img class="showcase-card__cover"
                   src="${project.cover}"
                   alt="${project.title}"
                   loading="lazy"
                   crossorigin="anonymous"
                   onerror="this.closest('.showcase-card__media').classList.add('showcase-card__media--missing')">
            </div>
            <div class="showcase-card__label">
              <span class="showcase-card__title">${project.title}</span>
            </div>
          </article>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  root.innerHTML = html;
}
