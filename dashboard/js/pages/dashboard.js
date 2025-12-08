import { DashboardAPI, ContactsAPI, InvoicesAPI } from '../api.js';
import { pageContent } from '../main.js';
import { formatCurrency, formatDate, showToast } from '../main.js';

export async function loadDashboardPage() {
    try {
        // Fetch dashboard data
        const [contacts, invoices] = await Promise.all([
            ContactsAPI.getAll({ status: 'pending', page_size: 5 }).catch(() => ({ results: [] })),
            InvoicesAPI.getAll({ page_size: 5 }).catch(() => ({ results: [] }))
        ]);

        // Calculate stats from data
        const totalInvoices = invoices.count || 0;
        const pendingContacts = contacts.count || 0;
        
        console.log(invoices.results[0]['payment_status'])
        // Render dashboard
        pageContent.innerHTML = `
            <!-- Stats Grid -->
            <div class="stats-grid">


                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    <div class="stat-info">
                        <h4>Total Invoices</h4>
                        <div class="stat-value">${totalInvoices}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="stat-info">
                        <h4>Pending Contacts</h4>
                        <div class="stat-value">${pendingContacts}</div>
                        ${pendingContacts > 0 ? '<div class="stat-change negative"><i class="fas fa-exclamation-circle"></i> Requires attention</div>' : ''}
                    </div>
                </div>
            </div>



                
            </div>

            <!-- Content Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <!-- Recent Contacts -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-envelope"></i>
                            Recent Contacts
                        </h3>
                        <a href="#" class="btn btn-sm btn-primary" onclick="window.navigateTo('contacts')">
                            View All
                        </a>
                    </div>
                    <div class="table-container">
                        ${contacts.results && contacts.results.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Service Type</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${contacts.results.map(contact => `
                                        <tr>
                                            <td>${contact.name}</td>
                                            <td>${contact.service_type.replace('_', " ").replace(/^./, c => c.toUpperCase())}</td>
                                            <td>${formatDate(contact.created_at)}</td>
                                            <td>
                                                <span class="status-badge status-${contact.status || 'pending'}">
                                                    ${contact.status || 'New'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h3>No Recent Contacts</h3>
                                <p>No contact submissions yet</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Recent Invoices -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-file-invoice"></i>
                            Recent Invoices
                        </h3>
                        <a href="#" class="btn btn-sm btn-primary" onclick="window.navigateTo('invoices')">
                            View All
                        </a>
                    </div>
                    <div class="table-container">
                        ${invoices.results && invoices.results.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoices.results.map(invoice => `
                                        <tr>
                                            <td><strong>${invoice.invoice_number}</strong></td>
                                            <td>${invoice.client_name}</td>
                                            <td><strong>${formatCurrency(invoice.total)}</strong></td>
                                            <td>
                                                <span class="status-badge status-${invoice.payment_status}">
                                                    ${invoice.payment_status}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-file-invoice"></i>
                                <h3>No Invoices</h3>
                                <p>Create your first invoice</p>
                                <button class="btn btn-primary" onclick="window.navigateTo('invoices')">
                                    <i class="fas fa-plus"></i> Create Invoice
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-bolt"></i>
                        Quick Actions
                    </h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1rem 0;">
                    <button class="btn btn-primary" onclick="window.navigateTo('invoices')">
                        <i class="fas fa-plus"></i>
                        New Invoice
                    </button>
                    <button class="btn btn-primary" onclick="window.navigateTo('receipts')">
                        <i class="fas fa-receipt"></i>
                        New Receipt
                    </button>
                   
                    <button class="btn btn-primary" onclick="window.navigateTo('contacts')">
                        <i class="fas fa-envelope"></i>
                        View Contacts
                    </button>
                </div>
            </div>
        `;

        // Make navigateTo available globally for onclick handlers
        window.navigateTo = (await import('../main.js')).navigateTo;

        // Update badge counts
        updateBadgeCounts(totalInvoices, pendingContacts);

    } catch (error) {
        console.error('Dashboard load error:', error);
        pageContent.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Dashboard</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }
}

function updateBadgeCounts(invoiceCount, contactCount) {
    const invoiceBadge = document.getElementById('invoiceCount');
    const contactBadge = document.getElementById('contactCount');
    
    if (invoiceBadge) invoiceBadge.textContent = invoiceCount;
    if (contactBadge) contactBadge.textContent = contactCount;
}