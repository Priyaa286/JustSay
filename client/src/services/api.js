/**
 * JustSay API Service Layer
 * Centralized API client for communicating with the backend Express server.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Helper to construct full API endpoint URLs
 */
const endpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
};

/**
 * Handle API responses and standardized error messages
 */
async function handleResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
    }
    return { success: true };
  }

  if (!response.ok || (json && json.success === false)) {
    const errorMsg = json?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = json;
    throw error;
  }

  return json;
}

export const api = {
  /**
   * Health check to ensure backend is accessible
   */
  async checkHealth() {
    const res = await fetch(endpoint('/api/health'));
    return handleResponse(res);
  },

  /**
   * Sends recorded audio blob to the backend voice pipeline
   * @param {Blob} audioBlob - Audio recording blob (e.g. audio/webm or audio/wav)
   * @param {string} [filename='recording.webm'] - Name of uploaded file
   * @returns {Promise<object>} Result containing status ('PENDING' | 'CLARIFY'), extraction, customer, transaction
   */
  async processVoice(audioBlob, filename = 'recording.webm') {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    const res = await fetch(endpoint('/api/voice'), {
      method: 'POST',
      body: formData
    });
    return handleResponse(res);
  },

  /**
   * Confirms a PENDING transaction atomically in the ledger
   * @param {string} transactionId - UUID of the transaction to confirm
   */
  async confirmTransaction(transactionId) {
    const res = await fetch(endpoint(`/api/ledger/${transactionId}/confirm`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  /**
   * Cancels an unconfirmed PENDING transaction
   * @param {string} transactionId - UUID of the transaction to cancel
   */
  async cancelTransaction(transactionId) {
    const res = await fetch(endpoint(`/api/ledger/${transactionId}/cancel`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  /**
   * Applies conversational correction to an existing transaction draft
   * @param {object} currentDraft - Existing extracted draft object
   * @param {string} correctionTranscript - Voice or text correction
   */
  async correctVoiceTransaction(currentDraft, correctionTranscript) {
    const res = await fetch(endpoint('/api/voice/correct'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDraft, correctionTranscript })
    });
    return handleResponse(res);
  },

  /**
   * Manually prepares a transaction (useful for manual edits / corrections)
   */
  async prepareTransaction(payload) {
    const res = await fetch(endpoint('/api/ledger/prepare'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  /**
   * Retrieves all registered customers
   */
  async getCustomers() {
    const res = await fetch(endpoint('/api/customers'));
    return handleResponse(res);
  },

  /**
   * Retrieves customer profile, balance and confirmed transaction history
   * @param {string} customerId
   */
  async getCustomerLedger(customerId) {
    const res = await fetch(endpoint(`/api/ledger/${customerId}`));
    return handleResponse(res);
  },

  /**
   * Retrieves all confirmed ledger transactions across all customers
   */
  async getAllLedger() {
    const res = await fetch(endpoint('/api/ledger'));
    return handleResponse(res);
  },

  /**
   * Creates a new customer
   * @param {object} payload - { name: string, nickname?: string }
   */
  async createCustomer(payload) {
    const res = await fetch(endpoint('/api/customers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  }
};

export default api;
