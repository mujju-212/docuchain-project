# 🔗 DocuChain - Blockchain Document Management System

![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-blue)
![Smart Contract](https://img.shields.io/badge/Smart%20Contract-Solidity-green)
![Frontend](https://img.shields.io/badge/Frontend-JavaScript-yellow)
![Backend](https://img.shields.io/badge/Backend-Python%20Flask-red)
![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-orange)

A decentralized document management system built on Ethereum blockchain that enables secure document storage, sharing, and verification with MetaMask integration.

## 🌟 Features

### Core Functionality
- **🔐 Blockchain Authentication** - Secure login/registration using MetaMask wallet
- **📄 Document Upload** - Upload documents with blockchain verification
- **🤝 Document Sharing** - Share documents with other users securely
- **🔍 Document Verification** - Verify document authenticity on blockchain
- **👤 User Management** - Account creation and management
- **🔄 Real-time Sync** - Dynamic address synchronization with MetaMask

### Security Features
- **🛡️ Ownership Verification** - Cryptographic proof of document ownership
- **🔒 Secure Sharing** - Permission-based document access control
- **⚡ Transaction Validation** - Real blockchain transaction verification
- **🎯 Address Consistency** - Automatic wallet address synchronization

## 🏗️ Architecture

### Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, Web3.js
- **Backend**: Python Flask, SQLite Database
- **Blockchain**: Ethereum (Sepolia Testnet), Solidity Smart Contracts
- **Wallet Integration**: MetaMask Web3 Provider
- **File Storage**: Local storage with blockchain hash verification

### Smart Contract
- **Contract Address**: `0x1203dc6f5d10556449e194c0c14f167bb3d72208`
- **Network**: Sepolia Ethereum Testnet
- **Features**: Document storage, sharing permissions, ownership tracking

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

1. **Python 3.8+** - [Download Python](https://python.org/downloads/)
2. **Git** - [Download Git](https://git-scm.com/downloads)
3. **MetaMask Browser Extension** - [Install MetaMask](https://metamask.io/)
4. **Sepolia ETH** - Get free testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/docuchain-project.git
cd docuchain-project
```

#### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

#### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# No additional installation needed - pure JavaScript/HTML
```

#### 4. Configuration

**Backend Configuration** (`backend/app.py`):
```python
# Update these values if needed
CONTRACT_ADDRESS = '0x1203dc6f5d10556449e194c0c14f167bb3d72208'
SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'  # Optional: Add your Infura key
```

**MetaMask Setup**:
1. Install MetaMask browser extension
2. Create/import your wallet
3. Switch to Sepolia Test Network
4. Get free Sepolia ETH from faucet

#### 5. Run the Application

**Start Backend Server**:
```bash
cd backend
python app.py
```
Server will start on `http://localhost:5000`

**Access Frontend**:
1. Open your web browser
2. Navigate to `frontend/index.html` or serve it locally:
   ```bash
   # Option 1: Python simple server
   cd frontend
   python -m http.server 8000
   # Then visit http://localhost:8000
   
   # Option 2: Use Live Server extension in VS Code
   # Right-click on index.html -> "Open with Live Server"
   ```
3. Connect your MetaMask wallet

## 📋 Requirements

### Python Dependencies (`requirements.txt`)
```
flask==2.3.3
flask-cors==4.0.0
python-dotenv==1.0.0
requests==2.31.0
cryptography==41.0.7
```

### Browser Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- MetaMask extension installed and configured
- JavaScript enabled

### Blockchain Requirements
- MetaMask wallet with Sepolia testnet configured
- Small amount of Sepolia ETH for transactions (~0.01 ETH recommended)

## 📖 How to Use

### 1. User Registration
1. Open the application in your browser
2. Click "Register" on the homepage
3. Fill in your details (username, email, password)
4. Connect your MetaMask wallet when prompted
5. Confirm the registration transaction

### 2. User Login
1. Click "Login" on the homepage
2. Enter your credentials
3. Connect MetaMask wallet
4. Access your dashboard

### 3. Document Upload
1. Go to your dashboard
2. Click "Upload Document"
3. Select your file (PDF, DOC, TXT, etc.)
4. Add a description (optional)
5. Confirm the blockchain transaction in MetaMask
6. Wait for transaction confirmation

### 4. Document Sharing
1. Find the document you want to share in your dashboard
2. Click "Share" next to the document
3. Enter the recipient's wallet address
4. Choose permission level (read/write)
5. Confirm the sharing transaction in MetaMask

### 5. View Shared Documents
1. Shared documents appear in "Shared with Me" section
2. Click on any document to view details
3. Download or view based on your permissions

### 6. Getting Sepolia ETH
1. Register a user to get a wallet address
2. Visit: https://sepoliafaucet.com
3. Request test ETH for your wallet address
4. Wait 2-3 minutes for confirmation

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/sync-wallet` - Sync MetaMask address

### Document Management
- `POST /api/upload` - Upload new document
- `GET /api/my-documents` - Get user's documents
- `GET /api/shared-documents` - Get documents shared with user
- `POST /api/share-document` - Share document with another user

### Blockchain Verification
- `POST /api/verify-transaction` - Verify blockchain transaction

## 🏗️ Project Structure

```
docuchain-project/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── database.db        # SQLite database
│   └── uploads/           # Uploaded files storage
├── frontend/
│   ├── index.html         # Homepage
│   ├── register.html      # Registration page
│   ├── dashboard.html     # User dashboard
│   ├── app_with_metamask.js # Main JavaScript logic
│   ├── metamask.js        # MetaMask integration
│   └── styles.css         # Application styles
├── smart-contract/
│   └── DocumentManager.sol # Solidity smart contract
└── README.md              # This file
```

## 🔐 Security Features

### Blockchain Security
- **Immutable Records**: All document hashes stored on blockchain
- **Cryptographic Verification**: SHA-256 hashing for file integrity
- **Smart Contract Validation**: Ownership and sharing verified on-chain

### Application Security
- **Wallet Authentication**: MetaMask signature verification
- **Address Synchronization**: Dynamic wallet address updates
- **Permission Control**: Granular sharing permissions
- **Transaction Validation**: Real blockchain transaction verification

## 🛠️ Development

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    wallet_address TEXT,
    created_at TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    filename TEXT,
    file_hash TEXT,
    owner_address TEXT,
    document_id TEXT,
    upload_time TIMESTAMP,
    transaction_hash TEXT
);
```

### Smart Contract Functions
- `uploadDocument()` - Store document on blockchain
- `shareDocument()` - Grant sharing permissions
- `getDocument()` - Retrieve document information
- `getSharedDocuments()` - Get documents shared with user

## 🐛 Troubleshooting

### Common Issues

**MetaMask Connection Issues**:
- Ensure MetaMask is installed and unlocked
- Switch to Sepolia Test Network
- Refresh the page and try connecting again

**Transaction Failures**:
- Check you have sufficient Sepolia ETH
- Increase gas limit if needed
- Wait for network congestion to clear

**Upload Failures**:
- Check file size (max 10MB recommended)
- Ensure stable internet connection
- Verify MetaMask is connected

**Document Not Appearing**:
- Wait for blockchain confirmation (1-2 minutes)
- Refresh the dashboard
- Check transaction status on Etherscan

### Getting Help
1. Check the browser console for error messages
2. Verify MetaMask network and account
3. Ensure backend server is running
4. Check transaction status on [Sepolia Etherscan](https://sepolia.etherscan.io/)

## 🚀 Deployment

### Production Deployment
1. **Backend**: Deploy Flask app to cloud service (Heroku, AWS, etc.)
2. **Frontend**: Host static files on web server or CDN
3. **Database**: Migrate to PostgreSQL or MySQL for production
4. **Environment**: Set production environment variables
5. **SSL**: Enable HTTPS for secure connections

### Environment Variables
```bash
FLASK_ENV=production
SECRET_KEY=your-production-secret-key
DATABASE_URL=your-production-database-url
INFURA_PROJECT_ID=your-infura-project-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ethereum Foundation** - For the blockchain infrastructure
- **MetaMask** - For wallet integration
- **Flask** - For the web framework
- **Solidity** - For smart contract development

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the documentation

---

**⚠️ Important Notes:**
- This is a testnet application - use only Sepolia ETH
- Never share your private keys or seed phrases
- Always verify contract addresses before transactions
- Keep your MetaMask and browser updated

**🎯 Built for learning and demonstrating blockchain document management concepts**