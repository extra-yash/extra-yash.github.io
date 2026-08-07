/* Sveltia CMS Live Preview Templates */

(function () {
  const initPreview = () => {
    if (!window.CMS) {
      setTimeout(initPreview, 100);
      return;
    }

    // Register site fonts and CSS stylesheet for iframe preview
    window.CMS.registerPreviewStyle('https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;900&family=Space+Mono:wght@400;700&display=swap');
    window.CMS.registerPreviewStyle('../style.css');

    const ProjectPreview = createClass({
      render: function () {
        const entry = this.props.entry;
        const getAsset = this.props.getAsset;

        const title = entry.getIn(['data', 'title']) || '';
        const description = entry.getIn(['data', 'description']) || '';
        const coverImage = entry.getIn(['data', 'cover_image']);
        const imageAsset = coverImage ? getAsset(coverImage) : null;
        const imageUrl = imageAsset ? imageAsset.toString() : '';

        const link = entry.getIn(['data', 'case_study_link']) || entry.getIn(['data', 'link']) || '#';
        const isConfidential = entry.getIn(['data', 'confidential_client']) === true;
        const engagementType = entry.getIn(['data', 'engagement_type']);
        const isExtraJob = engagementType === 'Extra大 Job';
        const client = entry.getIn(['data', 'client']);
        const studio = entry.getIn(['data', 'studio']);
        const featured = entry.getIn(['data', 'featured']) === true;

        // Tags & categories
        const tags = entry.getIn(['data', 'tags']);
        const categories = entry.getIn(['data', 'category']);
        const tagList = [];
        if (tags && typeof tags.forEach === 'function') {
          tags.forEach(t => t && tagList.push(t));
        }
        if (categories && typeof categories.forEach === 'function') {
          categories.forEach(c => c && tagList.push(c));
        }

        // Collaborators
        const collaborators = entry.getIn(['data', 'collaborators']);
        const creditsList = [];
        if (collaborators && typeof collaborators.forEach === 'function') {
          collaborators.forEach(c => {
            if (c && typeof c.get === 'function') {
              const person = c.get('person');
              const role = c.get('role');
              if (person && role) creditsList.push(`${person} — ${role}`);
              else if (person || role) creditsList.push(person || role);
            }
          });
        }

        // Meta info (client & studio)
        const metaParts = [];
        if (!isConfidential && client) {
          metaParts.push(`Client: ${client}`);
        }
        if (!isExtraJob && studio) {
          metaParts.push(`Studio: ${studio}`);
        }

        return h('div', {
          style: {
            backgroundColor: '#10140e',
            color: '#ffffff',
            fontFamily: "'Space Mono', monospace",
            padding: '40px 20px',
            minHeight: '100vh',
            boxSizing: 'border-box'
          }
        },
          h('div', { className: 's02-card', style: { maxWidth: '640px', margin: '0 auto' } },
            h('div', { className: 'project-card' },
              imageUrl ? h('img', { src: imageUrl, alt: title, className: 'project-card-cover' }) : null,
              h('div', { className: 'project-card-body' },
                featured ? h('span', { className: 'project-featured-badge' }, 'Featured') : null,
                h('h3', { className: 'project-card-title' }, title || 'Untitled Project'),
                description ? h('p', { className: 'project-card-desc' }, description) : null,
                metaParts.length ? h('div', { className: 'project-card-meta' }, metaParts.join('  |  ')) : null,
                creditsList.length ? h('div', { className: 'project-card-credits' }, `Credits: ${creditsList.join(', ')}`) : null,
                tagList.length ? h('div', { className: 'project-card-tags' },
                  tagList.map((t, idx) => h('span', { key: idx, className: 'project-tag' }, t))
                ) : null
              ),
              link && link !== '#' ? h('a', {
                href: link,
                target: '_blank',
                rel: 'noopener',
                className: 'project-card-link'
              },
                'Explore Project ',
                h('img', {
                  src: '../assets/icons/interface-essential-cursor.svg',
                  alt: '',
                  style: { width: '14px', height: '14px', filter: 'invert(0)', verticalAlign: 'middle', marginLeft: '4px' }
                })
              ) : null
            )
          )
        );
      }
    });

    window.CMS.registerPreviewTemplate('projects', ProjectPreview);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreview);
  } else {
    initPreview();
  }
})();
