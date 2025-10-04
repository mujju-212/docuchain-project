# 🔗 DocuChain - Blockchain Document Management System

A secure, decentralized document management system built with Flask, Web3.js, and MetaMask integration. DocuChain allows users to upload documents to IPFS, verify them on the Sepolia blockchain, and manage access permissions through smart contracts.

## ✨ Features

- **🔐 Secure User Authentication** - Registration and login system with session management
- **🦊 MetaMask Integration** - Connect your Ethereum wallet for blockchain interactions
- **📤 Document Upload** - Upload documents with automatic IPFS storage
- **⛓️ Blockchain Verification** - Smart contract verification on Sepolia testnet
- **🤝 Document Sharing** - Share documents with other users with permission controls
- **📱 Responsive Dashboard** - Clean, modern interface for document management
- **🔄 Wallet Management** - Connect/disconnect different MetaMask wallets easily

## 🛠️ Technology Stack

### Backend
- **Flask** - Python web framework
- **SQLite** - Database for user and document metadata
- **Web3.py** - Ethereum blockchain interaction

### Frontend
- **HTML/CSS/JavaScript** - Modern responsive UI
- **Web3.js** - Ethereum wallet integration
- **MetaMask** - Ethereum wallet connection

### Blockchain
- **Ethereum Sepolia Testnet** - For smart contract deployment
- **IPFS** - Decentralized file storage
- **Smart Contracts** - Document verification and sharing logic

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- MetaMask browser extension
- Node.js (for frontend dependencies)
- Sepolia testnet ETH (from faucet)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mujju-212/docuchain-project.git
   cd docuchain-project
   ```

2. **Set up Python virtual environment**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install flask flask-cors web3 requests
   ```

4. **Start the Flask server**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

### MetaMask Setup

1. Install MetaMask browser extension
2. Add Sepolia testnet to MetaMask:
   - Network Name: Sepolia
   - RPC URL: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY`
   - Chain ID: 11155111
   - Currency Symbol: ETH
3. Get testnet ETH from [Sepolia faucet](https://sepoliafaucet.com/)

## 📋 Usage

### 1. User Registration
- Create a new account with username/password
- Connect your MetaMask wallet during registration

### 2. Document Upload
- Navigate to "Upload Document" tab
- Select file and document type
- Click "Upload to Blockchain" to store on IPFS and verify on blockchain

### 3. Document Management
- View your uploaded documents in "My Documents"
- Share documents with other users
- View documents shared with you in "Shared With Me"

### 4. Wallet Management
- Click "🦊 Connect MetaMask" to connect a wallet
- Click "🔌 Disconnect Wallet" to disconnect current wallet
- Switch between different MetaMask accounts easily

## 🏗️ Project Structure

```
docuchain-project/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── database.py         # Database initialization
│   ├── repair_database.py  # Database maintenance
│   ├── test_api.py         # API testing
│   └── docuchain.db        # SQLite database
├── frontend/
│   ├── index.html          # Login page
│   ├── register.html       # Registration page
│   ├── dashboard.html      # Main dashboard
│   ├── styles.css          # Application styles
│   ├── app_with_metamask.js # Main application logic
│   └── metamask.js         # MetaMask integration
└── README.md
```

## 🔧 Configuration

### Smart Contract
- **Contract Address**: `0x1203dc6f5d10556449e194c0c14f167bb3d72208`
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111

### Database Schema
- **users**: User authentication and wallet addresses
- **documents**: Document metadata and IPFS hashes
- **user_wallets**: Multiple wallet support per user

## 🚨 Security Features

- **Session Management** - Secure user sessions with timeout
- **Wallet Verification** - Verify wallet ownership through MetaMask
- **Input Validation** - All user inputs are validated and sanitized
- **CSRF Protection** - Cross-site request forgery protection
- **Database Security** - Prepared statements prevent SQL injection

## 🐛 Troubleshooting

### Common Issues

1. **MetaMask not connecting**
   - Ensure MetaMask is installed and unlocked
   - Check if you're on the correct network (Sepolia)
   - Try disconnecting and reconnecting

2. **Database locked error**
   - Close any other instances of the application
   - Delete `database.db-wal` and `database.db-shm` files if they exist

3. **Upload failures**
   - Check your internet connection
   - Ensure you have sufficient Sepolia ETH for gas fees
   - Verify MetaMask is connected

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MetaMask](https://metamask.io/) for wallet integration
- [IPFS](https://ipfs.io/) for decentralized storage
- [Ethereum](https://ethereum.org/) for blockchain infrastructure
- [Flask](https://flask.palletsprojects.com/) for the web framework

## 📞 Contact

- **GitHub**: [@mujju-212](https://github.com/mujju-212)
- **Email**: mujju786492@gmail.com

---

**⚠️ Disclaimer**: This is a demo application for educational purposes. Do not use in production without proper security audits and testing.