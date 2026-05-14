function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

let activeCard = null;

function findProject(id) {
  for (const client of SHOWCASE_DATA) {
    const p = client.projects.find(p => p.id === id);
    if (p) return p;
  }
  return null;
}

function buildExpandPanel(project) {
  const panel = document.createElement('div');
  panel.className = 'showcase-card__expand';

  // Left panel
  const left = document.createElement('div');
  left.className = 'showcase-card__expand-left';

  const title = document.createElement('h2');
  title.className = 'showcase-card__expand-title';
  title.textContent = project.title;
  left.appendChild(title);

  const rolesContainer = document.createElement('div');
  rolesContainer.className = 'showcase-card__expand-roles';
  
  if (project.roles && project.roles.length > 0) {
    project.roles.forEach(role => {
      const roleRow = document.createElement('div');
      roleRow.className = 'showcase-card__expand-role';
      
      const whatSpan = document.createElement('span');
      whatSpan.className = 'showcase-card__expand-what';
      whatSpan.textContent = role.what;
      
      const sepSpan = document.createElement('span');
      sepSpan.className = 'showcase-card__expand-sep';
      sepSpan.textContent = '—';
      
      const whoSpan = document.createElement('span');
      whoSpan.className = 'showcase-card__expand-who';
      whoSpan.textContent = role.who;
      
      roleRow.appendChild(whatSpan);
      roleRow.appendChild(sepSpan);
      roleRow.appendChild(whoSpan);
      
      rolesContainer.appendChild(roleRow);
    });
  }
  left.appendChild(rolesContainer);

  const summary = document.createElement('p');
  summary.className = 'showcase-card__expand-summary';
  summary.textContent = project.summary;
  left.appendChild(summary);

  const detail = document.createElement('p');
  detail.className = 'showcase-card__expand-detail';
  detail.textContent = project.detail;
  left.appendChild(detail);

  // Right panel
  const right = document.createElement('div');
  right.className = 'showcase-card__expand-right';

  const mediaStage = typeof buildMediaStage === 'function'
    ? buildMediaStage(project)
    : (() => {
        const d = document.createElement('div');
        d.className = 'showcase-card__media-stage';
        return d;
      })();
  right.appendChild(mediaStage);

  panel.appendChild(left);
  panel.appendChild(right);

  return panel;
}

function openCardDesktop(card, project) {
  card.classList.add('showcase-card--expanded');
  card.setAttribute('aria-expanded', 'true');

  const panel = buildExpandPanel(project);
  card.appendChild(panel);

  requestAnimationFrame(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  if (typeof anime !== 'undefined') {
    anime({
      targets: panel,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 380,
      easing: 'easeOutQuart',
    });
  } else {
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
  }
}

function closeCardDesktop(card) {
  const panel = card.querySelector('.showcase-card__expand');
  if (!panel) return;

  if (typeof anime !== 'undefined') {
    anime({
      targets: panel,
      opacity: [1, 0],
      translateY: [0, 8],
      duration: 220,
      easing: 'easeInQuart',
      complete: () => {
        panel.remove();
        card.classList.remove('showcase-card--expanded');
        card.setAttribute('aria-expanded', 'false');
      }
    });
  } else {
    panel.remove();
    card.classList.remove('showcase-card--expanded');
    card.setAttribute('aria-expanded', 'false');
  }
}

function openCardMobile(card, project) {
  card.classList.add('showcase-card--mobile-open');
  card.setAttribute('aria-expanded', 'true');

  const panel = document.createElement('div');
  panel.className = 'showcase-card__mobile-panel';

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'showcase-card__mob-media-wrap';
  const mediaStage = typeof buildMediaStage === 'function'
    ? buildMediaStage(project) : document.createElement('div');
  mediaWrap.appendChild(mediaStage);
  panel.appendChild(mediaWrap);

  const handle = document.createElement('div');
  handle.className = 'showcase-card__mob-handle';

  const mobTitle = document.createElement('span');
  mobTitle.className = 'showcase-card__mob-title';
  mobTitle.textContent = project.title;
  handle.appendChild(mobTitle);

  const chevron = document.createElement('button');
  chevron.className = 'showcase-card__mob-chevron';
  chevron.setAttribute('aria-label', 'Show project info');
  chevron.textContent = '↓';
  handle.appendChild(chevron);

  panel.appendChild(handle);

  const infoEl = document.createElement('div');
  infoEl.className = 'showcase-card__mob-info';

  if (project.roles && project.roles.length > 0) {
    const rolesContainer = document.createElement('div');
    rolesContainer.className = 'showcase-card__expand-roles';
    project.roles.forEach(role => {
      const roleRow = document.createElement('div');
      roleRow.className = 'showcase-card__expand-role';
      
      const whatSpan = document.createElement('span');
      whatSpan.className = 'showcase-card__expand-what';
      whatSpan.textContent = role.what;
      
      const sepSpan = document.createElement('span');
      sepSpan.className = 'showcase-card__expand-sep';
      sepSpan.textContent = '—';
      
      const whoSpan = document.createElement('span');
      whoSpan.className = 'showcase-card__expand-who';
      whoSpan.textContent = role.who;
      
      roleRow.appendChild(whatSpan);
      roleRow.appendChild(sepSpan);
      roleRow.appendChild(whoSpan);
      
      rolesContainer.appendChild(roleRow);
    });
    infoEl.appendChild(rolesContainer);
  }

  const summary = document.createElement('p');
  summary.className = 'showcase-card__expand-summary';
  summary.textContent = project.summary;
  infoEl.appendChild(summary);

  const detail = document.createElement('p');
  detail.className = 'showcase-card__expand-detail';
  detail.textContent = project.detail;
  infoEl.appendChild(detail);

  panel.appendChild(infoEl);

  let infoOpen = false;
  chevron.addEventListener('click', e => {
    e.stopPropagation();
    infoOpen = !infoOpen;
    if (infoOpen) {
      panel.classList.add('showcase-card__mobile--info-open');
      chevron.textContent = '↑';
      if (typeof anime !== 'undefined') {
        anime({ targets: infoEl, translateY: [40, 0], opacity: [0, 1],
                duration: 300, easing: 'easeOutQuart' });
      } else {
        infoEl.style.opacity = '1';
        infoEl.style.transform = 'translateY(0)';
      }
    } else {
      panel.classList.remove('showcase-card__mobile--info-open');
      chevron.textContent = '↓';
      if (typeof anime !== 'undefined') {
        anime({ targets: infoEl, translateY: [0, 40], opacity: [1, 0],
                duration: 200, easing: 'easeInQuart' });
      } else {
        infoEl.style.opacity = '0';
      }
    }
  });

  const origMedia = card.querySelector('.showcase-card__media');
  const origLabel = card.querySelector('.showcase-card__label');
  if (origMedia) origMedia.style.setProperty('display', 'none');
  if (origLabel) origLabel.style.setProperty('display', 'none');

  card.appendChild(panel);

  if (typeof anime !== 'undefined') {
    anime({ targets: panel, opacity: [0,1], translateY: [16,0],
            duration: 320, easing: 'easeOutQuart' });
  } else {
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
  }

  requestAnimationFrame(() =>
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  );
}

function closeCardMobile(card) {
  const panel = card.querySelector('.showcase-card__mobile-panel');
  if (!panel) return;

  if (typeof anime !== 'undefined') {
    anime({
      targets: panel, opacity: [1,0], translateY: [0,16],
      duration: 200, easing: 'easeInQuart',
      complete: () => {
        panel.remove();
        card.querySelector('.showcase-card__media')?.style.removeProperty('display');
        card.querySelector('.showcase-card__label')?.style.removeProperty('display');
        card.classList.remove('showcase-card--mobile-open');
        card.setAttribute('aria-expanded', 'false');
      }
    });
  } else {
    panel.remove();
    card.querySelector('.showcase-card__media')?.style.removeProperty('display');
    card.querySelector('.showcase-card__label')?.style.removeProperty('display');
    card.classList.remove('showcase-card--mobile-open');
    card.setAttribute('aria-expanded', 'false');
  }
}

function openCard(card) {
  const project = findProject(card.dataset.project);
  if (!project) return;

  if (isMobileViewport()) {
    openCardMobile(card, project);
  } else {
    openCardDesktop(card, project);
  }
}

function closeCard(card) {
  if (card.classList.contains('showcase-card--mobile-open')) {
    closeCardMobile(card);
  } else {
    closeCardDesktop(card);
  }
}

function initShowcaseCards() {
  document.addEventListener('click', e => {
    if (e.target.closest('.showcase-card__expand')) return;
    if (e.target.closest('.showcase-card__mobile-panel')) return;

    const card = e.target.closest('.showcase-card');
    const root = document.getElementById('showcase-root');
    const prev = activeCard;

    if (prev) {
      closeCard(prev);
      activeCard = null;
    }

    if (card && card !== prev && root && root.contains(card)) {
      openCard(card);
      activeCard = card;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeCard) {
      closeCard(activeCard);
      activeCard = null;
      return;
    }

    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = document.activeElement?.closest('.showcase-card');
    if (!card) return;
    e.preventDefault();
    
    if (card === activeCard) {
      closeCard(card);
      activeCard = null;
    } else {
      if (activeCard) {
        closeCard(activeCard);
        activeCard = null;
      }
      openCard(card);
      activeCard = card;
    }
  });
}
