import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Calendar, Phone, Mail, Building, MapPin, NotepadText } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  type: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string | null;
  notes?: string | null;
}

const Customers: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBusiness, setFormBusiness] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formType, setFormType] = useState<'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR'>('RETAIL');
  const [formStatus, setFormStatus] = useState<'LEAD' | 'ACTIVE' | 'INACTIVE'>('LEAD');
  const [formAddress, setFormAddress] = useState('');
  const [formFollowUp, setFormFollowUp] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Follow-up notes state
  const [newNote, setNewNote] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const canWrite = user?.role === 'ADMIN' || user?.role === 'SALES';

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedCustomers = React.useMemo(() => {
    if (!sortField) return customers;
    return [...customers].sort((a: any, b: any) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, sortField, sortOrder]);

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

  const fetchCustomers = async () => {
    if (customers.length === 0) setLoading(true);
    setError(null);
    try {
      let query = `?page=${page}&limit=8`;
      if (debouncedSearch) query += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (typeFilter) query += `&type=${typeFilter}`;

      const response = await api.get(`/customers${query}`);
      setCustomers(response.data.customers);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleAddClick = () => {
    setSelectedCustomer(null);
    setFormName('');
    setFormMobile('');
    setFormEmail('');
    setFormBusiness('');
    setFormGst('');
    setFormType('RETAIL');
    setFormStatus('LEAD');
    setFormAddress('');
    setFormFollowUp('');
    setFormNotes('');
    setFormError(null);
    setShowFormModal(true);
  };

  const handleEditClick = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setFormName(customer.name);
    setFormMobile(customer.mobile);
    setFormEmail(customer.email);
    setFormBusiness(customer.businessName);
    setFormGst(customer.gstNumber || '');
    setFormType(customer.type);
    setFormStatus(customer.status);
    setFormAddress(customer.address);
    setFormFollowUp(customer.followUpDate ? new Date(customer.followUpDate).toISOString().split('T')[0] : '');
    setFormNotes(customer.notes || '');
    setFormError(null);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: formName,
      mobile: formMobile,
      email: formEmail,
      businessName: formBusiness,
      gstNumber: formGst || null,
      type: formType,
      address: formAddress,
      status: formStatus,
      followUpDate: formFollowUp ? new Date(formFollowUp).toISOString() : null,
      notes: formNotes || null,
    };

    try {
      if (selectedCustomer) {
        await api.put(`/customers/${selectedCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setShowFormModal(false);
      fetchCustomers();
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        setFormError(err.errors.map((e: any) => `${e.field}: ${e.message}`).join(', '));
      } else {
        setFormError(err.message || 'An error occurred during save.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'LEAD' | 'ACTIVE' | 'INACTIVE') => {
    try {
      await api.put(`/customers/${id}`, { status: newStatus });
      fetchCustomers();
    } catch (err: any) {
      showCustomAlert('Update Failed', err.message || 'Failed to update customer status.');
    }
  };

  const handleDeleteSingle = async () => {
    if (!selectedCustomer) return;
    showCustomConfirm(
      'Delete Customer',
      `Are you sure you want to delete customer "${selectedCustomer.name}"?`,
      async () => {
        try {
          await api.delete(`/customers/${selectedCustomer.id}`);
          setShowFormModal(false);
          fetchCustomers();
          showCustomAlert('Deleted Successfully', 'Customer profile has been permanently removed.');
        } catch (err: any) {
          showCustomAlert('Deletion Failed', err.message || 'Failed to delete customer.');
        }
      }
    );
  };

  const handleBulkDelete = async () => {
    showCustomConfirm(
      'Bulk Delete',
      `Are you sure you want to delete the ${selectedIds.length} selected customers?`,
      async () => {
        try {
          await Promise.all(selectedIds.map(id => api.delete(`/customers/${id}`)));
          setSelectedIds([]);
          fetchCustomers();
          showCustomAlert('Deleted Successfully', 'Selected customer profiles have been permanently removed.');
        } catch (err: any) {
          showCustomAlert('Bulk Deletion Failed', err.message || 'An error occurred during bulk deletion.');
          fetchCustomers();
        }
      }
    );
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNewNote('');
    setShowDetailModal(true);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCustomer) return;

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const author = user?.name || user?.username || 'System';
    const noteLine = `[${dateStr} by ${author}] ${newNote.trim()}`;
    const updatedNotes = selectedCustomer.notes ? `${selectedCustomer.notes}\n${noteLine}` : noteLine;

    try {
      const response = await api.put(`/customers/${selectedCustomer.id}`, {
        notes: updatedNotes,
      });
      setSelectedCustomer(response.data);
      setNewNote('');
      fetchCustomers();
    } catch (err: any) {
      showCustomAlert('Note Addition Failed', err.message || 'Failed to append follow-up note.');
    }
  };

  const parseNotes = (notesStr?: string | null): string[] => {
    if (!notesStr) return [];
    return notesStr.split('\n').filter((line) => line.trim().length > 0);
  };

  const getGradientForAvatar = (id: string) => {
    const code = id.charCodeAt(0) % 4;
    switch (code) {
      case 0: return 'linear-gradient(135deg, #a78bfa, #fda4af)';
      case 1: return 'linear-gradient(135deg, #fb7185, #f472b6)';
      case 2: return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
      default: return 'linear-gradient(135deg, #10b981, #34d399)';
    }
  };

  return (
    <div>
      {/* Search & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search customers..."
              className="search-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          <CustomSelect
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'LEAD', label: 'Leads' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            style={{ width: '150px' }}
          />

          <CustomSelect
            value={typeFilter}
            onChange={(val) => { setTypeFilter(val); setPage(1); }}
            options={[
              { value: '', label: 'All Types' },
              { value: 'RETAIL', label: 'Retail' },
              { value: 'WHOLESALE', label: 'Wholesale' },
              { value: 'DISTRIBUTOR', label: 'Distributor' },
            ]}
            style={{ width: '150px' }}
          />
        </form>

        {canWrite && (
          <button className="btn btn-primary" onClick={handleAddClick} style={{ width: 'auto', gap: '0.375rem', padding: '0.5rem 1rem' }}>
            <Plus size={14} /> Add Customer
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
            {selectedIds.length} customer{selectedIds.length > 1 ? 's' : ''} selected
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

      {/* Customer Database Table Grid */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  className="checkbox-custom" 
                  checked={customers.length > 0 && customers.every(c => selectedIds.includes(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const pageIds = customers.map(c => c.id);
                      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                    } else {
                      const pageIds = customers.map(c => c.id);
                      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                    }
                  }}
                />
              </th>
              {renderSortHeader('name', 'Customer Name')}
              {renderSortHeader('businessName', 'Business Name')}
              <th>Mobile Number</th>
              <th>Email Address</th>
              {renderSortHeader('type', 'Customer Type')}
              {renderSortHeader('status', 'CRM Status')}
              {renderSortHeader('followUpDate', 'Follow-up Date')}
              <th>Notes</th>
              {canWrite && <th style={{ textAlign: 'right', width: '90px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  Loading CRM database...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              sortedCustomers.map((cust) => {
                const grad = getGradientForAvatar(cust.id);
                return (
                  <tr key={cust.id} onClick={() => handleRowClick(cust)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="checkbox-custom" 
                        checked={selectedIds.includes(cust.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, cust.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== cust.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="company-cell">
                        <div className="company-gradient" style={{ background: grad }}></div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{cust.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{cust.businessName}</td>
                    <td>{cust.mobile}</td>
                    <td>{cust.email}</td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {cust.type.toLowerCase()}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="status-dot-cell">
                        <span className={`status-dot ${
                          cust.status === 'ACTIVE' ? 'status-dot-active' : 
                          cust.status === 'LEAD' ? 'status-dot-idle' : 'status-dot-cancelled'
                        }`}></span>
                        <CustomSelect
                          value={cust.status}
                          onChange={(val) => handleStatusChange(cust.id, val as any)}
                          disabled={!canWrite}
                          variant="minimal"
                          options={[
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'LEAD', label: 'Lead' },
                            { value: 'INACTIVE', label: 'Inactive' },
                          ]}
                          style={{
                            fontWeight: 500,
                            fontSize: '0.825rem',
                            color: cust.status === 'ACTIVE' ? 'var(--status-active-text)' :
                                   cust.status === 'LEAD' ? 'var(--status-idle-text)' : 'var(--status-cancelled-text)',
                            width: '90px',
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {cust.followUpDate ? new Date(cust.followUpDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td style={{
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--gray-500)',
                    }} title={cust.notes || ''}>
                      {cust.notes ? cust.notes : '-'}
                    </td>
                    {canWrite && (
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions-wrapper">
                          <button
                            className="pagination-btn-nav"
                            onClick={(e) => handleEditClick(cust, e)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Edit
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn-nav"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`page-num ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              className="pagination-btn-nav"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ==========================================
         ADD / EDIT CUSTOMER MODAL
         ========================================== */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedCustomer ? 'Edit Customer Info' : 'Register New Customer'}</h3>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formBusiness}
                    onChange={(e) => setFormBusiness(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formFollowUp}
                    onChange={(e) => setFormFollowUp(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <CustomSelect
                    value={formType}
                    onChange={(val) => setFormType(val as any)}
                    options={[
                      { value: 'RETAIL', label: 'Retail' },
                      { value: 'WHOLESALE', label: 'Wholesale' },
                      { value: 'DISTRIBUTOR', label: 'Distributor' },
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CRM Status</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    options={[
                      { value: 'LEAD', label: 'Lead' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes about the client..."
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
                {selectedCustomer && canWrite && (
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
                    Delete Customer
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowFormModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedCustomer ? 'Save Changes' : 'Create Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         CUSTOMER DETAIL & NOTES TIMELINE MODAL
         ========================================== */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Client Details & Notes</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--gray-400)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Business Info
                </h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <Building size={14} style={{ color: 'var(--gray-500)' }} />
                  <strong>{selectedCustomer.businessName}</strong>
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <MapPin size={14} style={{ color: 'var(--gray-500)' }} />
                  {selectedCustomer.address}
                </p>
                {selectedCustomer.gstNumber && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    GSTIN: <strong>{selectedCustomer.gstNumber}</strong>
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ color: 'var(--gray-400)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Contact Details
                </h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <Phone size={14} style={{ color: 'var(--gray-500)' }} />
                  {selectedCustomer.mobile} (Contact: {selectedCustomer.name})
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <Mail size={14} style={{ color: 'var(--gray-500)' }} />
                  {selectedCustomer.email}
                </p>
                {selectedCustomer.followUpDate && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--status-idle-text)', fontWeight: 500 }}>
                    <Calendar size={14} />
                    Next Follow-up: {new Date(selectedCustomer.followUpDate).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <NotepadText size={16} /> Follow-up Notes Timeline
              </h4>

              {parseNotes(selectedCustomer.notes).length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                  No follow-up notes recorded yet.
                </p>
              ) : (
                <div className="timeline" style={{ marginBottom: '1.5rem' }}>
                  {parseNotes(selectedCustomer.notes).map((line, index) => {
                    const match = line.match(/^\[(.*?)\] (.*)$/);
                    const timestamp = match ? match[1] : '';
                    const text = match ? match[2] : line;

                    return (
                      <div className="timeline-item" key={index}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          {timestamp && <div className="timeline-date">{timestamp}</div>}
                          <div style={{ fontWeight: 400 }}>{text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canWrite && (
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Type new follow-up notes..."
                    className="form-input"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                    Add Note
                  </button>
                </form>
              )}
            </div>
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

export default Customers;
