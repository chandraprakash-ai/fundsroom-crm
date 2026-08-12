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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search debouncing hook
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state (using string or number to prevent stuck zero state)
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formMinAlert, setFormMinAlert] = useState<number | ''>('');
  const [formLocation, setFormLocation] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Extra filter states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const canWrite = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

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

  const uniqueCategories = React.useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    // Price range filters
    if (minPrice !== '') {
      result = result.filter((p) => p.unitPrice >= Number(minPrice));
    }
    if (maxPrice !== '') {
      result = result.filter((p) => p.unitPrice <= Number(maxPrice));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Client-side sorting
    if (sortField) {
      result.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Special handling for computed stock status
        if (sortField === 'stockStatus') {
          valA = a.currentStock <= a.minStockAlert ? 1 : 0;
          valB = b.currentStock <= b.minStockAlert ? 1 : 0;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, minPrice, maxPrice, categoryFilter, sortField, sortOrder]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      const params: string[] = [];
      if (debouncedSearch) params.push(`search=${encodeURIComponent(debouncedSearch)}`);
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
  }, [lowStockFilter, debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleAddClick = () => {
    setSelectedProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormPrice('');
    setFormStock('');
    setFormMinAlert('');
    setFormLocation('');
    setFormReason('');
    setFormError(null);
    setShowFormModal(true);
  };

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

  const handleDeleteSingle = async () => {
    if (!selectedProduct) return;
    showCustomConfirm(
      'Delete Product',
      `Are you sure you want to delete product "${selectedProduct.name}"?`,
      async () => {
        try {
          await api.delete(`/products/${selectedProduct.id}`);
          setShowFormModal(false);
          fetchProducts();
          showCustomAlert('Deleted Successfully', 'Product has been permanently removed.');
        } catch (err: any) {
          showCustomAlert('Deletion Failed', err.message || 'Failed to delete product.');
        }
      }
    );
  };

  const handleBulkDelete = async () => {
    showCustomConfirm(
      'Bulk Delete',
      `Are you sure you want to delete the ${selectedIds.length} selected products?`,
      async () => {
        try {
          await Promise.all(selectedIds.map(id => api.delete(`/products/${id}`)));
          setSelectedIds([]);
          fetchProducts();
          showCustomAlert('Deleted Successfully', 'Selected products have been permanently removed.');
        } catch (err: any) {
          showCustomAlert('Bulk Deletion Failed', err.message || 'An error occurred during bulk deletion.');
          fetchProducts();
        }
      }
    );
  };

  const handleRowClick = async (product: Product) => {
    try {
      const response = await api.get(`/products/${product.id}`);
      setSelectedProduct(response.data);
      setShowDetailModal(true);
    } catch (err: any) {
      showCustomAlert('Fetch Failed', err.message || 'Failed to fetch product movement history.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = Number(formPrice);
    const stockNum = Number(formStock);
    const alertNum = Number(formMinAlert);

    if (priceNum < 0 || stockNum < 0 || alertNum < 0) {
      setFormError('Numbers cannot be negative.');
      return;
    }

    const payload: any = {
      name: formName,
      sku: formSku,
      category: formCategory,
      unitPrice: priceNum,
      currentStock: stockNum,
      minStockAlert: alertNum,
      location: formLocation,
    };

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

  // Helper gradient styling for product items
  const getProductGradient = (sku: string) => {
    const code = sku.charCodeAt(sku.length - 1) % 4;
    switch (code) {
      case 0: return 'linear-gradient(135deg, #a78bfa, #c084fc)';
      case 1: return 'linear-gradient(135deg, #60a5fa, #93c5fd)';
      case 2: return 'linear-gradient(135deg, #34d399, #10b981)';
      default: return 'linear-gradient(135deg, #fb7185, #fda4af)';
    }
  };

  return (
    <div>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="number"
              placeholder="Min ₹"
              className="form-input"
              style={{ width: '80px', padding: '0.45rem 0.5rem', fontSize: '0.8rem', height: '36px' }}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>to</span>
            <input
              type="number"
              placeholder="Max ₹"
              className="form-input"
              style={{ width: '80px', padding: '0.45rem 0.5rem', fontSize: '0.8rem', height: '36px' }}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: lowStockFilter ? 'var(--status-idle-text)' : 'inherit' }}>
              <AlertTriangle size={14} /> Low Stock Warnings
            </span>
          </label>
        </form>

        {canWrite && (
          <button className="btn btn-primary" onClick={handleAddClick} style={{ width: 'auto', gap: '0.375rem', padding: '0.5rem 1rem' }}>
            <Plus size={14} /> Add Product
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Bulk Delete Selection Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          padding: '0.625rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '0.825rem', color: '#b91c1c', fontWeight: 600 }}>
            {selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: '30px', display: 'flex', alignItems: 'center' }}
              onClick={() => setSelectedIds([])}
            >
              Unselect All
            </button>
            {canWrite && (
              <button
                type="button"
                className="btn"
                style={{
                  width: 'auto',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderColor: '#dc2626',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product Catalog Grid */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  className="checkbox-custom" 
                  checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const pageIds = filteredProducts.map(p => p.id);
                      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                    } else {
                      const pageIds = filteredProducts.map(p => p.id);
                      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                    }
                  }}
                />
              </th>
              {renderSortHeader('name', 'Product Details')}
              {renderSortHeader('sku', 'SKU')}
              {renderSortHeader('category', 'Category')}
              {renderSortHeader('unitPrice', 'Unit Price')}
              {renderSortHeader('currentStock', 'Current Stock')}
              <th>Alert Threshold</th>
              {renderSortHeader('location', 'Location')}
              {renderSortHeader('stockStatus', 'Stock Status')}
              {canWrite && <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  Loading warehouse catalog...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  No catalog items found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const isLowStock = prod.currentStock <= prod.minStockAlert;
                const grad = getProductGradient(prod.sku);
                return (
                  <tr key={prod.id} onClick={() => handleRowClick(prod)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="checkbox-custom" 
                        checked={selectedIds.includes(prod.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, prod.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== prod.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="company-cell">
                        <div className="company-gradient" style={{ background: grad }}></div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{prod.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{prod.sku}</td>
                    <td>{prod.category}</td>
                    <td>₹{prod.unitPrice.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>{prod.currentStock} units</td>
                    <td>{prod.minStockAlert} units</td>
                    <td>
                      <span className="badge badge-info" style={{ borderRadius: '6px' }}>
                        {prod.location}
                      </span>
                    </td>
                    <td>
                      <div className="status-dot-cell">
                        <span className={`status-dot ${isLowStock ? 'status-dot-cancelled' : 'status-dot-active'}`}></span>
                        <span style={{
                          color: isLowStock ? 'var(--status-cancelled-text)' : 'var(--status-active-text)'
                        }}>
                          {isLowStock ? 'Low Stock' : 'Sufficient'}
                        </span>
                      </div>
                    </td>
                    {canWrite && (
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions-wrapper">
                          <button
                            className="pagination-btn-nav"
                            onClick={(e) => handleEditClick(prod, e)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Adjust
                          </button>
                          <span style={{ color: 'var(--gray-300)', fontSize: '0.875rem' }}>›</span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
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
                    onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Alert Threshold</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(e.target.value === '' ? '' : Number(e.target.value))}
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

              {selectedProduct && Number(formStock) !== selectedProduct.currentStock && (
                <div className="form-group" style={{ backgroundColor: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <label className="form-label" style={{ color: 'var(--status-idle-text)', fontWeight: 600 }}>
                    Reason for Stock Adjustment (Audit Requirement)
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g., Damaged item write-off, Cycle count adjustment"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
                {selectedProduct && canWrite && (
                  <button
                    type="button"
                    className="btn"
                    style={{
                      width: 'auto',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      borderColor: '#dc2626',
                      marginRight: 'auto'
                    }}
                    onClick={handleDeleteSingle}
                  >
                    Delete Product
                  </button>
                )}
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
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Inventory Card: {selectedProduct.name}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem', padding: '0.875rem', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>SKU Code</span>
                <p style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.125rem' }}>{selectedProduct.sku}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</span>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.125rem' }}>{selectedProduct.currentStock} units</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>Bin Location</span>
                <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                  <Warehouse size={14} /> {selectedProduct.location}
                </p>
              </div>
            </div>

            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <ClipboardList size={16} /> Stock Movement Audit Logs
            </h4>

            {!selectedProduct.stockMovements || selectedProduct.stockMovements.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                No stock movement recorded yet.
              </p>
            ) : (
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time Logged</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Reason</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.stockMovements.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
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
                        <td>{log.reason}</td>
                        <td>
                          <span className="badge badge-info">
                            {log.createdBy.name}
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

      {/* Custom Dialog Alert/Confirm Modal Overlay */}
      {dialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <h3 className="modal-title" style={{ justifyContent: 'center', fontSize: '1.15rem', marginBottom: '1rem', color: dialog.title.toLowerCase().includes('delete') || dialog.title.toLowerCase().includes('failed') || dialog.title.toLowerCase().includes('error') ? '#dc2626' : 'var(--color-primary)' }}>
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

export default Products;
