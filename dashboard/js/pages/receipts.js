// js/pages/receipts.js
import { ReceiptsAPI } from '../api.js';
import { pageContent, openModal, closeModal, showToast, showLoading, formatCurrency, formatDate } from '../main.js';

let availablePaidInvoices = [];
let currentReceiptLineItems = [];

export async function loadReceiptsPage() {
    try {
        const data = await ReceiptsAPI.getAll();
        const receipts = data.results || [];

        // console.log(receipts);

        pageContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-receipt"></i>
                        All Receipts
                    </h3>
                    <button class="btn btn-primary" onclick="window.createNewReceipt()">
                        <i class="fas fa-plus"></i>
                        Create Receipt
                    </button>
                </div>

                ${receipts.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Receipt #</th>
                                    <th>Invoice #</th>
                                    <th>Quote Ref</th>
                                    <th>Customer</th>
                                    <th>Service</th>
                                    <th>Amount</th>
                                    <th>Payment Method</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${receipts.map(receipt => `
                                    <tr>
                                        <td><strong>${receipt.receipt_number}</strong></td>
                                        <td><span class="badge">${receipt.invoice_number}</span></td>
                                        <td><span class="badge badge-info">${receipt.quote_reference}</span></td>
                                        <td>
                                            <div>
                                                <strong>${receipt.customer_name}</strong>
                                                <br>
                                                <small style="color: var(--text-secondary)">${receipt.customer_email}</small>
                                            </div>
                                        </td>
                                        <td>${receipt.service_type || 'N/A'}</td>
                                        <td><strong>${formatCurrency(receipt.amount_paid)}</strong></td>
                                        <td>
                                            <span class="status-badge status-paid">
                                                ${formatPaymentMethod(receipt.payment_method)}
                                            </span>
                                        </td>
                                        <td>${formatDate(receipt.payment_date)}</td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="btn-icon view" onclick="window.viewReceipt('${receipt.id}')" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                ${receipt.pdf_url ? `
                                                    <button class="btn-icon edit" onclick="window.downloadReceiptPDF('${receipt.id}')" title="Download PDF">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                ` : ''}
                                                <button class="btn-icon delete" onclick="window.deleteReceipt('${receipt.id}')" title="Delete">
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
                        <i class="fas fa-receipt"></i>
                        <h3>No Receipts Yet</h3>
                        <p>Create a receipt for a paid invoice.</p>
                        <button class="btn btn-primary" onclick="window.createNewReceipt()">
                            <i class="fas fa-plus"></i>
                            Create Receipt
                        </button>
                    </div>
                `}
            </div>
        `;

        window.createNewReceipt = createNewReceipt;
        window.viewReceipt = viewReceipt;
        window.deleteReceipt = deleteReceipt;
        window.downloadReceiptPDF = downloadReceiptPDF;

        setupReceiptForm();

    } catch (error) {
        console.error('Failed to load receipts:', error);
        showToast('error', 'Error', 'Failed to load receipts');
    }
}


async function createNewReceipt() {
    try {
        
        showLoading();

        availablePaidInvoices = await ReceiptsAPI.getPaidInvoices();

   

       
        const modalBody = document.querySelector('#receiptModal .modal-body');
        modalBody.innerHTML = `
            <form id="receiptForm">

                <div class="form-group" id="selectFields">
                   
                      <label>Select Paid Invoice *</label>
                    <select name="invoice_id" id="invoiceSelect" required>
                        <option value="">-- Select an invoice --</option>
                        ${availablePaidInvoices.map(invoice => `
                            <option value="${invoice.id}" data-invoice='${JSON.stringify(invoice)}'>
                                ${invoice.invoice_number} - ${invoice.client_name} (${formatCurrency(invoice.total)})
                            </option>
                        `).join('')}
                    </select>
                </div>
                


                <div class="manualFields"  style="display:none;  display: flex; gap: 1rem;">
                <div class="form-row">
                    <div class="form-group"> 
                    <label>Client Name</label>
                        <input type="text" class="form-control manual"  name="manual_client_name"
                         placeholder="Enter client name...">
                    </div>
                    <div class="form-group"> 
                    <label>Service Name</label>
                        <input type="text" class="form-control manual"  name="manual_service_name" 
                        placeholder="Enter service name...">
                    </div>
                
                </div>
                </div>
                <div class="manualFields" style="display:none;  display: flex; gap: 1rem;">
                <div class="form-row" >
                    <div class="form-group">
                        <label>Client Email Address (optional)</label>
                        <input type="email" class="manual" name="manual_client_email" >
                    </div>
                    <div class="form-group">
                        <label>Client Phone</label>
                        <input type="number" class="manual" name="manual_client_phone" >
                    </div>
                </div>
                </div>

                <div class="form-group">
                    <label>Transaction ID *</label>
                    <input type="text" name="transaction_id" required placeholder="Bank/Transfer ID">
                </div>

                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="online">Online Payment</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Line Items *</label>
                    <div id="receiptLineItemsContainer"></div>

                    <button type="button" class="btn btn-secondary" onclick="window.addReceiptLineItem()">
                        <i class="fas fa-plus"></i> Add Line Item
                    </button>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea name="notes" rows="3" placeholder="Additional notes..."></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('receiptModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Create Receipt
                    </button>
                </div>
            </form>
        `;



        

const manualFields = document.querySelectorAll('.manualFields');
const selectFields = document.getElementById('selectFields');

if (availablePaidInvoices.length === 0) {


    selectFields.style.display = 'none';
    document.getElementById('invoiceSelect').required = false;
    manualFields.forEach(field =>{
        field.style.display = 'block';
    })
    document.querySelectorAll('.manual').forEach(m => m.required = true)


}else{
    
    selectFields.style.display = 'block';
    document.getElementById('invoiceSelect').required = true;
    manualFields.forEach(field =>{
        field.style.display = 'none';
    })
    document.querySelectorAll('.manual').forEach(m => m.required = false)


}
        currentReceiptLineItems = [];
        addReceiptLineItem();

        setupReceiptForm();
        openModal('receiptModal');

    } finally {
        showLoading(false);
    }
}

window.addReceiptLineItem = addReceiptLineItem;
window.removeReceiptLineItem = removeReceiptLineItem;

function addReceiptLineItem() {
    const id = Date.now();
    currentReceiptLineItems.push(id);

    const container = document.getElementById("receiptLineItemsContainer");

    const html = `
        <div class="line-item" id="receiptLineItem-${id}"
             style="border:1px solid var(--border-color); padding:1rem; margin-bottom:1rem; border-radius:8px; position:relative;">
             
            <button type="button"
                class="btn btn-sm btn-danger"
                onclick="window.removeReceiptLineItem(${id})"
                style="position:absolute; top:5px; right:5px;">
                <i class="fas fa-times"></i>
            </button>

            <div class="form-group">
                <label>Title *</label>
                <input type="text" class="receipt-item-title" required>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea class="receipt-item-description"></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Quantity *</label>
                    <input type="number" class="receipt-item-quantity" value="1" required min="1">
                </div>
                <div class="form-group">
                    <label>Unit Price *</label>
                    <input type="number" class="receipt-item-price" value="0" required min="0" step="0.01">
                </div>
            </div>
        </div>
    `;

    // THIS DOES NOT ERASE OLD INPUTS
    container.insertAdjacentHTML("beforeend", html);
}


function removeReceiptLineItem(id) {
    currentReceiptLineItems = currentReceiptLineItems.filter(x => x !== id);

    const row = document.getElementById(`receiptLineItem-${id}`);
    if (row) row.remove();

    if (currentReceiptLineItems.length === 0) addReceiptLineItem();
}




















async function viewReceipt(id) {
    try {
        showLoading();
        const receipt = await ReceiptsAPI.getById(id);

        const modalBody = document.getElementById('viewReceiptBody');
   
        const client_name =  receipt.customer_name ? receipt.customer_name : receipt.manual_client_name;
        const client_email =  receipt.customer_email ? receipt.customer_email : receipt.manual_client_email;
        const client_phone  =  receipt.customer_phone ? receipt.customer_phone : receipt.manual_client_phone;
        const invoice_number  =  receipt.invoice_number ? receipt.invoice_number: '';
        const quote_service = receipt.service_type || receipt.manual_service_name  || "N/A";
      
modalBody.innerHTML = `
<div class="receipt-wrapper">

    <div class="receipt-header">
      
        <h2>Ajibo Worldwide Interiors</h2>
          <div class="logo">
            <img src="../img/logo.jpg" alt="">
        </div>
    </div>
            <p class="inv-title">RECEIPT</p>


    <table class="info-table">
        <tr>
            <td><strong>Invoice #:</strong> ${receipt.receipt_number}</td>
            <td><strong>Quote Ref:</strong> ${invoice_number}</td>
        </tr>
        <tr>
            <td><strong>Client:</strong> ${client_name}</td>
            <td><strong>Email:</strong> ${client_email}</td>
        </tr>
        <tr>
            <td><strong>Phone:</strong> ${client_phone}</td>
            <td><strong>Service:</strong> ${ quote_service }</td>
        </tr>
        <tr>
            <td><strong>Payment Status:</strong> ${receipt.payment_method}</td>
            <td><strong>Due Date:</strong> ${receipt.payment_date ? formatDate(receipt.payment_date) : 'N/A'}</td>
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
            ${receipt.line_items
                .map(
                    item => `
                    <tr>
                        <td>${item.title}</td>
                        <td>${item.description || ''}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(parseFloat(item.unit_price))}</td>
                        <td>${formatCurrency(parseFloat(item.quantity * item.unit_price))}</td>
                    </tr>
                `
                ).join('')}
        </tbody>
    </table>

    <table class="total-table">
        <tr>
            <td><strong>Tax:</strong></td>
        <td>${receipt.tax_amount ? formatCurrency(parseFloat(receipt.tax_amount)) : formatCurrency(0)}</td>
        </tr>
        <tr>
            <td><strong>Total:</strong></td>
        <td class="grand-total">${formatCurrency(parseFloat(receipt.total || 0))}</td>
        </tr>
    </table>

    <h4 class="table-title">Notes</h4>
    <p class="notes-text">${receipt.notes || 'N/A'}</p>
</div>`;










        openModal('viewReceiptModal');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load receipt details');
    } finally {
        showLoading(false);
    }
}


async function downloadReceiptPDF(id) {
    try {
        showLoading();
        await ReceiptsAPI.downloadPDF(id);
        showToast('success', 'Downloaded', 'Receipt PDF downloaded successfully');
    } catch (error) {
        showToast('error', 'Error', 'Failed to download receipt PDF');
    } finally {
        showLoading(false);
    }
}

async function deleteReceipt(id) {
    if (!confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await ReceiptsAPI.delete(id);
        showToast('success', 'Deleted', 'Receipt deleted successfully');
        loadReceiptsPage();
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete receipt');
    } finally {
        showLoading(false);
    }
}






function setupReceiptForm() {
    const form = document.getElementById("receiptForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        showLoading();

        const formData = new FormData(form);

        const line_items = currentReceiptLineItems.map(id => {
            const box = document.getElementById(`receiptLineItem-${id}`);

            return {
                title: box.querySelector(".receipt-item-title").value,
                description: box.querySelector(".receipt-item-description").value,
                quantity: parseInt(box.querySelector(".receipt-item-quantity").value),
                unit_price: parseFloat(box.querySelector(".receipt-item-price").value)
            };
        });

        const payload = {
    invoice_id: parseInt(formData.get('invoice_id')) || null,
    transaction_id: formData.get('transaction_id'),
    payment_method: formData.get('payment_method'),
    notes: formData.get('notes'),
    line_items,

    manual_client_name: formData.get("manual_client_name") || null,
    manual_service_name: formData.get("manual_service_name") || null,
    manual_client_email: formData.get("manual_client_email") || null,
    manual_client_phone: formData.get("manual_client_phone") || null,
};
        console.log(payload);

        try {
            await ReceiptsAPI.create(payload);
            showToast("success", "Receipt Created", "Receipt has been successfully created!");
            closeModal("receiptModal");
            loadReceiptsPage();
        } catch (err) {
            console.error(err);
            showToast("error", "Error", "Could not create receipt");
        }

        showLoading(false);
    });
}


function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer',
        'card': 'Card',
        'check': 'Check',
        'online': 'Online Payment'
    };
    return methods[method] || method;
}


let receiptDownload = document.getElementById('receiptdownload');

const { jsPDF } = window.jspdf;

receiptDownload.addEventListener('click', async function(){
    let receiptWrapper = document.querySelector('.receipt-wrapper');

    //use html2canvas 

    const canvas = await html2canvas(receiptWrapper, {
        scale:2,
        useCORS: true 
    });

    const imageData = canvas.toDataURL("image/png");

    //create pdf 

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("invoice.pdf");




});
