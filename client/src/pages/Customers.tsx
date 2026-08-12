import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, UserCheck, Calendar, Phone, Mail, Building, MapPin, NotepadText } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Check write permission (Admin and Sales only)
  const canWrite = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `?page=${page}&limit=8`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
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
  }, [page, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Open modal to add a new customer
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

  // Open modal to edit existing customer
  const handleEditClick = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail modal
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

  // Submit form (Add or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // Edit Customer
        await api.put(`/customers/${selectedCustomer.id}`, payload);
      } else {
        // Add Customer
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
    }
  };

  // Open single customer details
  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNewNote('');
    setShowDetailModal(true);
  };

  // Append a follow-up note to the timeline
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

    // Append to existing notes
    const updatedNotes = selectedCustomer.notes 
      ? `${selectedCustomer.notes}\n${noteLine}`
      : noteLine;

    try {
      const response = await api.put(`/customers/${selectedCustomer.id}`, {
        notes: updatedNotes,
      });
      const updatedCust = response.data;
      setSelectedCustomer(updatedCust); // Update details modal
      setNewNote('');
      fetchCustomers(); // Refresh table list
    } catch (err: any) {
      alert(err.message || 'Failed to append follow-up note.');
    }
  };

  // Helper to parse follow-up notes line by line
  const parseNotes = (notesStr?: string | null): string[] => {
    if (!notesStr) return [];
    return notesStr.split('\n').filter((line) => line.trim().length > 0);
  };

  return (
    <div>
      <div className="panel-header">
        <h2 style={{ fontWeight: 600, fontSize: '1.5rem' }}>Customer Database (CRM)</h2>
        {canWrite && (
          <button className="btn btn-primary" onClick={handleAddClick} style={{ width: 'auto', gap: '0.5rem' }}>
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      <div className="card">
        {/* Search and Filters */}
        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or company..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Leads</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            className="select-filter"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>

          <button type="submit" className="btn btn-secondary" style={{ width: 'auto' }}>
            Search
          </button>
        </form>

        {error && <div className="error-banner">{error}</div>}

        {/* Customer Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Business Name</th>
                <th>Mobile Number</th>
                <th>Email Address</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next Follow-up</th>
                {canWrite && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} onClick={() => handleRowClick(cust)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{cust.name}</td>
                    <td>{cust.businessName}</td>
                    <td>{cust.mobile}</td>
                    <td>{cust.email}</td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {cust.type.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        cust.status === 'ACTIVE' ? 'badge-success' : 
                        cust.status === 'LEAD' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {cust.status}
                      </span>
                    </td>
                    <td>
                      {cust.followUpDate ? new Date(cust.followUpDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                    {canWrite && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-secondary"
                          onClick={(e) => handleEditClick(cust, e)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
                  <select
                    className="form-input"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">CRM Status</label>
                  <select
                    className="form-input"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
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

              {!selectedCustomer && (
                <div className="form-group">
                  <label className="form-label">Initial Notes</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Add brief details about the client..."
                  />
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  {selectedCustomer ? 'Save Changes' : 'Create Customer'}
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
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Client Details & Timeline</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Business info
                </h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  <Building size={16} style={{ color: 'var(--text-secondary)' }} />
                  <strong>{selectedCustomer.businessName}</strong>
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  <UserCheck size={16} style={{ color: 'var(--text-secondary)' }} />
                  {selectedCustomer.name} (Contact)
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  <MapPin size={16} style={{ color: 'var(--text-secondary)' }} />
                  {selectedCustomer.address}
                </p>
                {selectedCustomer.gstNumber && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    GSTIN: <strong>{selectedCustomer.gstNumber}</strong>
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Contact details
                </h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  <Phone size={16} style={{ color: 'var(--text-secondary)' }} />
                  {selectedCustomer.mobile}
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                  {selectedCustomer.email}
                </p>
                {selectedCustomer.followUpDate && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-warning-text)', fontWeight: 500 }}>
                    <Calendar size={16} />
                    Next Follow-up: {new Date(selectedCustomer.followUpDate).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            {/* Notes Timeline */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                <NotepadText size={18} /> Follow-up Notes Timeline
              </h4>

              {parseNotes(selectedCustomer.notes).length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                  No follow-up notes recorded yet.
                </p>
              ) : (
                <div className="timeline" style={{ marginBottom: '2rem' }}>
                  {parseNotes(selectedCustomer.notes).map((line, index) => {
                    // Split the timestamp header and note text
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

              {/* Add Note Form */}
              {canWrite && (
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Type new follow-up notes here..."
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
    </div>
  );
};

export default Customers;
