

// js/pages/contacts.js
import { ContactsAPI } from '../api.js';
import { pageContent, showToast, showLoading, formatDate } from '../main.js';


export async function loadContactsPage() {
    try {
        showLoading(true);
        
        console.log('Loading contacts page...');
        const response = await ContactsAPI.getAll();
        console.log('Contacts response:', response);
        
        const contacts = response.results || [];
        
        console.log('Contacts count:', contacts.length);

        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-file-invoice"></i>
                        Quote Submissions
                    </h3>
                    <select id="statusFilter" onchange="window.filterByStatus(this.value)" 
                            style="padding: 0.5rem; border-radius: 8px; border: 2px solid var(--border-color);">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="converted">Converted</option>
                    </select>
                </div>

                ${contacts.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Service Type</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${contacts.map(contact => `
                                    <tr>
                                        <td><strong>${contact.reference_number}</strong></td>
                                        <td>${contact.name}</td>
                                        <td>${contact.email}</td>
                                        <td>${contact.phone || 'N/A'}</td>
                                        <td>${contact.service_type}</td>
                                        <td>${formatDate(contact.created_at)}</td>
                                        <td>
                                            <select onchange="window.updateContactStatus('${contact.id}', this.value)" 
                                                    style="padding: 0.375rem 0.75rem; border-radius: 20px; border: none; 
                                                           background: rgba(201, 169, 97, 0.15); color: var(--accent-gold); font-weight: 600;">
                                                <option value="pending" ${contact.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                <option value="approved" ${contact.status === 'approved' ? 'selected' : ''}>Approved</option>
                                                <option value="rejected" ${contact.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                                <option value="converted" ${contact.status === 'converted' ? 'selected' : ''}>Converted</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="btn-icon view" onclick="window.viewContact('${contact.id}')" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>

                                                ${contact.pdf_file ? `
                                                    <a href="${contact.pdf_file}" target="_blank" class="btn-icon" title="Download PDF">
                                                        <i class="fas fa-file-pdf"></i>
                                                    </a>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No Quote Submissions</h3>
                        <p>No quotes have been submitted yet</p>
                    </div>
                `}
            </div>
        `;

        // Define window functions
        window.updateContactStatus = async (id, status) => {
            try {
                showLoading(true);
                await ContactsAPI.updateStatus(id, status);
                showToast('success', 'Updated', 'Quote status updated successfully');
                await loadContactsPage();
            } catch (error) {
                console.error('Failed to update status:', error);
                showToast('error', 'Error', error.message || 'Failed to update status');
            } finally {
                showLoading(false);
            }
        };

        window.viewContact = (id) => {
            const contact = contacts.find(c => c.id === id);
            if (contact) {
                const details = `
Reference: ${contact.reference_number}
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Service: ${contact.service_type}
Status: ${contact.status}

Message:
${contact.message || 'No message provided'}
                `.trim();
                alert(details);
            }
        };

        window.emailContact = (email) => {
            window.location.href = `mailto:${email}`;
        };

        window.filterByStatus = async (status) => {
            try {
                showLoading(true);
                await loadContactsPage();
                if (status) {
                    const response = await ContactsAPI.getAll({ status });
                    // Re-render would happen here, but we're reloading the whole page
                }
            } catch (error) {
                showToast('error', 'Error', 'Failed to filter contacts');
            } finally {
                showLoading(false);
            }
        };

        showLoading(false);

    } catch (error) {
        console.error('Failed to load contacts:', error);
        showToast('error', 'Error', `Failed to load contacts: ${error.message}`);
        showLoading(false);
        
        // Show error in page
        pageContent.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Quotes</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            </div>
        `;
    }
}