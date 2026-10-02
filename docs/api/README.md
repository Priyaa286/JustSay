# JustSay Backend API Documentation

Welcome to the backend API specification for **JustSay** — a voice-first AI ledger for Indian street vendors and small shopkeepers.

## Key Financial Rule: Money Representation

> **IMPORTANT:** To prevent floating-point rounding errors, all monetary amounts (`amount`, `balance`, `balancePaise`) in the API are represented as **INTEGERS IN PAISE** (1 Rupee = 100 Paise).

- **₹50.00** → `5000` paise
- **₹20.00** → `2000` paise
- **₹10.50** → `1050` paise

Frontend displays should divide `balancePaise` by `100` to show Indian Rupees (₹).

---

## Transaction Confirmation Workflow

```
[Voice Input / Speech] 
       │
       ▼
[AI Extraction Layer] 
       │
       ▼
POST /api/ledger/prepare ──► Creates unconfirmed transaction (confirmed = false)
                               │ (Customer balance is NOT changed)
                               ▼
                    [Human Confirmation UI]
                               │
                       ┌───────┴───────┐
                       ▼               ▼
        POST /api/ledger/:id/confirm   POST /api/ledger/:id/cancel
                       │               │
      Atomically updates balance &     Deletes unconfirmed transaction
      marks transaction confirmed      (No balance impact)
```

---

## Endpoints Summary

### 1. Health Check

#### `GET /api/health`
Returns the status of the server.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "JustSay backend is running"
}
```

---

### 2. Customers API

#### `GET /api/customers`
Retrieves a list of all registered customers sorted alphabetically by name.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Customers retrieved successfully",
  "data": [
    {
      "id": "63b5654a-e644-48d0-886e-ac4320e7b31d",
      "name": "Ravi",
      "nickname": "Ravi anna",
      "balance": 3000,
      "createdAt": "2026-10-02T11:42:55.000Z",
      "updatedAt": "2026-10-02T11:50:00.000Z"
    }
  ]
}
```

---

#### `GET /api/customers/:id`
Retrieves details for a specific customer by ID.

- **Parameters**: `id` (UUID string)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Customer retrieved successfully",
  "data": {
    "id": "63b5654a-e644-48d0-886e-ac4320e7b31d",
    "name": "Ravi",
    "nickname": "Ravi anna",
    "balance": 3000,
    "createdAt": "2026-10-02T11:42:55.000Z",
    "updatedAt": "2026-10-02T11:50:00.000Z"
  }
}
```
- **Response `404 Not Found`**:
```json
{
  "success": false,
  "message": "Customer with ID 63b5654a-... not found"
}
```

---

#### `POST /api/customers`
Creates a new customer. The balance is automatically initialized to `0` paise.

- **Request Body**:
```json
{
  "name": "Test Customer",
  "nickname": "Test"
}
```
- **Validation Rules**:
  - `name`: Required non-empty string.
  - `nickname`: Optional string.
  - Unsafe / unexpected properties like `balance` or `id` in body are rejected (`400 Bad Request`).

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "7a6a23eb-407a-4ad2-ba50-2f437cbbfbe3",
    "name": "Test Customer",
    "nickname": "Test",
    "balance": 0,
    "createdAt": "2026-10-02T12:00:00.000Z",
    "updatedAt": "2026-10-02T12:00:00.000Z"
  }
}
```

---

### 3. Ledger API

#### `POST /api/ledger/prepare`
Prepares an unconfirmed transaction extracted by AI or drafted by the user.

- **Request Body**:
```json
{
  "customerId": "63b5654a-e644-48d0-886e-ac4320e7b31d",
  "item": "Apples 1kg",
  "quantity": "1kg",
  "amount": 5000,
  "type": "CREDIT",
  "transcript": "Ravi took 1kg apples for 50 rupees"
}
```
- **Validation & Rules**:
  - `customerId`: Required valid string.
  - `amount`: Required positive integer in paise (e.g. `5000` = ₹50).
  - `type`: Must be `"CREDIT"` (goods taken/credit added, customer balance increases) or `"PAYMENT"` (cash paid by customer, customer balance decreases).
  - The created transaction has `confirmed: false`.
  - **Does NOT modify customer balance.**

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Transaction prepared successfully",
  "data": {
    "id": "7f70346b-d9af-444d-85da-21ac22f5bf4e",
    "customerId": "63b5654a-e644-48d0-886e-ac4320e7b31d",
    "item": "Apples 1kg",
    "quantity": "1kg",
    "amount": 5000,
    "type": "CREDIT",
    "transcript": "Ravi took 1kg apples for 50 rupees",
    "confirmed": false,
    "createdAt": "2026-10-02T12:01:00.000Z"
  }
}
```

---

#### `POST /api/ledger/:transactionId/confirm`
Confirms a prepared transaction after human review.

- **Behavior**:
  - Atomically marks the transaction as `confirmed: true`.
  - Updates customer balance (`CREDIT` increases balance; `PAYMENT` decreases balance).
  - **Idempotent**: If called multiple times on an already-confirmed transaction, it returns success without double-counting balance.

- **Response `200 OK` (First confirmation)**:
```json
{
  "success": true,
  "message": "Transaction confirmed successfully",
  "data": {
    "alreadyConfirmed": false,
    "transaction": {
      "id": "7f70346b-d9af-444d-85da-21ac22f5bf4e",
      "confirmed": true
    },
    "customer": {
      "id": "63b5654a-e644-48d0-886e-ac4320e7b31d",
      "name": "Ravi",
      "balance": 5000
    }
  }
}
```
- **Response `200 OK` (Duplicate confirmation attempt)**:
```json
{
  "success": true,
  "message": "Transaction has already been confirmed",
  "data": {
    "id": "7f70346b-d9af-444d-85da-21ac22f5bf4e",
    "confirmed": true
  }
}
```

---

#### `POST /api/ledger/:transactionId/cancel`
Cancels an unconfirmed draft transaction.

- **Behavior**:
  - Deletes the unconfirmed transaction.
  - Unconfirmed transactions have no balance impact.
  - **Rule**: Confirmed transactions cannot be cancelled via this endpoint (`400 Bad Request`).

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Unconfirmed transaction 7f70346b-... successfully cancelled.",
  "data": null
}
```

---

#### `GET /api/ledger`
Returns all confirmed ledger transactions across all customers.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Confirmed ledger transactions retrieved successfully",
  "data": [
    {
      "id": "7f70346b-d9af-444d-85da-21ac22f5bf4e",
      "customerId": "63b5654a-e644-48d0-886e-ac4320e7b31d",
      "item": "Apples 1kg",
      "amount": 5000,
      "type": "CREDIT",
      "confirmed": true,
      "customer": {
        "id": "63b5654a-e644-48d0-886e-ac4320e7b31d",
        "name": "Ravi",
        "nickname": "Ravi anna"
      }
    }
  ]
}
```

---

#### `GET /api/ledger/:customerId`
Returns a customer's profile, calculated balance, and all confirmed transactions.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Customer ledger retrieved successfully",
  "data": {
    "customer": {
      "id": "63b5654a-e644-48d0-886e-ac4320e7b31d",
      "name": "Ravi",
      "nickname": "Ravi anna",
      "balancePaise": 3000,
      "balanceRupees": 30,
      "createdAt": "2026-10-02T11:42:55.000Z",
      "updatedAt": "2026-10-02T11:50:00.000Z"
    },
    "transactions": [
      {
        "id": "b176ba6c-a3c3-45e5-86d8-05fafdfc5c89",
        "item": null,
        "amount": 2000,
        "type": "PAYMENT",
        "confirmed": true,
        "createdAt": "2026-10-02T11:48:00.000Z"
      },
      {
        "id": "7f70346b-d9af-444d-85da-21ac22f5bf4e",
        "item": "Apples 1kg",
        "amount": 5000,
        "type": "CREDIT",
        "confirmed": true,
        "createdAt": "2026-10-02T11:45:00.000Z"
      }
    ]
  }
}
```

---

### 4. Speech-to-Text Transcription API

#### `POST /api/transcribe`
Transcribes audio recordings of vendor speech into Tamil / Tanglish text using Groq Whisper-large-v3.

- **Request Format**: `multipart/form-data`
- **Field Name**: `audio`
- **Supported Formats**: `.webm`, `.wav`, `.mp3`, `.m4a`, `.mp4`, `.mpeg`, `.mpga`, `.ogg`, `.flac`
- **Size Limit**: 25 MB max

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Audio transcribed successfully",
  "data": {
    "transcript": "Ravi ku 50 rupees paal packet add pannu"
  }
}
```

- **Error Responses**:
  - `400 Bad Request`: Missing audio field, unsupported format, or file exceeding 25 MB limit.
  - `500 Internal Server Error`: Groq API error or missing server API key.

