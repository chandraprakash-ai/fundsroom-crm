import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockMovement {
  id: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  timestamp: string;
  product: {
    name: string;
    sku: string;
  };
  createdBy: {
    name: string;
    role: string;
  };
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all stock logs from backend
      const response = await api.get('/products/logs');
      setLogs(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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

  // Filter logs locally
  const filteredLogs = React.useMemo(() => {
    let result = [...logs];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (log) =>
          log.product?.name.toLowerCase().includes(q) ||
          log.product?.sku.toLowerCase().includes(q) ||
          log.createdBy?.name.toLowerCase().includes(q) ||
          log.reason.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Nested sorting
        if (sortField === 'productName') {
          valA = a.product?.name || '';
          valB = b.product?.name || '';
        } else if (sortField === 'sku') {
          valA = a.product?.sku || '';
          valB = b.product?.sku || '';
        } else if (sortField === 'userName') {
          valA = a.createdBy?.name || '';
          valB = b.createdBy?.name || '';
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [logs, debouncedSearch, sortField, sortOrder]);

  const getMockGradient = (sku: string) => {
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
      {/* Top Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper" style={{ width: '280px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by product, SKU, user, or reason..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <button 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          onClick={fetchLogs}
        >
          Refresh Logs
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Logs Table Grid */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {renderSortHeader('timestamp', 'Time Logged')}
              {renderSortHeader('productName', 'Product Details')}
              {renderSortHeader('sku', 'SKU')}
              {renderSortHeader('movementType', 'Log Type')}
              {renderSortHeader('quantityChanged', 'Quantity Changed')}
              <th>Reason for Adjustment</th>
              {renderSortHeader('userName', 'Author')}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  Loading stock movements history log...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const grad = getMockGradient(log.product?.sku || 'X');
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={12} />
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="company-cell">
                        <div className="company-gradient" style={{ background: grad }}></div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{log.product?.name || 'Deleted Product'}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{log.product?.sku || '-'}</td>
                    <td>
                      {log.movementType === 'IN' ? (
                        <span className="badge badge-success" style={{ gap: '0.25rem', borderRadius: '6px' }}>
                          <ArrowUpRight size={12} /> Stock In
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ gap: '0.25rem', borderRadius: '6px' }}>
                          <ArrowDownRight size={12} /> Stock Out
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.quantityChanged} units</td>
                    <td style={{ color: 'var(--gray-600)' }}>{log.reason}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: '0.8rem' }}>{log.createdBy?.name || 'Unknown'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>
                          {log.createdBy?.role?.toLowerCase() || 'staff'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Logs;
