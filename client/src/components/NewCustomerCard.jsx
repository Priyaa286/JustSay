import React from 'react';

export default function NewCustomerCard({ data, onCreate, onCancel, isCreating }) {
  if (!data || !data.customer || !data.extraction) return null;

  const { customer, extraction } = data;

  return (
    <div className="card new-customer-card" style={{ borderColor: '#F59E0B' }}>
      <div className="card-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
        <h3 style={{ color: '#D97706', margin: '0 0 4px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👤</span> Customer not found
        </h3>
        <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
          "<strong>{customer.name}</strong>" is not in your customer list.
        </p>
      </div>

      <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
          Pending Transaction
        </div>
        
        <div className="detail-row">
          <span className="label">Amount</span>
          <span className="value" style={{ fontSize: '18px', fontWeight: 700, color: extraction.transactionType === 'CREDIT' ? '#EF4444' : '#10B981' }}>
            ₹{extraction.amount}
          </span>
        </div>
        
        {extraction.item && (
          <div className="detail-row">
            <span className="label">Item</span>
            <span className="value">{extraction.item} {extraction.quantity ? `× ${extraction.quantity}` : ''}</span>
          </div>
        )}
        
        <div className="detail-row">
          <span className="label">Type</span>
          <span className={`value type-badge ${extraction.transactionType?.toLowerCase()}`}>
            {extraction.transactionType}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <p style={{ color: '#0F172A', fontWeight: 500, margin: 0 }}>Create this customer?</p>
      </div>

      <div className="action-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onCreate(customer.name)}
          disabled={isCreating}
          style={{ background: '#F59E0B', color: 'white', border: 'none' }}
        >
          {isCreating ? 'Creating...' : 'Create Customer'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isCreating}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
