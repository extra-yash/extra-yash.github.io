function isValidMediaItem(item) {
  if (item.type === 'video') {
    const hasVimeo = item.vimeoId && item.vimeoId !== 'placeholder';
    const hasDrive = item.driveId && item.driveId !== 'placeholder';
    return !!(hasVimeo || hasDrive);
  }
  if (item.type === 'image') {
    return !!(item.src && item.src.trim() !== '');
  }
  return false;
}

function buildMediaNav(total) {
  const nav = document.createElement('div');
  nav.className = 'showcase-media-nav';

  const prev = document.createElement('button');
  prev.className = 'showcase-media-prev';
  prev.setAttribute('aria-label', 'Previous media');
  prev.textContent = '←';
  nav.appendChild(prev);

  const counter = document.createElement('span');
  counter.className = 'showcase-media-counter';
  counter.textContent = '1 / ' + total;
  nav.appendChild(counter);

  const next = document.createElement('button');
  next.className = 'showcase-media-next';
  next.setAttribute('aria-label', 'Next media');
  next.textContent = '→';
  nav.appendChild(next);

  return nav;
}

function updateCounter(nav, index, total) {
  const counter = nav.querySelector('.showcase-media-counter');
  if (counter) {
    counter.textContent = `${index + 1} / ${total}`;
  }
}

function renderItem(viewport, item) {
  while (viewport.firstChild) {
    viewport.removeChild(viewport.firstChild);
  }

  if (item.type === 'video') {
    const hasVimeo = item.vimeoId && item.vimeoId !== 'placeholder';
    let url = '';
    
    if (hasVimeo) {
      url = `https://player.vimeo.com/video/${item.vimeoId}?autoplay=1&muted=1&loop=0&title=0&byline=0&portrait=0`;
    } else {
      url = `https://drive.google.com/file/d/${item.driveId}/preview`;
    }

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.className = 'showcase-media-iframe';
    
    viewport.appendChild(iframe);
  } else if (item.type === 'image') {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    img.className = 'showcase-media-image';
    img.loading = 'lazy';
    
    viewport.appendChild(img);
  }
}

function buildMediaStage(project) {
  const items = (project.media || [])
    .filter(isValidMediaItem)
    .sort((a, b) => {
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (a.type !== 'video' && b.type === 'video') return 1;
      return 0;
    });

  const stage = document.createElement('div');
  const FORMAT_RATIOS = { portrait: '2 / 3', landscape: '16 / 9', square: '1 / 1' };
  stage.style.aspectRatio = FORMAT_RATIOS[project.format] || '16 / 9';
  stage.style.width = '100%';
  stage.className = 'showcase-card__media-stage';

  if (items.length === 0) {
    return stage;
  }

  let currentIndex = 0;

  const viewport = document.createElement('div');
  viewport.className = 'showcase-card__media-viewport';
  stage.appendChild(viewport);

  let nav = null;
  if (items.length > 1) {
    nav = buildMediaNav(items.length);
    viewport.appendChild(nav);
  }

  renderItem(viewport, items[0]);
  if (items.length > 1 && nav) {
    updateCounter(nav, 0, items.length);
  }

  if (items.length > 1 && nav) {
    nav.querySelector('.showcase-media-prev').addEventListener('click', e => {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      renderItem(viewport, items[currentIndex]);
      updateCounter(nav, currentIndex, items.length);
    });

    nav.querySelector('.showcase-media-next').addEventListener('click', e => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % items.length;
      renderItem(viewport, items[currentIndex]);
      updateCounter(nav, currentIndex, items.length);
    });
  }

  if (items.length > 1) {
    let touchStartX = 0;
    let touchStartY = 0;

    stage.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) {
        currentIndex = (currentIndex + 1) % items.length;
      } else {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
      }
      renderItem(viewport, items[currentIndex]);
      if (nav) updateCounter(nav, currentIndex, items.length);
    }, { passive: true });
  }

  return stage;
}
