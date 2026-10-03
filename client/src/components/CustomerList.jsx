import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function CustomerList({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomers();
      const list = Array.isArray(res.data) ? res.data : [];
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError("Couldn't load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name && c.name.toLowerCase().includes(query);
    const nickMatch = c.nickname && c.nickname.toLowerCase().includes(query);
    return nameMatch || nickMatch;
  });

  return (
    <div className="customer-list-container">
      <div className="list-header">
        <div>
          <h2 className="list-title">Customer Ledger</h2>
          <span className="list-subtitle">வாடிக்கையாளர் கணக்குகள் ({customers.length})</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={fetchCustomers}
          disabled={loading}
          title="Refresh customers"
        >
          🔄
        </button>
      </div>

      {/* Search Bar */}
      {customers.length > 0 && (
        <div className="search-box">
          <input
            type="text"
            className="form-input search-input"
            placeholder="🔍 Search customer by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card text-center" style={{ padding: '36px 20px' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            Loading customers...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="card text-center" style={{ padding: '24px 20px', borderColor: '#FCA5A5', background: '#FEF2F2' }}>
          <p style={{ color: '#B91C1C', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
            ⚠️ {error}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: 'auto', margin: '0 auto' }}
            onClick={fetchCustomers}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && customers.length === 0 && (
        <div className="card text-center" style={{ padding: '36px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Customers Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Record a voice transaction to add your first customer automatically!
          </p>
        </div>
      )}

      {/* Customer List Cards */}
      {!loading && !error && customers.length > 0 && (
        <div className="customer-cards-list">
          {filteredCustomers.length === 0 ? (
            <div className="card text-center" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No customer matching &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const balancePaise = customer.balance || 0;
              const balanceRupees = (balancePaise / 100).toFixed(2);
              const owesMoney = balancePaise > 0;
              const isSettled = balancePaise === 0;

              return (
                <div
                  key={customer.id}
                  className="customer-row-card"
                  onClick={() => onSelectCustomer(customer.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectCustomer(customer.id);
                    }
                  }}
                >
                  <div className="customer-info">
                    <div className="avatar-circle">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="name-group">
                      <div className="customer-name">{customer.name}</div>
                      {customer.nickname && (
                        <div className="customer-nickname">({customer.nickname})</div>
                      )}
                    </div>
                  </div>

                  <div className="customer-balance-block">
                    {owesMoney ? (
                      <div className="balance-badge due">
                        <span className="balance-label">Owes</span>
                        <span className="balance-amount">₹{balanceRupees}</span>
                      </div>
                    ) : isSettled ? (
                      <div className="balance-badge settled">
                        <span className="balance-label">Settled</span>
                        <span className="balance-amount">₹0.00</span>
                      </div>
                    ) : (
                      <div className="balance-badge advance">
                        <span className="balance-label">Advance</span>
                        <span className="balance-amount">₹{Math.abs(customer.balance / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <span className="chevron-arrow">›</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
