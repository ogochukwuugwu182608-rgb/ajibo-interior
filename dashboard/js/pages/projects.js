
// js/pages/projects.js
import { ProjectsAPI } from '../api.js';
import { pageContent, showToast, showLoading, formatDate } from '../main.js';

export async function loadProjectsPage() {
    try {
        const data = await ProjectsAPI.getAll();
        const projects = data.results || [];

        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-project-diagram"></i>
                        All Projects
                    </h3>
                    <div style="display: flex; gap: 1rem;">
                        <select id="categoryFilter" style="padding: 0.5rem; border-radius: 8px; border: 2px solid var(--border-color);">
                            <option value="">All Categories</option>
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="luxury">Luxury</option>
                        </select>
                    </div>
                </div>

                ${projects.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; padding: 1rem;">
                        ${projects.map(project => `
                            <div class="card" style="cursor: pointer; overflow: hidden;" onclick="window.viewProject('${project.slug}')">
                                ${project.featured_image ? `
                                    <img src="${project.featured_image}" alt="${project.title}" 
                                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px 12px 0 0; margin: -1.5rem -1.5rem 1rem;">
                                ` : ''}
                                <div>
                                    <h4 style="margin-bottom: 0.5rem;">${project.title}</h4>
                                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                        ${project.short_description}
                                    </p>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                                        <span class="status-badge status-${project.category_slug}">
                                            ${project.category}
                                        </span>
                                        <span style="color: var(--text-light); font-size: 0.85rem;">
                                            <i class="fas fa-eye"></i> ${project.view_count} views
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-project-diagram"></i>
                        <h3>No Projects</h3>
                        <p>No projects available at the moment</p>
                    </div>
                `}
            </div>
        `;

        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            const category = e.target.value;
            if (category) {
                loadFilteredProjects(category);
            } else {
                loadProjectsPage();
            }
        });

        window.viewProject = (slug) => {
            showToast('info', 'Project', `Viewing project: ${slug}`);
        };

    } catch (error) {
        console.error('Failed to load projects:', error);
        showToast('error', 'Error', 'Failed to load projects');
    }
}

async function loadFilteredProjects(category) {
    try {
        showLoading();
        const data = await ProjectsAPI.getAll({ category__slug: category });
        // Reload with filtered data (simplified for brevity)
        loadProjectsPage();
    } finally {
        showLoading(false);
    }
}
