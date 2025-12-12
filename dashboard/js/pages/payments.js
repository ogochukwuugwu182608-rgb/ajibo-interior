// js/pages/payments.js
import { PaymentsAPI } from '../api.js';
import { pageContent, openModal, closeModal, showToast, showLoading, formatCurrency, formatDate } from '../main.js';

let availableInvoices = [];

export async function loadPaymentsPage() {
    try {
        const data = await PaymentsAPI.getAll();
        const payments = data.results || [];

        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-money-bill-wave"></i>
                        All Payments
                    </h3>
                    <button class="btn btn-primary" onclick="window.createNewPayment()">
                        <i class="fas fa-plus"></i>
                        Record Payment
                    </button>
                </div>

                ${payments.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Invoice #</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(payment => `
                                    <tr>
                                        <td><strong>${payment.transaction_id}</strong></td>
                                        <td>
                                            ${payment.invoice ? 
                                                `<span class="badge">${payment.invoice_number}</span>` : 
                                                `<span class="badge badge-warning">Manual</span>`
                                            }
                                        </td>
                                        <td>
                                            <div>
                                                <strong>${payment.customer_name || 'N/A'}</strong>
                                                <br>
                                                <small style="color: var(--text-secondary)">${payment.customer_email || ''}</small>
                                            </div>
                                        </td>
                                        <td><strong>${formatCurrency(payment.amount)}</strong></td>
                                        <td>
                                            <span class="status-badge status-paid">
                                                ${formatPaymentMethod(payment.payment_method)}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status-badge ${getStatusClass(payment.payment_status)}">
                                                ${payment.payment_status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>${formatDate(payment.created_at)}</td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="btn-icon view" onclick="window.viewPayment('${payment.id}')" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                ${payment.payment_status === 'pending' ? `
                                                    <button class="btn-icon edit" onclick="window.markPaymentCompleted('${payment.id}')" title="Mark Completed">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                ` : ''}
                                                <button class="btn-icon delete" onclick="window.deletePayment('${payment.id}')" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-money-bill-wave"></i>
                        <h3>No Payments Yet</h3>
                        <p>Record your first payment to track transactions.</p>
                        <button class="btn btn-primary" onclick="window.createNewPayment()">
                            <i class="fas fa-plus"></i>
                            Record Payment
                        </button>
                    </div>
                `}
            </div>
        `;

        window.createNewPayment = createNewPayment;
        window.viewPayment = viewPayment;
        window.deletePayment = deletePayment;
        window.markPaymentCompleted = markPaymentCompleted;

    } catch (error) {
        console.error('Failed to load payments:', error);
        showToast('error', 'Error', 'Failed to load payments');
    }
}

async function createNewPayment() {
    try {
        showLoading();
        availableInvoices = await PaymentsAPI.getUnpaidInvoices();

        const modal = document.getElementById('paymentModal');
        if (!modal) {
            // Create modal if it doesn't exist
            const modalHTML = `
                <div class="modal" id="paymentModal">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3><i class="fas fa-money-bill-wave"></i> Record Payment</h3>
                                <button class="modal-close" onclick="closeModal('paymentModal')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="modal-body"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modalBody = document.querySelector('#paymentModal .modal-body');
        modalBody.innerHTML = `
            <!-- Toggle Buttons -->
            <div class="form-group" style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button type="button" class="btn btn-primary" id="invoicePaymentBtn" 
                            style="flex: 1; max-width: 250px;">
                        <i class="fas fa-file-invoice"></i> From Invoice
                    </button>
                    <button type="button" class="btn btn-secondary" id="manualPaymentBtn"
                            style="flex: 1; max-width: 250px;">
                        <i class="fas fa-edit"></i> Manual Entry
                    </button>
                </div>
            </div>

            <form id="paymentForm">
                <!-- Invoice Payment Fields -->
                <div id="invoiceFields" style="display: block;">
                    <div class="form-group">
                        <label>Select Invoice *</label>
                        <select name="invoice_id" id="invoiceSelect">
                            <option value="">-- Select an invoice --</option>
                            ${availableInvoices.map(invoice => `
                                <option value="${invoice.id}" 
                                    data-name="${invoice.client_name}"
                                    data-email="${invoice.client_email || ''}"
                                    data-phone="${invoice.client_phone || ''}"
                                    data-amount="${invoice.total}">
                                    ${invoice.invoice_number} - ${invoice.client_name} (${formatCurrency(invoice.total)})
                                </option>
                            `).join('')}
                        </select>
                        ${availableInvoices.length === 0 ? 
                            '<small style="color: var(--warning);">No unpaid invoices available. Switch to Manual Entry.</small>' 
                            : ''}
                    </div>
                    
                    <div id="invoiceCustomerPreview" style="display: none; padding: 1rem; background: var(--card-bg); border-radius: 8px; margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">Customer Details:</h4>
                        <p><strong>Name:</strong> <span id="previewName"></span></p>
                        <p><strong>Email:</strong> <span id="previewEmail"></span></p>
                        <p><strong>Phone:</strong> <span id="previewPhone"></span></p>
                        <p><strong>Amount Due:</strong> <span id="previewAmount"></span></p>
                    </div>
                </div>

                <!-- Manual Payment Fields -->
                <div id="manualFields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group"> 
                            <label>Customer Name *</label>
                            <input type="text" class="form-control manual" name="manual_customer_name"
                                placeholder="Enter customer name...">
                        </div>
                        <div class="form-group"> 
                            <label>Customer Email</label>
                            <input type="email" class="form-control manual" name="manual_customer_email"
                                placeholder="customer@example.com">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Customer Phone</label>
                            <input type="tel" class="manual" name="manual_customer_phone"
                                placeholder="+234 xxx xxx xxxx">
                        </div>
                        <div class="form-group">
                            <label>Service Description</label>
                            <input type="text" class="manual" name="manual_service_description"
                                placeholder="e.g., Interior Design Consultation">
                        </div>
                    </div>
                </div>

                <!-- Common Fields -->
                <div class="form-group">
                    <label>Amount *</label>
                    <input type="number" name="amount" id="paymentAmount" required 
                        placeholder="0.00" step="0.01" min="0">
                </div>

                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="">-- Select method --</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="online">Online Payment</option>
                        <option value="paystack">Paystack</option>
                        <option value="stripe">Stripe</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Payment Status *</label>
                    <select name="payment_status" required>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea name="notes" rows="3" placeholder="Additional notes about this payment..."></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('paymentModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Record Payment
                    </button>
                </div>
            </form>
        `;

        setupPaymentFormToggles();
        setupPaymentForm();
        openModal('paymentModal');

    } finally {
        showLoading(false);
    }
}

function setupPaymentFormToggles() {
    const invoiceBtn = document.getElementById('invoicePaymentBtn');
    const manualBtn = document.getElementById('manualPaymentBtn');
    const invoiceFields = document.getElementById('invoiceFields');
    const manualFields = document.getElementById('manualFields');
    const invoiceSelect = document.getElementById('invoiceSelect');
    const amountInput = document.getElementById('paymentAmount');

    // Toggle to Invoice Payment mode
    invoiceBtn.addEventListener('click', () => {
        invoiceBtn.classList.remove('btn-secondary');
        invoiceBtn.classList.add('btn-primary');
        manualBtn.classList.remove('btn-primary');
        manualBtn.classList.add('btn-secondary');
        
        invoiceFields.style.display = 'block';
        manualFields.style.display = 'none';
        
        invoiceSelect.required = true;
        document.querySelectorAll('.manual').forEach(m => {
            m.required = false;
            m.value = '';
        });
    });

    // Toggle to Manual Payment mode
    manualBtn.addEventListener('click', () => {
        manualBtn.classList.remove('btn-secondary');
        manualBtn.classList.add('btn-primary');
        invoiceBtn.classList.remove('btn-primary');
        invoiceBtn.classList.add('btn-secondary');
        
        invoiceFields.style.display = 'none';
        manualFields.style.display = 'block';
        
        invoiceSelect.required = false;
        invoiceSelect.value = '';
        document.getElementById('invoiceCustomerPreview').style.display = 'none';
        
        const nameField = document.querySelector('input[name="manual_customer_name"]');
        if (nameField) nameField.required = true;
    });

    // Initialize with invoice mode if invoices available, else manual mode
    if (availableInvoices.length === 0) {
        manualBtn.click();
    }

    // Preview invoice customer details
    invoiceSelect.addEventListener('change', function() {
        const preview = document.getElementById('invoiceCustomerPreview');
        if (this.value) {
            const option = this.options[this.selectedIndex];
            document.getElementById('previewName').textContent = option.dataset.name;
            document.getElementById('previewEmail').textContent = option.dataset.email || 'N/A';
            document.getElementById('previewPhone').textContent = option.dataset.phone || 'N/A';
            document.getElementById('previewAmount').textContent = formatCurrency(parseFloat(option.dataset.amount));
            amountInput.value = option.dataset.amount;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
            amountInput.value = '';
        }
    });
}

function setupPaymentForm() {
    const form = document.getElementById('paymentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        const formData = new FormData(form);
        
        const payload = {
            invoice: formData.get('invoice_id') ? parseInt(formData.get('invoice_id')) : null,
            amount: parseFloat(formData.get('amount')),
            payment_method: formData.get('payment_method'),
            payment_status: formData.get('payment_status'),
            notes: formData.get('notes') || '',
            manual_customer_name: formData.get('manual_customer_name') || null,
            manual_customer_email: formData.get('manual_customer_email') || null,
            manual_customer_phone: formData.get('manual_customer_phone') || null,
            manual_service_description: formData.get('manual_service_description') || null,
        };

        console.log('Payment payload:', payload);

        try {
            await PaymentsAPI.create(payload);
            showToast('success', 'Payment Recorded', 'Payment has been successfully recorded!');
            closeModal('paymentModal');
            loadPaymentsPage();
        } catch (err) {
            console.error('Payment creation error:', err);
            showToast('error', 'Error', err.message || 'Could not record payment');
        } finally {
            showLoading(false);
        }
    });
}

async function viewPayment(id) {
    try {
        showLoading();
        const payment = await PaymentsAPI.getById(id);

        const modal = document.getElementById('viewPaymentModal');
        if (!modal) {
            const modalHTML = `
                <div class="modal vrmodal" id="viewPaymentModal">
                    <div class="modal-content vrmodal-content">
                        <span class="close" onclick="closeModal('viewPaymentModal')">&times;</span>
                        <div class="modal-body" id="viewPaymentBody"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modalBody = document.getElementById('viewPaymentBody');
        modalBody.innerHTML = `
            <div class="payment-details">
                <h2>Payment Details</h2>
                
                <div class="detail-section">
                    <h3>Transaction Information</h3>
                    <table class="info-table">
                        <tr>
                            <td><strong>Transaction ID:</strong></td>
                            <td>${payment.transaction_id}</td>
                        </tr>
                        <tr>
                            <td><strong>Invoice:</strong></td>
                            <td>${payment.invoice ? payment.invoice_number : 'Manual Entry'}</td>
                        </tr>
                        <tr>
                            <td><strong>Amount:</strong></td>
                            <td><strong style="color: var(--success); font-size: 1.2em;">${formatCurrency(payment.amount)}</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Payment Method:</strong></td>
                            <td>${formatPaymentMethod(payment.payment_method)}</td>
                        </tr>
                        <tr>
                            <td><strong>Status:</strong></td>
                            <td><span class="status-badge ${getStatusClass(payment.payment_status)}">${payment.payment_status.toUpperCase()}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Date:</strong></td>
                            <td>${formatDate(payment.created_at)}</td>
                        </tr>
                        ${payment.completed_at ? `
                            <tr>
                                <td><strong>Completed:</strong></td>
                                <td>${formatDate(payment.completed_at)}</td>
                            </tr>
                        ` : ''}
                    </table>
                </div>

                <div class="detail-section">
                    <h3>Customer Information</h3>
                    <table class="info-table">
                        <tr>
                            <td><strong>Name:</strong></td>
                            <td>${payment.customer_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Email:</strong></td>
                            <td>${payment.customer_email || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Phone:</strong></td>
                            <td>${payment.customer_phone || 'N/A'}</td>
                        </tr>
                        ${payment.manual_service_description ? `
                            <tr>
                                <td><strong>Service:</strong></td>
                                <td>${payment.manual_service_description}</td>
                            </tr>
                        ` : ''}
                    </table>
                </div>

                ${payment.notes ? `
                    <div class="detail-section">
                        <h3>Notes</h3>
                        <p>${payment.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        openModal('viewPaymentModal');
    } catch (error) {
        console.error('Failed to load payment details:', error);
        showToast('error', 'Error', 'Failed to load payment details');
    } finally {
        showLoading(false);
    }
}

async function markPaymentCompleted(id) {
    if (!confirm('Mark this payment as completed?')) return;

    try {
        showLoading();
        await PaymentsAPI.markCompleted(id);
        showToast('success', 'Updated', 'Payment marked as completed');
        loadPaymentsPage();
    } catch (error) {
        console.error('Failed to update payment:', error);
        showToast('error', 'Error', 'Failed to update payment status');
    } finally {
        showLoading(false);
    }
}

async function deletePayment(id) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await PaymentsAPI.delete(id);
        showToast('success', 'Deleted', 'Payment deleted successfully');
        loadPaymentsPage();
    } catch (error) {
        console.error('Failed to delete payment:', error);
        showToast('error', 'Error', 'Failed to delete payment');
    } finally {
        showLoading(false);
    }
}

function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer',
        'card': 'Card',
        'online': 'Online Payment',
        'paystack': 'Paystack',
        'stripe': 'Stripe'
    };
    return methods[method] || method;
}

function getStatusClass(status) {
    const classes = {
        'completed': 'status-paid',
        'pending': 'status-pending',
        'failed': 'status-overdue',
        'refunded': 'status-draft'
    };
    return classes[status] || 'status-pending';
}
