document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('project-grid');
    const filters = document.querySelectorAll('.filter-btn');
    const brandName = document.getElementById('brand-name');
    const motto = document.getElementById('motto');
    const contactDisplay = document.getElementById('contact-display');

    // 1. Fetch Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Setup Config
            brandName.innerText = data.siteConfig.brandName.toUpperCase();
            motto.innerText = data.siteConfig.motto.toUpperCase();
            contactDisplay.innerText = data.siteConfig.contactEmail;

            // Render Projects
            renderProjects(data.projects);

            // Setup Filtering
            setupFilters(data.projects);
        })
        .catch(error => console.error('Error loading data:', error));

    // 2. Render Function
    function renderProjects(projects) {
        grid.innerHTML = ''; // Clear current
        
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            // Create tags string
            const tagsHtml = project.tags.join(' // ');

            card.innerHTML = `
                <div class="img-container">
                    <img src="${project.image}" alt="${project.title}">
                </div>
                <div class="card-info">
                    <div class="card-cat">${project.category}</div>
                    <h3 class="card-title">${project.title}</h3>
                    <div class="card-tags">${tagsHtml}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 3. Filter Logic
    function setupFilters(allProjects) {
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                filters.forEach(b => b.classList.remove('active'));
                // Add to clicked
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                if (filterValue === 'all') {
                    renderProjects(allProjects);
                } else {
                    const filtered = allProjects.filter(p => p.category.toLowerCase() === filterValue);
                    renderProjects(filtered);
                }
            });
        });
    }

    // 4. Custom Cursor Logic
    const cursor = document.getElementById('cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Hover effects for cursor
    const clickableElements = document.querySelectorAll('a, button, .project-card');
    clickableElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursor.style.background = '#fff';
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursor.style.background = 'var(--accent)';
        });
    });
});
