import React, { useState } from 'react';
import api from '../services/api';

export default function CorrectionModal({
  isOpen,
  data,
  onClose,
  onCorrectionComplete,
  onError
}) {
  if (!isOpen || !data) return null;

  const initialPerson = data.customer?.name || data.extraction?.person || '';
  const initialAmount = data.extraction?.amount ?? (data.transaction?.amount ? data.transaction.amount / 100 : '');
  const initialType = data.transaction?.type || data.extraction?.transactionType || 'CREDIT';
  const initialItem = data.transaction?.item || data.extraction?.item || '';

  const [person, setPerson] = useState(initialPerson);
  const [amount, setAmount] = useState(initialAmount);
  const [type, setType] = useState(initialType);
  const [item, setItem] = useState(initialItem);
  const [spokenCorrection, setSpokenCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingVoiceCorrection, setIsApplyingVoiceCorrection] = useState(false);

  // Conversational AI correction
  const handleConversationalCorrection = async (e) => {
    e.preventDefault();
    if (!spokenCorrection.trim()) return;

    setIsApplyingVoiceCorrection(true);
    try {
      const currentDraft = {
        person,
        amount: Number(amount) || null,
        transactionType: type,
        item: item || null
      };

      const result = await api.correctVoiceTransaction(currentDraft, spokenCorrection);
      const corrected = result.data?.correctedDraft;

      if (corrected) {
        if (corrected.person) setPerson(corrected.person);
        if (corrected.amount) setAmount(corrected.amount);
        if (corrected.transactionType) setType(corrected.transactionType);
        if (corrected.item) setItem(corrected.item);
        setSpokenCorrection('');
      }
    } catch (err) {
      console.error('Correction AI error:', err);
      if (onError) onError(err.message || 'Failed to apply conversational correction.');
    } finally {
      setIsApplyingVoiceCorrection(false);
    }
  };

  // Save changes by updating the pending transaction
  const handleSave = async (e) => {
    e.preventDefault();
    if (!person.trim()) {
      if (onError) onError('Customer name is required.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (onError) onError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const oldTxId = data.transactionId || data.transaction?.id;

      // 1. Cancel previous pending transaction if it exists in DB
      if (oldTxId) {
        try {
          await api.cancelTransaction(oldTxId);
        } catch (cancelErr) {
          console.warn('Could not cancel previous pending transaction:', cancelErr.message);
        }
      }

      // 2. Prepare new pending transaction with corrected values
      const preparedRes = await api.prepareTransaction({
        person: person.trim(),
        amount: numAmount,
        type,
        item: item.trim() || undefined,
        transcript: data.transcript ? `(Corrected) ${data.transcript}` : undefined
      });

      const newTx = preparedRes.data;

      // 3. Notify parent with the new pending transaction
      onCorrectionComplete({
        status: 'PENDING',
        transactionId: newTx.id,
        transcript: newTx.transcript || data.transcript,
        extraction: {
          person: person.trim(),
          amount: numAmount,
          transactionType: type,
          item: item.trim() || null
        },
        customer: {
          id: newTx.customerId,
          name: person.trim(),
          balancePaise: 0,
          balanceRupees: 0
        },
        transaction: newTx
      });

      onClose();
    } catch (err) {
      console.error('Save correction error:', err);
      if (onError) onError(err.message || 'Failed to save correction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Correct Transaction (மாற்றம் செய்)</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Conversational Correction Input */}
        <form onSubmit={handleConversationalCorrection} style={{ marginBottom: '18px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Say or type correction:</span>
            <span style={{ fontSize: '11px', color: 'var(--primary-terracotta)', fontWeight: 'normal' }}>
              (e.g., &ldquo;No 500 illa, 50 rupees&rdquo;)
            </span>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="form-input"
              value={spokenCorrection}
              onChange={(e) => setSpokenCorrection(e.target.value)}
              placeholder="e.g., Suresh 200 tea"
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isApplyingVoiceCorrection || !spokenCorrection.trim()}
              style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '13px' }}
            >
              {isApplyingVoiceCorrection ? '...' : 'Apply'}
            </button>
          </div>
        </form>

        <hr style={{ border: 'none', borderTop: '1px dashed var(--border-cream)', margin: '14px 0' }} />

        {/* Manual Edit Fields */}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="CREDIT">CREDIT (கடன்)</option>
                <option value="PAYMENT">PAYMENT (வரவு)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Item / Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Milk, Rice 1kg"
            />
          </div>

          <div className="action-buttons" style={{ marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : '✓ Update & Review'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
