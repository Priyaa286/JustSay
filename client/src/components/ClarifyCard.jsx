import React from 'react';

export default function ClarifyCard({ data, onDismiss }) {
  if (!data) return null;

  const { clarificationReason, transcript, extraction } = data;

  return (
    <div className="clarify-card">
      <div className="clarify-header">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Need More Information (விவரம் தேவை)</span>
      </div>

      <div className="clarify-message">
        {clarificationReason || 'Transaction details are incomplete or ambiguous. Please mention the customer name, amount, and whether it is credit or payment.'}
      </div>

      {transcript && (
        <div className="transcript-box" style={{ background: '#FFF7ED', borderColor: '#F59E0B' }}>
          <span className="transcript-label" style={{ color: '#D97706' }}>What we heard:</span>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {extraction && extraction.person && !extraction.amount && (
        <div style={{ fontSize: '12px', color: '#B45309', fontWeight: 600 }}>
          💡 Tip: Say how much {extraction.person} owes or paid, e.g. &ldquo;{extraction.person} ku 50 rupees&rdquo;
        </div>
      )}

      <div style={{ marginTop: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', borderColor: '#FCD34D' }}
          onClick={onDismiss}
        >
          🎙️ Tap to Speak Again
        </button>
      </div>
    </div>
  );
}
