// js/pages/invoices.js
import { InvoicesAPI } from '../api.js';
import { pageContent, openModal, closeModal, showToast, showLoading, formatCurrency, formatDate } from '../main.js';

let currentInvoices = [];
let availableQuotes = [];
let currentLineItems = [];

export async function loadInvoicesPage() { 
    try {
        const data = await InvoicesAPI.getAll();
        currentInvoices = data.results || [];
        
        console.log(currentInvoices);
        
        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-file-invoice"></i>
                        All Invoices
                    </h3>
                    <button class="btn btn-primary" onclick="window.createNewInvoice()">
                        <i class="fas fa-plus"></i>
                        Create Invoice
                    </button>
                </div>

                ${currentInvoices.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Quote Ref</th>
                                    <th>Client</th>
                                    <th>Service</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentInvoices.map(invoice => {
                                    const client_name = invoice.client_name || invoice.manual_client_name || 'N/A';
                                    const client_email = invoice.client_email || invoice.manual_client_email || '';
                                    const quote_service = invoice.quote_service || invoice.manual_service_name || 'N/A';
                                    const quote_reference = invoice.quote_reference || 'N/A';
                                    
                                    return `
                                        <tr>
                                            <td><strong>${invoice.invoice_number || 'N/A'}</strong></td>
                                            <td><span class="badge">${quote_reference}</span></td>
                                            <td>
                                                <div>
                                                    <strong>${client_name}</strong>
                                                    <br>
                                                    <small style="color: var(--text-secondary)">${client_email}</small>
                                                </div>
                                            </td>
                                            <td>${quote_service}</td>
                                            <td><strong>${formatCurrency(invoice.total || 0)}</strong></td>
                                            <td>
                                                <span class="status-badge status-${invoice.payment_status || 'pending'}">
                                                    ${invoice.payment_status || 'pending'}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="table-actions">
                                                    <button class="btn-icon view" onclick="window.viewInvoice('${invoice.id}')" title="View">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    ${(invoice.payment_status || '') !== 'paid' ? `
                                                        <button class="btn-icon edit" onclick="window.markInvoicePaid('${invoice.id}')" title="Mark as Paid">
                                                            <i class="fas fa-check-circle"></i>
                                                        </button>
                                                    ` : ''}
                                                    <button class="btn-icon delete" onclick="window.deleteInvoice('${invoice.id}')" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <h3>No Invoices Yet</h3>
                        <p>Create your first invoice from a quote</p>
                        <button class="btn btn-primary" onclick="window.createNewInvoice()">
                            <i class="fas fa-plus"></i>
                            Create Invoice
                        </button>
                    </div>
                `}
            </div>
        `;

        window.createNewInvoice = createNewInvoice;
        window.viewInvoice = viewInvoice;
        window.deleteInvoice = deleteInvoice;
        window.markInvoicePaid = markInvoicePaid;
        window.addLineItem = addLineItem;
        window.removeLineItem = removeLineItem;

    } catch (error) {
        console.error('Failed to load invoices:', error);
        showToast('error', 'Error', 'Failed to load invoices');
    }
}

async function createNewInvoice() {
    try {
        showLoading();

        // Fetch available quotes
        const response = await InvoicesAPI.getAvailableQuotes();
        availableQuotes = response || [];

        // Update modal content with new form
        const modalBody = document.querySelector('#invoiceModal .modal-body');
        modalBody.innerHTML = `
            <!-- Toggle Buttons -->
            <div class="form-group" style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button type="button" class="btn btn-primary" id="quoteInvoiceBtn" 
                            style="flex: 1; max-width: 250px;">
                        <i class="fas fa-file-alt"></i> From Quote
                    </button>
                    <button type="button" class="btn btn-secondary" id="manualInvoiceBtn"
                            style="flex: 1; max-width: 250px;">
                        <i class="fas fa-edit"></i> Manual Invoice
                    </button>
                </div>
            </div>

            <form id="invoiceForm">
                <!-- Quote Invoice Fields -->
                <div id="quoteFields" style="display: block;">
                    <div class="form-group">
                        <label>Select Quote *</label>
                        <select name="quote_id" id="quoteSelect">
                            <option value="">-- Select a quote --</option>
                            ${availableQuotes.map(quote => `
                                <option value="${quote.id}" data-quote='${JSON.stringify(quote)}'>
                                    ${quote.reference_number} - ${quote.name} (${quote.service_display})
                                </option>
                            `).join('')}
                        </select>
                        ${availableQuotes.length === 0 ? 
                            '<small style="color: var(--danger);">No quotes available. Switch to Manual Invoice.</small>' 
                            : ''}
                    </div>

                    <div id="quoteDetails" style="display: none; background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-primary);">Quote Details</h4>
                        <p><strong>Client:</strong> <span id="quoteClient"></span></p>
                        <p><strong>Email:</strong> <span id="quoteEmail"></span></p>
                        <p><strong>Phone:</strong> <span id="quotePhone"></span></p>
                        <p><strong>Service:</strong> <span id="quoteService"></span></p>
                        <p><strong>Message:</strong> <span id="quoteMessage"></span></p>
                    </div>
                </div>

                <!-- Manual Invoice Fields -->
                <div id="manualFields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group"> 
                            <label>Client Name *</label>
                            <input type="text" class="form-control manual" name="manual_client_name" 
                                   placeholder="Enter client name...">
                        </div>
                        <div class="form-group"> 
                            <label>Service Name *</label>
                            <input type="text" class="form-control manual" name="manual_service_name" 
                                   placeholder="Enter service name...">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Client Email Address (optional)</label>
                            <input type="email" class="manual" name="manual_client_email" 
                                   placeholder="Enter client email...">
                        </div>
                        <div class="form-group">
                            <label>Client Phone (optional)</label>
                            <input type="tel" class="manual" name="manual_client_phone" 
                                   placeholder="Enter client phone...">
                        </div>
                    </div>
                </div>
                
                <!-- Common Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Due Date *</label>
                        <input type="date" name="due_date" required>
                    </div>
                    <div class="form-group">
                        <label>Tax Rate (%) *</label>
                        <input type="number" name="tax_rate" value="0" step="0.01" min="0" max="100" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Service Breakdown *</label>
                    <div id="lineItemsContainer"></div>
                    <button type="button" class="btn btn-secondary" onclick="window.addLineItem()">
                        <i class="fas fa-plus"></i>
                        Add Service Breakdown
                    </button>
                </div>
                
                <div class="form-group">
                    <label>Notes</label>
                    <textarea name="notes" rows="3" placeholder="Additional notes..."></textarea>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('invoiceModal')">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Create Invoice
                    </button>
                </div>
            </form>
        `;

        // Setup toggle buttons
        const quoteBtn = document.getElementById('quoteInvoiceBtn');
        const manualBtn = document.getElementById('manualInvoiceBtn');
        const quoteFields = document.getElementById('quoteFields');
        const manualFields = document.getElementById('manualFields');
        const quoteSelect = document.getElementById('quoteSelect');

        // Toggle to Quote Invoice mode
        quoteBtn.addEventListener('click', () => {
            quoteBtn.classList.remove('btn-secondary');
            quoteBtn.classList.add('btn-primary');
            manualBtn.classList.remove('btn-primary');
            manualBtn.classList.add('btn-secondary');
            
            quoteFields.style.display = 'block';
            manualFields.style.display = 'none';
            
            quoteSelect.required = true;
            document.querySelectorAll('.manual').forEach(m => {
                m.required = false;
                m.value = '';
            });
        });

        // Toggle to Manual Invoice mode
        manualBtn.addEventListener('click', () => {
            manualBtn.classList.remove('btn-secondary');
            manualBtn.classList.add('btn-primary');
            quoteBtn.classList.remove('btn-primary');
            quoteBtn.classList.add('btn-secondary');
            
            quoteFields.style.display = 'none';
            manualFields.style.display = 'block';
            document.getElementById('quoteDetails').style.display = 'none';
            
            quoteSelect.required = false;
            quoteSelect.value = '';
            document.querySelectorAll('.manual').forEach(m => {
                if (m.name === 'manual_client_name' || m.name === 'manual_service_name') {
                    m.required = true;
                }
            });
        });

        // Initialize with quote mode if quotes available, else manual mode
        if (availableQuotes.length === 0) {
            manualBtn.click();
        }

        // Reset line items
        currentLineItems = [];
        addLineItem();

        // Setup quote select handler
        quoteSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.value) {
                const quote = JSON.parse(selectedOption.dataset.quote);
                document.getElementById('quoteDetails').style.display = 'block';
                document.getElementById('quoteClient').textContent = quote.name;
                document.getElementById('quoteEmail').textContent = quote.email;
                document.getElementById('quotePhone').textContent = quote.phone;
                document.getElementById('quoteService').textContent = quote.service_display;
                document.getElementById('quoteMessage').textContent = quote.message;
            } else {
                document.getElementById('quoteDetails').style.display = 'none';
            }
        });

        setupInvoiceForm();
        openModal('invoiceModal');

    } catch (error) {
        console.error('Error loading quotes:', error);
        showToast('error', 'Error', 'Failed to load quotes');
    } finally {
        showLoading(false);
    }
}

window.addLineItem = addLineItem;
window.removeLineItem = removeLineItem;

function addLineItem() {
    const itemId = Date.now();
    currentLineItems.push(itemId);

    const container = document.getElementById('lineItemsContainer');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'line-item';
    itemDiv.id = `lineItem-${itemId}`;
    itemDiv.innerHTML = `
        <div style="border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; position: relative;">
            <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLineItem(${itemId})" style="position: absolute; top: 0.5rem; right: 0.5rem;">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="form-group">
                <label>Title *</label>
                <input type="text" class="line-item-title" placeholder="Service/Product title" required>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea class="line-item-description" rows="2" placeholder="Description"></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity *</label>
                    <input type="number" class="line-item-quantity" value="1" min="1" required>
                </div>
                <div class="form-group">
                    <label>Unit Price (₦) *</label>
                    <input type="number" class="line-item-price" step="0.01" min="0" required>
                </div>
            </div>
        </div>
    `;

    container.appendChild(itemDiv);
}

function removeLineItem(itemId) {
    const index = currentLineItems.indexOf(itemId);
    if (index > -1) {
        currentLineItems.splice(index, 1);
    }

    const item = document.getElementById(`lineItem-${itemId}`);
    if (item) {
        item.remove();
    }

    // Ensure at least one line item
    if (currentLineItems.length === 0) {
        addLineItem();
    }
}

async function viewInvoice(id) {
    try {
        showLoading();
        const invoice = await InvoicesAPI.getById(id);
        console.log(invoice);

        const client_name = invoice.client_name || invoice.manual_client_name || 'N/A';
        const client_email = invoice.client_email || invoice.manual_client_email || 'N/A';
        const client_phone = invoice.client_phone || invoice.manual_client_phone || 'N/A';
        const quote_service = invoice.quote_service || invoice.manual_service_name || 'N/A';
        const quote_reference = invoice.quote_reference || 'N/A';

        const modalBody = document.getElementById('viewInvoiceBody');

        // Invoice HTML Structure
        modalBody.innerHTML = `
            <div class="invoice-wrapper">
                <div class="invoice-header">
                    <h2>Ajibo Worldwide Interiors</h2>
                    <div class="logo">
                        <img src="../img/logo.jpg" alt="">
                    </div>
                </div>
                <p class="inv-title">INVOICE</p>

                <table class="info-table">
                    <tr>
                        <td><strong>Invoice #:</strong> ${invoice.invoice_number}</td>
                        <td><strong>Quote Ref:</strong> ${quote_reference}</td>
                    </tr>
                    <tr>
                        <td><strong>Client:</strong> ${client_name}</td>
                        <td><strong>Email:</strong> ${client_email}</td>
                    </tr>
                    <tr>
                        <td><strong>Phone:</strong> ${client_phone}</td>
                        <td><strong>Service:</strong> ${quote_service}</td>
                    </tr>
                    <tr>
                        <td><strong>Payment Status:</strong> ${invoice.payment_status}</td>
                        <td><strong>Due Date:</strong> ${invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</td>
                    </tr>
                </table>

                <h4 class="table-title">Service Breakdown</h4>

                <table class="line-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.line_items.map(item => `
                            <tr>
                                <td>${item.title}</td>
                                <td>${item.description || ''}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCurrency(item.unit_price)}</td>
                                <td>${formatCurrency(item.quantity * item.unit_price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <table class="total-table">
                    <tr>
                        <td><strong>Tax:</strong></td>
                        <td>${formatCurrency(invoice.tax_amount || 0)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total:</strong></td>
                        <td class="grand-total">${formatCurrency(invoice.total)}</td>
                    </tr>
                </table>

                <h4 class="table-title">Notes</h4>
                <p class="notes-text">${invoice.notes || 'N/A'}</p>
            </div>
        `;

        openModal('viewInvoiceModal');

    } catch (error) {
        showToast('error', 'Error', 'Failed to load invoice details');
    } finally {
        showLoading(false);
    }
}

async function markInvoicePaid(id) {
    if (!confirm('Mark this invoice as paid?')) {
        return;
    }

    try {
        showLoading();
        await InvoicesAPI.markPaid(id);
        showToast('success', 'Updated', 'Invoice marked as paid');
        loadInvoicesPage();
    } catch (error) {
        showToast('error', 'Error', 'Failed to update invoice');
    } finally {
        showLoading(false);
    }
}

async function deleteInvoice(id) {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await InvoicesAPI.delete(id);
        showToast('success', 'Deleted', 'Invoice deleted successfully');
        loadInvoicesPage();
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete invoice');
    } finally {
        showLoading(false);
    }
}

function setupInvoiceForm() {
    const form = document.getElementById('invoiceForm');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        const formData = new FormData(newForm);

        // Collect line items
        const lineItems = [];
        currentLineItems.forEach(itemId => {
            const itemDiv = document.getElementById(`lineItem-${itemId}`);
            if (itemDiv) {
                lineItems.push({
                    title: itemDiv.querySelector('.line-item-title').value,
                    description: itemDiv.querySelector('.line-item-description').value,
                    quantity: parseInt(itemDiv.querySelector('.line-item-quantity').value),
                    unit_price: parseFloat(itemDiv.querySelector('.line-item-price').value)
                });
            }
        });

        if (lineItems.length === 0) {
            showToast('error', 'Error', 'Please add at least one line item');
            showLoading(false);
            return;
        }

        const invoiceData = {
            quote_id: formData.get('quote_id') ? parseInt(formData.get('quote_id')) : null,
            manual_service_name: formData.get('manual_service_name') || null,
            manual_client_name: formData.get('manual_client_name') || null,
            manual_client_email: formData.get('manual_client_email') || null,
            manual_client_phone: formData.get('manual_client_phone') || null,
            due_date: formData.get('due_date'),
            tax_rate: parseFloat(formData.get('tax_rate')),
            notes: formData.get('notes') || '',
            line_items: lineItems
        };

        console.log(invoiceData);

        try {
            await InvoicesAPI.create(invoiceData);
            showToast('success', 'Created', 'Invoice created successfully');
            closeModal('invoiceModal');
            newForm.reset();
            loadInvoicesPage();
        } catch (error) {
            showToast('error', 'Error', error.message || 'Failed to create invoice');
        } finally {
            showLoading(false);
        }
    });
}

// PDF Download functionality
let invoicedownload = document.getElementById('invoicedownload');

if (invoicedownload) {
    const { jsPDF } = window.jspdf;

    invoicedownload.addEventListener('click', async function () {
        let invoicemodaWrapper = document.querySelector('.invoice-wrapper');

        const canvas = await html2canvas(invoicemodaWrapper, {
            scale: 2,
            useCORS: true
        });

        const imageData = canvas.toDataURL("image/png");
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save("invoice.pdf");
    });
}
