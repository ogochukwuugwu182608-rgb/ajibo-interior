
// js/pages/newsletter.js
import { NewsletterAPI } from '../api.js';
import { pageContent, showToast, formatDate } from '../main.js';

export async function loadNewsletterPage() {
    try {
        const data = await NewsletterAPI.getSubscribers();
        const subscribers = data.results || [];

        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-envelope-open-text"></i>
                        Newsletter Subscribers
                    </h3>
                    <button class="btn btn-primary">
                        <i class="fas fa-download"></i>
                        Export CSV
                    </button>
                </div>

                <div class="stats-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h4>Total Subscribers</h4>
                            <div class="stat-value">${subscribers.length}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <div class="stat-info">
                            <h4>This Month</h4>
                            <div class="stat-value">+12</div>
                        </div>
                    </div>
                </div>

                ${subscribers.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Subscribed</th>
                                    <th>Preferences</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${subscribers.map(sub => `
                                    <tr>
                                        <td><strong>${sub.email}</strong></td>
                                        <td>${sub.first_name || ''} ${sub.last_name || ''}</td>
                                        <td>
                                            <span class="status-badge status-${sub.status}">
                                                ${sub.status}
                                            </span>
                                        </td>
                                        <td>${formatDate(sub.subscribed_at)}</td>
                                        <td>
                                            <div style="display: flex; gap: 0.5rem; font-size: 0.85rem;">
                                                ${sub.wants_design_tips ? '<span title="Design Tips">📐</span>' : ''}
                                                ${sub.wants_project_updates ? '<span title="Projects">🏠</span>' : ''}
                                                ${sub.wants_promotions ? '<span title="Promotions">🎁</span>' : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-envelope-open-text"></i>
                        <h3>No Subscribers</h3>
                        <p>No newsletter subscribers yet</p>
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Failed to load newsletter:', error);
        showToast('error', 'Error', 'Failed to load newsletter subscribers');
    }
}
