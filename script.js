document.addEventListener('DOMContentLoaded', () => {
    // --- 1. THE CONFIG "BACKEND" ---
    // We moved the data here so it loads instantly without a server.
    const siteData = {
        siteConfig: {
            brandName: "extra",
            motto: "Average is invisible.",
            contactEmail: "hello@extracollective.com"
        },
        projects: [
            {
                id: 1,
                title: "Neon Horizon",
                category: "branding",
                // Placeholder image 1
                image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1000&auto=format&fit=crop", 
                tags: ["Identity", "Strategy"]
            },
            {
                id: 2,
                title: "Cyber Core",
                category: "digital",
                // Placeholder image 2
                image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop",
                tags: ["Web", "UI/UX"]
            },
            {
                id: 3,
                title: "Analog Soul",
                category: "print",
                // Placeholder image 3
                image: "https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?q=80&w=1000&auto=format&fit=crop",
                tags: ["Editorial", "Layout"]
            },
            {
                id: 4,
                title: "Corp Future",
                category: "corporate",
                // Placeholder image 4
                image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop",
                tags: ["Annual Report", "B2B"]
            }
        ]
    };

    // --- 2. INITIALIZATION ---
    const grid = document.getElementById('project-grid');
    const filters = document.querySelectorAll('.filter-btn');
    const brandName = document.getElementById('brand-name');
    const motto = document.getElementById('motto');
    const contactDisplay = document.getElementById('contact-display');

    // Load Config
    if(brandName) brandName.innerText = siteData.siteConfig.brandName.toUpperCase();
    if(motto) motto.innerText = siteData.siteConfig.motto.toUpperCase();
    if(contactDisplay) contactDisplay.innerText = siteData.siteConfig.contactEmail;

    // Load Projects
    renderProjects(siteData.projects);
    setupFilters(siteData.projects);

    // --- 3. RENDER LOGIC ---
    function renderProjects(projects) {
        grid.innerHTML = ''; // Clear current content
        
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
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

    // --- 4. FILTER LOGIC ---
    function setupFilters(allProjects) {
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(b => b.classList.remove('active'));
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

    // --- 5. CURSOR LOGIC ---
    const cursor = document.getElementById('cursor');
    
    // Only run if cursor element exists
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            // Update cursor position
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Add hover effects
        addCursorEffects();
    }

    function addCursorEffects() {
        const clickableElements = document.querySelectorAll('a, button, .project-card');
        clickableElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(2.5)';
                cursor.style.background = '#ffffff'; // Turn white on hover
                cursor.style.mixBlendMode = 'difference';
            });
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                cursor.style.background = 'var(--accent)'; // Back to neon
                cursor.style.mixBlendMode = 'normal';
            });
        });
    }
});
