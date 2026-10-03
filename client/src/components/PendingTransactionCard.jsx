import React from 'react';

export default function PendingTransactionCard({
  data,
  onConfirm,
  onCorrect,
  onCancel,
  isConfirming,
  isCancelling
}) {
  if (!data) return null;

  const {
    transactionId,
    transaction,
    extraction,
    customer,
    transcript
  } = data;

  const actualId = transactionId || transaction?.id;
  const personName = customer?.name || extraction?.person || 'Customer';
  const type = transaction?.type || extraction?.transactionType || 'CREDIT';
  const isCredit = type === 'CREDIT';
  
  // Amount in Rupees
  const amountRupees = extraction?.amount !== undefined && extraction?.amount !== null
    ? extraction.amount
    : transaction?.amount !== undefined
    ? transaction.amount / 100
    : 0;

  const item = transaction?.item || extraction?.item;
  const quantity = transaction?.quantity || extraction?.quantity;
  const spokenText = transcript || transaction?.transcript || extraction?.transcript;

  return (
    <div className="pending-card">
      {/* Header status */}
      <div className="pending-card-header">
        <span className="pending-badge">
          ⏳ PENDING CONFIRMATION
        </span>
        <span className={`transaction-type-badge ${isCredit ? 'type-credit' : 'type-payment'}`}>
          {isCredit ? '🔴 CREDIT (கடன்)' : '🟢 PAYMENT (வரவு)'}
        </span>
      </div>

      {/* Large Amount Display */}
      <div className="amount-hero">
        <div className="amount-label">
          {isCredit ? 'Credit to add' : 'Payment received'}
        </div>
        <div className="amount-value">
          ₹{Number(amountRupees).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Key Details Grid */}
      <div className="detail-grid">
        <div className="detail-item">
          <span className="detail-label">Customer</span>
          <span className="detail-value">{personName}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Current Balance</span>
          <span className="detail-value">
            ₹{customer ? (customer.balancePaise / 100).toFixed(2) : '0.00'}
          </span>
        </div>

        {item && (
          <div className="detail-item">
            <span className="detail-label">Item / Goods</span>
            <span className="detail-value">{item}</span>
          </div>
        )}

        {quantity && (
          <div className="detail-item">
            <span className="detail-label">Quantity</span>
            <span className="detail-value">{quantity}</span>
          </div>
        )}
      </div>

      {/* Spoken Transcript Box */}
      {spokenText && (
        <div className="transcript-box">
          <span className="transcript-label">You said:</span>
          &ldquo;{spokenText}&rdquo;
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onConfirm(actualId)}
          disabled={isConfirming || isCancelling}
          aria-label="Confirm Transaction"
        >
          {isConfirming ? (
            'Confirming...'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirm
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onCorrect(data)}
          disabled={isConfirming || isCancelling}
          aria-label="Edit or Correct Transaction"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Correct
        </button>

        <button
          type="button"
          className="btn btn-danger-outline"
          onClick={() => onCancel(actualId)}
          disabled={isConfirming || isCancelling}
          title="Cancel Transaction"
          aria-label="Cancel Transaction"
        >
          {isCancelling ? (
            '...'
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
