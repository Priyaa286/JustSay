import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function CustomerLedger({ customerId, onBack }) {
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLedger = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomerLedger(customerId);
      setLedgerData(res.data);
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      setError("Couldn't load customer ledger. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  if (loading) {
    return (
      <div className="ledger-view-container">
        <button type="button" className="btn btn-secondary back-btn" onClick={onBack}>
          ← Back to Customers
        </button>
        <div className="card text-center" style={{ padding: '36px 20px', marginTop: '16px' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            Loading ledger history...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ledgerData) {
    return (
      <div className="ledger-view-container">
        <button type="button" className="btn btn-secondary back-btn" onClick={onBack}>
          ← Back to Customers
        </button>
        <div className="card text-center" style={{ padding: '24px 20px', marginTop: '16px', borderColor: '#FCA5A5', background: '#FEF2F2' }}>
          <p style={{ color: '#B91C1C', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
            ⚠️ {error || 'Customer not found.'}
          </p>
          <button type="button" className="btn btn-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={fetchLedger}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { customer, transactions = [] } = ledgerData;
  const balanceRupees = typeof customer.balanceRupees === 'number'
    ? customer.balanceRupees
    : (customer.balancePaise || 0) / 100;
  const owesMoney = balanceRupees > 0;
  const isSettled = balanceRupees === 0;

  return (
    <div className="ledger-view-container">
      {/* Back Button */}
      <button type="button" className="btn btn-secondary back-btn" onClick={onBack}>
        ← Back to Customers
      </button>

      {/* Customer Header Summary Card */}
      <div className="customer-header-card">
        <div className="customer-header-top">
          <div className="avatar-circle-lg">
            {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="customer-name-block">
            <h2 className="customer-title-name">{customer.name}</h2>
            {customer.nickname && (
              <span className="customer-title-nick">({customer.nickname})</span>
            )}
          </div>
        </div>

        <div className="balance-hero-box">
          <span className="balance-hero-label">Current Balance</span>
          <div className={`balance-hero-value ${owesMoney ? 'due' : isSettled ? 'settled' : 'advance'}`}>
            ₹{Math.abs(balanceRupees).toFixed(2)}
          </div>
          <span className={`balance-hero-pill ${owesMoney ? 'due' : isSettled ? 'settled' : 'advance'}`}>
            {owesMoney ? '⚠️ Customer Owes Shopkeeper' : isSettled ? '✓ Fully Settled' : '⭐ Advance Credit'}
          </span>
        </div>
      </div>

      {/* Ledger History List */}
      <div className="ledger-history-section">
        <h3 className="section-title">
          Transaction History ({transactions.length})
        </h3>

        {transactions.length === 0 ? (
          <div className="card text-center" style={{ padding: '30px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📜</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Confirmed Transactions
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Confirmed transactions for {customer.name} will appear here.
            </p>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT';
              const amountRupees = (tx.amount / 100).toFixed(2);
              const txDate = new Date(tx.createdAt);
              const formattedDate = txDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
              const formattedTime = txDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={tx.id} className={`transaction-item-card ${isCredit ? 'credit' : 'payment'}`}>
                  <div className="tx-top-row">
                    <span className={`transaction-type-badge ${isCredit ? 'type-credit' : 'type-payment'}`}>
                      {isCredit ? '🔴 CREDIT (வரவு)' : '🟢 PAYMENT (கடன்)'}
                    </span>
                    <span className="tx-timestamp">
                      {formattedDate} • {formattedTime}
                    </span>
                  </div>

                  <div className="tx-main-row">
                    <div className="tx-details">
                      {tx.item ? (
                        <div className="tx-item-name">
                          📦 {tx.item} {tx.quantity ? `(${tx.quantity})` : ''}
                        </div>
                      ) : (
                        <div className="tx-item-name">
                          {isCredit ? '📦 Store Purchase' : '💳 Cash Payment'}
                        </div>
                      )}
                    </div>
                    <div className={`tx-amount ${isCredit ? 'credit' : 'payment'}`}>
                      {isCredit ? `+₹${amountRupees}` : `-₹${amountRupees}`}
                    </div>
                  </div>

                  {tx.transcript && (
                    <div className="tx-transcript-quote">
                      &quot;{tx.transcript}&quot;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
