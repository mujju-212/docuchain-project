# Complete Documentation for DocuChain Development

## Project Overview
A blockchain-based document management system where users can upload documents to IPFS, store metadata on Ethereum blockchain, and share documents with other users securely.

---

## 1. PROJECT STRUCTURE

```
docuchain-project/
│
├── backend/
│   ├── venv/                      # Virtual environment
│   ├── app.py                     # Flask backend server
│   ├── .env                       # Environment variables
│   ├── requirements.txt           # Python dependencies
│   └── database.db                # SQLite database (auto-created)
│
├── frontend/
│   ├── index.html                 # Login page
│   ├── register.html              # Registration page
│   ├── dashboard.html             # Main dashboard
│   ├── styles.css                 # Global styles
│   └── app.js                     # Frontend logic
│
├── smart-contract/
│   └── DocumentManager.sol        # Solidity smart contract
│
└── docs/
    ├── setup.md                   # This file
    └── api-documentation.md       # API endpoints
```

---

## 2. PREREQUISITES CHECKLIST

### ✅ Required Accounts & Keys

1. **MetaMask Wallet**
   - Installed browser extension
   - Wallet address: `0x...`
   - Private key: (Keep secret!)
   - Network: Sepolia Testnet
   - Balance: At least 0.5 test ETH

2. **Pinata Account**
   - API Key: `dad9bf18935787b34571`
   - Secret Key: `6ec266b4589eaedee1381f8666a808c787340a3e261bdb1ed20b0a641af0d657`
   - Dashboard: https://app.pinata.cloud/

3. **Infura/Public RPC**
   - RPC URL: `https://sepolia.infura.io/v3/4e188ff9085f403fb969dffb8e003577`

4. **Smart Contract**
   - Deployed Address: `0x8FA367e26E1c9f303c9e87c32d595d02679BA621`
   - Network: Sepolia
   - Explorer: https://sepolia.etherscan.io/

---

## 3. SETUP INSTRUCTIONS

### 3.1 Backend Setup

```bash
# Navigate to backend directory
cd docuchain-project/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python app.py
```

**Expected Output:**
```
============================================================
🚀 DocuChain Backend Server Starting...
📍 Contract Address: 0x8FA367e26E1c9f303c9e87c32d595d02679BA621
🌐 Network: Sepolia Testnet
🔗 RPC URL: https://sepolia.infura.io/v3/4e188ff9085f403fb969dffb8e003577
✅ Blockchain Connected: True
📊 Database: Initialized
============================================================
 * Running on http://0.0.0.0:5000
```

### 3.2 Frontend Setup

```bash
# Navigate to frontend directory
cd docuchain-project/frontend

# If using VS Code, install "Live Server" extension
# Right-click on index.html → Open with Live Server

# Or use Python's built-in server:
python -m http.server 8000

# Access at: http://localhost:8000
```

---

## 4. TESTING WORKFLOW

### Step 1: Register Two Users

1. Open browser: `http://localhost:8000/register.html`
2. Register **User 1**:
   - Username: `alice`
   - Email: `alice@example.com`
   - Password: `password123`
3. **IMPORTANT**: Copy the wallet address shown
4. Go to [Sepolia Faucet](https://sepoliafaucet.com) and get test ETH
5. Wait 2-3 minutes for ETH to arrive

6. Register **User 2**:
   - Username: `bob`
   - Email: `bob@example.com`
   - Password: `password123`
7. Copy wallet address and fund with test ETH

### Step 2: Login as User 1 (Alice)

1. Go to `http://localhost:8000/index.html`
2. Login with:
   - Username: `alice`
   - Password: `password123`
3. You'll be redirected to dashboard

### Step 3: Upload Document

1. Click "📤 Upload Document"
2. Select a file (PDF, image, or any document)
3. Choose document type
4. Click "Upload to Blockchain"
5. Wait 15-30 seconds for transaction confirmation
6. You'll see:
   - IPFS Hash
   - Transaction Hash
   - Document ID
   - Block Number

### Step 4: View Your Documents

1. Click "📁 My Documents"
2. Click "Refresh"
3. You'll see your uploaded document with:
   - File name
   - Type
   - Size
   - Upload date
   - IPFS hash
4. Test buttons:
   - **View**: Opens document in new tab from IPFS
   - **Download**: Downloads file to your computer

### Step 5: Share Document

1. In "My Documents", click "Share" on any document
2. Modal opens showing:
   - List of users (Bob should appear)
3. Select "bob" from dropdown
4. Choose permission: "Read Only" or "Read & Write"
5. Click "Share"
6. Wait 15-30 seconds for blockchain transaction
7. You'll see success message with transaction hash

### Step 6: Login as User 2 (Bob)

1. Logout from Alice's account
2. Login as Bob:
   - Username: `bob`
   - Password: `password123`
3. Click "🤝 Shared With Me"
4. Click "Refresh"
5. You'll see the document Alice shared
6. Click "View" to see the document
7. Click "Download" to download it

### Step 7: Bob Uploads Document

1. Bob uploads his own document
2. Alice can then see it if Bob shares it with her

---

## 5. API ENDPOINTS REFERENCE

### Authentication Endpoints

| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/register` | POST | Register new user | `{username, email, password}` |
| `/api/login` | POST | Login user | `{username, password}` |
| `/api/logout` | POST | Logout user | None |
| `/api/current-user` | GET | Get logged-in user | None |
| `/api/users` | GET | Get all users except current | None |

### Document Endpoints

| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/upload-to-ipfs` | POST | Upload file to IPFS | `FormData{file}` |
| `/api/upload-document` | POST | Record on blockchain | `{ipfsHash, fileName, fileSize, documentType}` |
| `/api/my-documents` | GET | Get user's documents | None |
| `/api/shared-documents` | GET | Get shared documents | None |
| `/api/share-document` | POST | Share with user | `{documentId, shareWith, permission}` |
| `/api/health` | GET | Check server status | None |

---

## 6. TROUBLESHOOTING

### Problem: "Blockchain not connected"
**Solution:**
- Check `.env` file has correct RPC URL
- Try alternative RPC: `https://eth-sepolia.public.blastapi.io`
- Check internet connection

### Problem: "Insufficient funds"
**Solution:**
- Get more Sepolia ETH from faucet
- Wait 2-3 minutes after requesting
- Check balance in MetaMask

### Problem: "Transaction failed"
**Solution:**
- Ensure wallet has at least 0.1 test ETH
- Wait and try again (network congestion)
- Check if contract address is correct

### Problem: "File not uploading to IPFS"
**Solution:**
- Verify Pinata API keys in `.env`
- Check file size (Pinata free: 100MB limit)
- Try smaller file first

### Problem: "CORS error"
**Solution:**
- Ensure backend is running on port 5000
- Check `CORS(app, supports_credentials=True)` in app.py
- Use same protocol (http/https) for both

### Problem: "Session not working"
**Solution:**
- Check `SECRET_KEY` in `.env`
- Clear browser cookies
- Ensure `credentials: 'include'` in fetch calls

---

## 7. VERIFICATION CHECKLIST

Before submitting to coding agent, verify:

- [ ] Backend runs without errors
- [ ] Frontend opens in browser
- [ ] Can register two users
- [ ] Both users funded with test ETH
- [ ] Can login with both users
- [ ] Can upload document
- [ ] Document appears in "My Documents"
- [ ] Can view document on IPFS
- [ ] Can download document
- [ ] Can share document with other user
- [ ] Other user sees shared document
- [ ] Can view shared document
- [ ] Transaction hashes visible on [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

## 8. IMPORTANT FILES SUMMARY

### Backend Files:
- `app.py` - Main Flask application with all API endpoints
- `.env` - Environment variables (API keys, contract address, etc.)
- `requirements.txt` - Python dependencies

### Frontend Files:
- `index.html` - Login page
- `register.html` - User registration page
- `dashboard.html` - Main application dashboard
- `app.js` - Frontend JavaScript logic
- `styles.css` - All styling and responsive design

### Smart Contract:
- `DocumentManager.sol` - Solidity contract for document management

---

## 9. QUICK START COMMANDS

```bash
# Start Backend
cd backend
venv\Scripts\activate
python app.py

# Start Frontend (in new terminal)
cd frontend
python -m http.server 8000

# Open browser
# Go to: http://localhost:8000
```

---

## 10. SUPPORT LINKS

- **Sepolia Faucet**: https://sepoliafaucet.com
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Pinata Dashboard**: https://app.pinata.cloud/
- **Contract Address**: https://sepolia.etherscan.io/address/0x8FA367e26E1c9f303c9e87c32d595d02679BA621

---

This documentation provides everything needed to set up, run, and test the DocuChain blockchain document management system. All API keys and configurations are already included and ready to use.