import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, Warehouse, Calendar, ClipboardList } from 'lucide-react';

interface StockMovement {
  id: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  timestamp: string;
  createdBy: {
    name: string;
    role: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  stockMovements?: StockMovement[];
}

const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formStock, setFormStock] = useState(0);
  const [formMinAlert, setFormMinAlert] = useState(0);
  const [formLocation, setFormLocation] = useState('');
  const [formReason, setFormReason] = useState(''); // Only for editing stock adjustments
  const [formError, setFormError] = useState<string | null>(null);

  const canWrite = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      const params: string[] = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (lowStockFilter) params.push('lowStock=true');
      
      if (params.length > 0) {
        query = `?${params.join('&')}`;
      }

      const response = await api.get(`/products${query}`);
      setProducts(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [lowStockFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  // Open modal to add product
  const handleAddClick = () => {
    setSelectedProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormPrice(0);
    setFormStock(0);
    setFormMinAlert(0);
    setFormLocation('');
    setFormReason('');
    setFormError(null);
    setShowFormModal(true);
  };

  // Open modal to edit product / adjust stock
  const handleEditClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
    setFormPrice(product.unitPrice);
    setFormStock(product.currentStock);
    setFormMinAlert(product.minStockAlert);
    setFormLocation(product.location);
    setFormReason('');
    setFormError(null);
    setShowFormModal(true);
  };

  // Open product details to view movement logs
  const handleRowClick = async (product: Product) => {
    try {
      const response = await api.get(`/products/${product.id}`);
      setSelectedProduct(response.data);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch product movement history.');
    }
  };

  // Submit Product form (Add/Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic numerical validations
    if (formPrice < 0 || formStock < 0 || formMinAlert < 0) {
      setFormError('Numbers cannot be negative.');
      return;
    }

    const payload: any = {
      name: formName,
      sku: formSku,
      category: formCategory,
      unitPrice: Number(formPrice),
      currentStock: Number(formStock),
      minStockAlert: Number(formMinAlert),
      location: formLocation,
    };

    // If editing and the stock has changed, require a reason for audit logs
    if (selectedProduct && Number(formStock) !== selectedProduct.currentStock) {
      if (!formReason.trim()) {
        setFormError('You must specify a reason for this inventory adjustment.');
        return;
      }
      payload.reason = formReason.trim();
    }

    try {
      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowFormModal(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product information.');
    }
  };

  return (
    <div>
      <div className="panel-header">
        <h2 style={{ fontWeight: 600, fontSize: '1.5rem' }}>Product Catalog & Inventory</h2>
        {canWrite && (
          <button className="btn btn-primary" onClick={handleAddClick} style={{ width: 'auto', gap: '0.5rem' }}>
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      <div className="card">
        {/* Search & Low Stock Filters */}
        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: lowStockFilter ? 'var(--color-danger-text)' : 'inherit' }}>
              <AlertTriangle size={16} /> Low Stock Warnings
            </span>
          </label>

          <button type="submit" className="btn btn-secondary" style={{ width: 'auto' }}>
            Filter
          </button>
        </form>

        {error && <div className="error-banner">{error}</div>}

        {/* Product Grid Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Alert Threshold</th>
                <th>Warehouse Bin</th>
                <th>Stock Status</th>
                {canWrite && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const isLowStock = prod.currentStock <= prod.minStockAlert;
                  return (
                    <tr key={prod.id} onClick={() => handleRowClick(prod)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{prod.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{prod.sku}</td>
                      <td>{prod.category}</td>
                      <td>₹{prod.unitPrice.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>{prod.currentStock} units</td>
                      <td>{prod.minStockAlert} units</td>
                      <td>{prod.location}</td>
                      <td>
                        {isLowStock ? (
                          <span className="badge badge-danger" style={{ gap: '0.25rem' }}>
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="badge badge-success">Sufficient</span>
                        )}
                      </td>
                      {canWrite && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            onClick={(e) => handleEditClick(prod, e)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
         ADD / EDIT PRODUCT MODAL
         ========================================== */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedProduct ? 'Update Product & Stock' : 'Register New Product'}</h3>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Code</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Current Stock Quantity</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Alert Threshold</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Warehouse Bin / Location</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formLocation}
                  placeholder="e.g. Rack A-4"
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              {/* Display Reason box ONLY when editing product AND stock count is modified */}
              {selectedProduct && Number(formStock) !== selectedProduct.currentStock && (
                <div className="form-group" style={{ backgroundColor: 'var(--color-warning-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-warning-text)' }}>
                  <label className="form-label" style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>
                    Reason for Stock Adjustment (Audit Requirement)
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g., Stock count discrepancy corrected, Damages removed, Inbound shipment"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  {selectedProduct ? 'Adjust Stock' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         PRODUCT STOCK MOVEMENT AUDIT TRAIL MODAL
         ========================================== */}
      {showDetailModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Inventory Card: {selectedProduct.name}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU Code</span>
                <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedProduct.sku}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Stock</span>
                <p style={{ fontWeight: 600 }}>{selectedProduct.currentStock} units</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bin Location</span>
                <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Warehouse size={14} /> {selectedProduct.location}
                </p>
              </div>
            </div>

            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>
              <ClipboardList size={18} /> Stock Movement Audit Logs
            </h4>

            {/* Audit Logs List */}
            {!selectedProduct.stockMovements || selectedProduct.stockMovements.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No stock movement recorded yet for this product.
              </p>
            ) : (
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Movement Type</th>
                      <th>Quantity Changed</th>
                      <th>Reason</th>
                      <th>Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.stockMovements.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> {new Date(log.timestamp).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td>
                          {log.movementType === 'IN' ? (
                            <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                              <ArrowUpRight size={12} /> Stock In
                            </span>
                          ) : (
                            <span className="badge badge-danger" style={{ gap: '0.25rem' }}>
                              <ArrowDownRight size={12} /> Stock Out
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.quantityChanged} units</td>
                        <td style={{ fontSize: '0.875rem' }}>{log.reason}</td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {log.createdBy.name} ({log.createdBy.role.toLowerCase()})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
