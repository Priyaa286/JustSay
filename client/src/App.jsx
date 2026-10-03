import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import VoiceRecorder from './components/VoiceRecorder';
import PendingTransactionCard from './components/PendingTransactionCard';
import ClarifyCard from './components/ClarifyCard';
import CorrectionModal from './components/CorrectionModal';
import NewCustomerCard from './components/NewCustomerCard';
import api from './services/api';

export default function App() {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [clarifyData, setClarifyData] = useState(null);
  const [newCustomerData, setNewCustomerData] = useState(null);
  const [confirmedData, setConfirmedData] = useState(null);
  const [cancelledMessage, setCancelledMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        await api.checkHealth();
        if (isMounted) setIsOnline(true);
      } catch (err) {
        if (isMounted) setIsOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handler for voice processing result
  const handleVoiceProcessed = (data) => {
    setErrorMessage(null);
    setConfirmedData(null);
    setCancelledMessage(null);

    if (data.status === 'PENDING') {
      setPendingData(data);
      setClarifyData(null);
      setNewCustomerData(null);
    } else if (data.status === 'CLARIFY') {
      setClarifyData(data);
      setPendingData(null);
      setNewCustomerData(null);
    } else if (data.status === 'NEW_CUSTOMER_DETECTED') {
      setNewCustomerData(data);
      setPendingData(null);
      setClarifyData(null);
    } else {
      // Fallback
      setPendingData(data);
      setClarifyData(null);
      setNewCustomerData(null);
    }
  };

  // Handler for confirmation
  const handleConfirm = async (transactionId) => {
    if (!transactionId) return;
    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmTransaction(transactionId);
      setConfirmedData(res.data);
      setPendingData(null);
    } catch (err) {
      console.error('Confirmation error:', err);
      setErrorMessage(err.message || 'Failed to confirm transaction. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Handler for cancellation
  const handleCancel = async (transactionId) => {
    if (!transactionId) return;
    setIsCancelling(true);
    setErrorMessage(null);

    try {
      await api.cancelTransaction(transactionId);
      setCancelledMessage('Transaction was cancelled. No changes made to ledger.');
      setPendingData(null);
    } catch (err) {
      console.error('Cancellation error:', err);
      setErrorMessage(err.message || 'Failed to cancel transaction.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCreateCustomer = async (customerName) => {
    setIsCreatingCustomer(true);
    setErrorMessage(null);
    try {
      const createRes = await api.createCustomer({ name: customerName });
      const newCustomer = createRes.data;
      const { extraction, transcript } = newCustomerData;

      const prepRes = await api.prepareTransaction({
        customerId: newCustomer.id,
        item: extraction.item,
        quantity: extraction.quantity,
        amount: extraction.amount,
        type: extraction.transactionType,
        transcript: transcript
      });

      const pendingTx = prepRes.data;
      
      setPendingData({
        status: 'PENDING',
        transactionId: pendingTx.id,
        transcript: transcript,
        extraction: extraction,
        customer: {
          id: newCustomer.id,
          name: newCustomer.name,
          nickname: newCustomer.nickname,
          balancePaise: newCustomer.balance,
          balanceRupees: newCustomer.balance / 100
        },
        transaction: pendingTx
      });
      setNewCustomerData(null);
    } catch (err) {
      console.error('Create customer error:', err);
      setErrorMessage(err.message || 'Failed to create customer.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleResetFlow = () => {
    setPendingData(null);
    setClarifyData(null);
    setNewCustomerData(null);
    setConfirmedData(null);
    setCancelledMessage(null);
    setErrorMessage(null);
  };

  return (
    <>
      <Header isOnline={isOnline} />

      <main className="app-main">
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="error-banner">
            <span>⚠️ {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        {/* Cancellation Message Banner */}
        {cancelledMessage && !pendingData && !confirmedData && (
          <div className="card" style={{ background: '#F8FAFC', borderColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
              ✕ {cancelledMessage}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleResetFlow}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Confirmed Success Card */}
        {confirmedData && !pendingData && (
          <div className="success-card">
            <div className="success-icon-badge">✓</div>
            <div className="success-title">Transaction Confirmed!</div>
            <p style={{ fontSize: '14px', color: '#065F46', margin: '-4px 0 4px' }}>
              Successfully recorded in the customer ledger.
            </p>

            {confirmedData.customer && (
              <div className="balance-pill">
                {confirmedData.customer.name}&apos;s Updated Balance:{' '}
                <strong>₹{(confirmedData.customer.balance / 100).toFixed(2)}</strong>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '12px', width: '100%' }}
              onClick={handleResetFlow}
            >
              🎙️ Record Next Transaction
            </button>
          </div>
        )}

        {/* Clarify Needed Card */}
        {clarifyData && !pendingData && !confirmedData && !newCustomerData && (
          <ClarifyCard
            data={clarifyData}
            onDismiss={() => setClarifyData(null)}
          />
        )}

        {/* New Customer Detected Card */}
        {newCustomerData && !pendingData && !confirmedData && (
          <NewCustomerCard
            data={newCustomerData}
            isCreating={isCreatingCustomer}
            onCreate={handleCreateCustomer}
            onCancel={() => {
              setNewCustomerData(null);
              setCancelledMessage('Transaction was cancelled. No changes made.');
            }}
          />
        )}

        {/* Pending Transaction Review Card */}
        {pendingData && (
          <PendingTransactionCard
            data={pendingData}
            onConfirm={handleConfirm}
            onCorrect={() => setIsCorrectionOpen(true)}
            onCancel={handleCancel}
            isConfirming={isConfirming}
            isCancelling={isCancelling}
          />
        )}

        {/* Voice Recording Interaction */}
        <VoiceRecorder
          onVoiceProcessed={handleVoiceProcessed}
          onError={(err) => setErrorMessage(err)}
          disabled={isConfirming || isCancelling || isCreatingCustomer}
        />
      </main>

      {/* Inline Correction Drawer / Modal */}
      <CorrectionModal
        isOpen={isCorrectionOpen}
        data={pendingData}
        onClose={() => setIsCorrectionOpen(false)}
        onCorrectionComplete={(updatedPending) => {
          setPendingData(updatedPending);
          setErrorMessage(null);
        }}
        onError={(err) => setErrorMessage(err)}
      />
    </>
  );
}
