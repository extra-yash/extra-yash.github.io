/* Dynamic Portfolio Projects Renderer */

function parseYamlValue(str) {
  if (typeof str !== 'string') return str;
  str = str.trim();
  if (str === 'true') return true;
  if (str === 'false') return false;
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, content: text };

  const yamlText = match[1];
  const content = text.slice(match[0].length).trim();
  const data = {};

  const lines = yamlText.split(/\r?\n/);
  let currentKey = null;
  let currentObjectInArray = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = rawLine.search(/\S/);

    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2).trim();
      if (!currentKey) continue;

      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }

      if (rest.includes(':')) {
        const colonIdx = rest.indexOf(':');
        const k = rest.slice(0, colonIdx).trim();
        const v = parseYamlValue(rest.slice(colonIdx + 1));
        currentObjectInArray = { [k]: v };
        data[currentKey].push(currentObjectInArray);
      } else {
        const v = parseYamlValue(rest);
        currentObjectInArray = null;
        data[currentKey].push(v);
      }
    } else if (indent > 2 && currentObjectInArray && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const k = trimmed.slice(0, colonIdx).trim();
      const v = parseYamlValue(trimmed.slice(colonIdx + 1));
      currentObjectInArray[k] = v;
    } else if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();

      currentKey = key;
      currentObjectInArray = null;

      if (valStr !== '') {
        data[key] = parseYamlValue(valStr);
      } else {
        data[key] = null;
      }
    }
  }

  return { data, content };
}

async function fetchProjectFiles() {
  try {
    const res = await fetch('https://api.github.com/repos/extra-yash/extra-yash.github.io/contents/content/projects');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter(file => file.name.endsWith('.md')).map(file => file.name);
      }
    }
  } catch (e) {
    console.warn('GitHub API fetch failed, falling back to index.json', e);
  }

  try {
    const res = await fetch('content/projects/index.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn('Local index.json fetch failed', e);
  }

  return ['sample-project.md'];
}

async function renderProjects() {
  const container = document.getElementById('projectsGrid');
  if (!container) return;

  const filenames = await fetchProjectFiles();
  const projects = [];

  for (const filename of filenames) {
    try {
      const res = await fetch(`content/projects/${filename}`);
      if (res.ok) {
        const text = await res.text();
        const { data } = parseFrontmatter(text);
        if (data.title) {
          projects.push(data);
        }
      }
    } catch (e) {
      console.error(`Failed to load project: ${filename}`, e);
    }
  }

  if (projects.length === 0) return;

  // Sort featured: true projects first, then by date descending
  projects.sort((a, b) => {
    const isAFeatured = a.featured === true || a.featured === 'true';
    const isBFeatured = b.featured === true || b.featured === 'true';

    if (isAFeatured !== isBFeatured) {
      return isAFeatured ? -1 : 1;
    }

    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;

    return dateB - dateA;
  });

  container.innerHTML = projects.map(proj => {
    const title = proj.title || 'Untitled Project';
    const desc = proj.description || '';
    const cover = proj.cover_image || '';
    const link = proj.case_study_link || proj.link || '#';
    const isConfidential = proj.confidential_client === true || proj.confidential_client === 'true';
    const isExtraJob = proj.engagement_type === 'Extra大 Job';

    // Tags & Categories
    const tagsList = [];
    if (proj.tags) {
      if (Array.isArray(proj.tags)) tagsList.push(...proj.tags);
      else tagsList.push(proj.tags);
    }
    if (proj.category) {
      if (Array.isArray(proj.category)) tagsList.push(...proj.category);
      else tagsList.push(proj.category);
    }
    const uniqueTags = [...new Set(tagsList)];
    const tagsHtml = uniqueTags.map(tag => `<span class="project-tag">${tag}</span>`).join('');

    // Client & Studio logic
    const metaParts = [];
    if (!isConfidential && proj.client) {
      metaParts.push(`Client: ${proj.client}`);
    }
    if (!isExtraJob && proj.studio) {
      metaParts.push(`Studio: ${proj.studio}`);
    }
    const metaHtml = metaParts.length ? `<div class="project-card-meta">${metaParts.join(' &nbsp;|&nbsp; ')}</div>` : '';

    // Collaborators / Credit Line logic (e.g. "Yash — Art Direction, Jane — Motion")
    const creditsList = Array.isArray(proj.collaborators)
      ? proj.collaborators.map(c => {
          if (typeof c === 'object' && c !== null) {
            if (c.person && c.role) return `${c.person} — ${c.role}`;
            return c.person || c.role || '';
          }
          return String(c);
        }).filter(Boolean)
      : [];
    const creditsHtml = creditsList.length
      ? `<div class="project-card-credits">Credits: ${creditsList.join(', ')}</div>`
      : '';

    const coverHtml = cover ? `<img src="${cover}" alt="${title}" class="project-card-cover">` : '';
    const featuredBadge = (proj.featured === true || proj.featured === 'true')
      ? `<span class="project-featured-badge">Featured</span>`
      : '';

    return `
      <div class="project-card">
        ${coverHtml}
        <div class="project-card-body">
          ${featuredBadge}
          <h3 class="project-card-title">${title}</h3>
          <p class="project-card-desc">${desc}</p>
          ${metaHtml}
          ${creditsHtml}
          ${tagsHtml ? `<div class="project-card-tags">${tagsHtml}</div>` : ''}
        </div>
        ${link && link !== '#' ? `
          <a href="${link}" target="_blank" rel="noopener" class="project-card-link">
            Explore Project 
            <img src="assets/icons/interface-essential-cursor.svg" alt="" style="width:14px;height:14px;filter:invert(0);vertical-align:middle;">
          </a>
        ` : ''}
      </div>
    `;
  }).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderProjects);
} else {
  renderProjects();
}
