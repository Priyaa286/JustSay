import './style.css';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// State
let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let recordingSeconds = 0;
let currentPendingTransaction = null;

// DOM Elements
const views = {
  dashboard: document.getElementById('view-dashboard'),
  recording: document.getElementById('view-recording'),
  processing: document.getElementById('view-processing'),
  confirmation: document.getElementById('view-confirmation'),
  clarify: document.getElementById('view-clarify'),
  ledger: document.getElementById('view-ledger'),
  customers: document.getElementById('view-customers')
};

// Formatting utilities
const formatCurrency = (amountInPaise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amountInPaise / 100);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Navigation
function navigateTo(viewId) {
  Object.values(views).forEach(view => {
    view.classList.remove('active');
  });
  views[viewId.replace('view-', '')].classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === viewId);
  });

  // Load data based on view
  if (viewId === 'view-dashboard') loadDashboard();
  if (viewId === 'view-ledger') loadLedger();
  if (viewId === 'view-customers') loadCustomers();
}

// Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Check Backend Health
async function checkHealth() {
  const indicator = document.getElementById('connection-status');
  try {
    const res = await fetch(`${API_URL}/health`);
    if (res.ok) {
      indicator.classList.remove('offline');
    } else {
      indicator.classList.add('offline');
    }
  } catch (error) {
    indicator.classList.add('offline');
  }
}

// API Calls
async function loadDashboard() {
  try {
    const [ledgerRes, customersRes] = await Promise.all([
      fetch(`${API_URL}/ledger`),
      fetch(`${API_URL}/customers`)
    ]);
    
    if (!ledgerRes.ok || !customersRes.ok) throw new Error('Failed to fetch dashboard data');
    
    const { data: { transactions } } = await ledgerRes.json();
    const { data: { customers } } = await customersRes.json();

    // Calculate total outstanding (Sum of all customer balances)
    const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);
    document.getElementById('dashboard-total-balance').textContent = formatCurrency(Math.abs(totalBalance));

    // Render recent transactions (limit 5)
    const recentList = document.getElementById('dashboard-recent-list');
    recentList.innerHTML = '';
    
    const recentTx = transactions
      .filter(tx => tx.status === 'CONFIRMED')
      .slice(0, 5);

    if (recentTx.length === 0) {
      recentList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No recent transactions</p>';
    } else {
      recentTx.forEach(tx => {
        recentList.appendChild(createTransactionEl(tx));
      });
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

async function loadLedger() {
  try {
    const res = await fetch(`${API_URL}/ledger`);
    if (!res.ok) throw new Error('Failed to load ledger');
    const { data: { transactions } } = await res.json();
    
    const ledgerList = document.getElementById('ledger-list');
    ledgerList.innerHTML = '';
    
    const confirmedTx = transactions.filter(tx => tx.status === 'CONFIRMED');
    
    if (confirmedTx.length === 0) {
      ledgerList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No confirmed transactions</p>';
    } else {
      confirmedTx.forEach(tx => {
        ledgerList.appendChild(createTransactionEl(tx));
      });
    }
  } catch (error) {
    showToast('Failed to load ledger', 'error');
  }
}

async function loadCustomers() {
  try {
    const res = await fetch(`${API_URL}/customers`);
    if (!res.ok) throw new Error('Failed to load customers');
    const { data: { customers } } = await res.json();
    
    const customerList = document.getElementById('customer-list');
    customerList.innerHTML = '';
    
    if (customers.length === 0) {
      customerList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No customers found</p>';
    } else {
      customers.forEach(customer => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `
          <div class="item-main">
            <span class="item-title">${customer.name}</span>
            ${customer.nickname ? `<span class="item-subtitle">Also known as: ${customer.nickname}</span>` : ''}
          </div>
          <span class="item-amount ${customer.balance > 0 ? 'credit' : ''}">
            ${formatCurrency(customer.balance)}
          </span>
        `;
        customerList.appendChild(el);
      });
    }
  } catch (error) {
    showToast('Failed to load customers', 'error');
  }
}

function createTransactionEl(tx) {
  const el = document.createElement('div');
  el.className = 'list-item';
  const isCredit = tx.type === 'CREDIT';
  el.innerHTML = `
    <div class="item-main">
      <span class="item-title">${tx.customer.name}</span>
      <span class="item-subtitle">${tx.item} × ${tx.quantity} • ${formatDate(tx.createdAt)}</span>
    </div>
    <span class="item-amount ${isCredit ? 'credit' : 'payment'}">
      ${isCredit ? '-' : '+'}${formatCurrency(tx.amount)}
    </span>
  `;
  return el;
}

// Voice Recording Logic
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Use an appropriate mime type
    const options = { mimeType: 'audio/webm' };
    mediaRecorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm') ? options : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = processAudio;

    mediaRecorder.start();
    
    // UI Updates
    recordingSeconds = 0;
    updateRecordingTime();
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      updateRecordingTime();
    }, 1000);
    
    navigateTo('view-recording');
  } catch (error) {
    console.error('Microphone error:', error);
    showToast('Microphone access denied or not available', 'error');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    clearInterval(recordingTimer);
  }
}

function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null; // Prevent processing
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    clearInterval(recordingTimer);
  }
  navigateTo('view-dashboard');
}

function updateRecordingTime() {
  const mins = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
  const secs = (recordingSeconds % 60).toString().padStart(2, '0');
  document.getElementById('recording-time').textContent = `${mins}:${secs}`;
}

async function processAudio() {
  navigateTo('view-processing');
  
  const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  try {
    const response = await fetch(`${API_URL}/voice`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Server error');
    }

    const { status, data } = result;

    if (status === 'PENDING') {
      showConfirmation(data);
    } else if (status === 'CLARIFY') {
      showClarification(data);
    } else {
      throw new Error('Unexpected response status');
    }
  } catch (error) {
    console.error('Processing error:', error);
    showToast(error.message || 'Failed to process audio', 'error');
    navigateTo('view-dashboard');
  }
}

// Confirmation UI
function showConfirmation(data) {
  currentPendingTransaction = data.transaction;
  
  document.getElementById('confirm-customer').textContent = data.transaction.customer.name;
  document.getElementById('confirm-item').textContent = data.transaction.item;
  document.getElementById('confirm-quantity').textContent = data.transaction.quantity;
  document.getElementById('confirm-amount').textContent = formatCurrency(data.transaction.amount);
  
  const typeEl = document.getElementById('confirm-type');
  typeEl.textContent = data.transaction.type;
  typeEl.className = `value type-badge ${data.transaction.type.toLowerCase()}`;
  
  document.getElementById('confirm-transcript').textContent = `"${data.transcript}"`;
  
  navigateTo('view-confirmation');
}

async function confirmTransaction() {
  if (!currentPendingTransaction) return;
  
  const btn = document.getElementById('btn-confirm-tx');
  btn.disabled = true;
  btn.textContent = 'Confirming...';

  try {
    const res = await fetch(`${API_URL}/ledger/${currentPendingTransaction.id}/confirm`, {
      method: 'POST'
    });
    
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error?.message || 'Failed to confirm');
    }

    showToast('Transaction confirmed successfully!');
    currentPendingTransaction = null;
    navigateTo('view-dashboard');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm';
  }
}

async function cancelTransaction() {
  if (!currentPendingTransaction) {
    navigateTo('view-dashboard');
    return;
  }

  const btn = document.getElementById('btn-cancel-tx');
  btn.disabled = true;
  
  try {
    const res = await fetch(`${API_URL}/ledger/${currentPendingTransaction.id}/cancel`, {
      method: 'POST'
    });
    
    if (!res.ok) throw new Error('Failed to cancel');
    
    showToast('Transaction cancelled');
  } catch (error) {
    console.error(error);
  } finally {
    currentPendingTransaction = null;
    btn.disabled = false;
    navigateTo('view-dashboard');
  }
}

// Clarification UI
function showClarification(data) {
  document.getElementById('clarify-reason').textContent = data.clarificationReason;
  document.getElementById('clarify-transcript').textContent = `"${data.transcript}"`;
  navigateTo('view-clarify');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.target));
  });

  // Recording
  document.getElementById('btn-start-record').addEventListener('click', startRecording);
  document.getElementById('btn-stop-record').addEventListener('click', stopRecording);
  document.getElementById('btn-cancel-record').addEventListener('click', cancelRecording);

  // Confirmation
  document.getElementById('btn-confirm-tx').addEventListener('click', confirmTransaction);
  document.getElementById('btn-cancel-tx').addEventListener('click', cancelTransaction);

  // Clarification
  document.getElementById('btn-retry-record').addEventListener('click', () => {
    navigateTo('view-dashboard');
    setTimeout(startRecording, 300);
  });
  document.getElementById('btn-cancel-clarify').addEventListener('click', () => navigateTo('view-dashboard'));

  // Initial Load
  checkHealth();
  setInterval(checkHealth, 30000);
  loadDashboard();
});
