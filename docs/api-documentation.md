# DocuChain API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require session-based authentication. Sessions are maintained through cookies.

---

## Authentication Endpoints

### POST /register
Register a new user and create an Ethereum wallet.

**Request Body:**
```json
{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "walletAddress": "0x...",
  "notice": "IMPORTANT: Fund this wallet with Sepolia ETH from faucet"
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Username or email already exists"
}
```

### POST /login
Authenticate user and create session.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "walletAddress": "0x..."
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### POST /logout
End user session.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /current-user
Get current authenticated user information.

**Response Success (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "walletAddress": "0x..."
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "error": "Not authenticated"
}
```

### GET /users
Get all users except current user (for sharing).

**Response Success (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "username": "bob",
      "email": "bob@example.com",
      "walletAddress": "0x..."
    }
  ]
}
```

---

## Document Endpoints

### POST /upload-to-ipfs
Upload file to IPFS via Pinata.

**Request:** Multipart form data
```
file: [File object]
```

**Response Success (200):**
```json
{
  "success": true,
  "ipfsHash": "QmX...",
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmX...",
  "fileName": "document.pdf"
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "No file provided"
}
```

### POST /upload-document
Record document metadata on blockchain.

**Request Body:**
```json
{
  "ipfsHash": "QmX...",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "documentType": "pdf"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "documentId": "0x...",
  "blockNumber": 123456
}
```

**Response Error (500):**
```json
{
  "success": false,
  "error": "Insufficient funds for gas"
}
```

### GET /my-documents
Get all documents owned by current user.

**Response Success (200):**
```json
{
  "success": true,
  "documents": [
    {
      "documentId": "0x...",
      "ipfsHash": "QmX...",
      "owner": "0x...",
      "timestamp": 1634567890,
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "isActive": true,
      "documentType": "pdf",
      "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmX..."
    }
  ],
  "count": 1
}
```

### GET /shared-documents
Get all documents shared with current user.

**Response Success (200):**
```json
{
  "success": true,
  "documents": [
    {
      "documentId": "0x...",
      "ipfsHash": "QmY...",
      "owner": "0x...",
      "timestamp": 1634567890,
      "fileName": "shared-doc.pdf",
      "fileSize": 2048000,
      "isActive": true,
      "documentType": "pdf",
      "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmY..."
    }
  ],
  "count": 1
}
```

### POST /share-document
Share document with another user.

**Request Body:**
```json
{
  "documentId": "0x...",
  "shareWith": "0x...",
  "permission": "read"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 123457
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

## Utility Endpoints

### GET /health
Check server and blockchain connectivity status.

**Response Success (200):**
```json
{
  "status": "healthy",
  "blockchain_connected": true,
  "contract_address": "0x8FA367e26E1c9f303c9e87c32d595d02679BA621",
  "network": "Sepolia"
}
```

**Response Error (500):**
```json
{
  "status": "unhealthy",
  "error": "Connection failed"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Frontend Integration Examples

### Upload Document Flow
```javascript
// Step 1: Upload to IPFS
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const ipfsResponse = await fetch('/api/upload-to-ipfs', {
    method: 'POST',
    credentials: 'include',
    body: formData
});

const ipfsData = await ipfsResponse.json();

// Step 2: Record on blockchain
const blockchainResponse = await fetch('/api/upload-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        ipfsHash: ipfsData.ipfsHash,
        fileName: file.name,
        fileSize: file.size,
        documentType: 'pdf'
    })
});
```

### Authentication Flow
```javascript
// Login
const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
});

// Check auth status
const authResponse = await fetch('/api/current-user', {
    credentials: 'include'
});
```

---

## Rate Limits
- No specific rate limits implemented
- Limited by Pinata API limits (100MB file size on free plan)
- Limited by Ethereum gas costs and network congestion

---

## Security Notes
- All sensitive operations require authentication
- Private keys are stored encrypted in database
- CORS enabled for cross-origin requests
- Session management via secure cookies
- File uploads are validated and sanitized