import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, ShoppingBag, X, Search, Printer } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';

interface ChallanItem {
  id: string;
  nameSnapshot: string;
  skuSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  status: 'DRAFT' | 'CONFIRMED';
  totalQuantity: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string;
    address: string;
    mobile: string;
    email: string;
    gstNumber: string | null;
  };
  createdBy: {
    name: string;
    role: string;
  };
  items: ChallanItem[];
}

interface CustomerOption {
  id: string;
  name: string;
  businessName: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

const Challans: React.FC = () => {
  const { user } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Custom dialog modal state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showCustomAlert = (title: string, message: string) => {
    setDialog({ isOpen: true, type: 'alert', title, message });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortHeader = (field: string, label: string) => {
    const isSorted = sortField === field;
    return (
      <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <div className="th-content">
          {label}
          <span className="sort-arrows" style={{ color: isSorted ? 'var(--gray-900)' : 'var(--gray-300)', marginLeft: '0.25rem' }}>
            {isSorted ? (sortOrder === 'asc' ? '▲' : '▼') : '▲▼'}
          </span>
        </div>
      </th>
    );
  };

  const sortedChallans = React.useMemo(() => {
    let result = [...challans];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (chal) =>
          chal.challanNumber.toLowerCase().includes(q) ||
          (chal.customer?.name || '').toLowerCase().includes(q) ||
          (chal.customer?.businessName || '').toLowerCase().includes(q)
      );
    }

    if (!sortField) return result;
    return [...result].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Nested customer fields
      if (sortField === 'businessName') {
        valA = a.customer?.businessName || '';
        valB = b.customer?.businessName || '';
      } else if (sortField === 'name') {
        valA = a.customer?.name || '';
        valB = b.customer?.name || '';
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [challans, debouncedSearch, sortField, sortOrder]);

  const handlePrintChallan = async (chal: Challan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showCustomAlert('Popup Blocked', 'Please allow popups in your browser settings to export the PDF invoice.');
      return;
    }

    // Write loader text so the user knows details are loading
    printWindow.document.write('<html><head><title>Loading...</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;color:#6b7280;"><h3>Loading invoice details for print preview...</h3></body></html>');

    let fullChal = chal;
    if (!chal.items || chal.items.length === 0 || !chal.customer?.email) {
      try {
        const response = await api.get(`/challans/${chal.id}`);
        fullChal = response.data;
      } catch (err: any) {
        printWindow.close();
        showCustomAlert('Print Failed', 'Failed to retrieve invoice details for printing.');
        return;
      }
    }

    const totalQty = fullChal.items.reduce((s, i) => s + i.quantity, 0);
    const totalVal = fullChal.items.reduce((s, i) => s + (i.priceSnapshot * i.quantity), 0);
    const formattedDate = new Date(fullChal.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlContent = `
      <html>
        <head>
          <title>Sales Challan - ${fullChal.challanNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              padding: 40px;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .header-table td {
              vertical-align: top;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
              color: #2563eb;
              letter-spacing: -0.025em;
            }
            .doc-title {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .card-block {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: #9ca3af;
              margin-bottom: 10px;
              letter-spacing: 0.05em;
            }
            .card-block p {
              margin: 0 0 6px 0;
              font-size: 13px;
              line-height: 1.4;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .data-table th {
              background-color: #f3f4f6;
              border-bottom: 2px solid #e5e7eb;
              text-align: left;
              padding: 12px 16px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: #4b5563;
            }
            .data-table td {
              border-bottom: 1px solid #e5e7eb;
              padding: 14px 16px;
              font-size: 13px;
            }
            .summary-wrapper {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .summary-table {
              width: 300px;
              border-collapse: collapse;
            }
            .summary-table td {
              padding: 8px 0;
              font-size: 14px;
            }
            .total-row {
              font-weight: 700;
              font-size: 15px;
              color: #2563eb;
              border-top: 2px solid #e5e7eb;
            }
            .footer-note {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="brand">FUNDSROOM CRM</div>
                <div style="font-size: 12px; color: #6b7280;">Corporate Operations Invoice Log</div>
              </td>
              <td style="text-align: right;">
                <div class="doc-title">Sales Invoice</div>
                <div style="font-size: 13px; font-weight: 600; color: #4b5563; font-family: monospace;">Ref: ${fullChal.challanNumber}</div>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="card-block">
              <div class="section-title">Client Information</div>
              <p><strong>Business Name:</strong> ${fullChal.customer.businessName}</p>
              <p><strong>Purchaser:</strong> ${fullChal.customer.name}</p>
              <p><strong>Email:</strong> ${fullChal.customer.email}</p>
              <p><strong>Mobile:</strong> ${fullChal.customer.mobile}</p>
              <p><strong>Billing Address:</strong> ${fullChal.customer.address}</p>
              ${fullChal.customer.gstNumber ? `<p><strong>GSTIN:</strong> ${fullChal.customer.gstNumber}</p>` : ''}
            </div>
            <div class="card-block">
              <div class="section-title">Invoice Information</div>
              <p><strong>Date Issued:</strong> ${formattedDate}</p>
              <p><strong>Billing Clerk:</strong> ${fullChal.createdBy.name}</p>
              <p><strong>Status:</strong> <span style="font-weight:700; color: ${fullChal.status === 'CONFIRMED' ? '#10b981' : '#f59e0b'}">${fullChal.status}</span></p>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th>SKU Snapshot</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${fullChal.items.map(item => `
                <tr>
                  <td style="font-weight: 600;">${item.nameSnapshot}</td>
                  <td style="font-family: monospace;">${item.skuSnapshot}</td>
                  <td>₹${item.priceSnapshot.toLocaleString('en-IN')}</td>
                  <td>${item.quantity} units</td>
                  <td style="text-align: right; font-weight: 600;">₹${(item.priceSnapshot * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-wrapper">
            <table class="summary-table">
              <tr>
                <td>Total Items Quantity:</td>
                <td style="text-align: right; font-weight: 600;">${totalQty} units</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total:</td>
                <td style="text-align: right; font-weight: 700; padding-top: 10px;">₹${totalVal.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div class="footer-note">
            This is a computer generated document. No signature required.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Create Form State
  const [formCustomerId, setFormCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [formError, setFormError] = useState<string | null>(null);

  // Order Items Builder State
  const [builderProductId, setBuilderProductId] = useState('');
  const [builderQuantity, setBuilderQuantity] = useState<number | ''>(1);
  const [challanItems, setChallanItems] = useState<{ productId: string; name: string; sku: string; price: number; quantity: number }[]>([]);

  const canWrite = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchChallans = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/challans');
      setChallans(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const custResponse = await api.get('/customers?limit=100');
      setCustomers(custResponse.data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        businessName: c.businessName,
      })));

      const prodResponse = await api.get('/products');
      setProducts(prodResponse.data);
    } catch (err) {
      console.error('Failed to load selection options', err);
    }
  };

  useEffect(() => {
    fetchChallans();
    if (canWrite) {
      fetchOptions();
    }
  }, []);

  const handleCreateClick = () => {
    setFormCustomerId('');
    setFormStatus('DRAFT');
    setChallanItems([]);
    setBuilderProductId('');
    setBuilderQuantity(1);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleRowClick = async (challan: Challan) => {
    try {
      const response = await api.get(`/challans/${challan.id}`);
      setSelectedChallan(response.data);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch challan details.');
    }
  };

  const handleAddItemToBuilder = () => {
    if (!builderProductId) return;
    
    const prod = products.find((p) => p.id === builderProductId);
    if (!prod) return;

    const existingIndex = challanItems.findIndex((item) => item.productId === builderProductId);
    if (existingIndex > -1) {
      const updated = [...challanItems];
      updated[existingIndex].quantity += Number(builderQuantity);
      setChallanItems(updated);
    } else {
      setChallanItems([
        ...challanItems,
        {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          price: prod.unitPrice,
          quantity: Number(builderQuantity),
        },
      ]);
    }

    setBuilderProductId('');
    setBuilderQuantity(1);
  };

  const handleRemoveItemFromBuilder = (index: number) => {
    const item = challanItems[index];
    if (!item) return;

    showCustomConfirm(
      'Remove Item',
      `Are you sure you want to remove ${item.name} from the invoice?`,
      () => {
        setChallanItems(prev => prev.filter((_, i) => i !== index));
      }
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (challanItems.length === 0) {
      setFormError('Please add at least one product to the challan.');
      return;
    }

    const payload = {
      customerId: formCustomerId,
      status: formStatus,
      items: challanItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      await api.post('/challans', payload);
      setShowCreateModal(false);
      fetchChallans();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create sales challan.');
    }
  };

  const handleConfirmChallan = async () => {
    if (!selectedChallan) return;
    setFormError(null);

    try {
      await api.put(`/challans/${selectedChallan.id}`, {
        status: 'CONFIRMED',
      });
      showCustomAlert('Challan Confirmed', 'Sales Challan successfully confirmed! Warehouse stock levels have been adjusted.');
      
      const response = await api.get(`/challans/${selectedChallan.id}`);
      setSelectedChallan(response.data);
      fetchChallans();
    } catch (err: any) {
      showCustomAlert('Confirmation Failed', err.message || 'Failed to confirm challan.');
    }
  };

  const totalItemsCount = challanItems.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedOrderValue = challanItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Helper gradients for challan customer badges
  const getChallanGradient = (num: string) => {
    const code = num.charCodeAt(num.length - 1) % 4;
    switch (code) {
      case 0: return 'linear-gradient(135deg, #a78bfa, #fda4af)';
      case 1: return 'linear-gradient(135deg, #fb7185, #f472b6)';
      case 2: return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
      default: return 'linear-gradient(135deg, #10b981, #34d399)';
    }
  };

  if (showCreateModal) {
    const filteredCustomersForSelect = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.businessName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.id.toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
      <div className="fade-in">
        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
            onClick={() => {
              setShowCreateModal(false);
              setFormCustomerId('');
              setCustomerSearch('');
              setChallanItems([]);
              setFormError(null);
            }}
          >
            ← Back to Invoices List
          </button>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Create Sales Challan / Invoice</h3>
        </div>

        {formError && <div className="error-banner">{formError}</div>}

        <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '2rem' }}>
          {/* Left side: Customer selection & Items table */}
          <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
            
            {/* Searchable Customer Selector */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Client / Customer (Search by name, business, or ID)</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Type customer name, business, or ID..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => {
                    // Delay blur to allow dropdown clicks
                    setTimeout(() => setShowCustomerDropdown(false), 200);
                  }}
                />
              </div>

              {showCustomerDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  marginTop: '0.25rem'
                }}>
                  {filteredCustomersForSelect.length === 0 ? (
                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--gray-400)' }}>
                      No matching customers found.
                    </div>
                  ) : (
                    filteredCustomersForSelect.map(cust => (
                      <div
                        key={cust.id}
                        style={{
                          padding: '0.625rem 1rem',
                          cursor: 'pointer',
                          backgroundColor: formCustomerId === cust.id ? 'var(--gray-100)' : 'transparent',
                          borderBottom: '1px solid var(--gray-100)'
                        }}
                        onMouseDown={() => {
                          setFormCustomerId(cust.id);
                          setCustomerSearch(`${cust.businessName} (${cust.name})`);
                          setShowCustomerDropdown(false);
                        }}
                        className="hover-bg-gray"
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--gray-900)' }}>{cust.businessName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                          Purchaser: {cust.name} | ID: {cust.id.substring(0, 8)}...
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Status Option */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Dispatch Execution Status</label>
              <CustomSelect
                value={formStatus}
                onChange={(val) => setFormStatus(val as any)}
                options={[
                  { value: 'DRAFT', label: 'DRAFT (Creates Invoice, leaves inventory unchanged)' },
                  { value: 'CONFIRMED', label: 'CONFIRMED (Checks inventory and deducts stock)' },
                ]}
              />
            </div>

            {/* Items List Table */}
            <h4 style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
              Invoice Items List
            </h4>
            
            {challanItems.length === 0 ? (
              <div style={{ padding: '3rem 2rem', border: '1px dashed var(--gray-200)', borderRadius: '8px', textAlign: 'center', fontSize: '0.825rem', color: 'var(--gray-400)', marginBottom: '1.5rem' }}>
                No items added yet. Search and select products from the sidebar panel on the right.
              </div>
            ) : (
              <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>SKU</th>
                      <th>Unit Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challanItems.map((item, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>
                        <td>₹{item.price.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600 }}>{item.quantity} units</td>
                        <td style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn-icon" onClick={() => handleRemoveItemFromBuilder(index)}>
                            <X size={14} style={{ color: 'var(--color-danger-text)' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary card */}
            {challanItems.length > 0 && (
              <div className="summary-card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.825rem', color: 'var(--gray-600)' }}>
                  <span>Unique Catalog Products:</span>
                  <span>{challanItems.length} items</span>
                </div>
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.825rem', color: 'var(--gray-600)' }}>
                  <span>Total Quantity:</span>
                  <span>{totalItemsCount} units</span>
                </div>
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', borderTop: '1px solid var(--gray-200)', paddingTop: '0.5rem' }}>
                  <span>Estimated Grand Total:</span>
                  <span>₹{estimatedOrderValue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--gray-100)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto' }}
                onClick={() => {
                  setShowCreateModal(false);
                  setFormCustomerId('');
                  setCustomerSearch('');
                  setChallanItems([]);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                {formStatus === 'CONFIRMED' ? 'Confirm and Dispatch' : 'Save Draft Invoice'}
              </button>
            </div>
          </div>

          {/* Right side: Product Picker Builder */}
          <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>
              <ShoppingBag size={14} /> Add Line Item
            </h4>

            {/* Product Selector with stock preview */}
            <div className="form-group">
              <label className="form-label">Product Selector</label>
              <CustomSelect
                value={builderProductId}
                onChange={(val) => setBuilderProductId(val)}
                placeholder="-- Select Product --"
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.name} (SKU: ${p.sku}) | Stock: ${p.currentStock} | Price: ₹${p.unitPrice}`
                }))}
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={builderQuantity}
                onChange={(e) => setBuilderQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1.5rem' }}
              disabled={!builderProductId}
              onClick={handleAddItemToBuilder}
            >
              Add Product to Challan
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showDetailModal && selectedChallan) {
    const totalQty = selectedChallan.items.reduce((s, i) => s + i.quantity, 0);
    const totalVal = selectedChallan.items.reduce((s, i) => s + (i.priceSnapshot * i.quantity), 0);

    return (
      <div className="fade-in">
        {/* Invoice Page Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
            onClick={() => {
              setSelectedChallan(null);
              setShowDetailModal(false);
            }}
          >
            ← Back to Invoices List
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
              onClick={() => handlePrintChallan(selectedChallan)}
            >
              Export as PDF / Print
            </button>

            {selectedChallan.status === 'DRAFT' && canWrite && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmChallan}
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
              >
                Confirm & Deduct Stock
              </button>
            )}
          </div>
        </div>

        {/* Invoice Document Layout Sheet */}
        <div className="card" style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-100)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>FUNDSROOM CRM</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Corporate Sales & Inventory Operations Portal</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Sales Challan / Invoice</h3>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                Ref ID: {selectedChallan.challanNumber}
              </span>
            </div>
          </div>

          {/* Customer & Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div style={{ backgroundColor: 'var(--gray-50)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ color: 'var(--gray-400)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                Client Billing Information
              </h4>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--gray-900)' }}>
                {selectedChallan.customer.businessName}
              </p>
              <p style={{ fontSize: '0.825rem', margin: '0 0 0.25rem 0', color: 'var(--gray-600)' }}>
                <strong>Contact Person:</strong> {selectedChallan.customer.name}
              </p>
              <p style={{ fontSize: '0.825rem', margin: '0 0 0.25rem 0', color: 'var(--gray-600)' }}>
                <strong>Email:</strong> {selectedChallan.customer.email} | <strong>Mobile:</strong> {selectedChallan.customer.mobile}
              </p>
              <p style={{ fontSize: '0.825rem', margin: '0 0 0.25rem 0', color: 'var(--gray-600)' }}>
                <strong>Billing Address:</strong> {selectedChallan.customer.address}
              </p>
              {selectedChallan.customer.gstNumber && (
                <p style={{ fontSize: '0.825rem', margin: '0', color: 'var(--gray-700)', fontWeight: 600 }}>
                  <strong>GSTIN:</strong> {selectedChallan.customer.gstNumber}
                </p>
              )}
            </div>

            <div style={{ backgroundColor: 'var(--gray-50)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ color: 'var(--gray-400)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                Invoice Reference Details
              </h4>
              <p style={{ fontSize: '0.825rem', margin: '0 0 0.35rem 0', color: 'var(--gray-600)' }}>
                <strong>Issued Date:</strong> {new Date(selectedChallan.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p style={{ fontSize: '0.825rem', margin: '0 0 0.35rem 0', color: 'var(--gray-600)' }}>
                <strong>Authorized Clerk:</strong> {selectedChallan.createdBy.name}
              </p>
              <p style={{ fontSize: '0.825rem', margin: '0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <strong>Dispatch Status:</strong> 
                <span className={`badge ${selectedChallan.status === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}`} style={{ borderRadius: '6px' }}>
                  {selectedChallan.status}
                </span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <h4 style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            Product snapshotted line items
          </h4>
          <div className="table-container" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Details (Catalog Snapshot)</th>
                  <th>SKU snapshot</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedChallan.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.nameSnapshot}</td>
                    <td style={{ fontFamily: 'monospace' }}>{item.skuSnapshot}</td>
                    <td>₹{item.priceSnapshot.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>{item.quantity} units</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{(item.priceSnapshot * item.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Details */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '320px', borderTop: '2px solid var(--gray-100)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                <span>Total Items:</span>
                <span style={{ fontWeight: 600 }}>{totalQty} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', borderTop: '1px solid var(--gray-200)', paddingTop: '0.75rem' }}>
                <span>Grand Total:</span>
                <span>₹{totalVal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Header Options */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper" style={{ width: '280px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by client or Challan ID..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {canWrite && (
          <button className="btn btn-primary" onClick={handleCreateClick} style={{ width: 'auto', gap: '0.375rem', padding: '0.5rem 1rem' }}>
            <Plus size={14} /> New Challan
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}



      {/* Challans List Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" className="checkbox-custom" readOnly />
              </th>
              {renderSortHeader('challanNumber', 'Challan ID')}
              {renderSortHeader('businessName', 'Client Business')}
              {renderSortHeader('name', 'Purchaser Name')}
              {renderSortHeader('totalQuantity', 'Total Units')}
              {renderSortHeader('createdAt', 'Issued Date')}
              {renderSortHeader('status', 'Status')}
              <th>Billing Clerk</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  Loading challans...
                </td>
              </tr>
            ) : sortedChallans.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  No sales challans recorded.
                </td>
              </tr>
            ) : (
              sortedChallans.map((chal) => {
                const grad = getChallanGradient(chal.challanNumber);
                return (
                  <tr key={chal.id} onClick={() => handleRowClick(chal)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="checkbox-custom" />
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--gray-900)' }}>{chal.challanNumber}</td>
                    <td>
                      <div className="company-cell">
                        <div className="company-gradient" style={{ background: grad }}></div>
                        {chal.customer.businessName}
                      </div>
                    </td>
                    <td>{chal.customer.name}</td>
                    <td style={{ fontWeight: 600 }}>{chal.totalQuantity} items</td>
                    <td>
                      {new Date(chal.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div className="status-dot-cell">
                        <span className={`status-dot ${chal.status === 'CONFIRMED' ? 'status-dot-active' : 'status-dot-idle'}`}></span>
                        <span style={{
                          color: chal.status === 'CONFIRMED' ? 'var(--status-active-text)' : 'var(--status-idle-text)'
                        }}>
                          {chal.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{chal.createdBy.name}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            width: 'auto',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => handlePrintChallan(chal)}
                        >
                          <Printer size={12} /> Print
                        </button>
                        <span style={{ color: 'var(--gray-300)', fontSize: '0.875rem', marginLeft: '0.25rem' }}>›</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Obsolete modal details view removed - now renders as a gorgeous full page sheet */}

      {/* Custom Dialog Alert/Confirm Modal Overlay */}
      {dialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <h3 className="modal-title" style={{ justifyContent: 'center', fontSize: '1.15rem', marginBottom: '1rem', color: dialog.title.toLowerCase().includes('delete') || dialog.title.toLowerCase().includes('failed') || dialog.title.toLowerCase().includes('error') || dialog.title.toLowerCase().includes('blocked') ? '#dc2626' : 'var(--color-primary)' }}>
              {dialog.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '2rem', lineHeight: 1.5 }}>
              {dialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              {dialog.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100px' }}
                    onClick={() => setDialog({ ...dialog, isOpen: false })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      width: '100px',
                      backgroundColor: dialog.title.toLowerCase().includes('delete') ? '#dc2626' : 'var(--color-primary)',
                      color: 'white',
                      borderColor: dialog.title.toLowerCase().includes('delete') ? '#dc2626' : 'var(--color-primary)',
                    }}
                    onClick={() => {
                      setDialog({ ...dialog, isOpen: false });
                      if (dialog.onConfirm) dialog.onConfirm();
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100px' }}
                  onClick={() => setDialog({ ...dialog, isOpen: false })}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challans;
