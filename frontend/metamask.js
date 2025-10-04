// MetaMask integration for DocuChain
// This file handles all Web3 and MetaMask interactions

// Blockchain configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const CONTRACT_ADDRESS = '0x1203dc6f5d10556449e194c0c14f167bb3d72208';

// MetaMask connection state
let web3 = null;
let userAccount = null;

// Smart Contract ABI (matching deployed DocumentManager contract)
const CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "_ipfsHash", "type": "string"}, 
            {"name": "_fileName", "type": "string"}, 
            {"name": "_fileSize", "type": "uint256"}, 
            {"name": "_documentType", "type": "string"}
        ],
        "name": "uploadDocument",
        "outputs": [{"name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_documentId", "type": "bytes32"}, 
            {"name": "_shareWith", "type": "address"}, 
            {"name": "_permission", "type": "string"}
        ],
        "name": "shareDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_documentId", "type": "bytes32"}
        ],
        "name": "getDocument",
        "outputs": [
            {"name": "ipfsHash", "type": "string"},
            {"name": "owner", "type": "address"},
            {"name": "timestamp", "type": "uint256"},
            {"name": "fileName", "type": "string"},
            {"name": "fileSize", "type": "uint256"},
            {"name": "isActive", "type": "bool"},
            {"name": "documentType", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "documentId", "type": "bytes32"},
            {"indexed": true, "name": "owner", "type": "address"},
            {"indexed": false, "name": "ipfsHash", "type": "string"},
            {"indexed": false, "name": "fileName", "type": "string"}
        ],
        "name": "DocumentUploaded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "documentId", "type": "bytes32"},
            {"indexed": true, "name": "owner", "type": "address"},
            {"indexed": true, "name": "sharedWith", "type": "address"},
            {"indexed": false, "name": "permission", "type": "string"}
        ],
        "name": "DocumentShared",
        "type": "event"
    }
];

// Initialize MetaMask on page load
window.addEventListener('DOMContentLoaded', async () => {
    await initializeMetaMask();
});

async function initializeMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        
        console.log('🦊 MetaMask detected but NOT auto-connecting');
        console.log('💡 User must click "Connect MetaMask" to choose wallet');
        
        // Don't auto-check accounts - let user choose manually
        // const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        // if (accounts.length > 0) {
        //     userAccount = accounts[0];
        //     await updateWalletConnection();
        // }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length > 0) {
                userAccount = accounts[0];
                console.log('🔄 MetaMask account changed to:', userAccount);
                await updateWalletConnection();
            } else {
                userAccount = null;
                console.log('🔌 MetaMask disconnected');
            }
            updateWalletUI();
        });
        
        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
            if (chainId !== SEPOLIA_CHAIN_ID) {
                showNotification('Please switch to Sepolia testnet!', 'warning');
            }
        });
        
        // Add wallet status to UI
        createWalletUI();
        
    } else {
        showNotification('MetaMask not detected! Please install MetaMask to use blockchain features.', 'error');
        createInstallMetaMaskUI();
    }
}

function createWalletUI() {
    const walletDiv = document.createElement('div');
    walletDiv.id = 'walletStatus';
    walletDiv.style.cssText = `
        position: fixed; 
        top: 80px; 
        right: 20px; 
        background: #007bff; 
        color: white; 
        padding: 12px; 
        border-radius: 8px; 
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        min-width: 200px;
    `;
    document.body.appendChild(walletDiv);
    updateWalletUI();
}

function createInstallMetaMaskUI() {
    const walletDiv = document.createElement('div');
    walletDiv.id = 'walletStatus';
    walletDiv.style.cssText = `
        position: fixed; 
        top: 80px; 
        right: 20px; 
        background: #ff6b35; 
        color: white; 
        padding: 12px; 
        border-radius: 8px; 
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    walletDiv.innerHTML = `
        <div>⚠️ MetaMask Required</div>
        <a href="https://metamask.io/download/" target="_blank" style="color: white; text-decoration: underline;">
            Install MetaMask
        </a>
    `;
    document.body.appendChild(walletDiv);
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showNotification('MetaMask not detected! Please install MetaMask first.', 'error');
        return;
    }

    try {
        showNotification('Connecting to MetaMask...', 'info');
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        // Switch to Sepolia if not already
        await switchToSepolia();
        
        // Update backend with wallet address
        await updateWalletConnection();
        
        updateWalletUI();
        showNotification('MetaMask connected successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification('Failed to connect wallet: ' + error.message, 'error');
    }
}

async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://rpc.sepolia.org'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io']
                    }],
                });
            } catch (addError) {
                console.error('Failed to add Sepolia network:', addError);
                throw addError;
            }
        } else {
            throw switchError;
        }
    }
}

async function updateWalletConnection() {
    if (userAccount) {
        try {
            console.log('🔄 Syncing wallet address with backend:', userAccount);
            
            // First, sync the wallet address for shared documents lookup
            const syncResponse = await fetch(`${API_URL}/sync-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ walletAddress: userAccount })
            });
            
            const syncData = await syncResponse.json();
            if (syncData.success) {
                console.log('✅ Wallet address synced with backend for sharing:', userAccount);
                if (syncData.addressUpdated) {
                    console.log('📄 Database address updated from', syncData.oldAddress, 'to', syncData.newAddress);
                    
                    // Trigger UI refresh to show updated address in header
                    if (typeof syncWalletAddress === 'function') {
                        await syncWalletAddress(userAccount);
                    }
                }
            } else {
                console.warn('⚠️ Failed to sync wallet address:', syncData.error);
            }
            
            // Then, update the general wallet connection
            const response = await fetch(`${API_URL}/connect-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ walletAddress: userAccount })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('Wallet connected to backend:', userAccount);
                
                // Reload shared documents to show any newly visible shares
                if (typeof loadSharedDocuments === 'function') {
                    loadSharedDocuments();
                }
            } else {
                console.error('Failed to update backend:', data.error);
            }
        } catch (error) {
            console.error('Failed to update wallet connection:', error);
        }
    }
}

function updateWalletUI() {
    const walletStatus = document.getElementById('walletStatus');
    if (!walletStatus) return;
    
    if (userAccount) {
        walletStatus.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                🦊 <strong style="margin-left: 8px;">${userAccount.substring(0, 8)}...${userAccount.substring(36)}</strong>
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
                Sepolia Testnet ⚡
            </div>
            <button onclick="disconnectWallet()" style="
                background: rgba(255,255,255,0.2); 
                border: 1px solid rgba(255,255,255,0.3); 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                cursor: pointer;
                font-size: 12px;
                margin-top: 8px;
            ">Disconnect</button>
        `;
    } else {
        walletStatus.innerHTML = `
            <div style="margin-bottom: 8px;">🦊 MetaMask</div>
            <button onclick="connectWallet()" style="
                background: #ff6b35; 
                border: none; 
                color: white; 
                padding: 8px 12px; 
                border-radius: 4px; 
                cursor: pointer;
                font-weight: bold;
            ">Connect Wallet</button>
        `;
    }
}

function disconnectWallet() {
    userAccount = null;
    updateWalletUI();
    showNotification('Wallet disconnected', 'info');
}

// Blockchain transaction functions
async function uploadDocumentToBlockchain(ipfsHash, fileName, fileType, fileSize) {
    if (!userAccount) {
        throw new Error('Please connect MetaMask first');
    }
    
    if (!web3) {
        throw new Error('Web3 not initialized');
    }
    
    try {
        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== SEPOLIA_CHAIN_ID) {
            await switchToSepolia();
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        // Estimate gas
        const gasEstimate = await contract.methods
            .uploadDocument(ipfsHash, fileName, fileSize, fileType)
            .estimateGas({ from: userAccount });
        
        // Send transaction
        const result = await contract.methods
            .uploadDocument(ipfsHash, fileName, fileSize, fileType)
            .send({ 
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
            });
        
        console.log('=== UPLOAD TRANSACTION RESULT ===');
        console.log('Full result:', result);
        console.log('Events:', result.events);
        console.log('DocumentUploaded event:', result.events?.DocumentUploaded);
        console.log('Return values:', result.events?.DocumentUploaded?.returnValues);
        
        // Extract document ID from event
        let documentId = null;
        if (result.events?.DocumentUploaded?.returnValues) {
            documentId = result.events.DocumentUploaded.returnValues.documentId || 
                        result.events.DocumentUploaded.returnValues[0];
        }
        
        console.log('Extracted documentId:', documentId);
        
        if (!documentId) {
            console.error('❌ Failed to extract document ID from blockchain event');
            console.error('Event data:', result.events);
            throw new Error('Failed to get document ID from blockchain transaction. Please try again.');
        }
        
        console.log('=== END UPLOAD DEBUG ===');
        
        return {
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            documentId: documentId
        };
        
    } catch (error) {
        console.error('Blockchain upload failed:', error);
        throw error;
    }
}

async function shareDocumentOnBlockchain(documentId, shareWithAddress, permission) {
    if (!userAccount) {
        throw new Error('Please connect MetaMask first');
    }
    
    if (!web3) {
        throw new Error('Web3 not initialized');
    }
    
    try {
        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== SEPOLIA_CHAIN_ID) {
            await switchToSepolia();
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        // Convert documentId to bytes32 format
        let docIdBytes32 = documentId;
        if (typeof documentId === 'string') {
            if (!documentId.startsWith('0x')) {
                // If it's a plain string, convert to hex and pad to 32 bytes
                docIdBytes32 = '0x' + documentId.padEnd(64, '0');
            } else if (documentId.length < 66) {
                // If it's hex but not 32 bytes, pad it
                docIdBytes32 = documentId.padEnd(66, '0');
            }
        }
        
        console.log('Original Document ID:', documentId);
        console.log('Converted Document ID:', docIdBytes32);
        console.log('Share with address:', shareWithAddress);
        console.log('Permission:', permission);
        console.log('Current user account:', userAccount);
        
        // First, verify document ownership
        try {
            const documentInfo = await contract.methods.getDocument(docIdBytes32).call();
            console.log('Document info from blockchain:', documentInfo);
            console.log('Document owner:', documentInfo.owner);
            console.log('Current account:', userAccount);
            console.log('Accounts match:', documentInfo.owner.toLowerCase() === userAccount.toLowerCase());
            
            if (documentInfo.owner.toLowerCase() !== userAccount.toLowerCase()) {
                throw new Error(`You are not the owner of this document. Owner: ${documentInfo.owner}, Current account: ${userAccount}`);
            }
        } catch (ownershipError) {
            console.error('Ownership verification failed:', ownershipError);
            throw new Error(`Cannot verify document ownership: ${ownershipError.message}`);
        }
        
        // Estimate gas
        const gasEstimate = await contract.methods
            .shareDocument(docIdBytes32, shareWithAddress, permission)
            .estimateGas({ from: userAccount });
        
        // Send transaction
        const result = await contract.methods
            .shareDocument(docIdBytes32, shareWithAddress, permission)
            .send({ 
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
            });
        
        return {
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber
        };
        
    } catch (error) {
        console.error('Blockchain share failed:', error);
        console.error('Error details:', {
            documentId: documentId,
            shareWithAddress: shareWithAddress,
            permission: permission,
            errorMessage: error.message
        });
        throw error;
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
        color: ${type === 'warning' ? '#000' : '#fff'};
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        max-width: 400px;
        text-align: center;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Get current wallet address
function getCurrentWalletAddress() {
    return userAccount;
}

// Check if wallet is connected
function isWalletConnected() {
    return !!userAccount;
}

// Export functions for global use
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.uploadDocumentToBlockchain = uploadDocumentToBlockchain;
window.shareDocumentOnBlockchain = shareDocumentOnBlockchain;
window.getCurrentWalletAddress = getCurrentWalletAddress;
window.isWalletConnected = isWalletConnected;

// Export constants and variables for debugging
window.CONTRACT_ABI = CONTRACT_ABI;
window.CONTRACT_ADDRESS = CONTRACT_ADDRESS;
// Export functions to get current values
window.getWeb3 = () => web3;
window.getUserAccount = () => userAccount;

// Also export as properties for backward compatibility
Object.defineProperty(window, 'web3', { get: () => web3 });
Object.defineProperty(window, 'userAccount', { get: () => userAccount });