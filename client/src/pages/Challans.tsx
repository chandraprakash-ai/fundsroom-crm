import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, FileText, CheckCircle, ShoppingBag, X, Calendar, User, UserCheck, Building } from 'lucide-react';

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
  };
  createdBy: {
    name: string;
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

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Create Form State
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [formError, setFormError] = useState<string | null>(null);

  // Order Items Builder State
  const [builderProductId, setBuilderProductId] = useState('');
  const [builderQuantity, setBuilderQuantity] = useState<number>(1);
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
      // Fetch customers list for selector
      const custResponse = await api.get('/customers?limit=100');
      setCustomers(custResponse.data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        businessName: c.businessName,
      })));

      // Fetch products list for selector
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

  // Open modal to create a new order
  const handleCreateClick = () => {
    setFormCustomerId('');
    setFormStatus('DRAFT');
    setChallanItems([]);
    setBuilderProductId('');
    setBuilderQuantity(1);
    setFormError(null);
    setShowCreateModal(true);
  };

  // Open details modal
  const handleRowClick = async (challan: Challan) => {
    try {
      const response = await api.get(`/challans/${challan.id}`);
      setSelectedChallan(response.data);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch challan details.');
    }
  };

  // Add line item to list builder
  const handleAddItemToBuilder = () => {
    if (!builderProductId) return;
    
    const prod = products.find((p) => p.id === builderProductId);
    if (!prod) return;

    // Check if product already exists in builder list
    const existingIndex = challanItems.findIndex((item) => item.productId === builderProductId);
    if (existingIndex > -1) {
      // Update quantity
      const updated = [...challanItems];
      updated[existingIndex].quantity += Number(builderQuantity);
      setChallanItems(updated);
    } else {
      // Add new row
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

  // Remove line item from list builder
  const handleRemoveItemFromBuilder = (index: number) => {
    setChallanItems(challanItems.filter((_, i) => i !== index));
  };

  // Create Challan Form Submission
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

  // Transition a Draft Challan to Confirmed
  const handleConfirmChallan = async () => {
    if (!selectedChallan) return;
    setFormError(null);

    try {
      await api.put(`/challans/${selectedChallan.id}`, {
        status: 'CONFIRMED',
      });
      alert('Sales Challan successfully confirmed! Inventory has been updated.');
      setShowDetailModal(false);
      fetchChallans();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm challan.');
    }
  };

  // Helpers for calculation summaries
  const totalItemsCount = challanItems.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedOrderValue = challanItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div>
      <div className="panel-header">
        <h2 style={{ fontWeight: 600, fontSize: '1.5rem' }}>Sales Challan & Invoices</h2>
        {canWrite && (
          <button className="btn btn-primary" onClick={handleCreateClick} style={{ width: 'auto', gap: '0.5rem' }}>
            <Plus size={16} /> New Challan
          </button>
        )}
      </div>

      <div className="card">
        {error && <div className="error-banner">{error}</div>}

        {/* Challans List Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan ID</th>
                <th>Client Business</th>
                <th>Purchaser Name</th>
                <th>Total Units</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th>Billing Clerk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    Loading challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No sales challans recorded.
                  </td>
                </tr>
              ) : (
                challans.map((chal) => (
                  <tr key={chal.id} onClick={() => handleRowClick(chal)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{chal.challanNumber}</td>
                    <td style={{ fontWeight: 500 }}>{chal.customer.businessName}</td>
                    <td>{chal.customer.name}</td>
                    <td style={{ fontWeight: 500 }}>{chal.totalQuantity} items</td>
                    <td>
                      {new Date(chal.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className={`badge ${chal.status === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}`}>
                        {chal.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{chal.createdBy.name}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
         CREATE SALES CHALLAN MODAL
         ========================================== */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Sales Challan</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={handleCreateSubmit}>
              <div className="order-builder-grid">
                {/* Left Side: Metadata and Line items */}
                <div>
                  <div className="form-group">
                    <label className="form-label">Client Name</label>
                    <select
                      className="form-input"
                      required
                      value={formCustomerId}
                      onChange={(e) => setFormCustomerId(e.target.value)}
                    >
                      <option value="">-- Choose Client --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order Type / Status</label>
                    <select
                      className="form-input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                    >
                      <option value="DRAFT">DRAFT (Creates Invoice, leaves inventory unchanged)</option>
                      <option value="CONFIRMED">CONFIRMED (Checks inventory and deducts stock)</option>
                    </select>
                  </div>

                  {/* Dynamic Line-items Preview table */}
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Invoice items
                  </h4>

                  {challanItems.length === 0 ? (
                    <div style={{ padding: '2rem', border: '1px dashed var(--border-darker)', borderRadius: '8px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      No items added to invoice list yet. Use the product builder on the right.
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>SKU</th>
                            <th>Qty</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {challanItems.map((item, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: 500 }}>{item.name}</td>
                              <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>
                              <td style={{ fontWeight: 600 }}>{item.quantity}</td>
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
                    <div className="summary-card">
                      <div className="summary-row">
                        <span>Unique Catalog Products:</span>
                        <span>{challanItems.length} items</span>
                      </div>
                      <div className="summary-row">
                        <span>Total Quantity:</span>
                        <span>{totalItemsCount} units</span>
                      </div>
                      <div className="summary-row">
                        <span>Estimated Invoice Cost:</span>
                        <span>₹{estimatedOrderValue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Product Picker Builder */}
                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem' }}>
                    <ShoppingBag size={18} /> Add line Item
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Product Selector</label>
                    <select
                      className="form-input"
                      value={builderProductId}
                      onChange={(e) => setBuilderProductId(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (SKU: {p.sku}) | Stock: {p.currentStock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={builderQuantity}
                      onChange={(e) => setBuilderQuantity(Number(e.target.value))}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddItemToBuilder}
                    disabled={!builderProductId}
                  >
                    Add Product to Challan
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowCreateModal(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  {formStatus === 'CONFIRMED' ? 'Confirm and Dispatch' : 'Save Draft Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         CHALLAN DETAIL VIEW MODAL (SNAPSHOTTED HISTORICAL ITEMS)
         ========================================== */}
      {showDetailModal && selectedChallan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Sales Invoice: {selectedChallan.challanNumber}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Client information
                </h4>
                <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Building size={14} /> <strong>{selectedChallan.customer.businessName}</strong>
                </p>
                <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <UserCheck size={14} /> {selectedChallan.customer.name}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '1.25rem' }}>
                  {selectedChallan.customer.address}
                </p>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Metadata Info
                </h4>
                <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Calendar size={14} /> Issued Date: {new Date(selectedChallan.createdAt).toLocaleDateString('en-IN')}
                </p>
                <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <User size={14} /> Clerk: {selectedChallan.createdBy.name}
                </p>
                <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Status: 
                  <span className={`badge ${selectedChallan.status === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: '0.25rem' }}>
                    {selectedChallan.status}
                  </span>
                </p>
              </div>
            </div>

            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <FileText size={16} /> Snapshotted Line Items
            </h4>

            {/* Line Items Table */}
            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Details (Historical Name)</th>
                    <th>SKU Snapshot</th>
                    <th>Price Snapshot</th>
                    <th>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChallan.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.nameSnapshot}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.skuSnapshot}</td>
                      <td>₹{item.priceSnapshot.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>{item.quantity} units</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{(item.priceSnapshot * item.quantity).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {/* Final calculations row */}
                  <tr style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                    <td colSpan={3}>Order Aggregate Summary</td>
                    <td>{selectedChallan.items.reduce((s, i) => s + i.quantity, 0)} units</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>
                      ₹{selectedChallan.items.reduce((s, i) => s + (i.priceSnapshot * i.quantity), 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions for Draft Invoices */}
            {selectedChallan.status === 'DRAFT' && canWrite && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmChallan}
                  style={{ width: 'auto', gap: '0.5rem' }}
                >
                  <CheckCircle size={16} /> Confirm Challan & Update Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Challans;
