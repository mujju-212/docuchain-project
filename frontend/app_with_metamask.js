const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentDocumentToShare = null;
let allUsers = [];

// Debug function to check document ownership
async function checkDocumentOwnership(documentId) {
    try {
        const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
        if (!currentAccount) {
            alert('Please connect MetaMask first');
            return;
        }
        
        console.log('=== STARTING DOCUMENT OWNERSHIP DEBUG ===');
        console.log('Contract Address:', window.CONTRACT_ADDRESS);
        console.log('Database Document ID:', documentId);
        
        // First, let's find the actual blockchain document ID by checking recent transactions
        // Get the document from backend to find its transaction hash
        const response = await fetch(`${API_URL}/my-documents`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            alert('Failed to fetch documents from backend');
            return;
        }
        
        const doc = data.documents.find(d => d.documentId === documentId);
        if (!doc) {
            alert('Document not found in backend');
            return;
        }
        
        console.log('Document from backend:', doc);
        console.log('Transaction hash:', doc.transactionHash || 'No transaction hash');
        
        if (!window.web3) {
            window.web3 = new Web3(window.ethereum);
        }
        const contract = new window.web3.eth.Contract(window.CONTRACT_ABI, window.CONTRACT_ADDRESS);
        
        let realBlockchainDocId = null;
        
        // If we have a transaction hash, get the real document ID from the blockchain
        if (doc.transactionHash) {
            try {
                console.log('Getting transaction receipt for:', doc.transactionHash);
                const receipt = await window.web3.eth.getTransactionReceipt(doc.transactionHash);
                
                if (receipt && receipt.logs) {
                    // Look for DocumentUploaded event
                    for (let log of receipt.logs) {
                        if (log.address.toLowerCase() === window.CONTRACT_ADDRESS.toLowerCase()) {
                            try {
                                const decoded = window.web3.eth.abi.decodeLog([
                                    {"indexed": true, "name": "documentId", "type": "bytes32"},
                                    {"indexed": true, "name": "owner", "type": "address"},
                                    {"indexed": false, "name": "ipfsHash", "type": "string"},
                                    {"indexed": false, "name": "fileName", "type": "string"}
                                ], log.data, log.topics.slice(1));
                                
                                if (decoded.documentId) {
                                    realBlockchainDocId = decoded.documentId;
                                    console.log('Found real blockchain document ID:', realBlockchainDocId);
                                    break;
                                }
                            } catch (e) {
                                // Continue to next log
                            }
                        }
                    }
                }
            } catch (err) {
                console.log('Error getting transaction receipt:', err);
            }
        }
        
        // Try to get the document using the real blockchain ID
        if (realBlockchainDocId) {
            try {
                console.log('Trying real blockchain document ID:', realBlockchainDocId);
                const documentInfo = await contract.methods.getDocument(realBlockchainDocId).call();
                console.log('Document info from blockchain:', documentInfo);
                
                if (documentInfo.owner && documentInfo.owner !== '0x0000000000000000000000000000000000000000') {
                    console.log('=== DOCUMENT FOUND ON BLOCKCHAIN ===');
                    console.log('Real Document ID:', realBlockchainDocId);
                    console.log('Document Owner:', documentInfo.owner);
                    console.log('Current MetaMask Account:', currentAccount);
                    console.log('Ownership Match:', documentInfo.owner.toLowerCase() === currentAccount.toLowerCase());
                    console.log('Document Active:', documentInfo.isActive);
                    console.log('=== END DEBUG ===');
                    
                    alert(`✅ Document Found!\nID: ${realBlockchainDocId}\nOwner: ${documentInfo.owner}\nYour Account: ${currentAccount}\nMatch: ${documentInfo.owner.toLowerCase() === currentAccount.toLowerCase()}`);
                    return;
                }
            } catch (err) {
                console.log('Error getting document with real ID:', err);
            }
        }
        
        // Fallback: try the original formats
        console.log('Fallback: trying original document ID formats...');
        const docIdFormats = [
            { name: 'Original', value: documentId },
            { name: 'Padded', value: documentId.startsWith('0x') ? documentId.padEnd(66, '0') : ('0x' + documentId).padEnd(66, '0') },
            { name: 'Keccak256', value: window.web3.utils.keccak256(documentId) }
        ];
        
        for (let format of docIdFormats) {
            try {
                console.log(`Trying format "${format.name}": ${format.value}`);
                const documentInfo = await contract.methods.getDocument(format.value).call();
                
                if (documentInfo.owner && documentInfo.owner !== '0x0000000000000000000000000000000000000000') {
                    console.log(`✅ Found document with format "${format.name}"!`);
                    alert(`✅ Document Found!\nFormat: ${format.name}\nOwner: ${documentInfo.owner}\nYour Account: ${currentAccount}\nMatch: ${documentInfo.owner.toLowerCase() === currentAccount.toLowerCase()}`);
                    return;
                }
            } catch (err) {
                console.log(`❌ Error with format "${format.name}":`, err.message);
            }
        }
        
        console.log('❌ Document not found in any format');
        alert(`❌ Document not found on blockchain\nDatabase ID: ${documentId}\nTransaction: ${doc.transactionHash || 'None'}\nTried multiple formats - check console for details`);
        
    } catch (error) {
        console.error('Debug ownership check failed:', error);
        alert('Failed to check ownership: ' + error.message);
    }
}

window.checkDocumentOwnership = checkDocumentOwnership;

// Removed debug function listBlockchainDocuments

// Function to re-upload document to blockchain
async function reUploadToBlockchain(documentId, fileName) {
    try {
        const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
        if (!currentAccount) {
            alert('Please connect MetaMask first');
            return;
        }
        
        // Get document details from backend
        const response = await fetch(`${API_URL}/my-documents`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            alert('Failed to fetch document details');
            return;
        }
        
        const doc = data.documents.find(d => d.documentId === documentId);
        if (!doc) {
            alert('Document not found');
            return;
        }
        
        console.log('Re-uploading document:', doc);
        
        // Upload to blockchain
        const blockchainResult = await window.uploadDocumentToBlockchain(
            doc.ipfsHash, 
            doc.fileName, 
            doc.documentType, 
            doc.fileSize
        );
        
        console.log('Blockchain upload result:', blockchainResult);
        
        if (blockchainResult && blockchainResult.documentId) {
            // Update backend with new blockchain document ID
            const updateResponse = await fetch(`${API_URL}/update-document-blockchain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    oldDocumentId: documentId,
                    newDocumentId: blockchainResult.documentId,
                    transactionHash: blockchainResult.transactionHash,
                    blockNumber: blockchainResult.blockNumber
                })
            });
            
            const updateData = await updateResponse.json();
            if (updateData.success) {
                alert(`✅ Document successfully uploaded to blockchain!\nNew Document ID: ${blockchainResult.documentId}\nTransaction: ${blockchainResult.transactionHash}`);
                loadMyDocuments(); // Refresh the list
            } else {
                alert('Blockchain upload succeeded but backend update failed: ' + updateData.error);
            }
        } else {
            alert('Blockchain upload failed');
        }
        
    } catch (error) {
        console.error('Re-upload failed:', error);
        alert('Re-upload failed: ' + error.message);
    }
}

window.reUploadToBlockchain = reUploadToBlockchain;

// Function to check and display current MetaMask status
function checkMetaMaskStatus() {
    const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
    console.log('=== METAMASK STATUS CHECK ===');
    console.log('Connected Account:', currentAccount);
    console.log('IsWalletConnected:', window.isWalletConnected ? window.isWalletConnected() : false);
    console.log('Web3 Available:', !!window.web3);
    console.log('=== END STATUS CHECK ===');
    
    if (currentAccount) {
        alert(`✅ MetaMask Connected\\nAccount: ${currentAccount}`);
    } else {
        alert('❌ MetaMask Not Connected\\nPlease connect your wallet first.');
    }
}

window.checkMetaMaskStatus = checkMetaMaskStatus;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (currentUser) {
        loadMyDocuments();
        
        // If user has zero address, automatically try to connect MetaMask
        const isZeroAddress = currentUser.walletAddress === '0x0000000000000000000000000000000000000000';
        // Don't auto-check MetaMask - user must connect manually
        if (isZeroAddress) {
            console.log('💡 User has zero address - must click "Connect MetaMask" to choose wallet');
        }
    }
    
    // Setup MetaMask listeners but don't auto-sync
    setTimeout(async () => {
        console.log('Setting up MetaMask listeners (no auto-sync)...');
        checkMetaMaskStatus();
        setupMetaMaskListeners();
        
        console.log('💡 Click "Connect MetaMask" to choose your wallet');
    }, 2000);
});

// Setup MetaMask event listeners
function setupMetaMaskListeners() {
    if (typeof window.ethereum !== 'undefined') {
        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
            console.log('🔄 MetaMask account changed:', accounts);
            if (accounts.length > 0 && currentUser) {
                const newAccount = accounts[0];
                console.log('New account:', newAccount);
                
                // Sync new address with backend
                await syncWalletAddress(newAccount);
                
                // Update global variable
                window.userAccount = newAccount;
                
                // Reload documents to reflect any changes
                loadMyDocuments();
                loadSharedDocuments();
            } else if (accounts.length === 0) {
                // MetaMask disconnected
                console.log('🦊 MetaMask disconnected');
                if (currentUser) {
                    updateUserInfoUI(currentUser.username, currentUser.walletAddress, false);
                }
            }
        });
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', (chainId) => {
            console.log('🔗 Chain changed to:', chainId);
            // You might want to reload the page or update UI
        });
    }
}

// Copy current MetaMask address to clipboard
function copyCurrentAddress() {
    const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
    if (currentAccount) {
        navigator.clipboard.writeText(currentAccount).then(() => {
            alert(`✅ Address copied to clipboard!\n${currentAccount}`);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = currentAccount;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(`✅ Address copied to clipboard!\n${currentAccount}`);
        });
    } else {
        alert('❌ Please connect MetaMask first');
    }
}

// Make function globally available
window.copyCurrentAddress = copyCurrentAddress;

// Disconnect MetaMask from the application
async function disconnectMetaMask() {
    console.log('� Disconnecting MetaMask...');
    
    try {
        // Clear the stored wallet connection
        window.userAccount = null;
        
        // Update UI to show disconnected state
        if (currentUser) {
            // Set user wallet to zero address in database
            await syncWalletAddress('0x0000000000000000000000000000000000000000');
            currentUser.walletAddress = '0x0000000000000000000000000000000000000000';
            updateUserInfoUI(currentUser.username, '0x000000...000000', false);
        }
        
        console.log('✅ MetaMask disconnected from application');
        
        // Show user instruction for seeing popup next time
        setTimeout(() => {
            console.log('💡 TIP: To see MetaMask popup when connecting, manually disconnect this site from MetaMask extension');
            // Show notification in UI
            const notification = document.getElementById('notificationArea');
            if (notification) {
                notification.style.display = 'block';
                // Hide after 10 seconds
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 10000);
            }
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('❌ Error disconnecting MetaMask:', error);
        return false;
    }
}

// Connect to MetaMask explicitly - ALWAYS FORCE POPUP
async function connectMetaMask() {
    console.log('🚀 connectMetaMask function called!');
    
    if (typeof window.ethereum === 'undefined') {
        console.log('❌ MetaMask is not installed!');
        return false;
    }
    
    try {
        console.log('🔄 Requesting MetaMask connection...');
        console.log('🦊 Forcing MetaMask popup to appear...');
        
        // First, try to get current accounts to see if already connected
        let accounts;
        try {
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
            console.log('🔍 Current connected accounts:', accounts);
        } catch (error) {
            console.log('⚠️ Could not get current accounts:', error);
            accounts = [];
        }
        
        // If already connected, try to force account selection popup
        if (accounts && accounts.length > 0) {
            console.log('� Already connected, trying to force account selection popup...');
            try {
                console.log('📢 Requesting permissions to force popup...');
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
                console.log('✅ Permission popup shown, getting accounts...');
                
                // Get accounts after permission request
                accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
            } catch (permError) {
                console.log('⚠️ Permission request failed, using current accounts:', permError.message);
                // Use existing accounts if permission request fails
            }
        } else {
            // Not connected, regular connection flow
            console.log('📢 Not connected, requesting accounts...');
            accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
        }
        
        console.log('🦊 Final accounts:', accounts);
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned from MetaMask');
        }
        
        const connectedAccount = accounts[0];
        console.log('✅ MetaMask connected successfully:', connectedAccount);
        
        // Log success message (no alert popup)
        console.log(`✅ MetaMask Connected Successfully! Wallet: ${connectedAccount}`);
        
        // Sync with backend if user is logged in
        if (currentUser) {
            console.log('👤 User logged in, syncing wallet with backend...');
            const syncSuccess = await syncWalletAddress(connectedAccount);
            if (syncSuccess) {
                currentUser.walletAddress = connectedAccount;
                console.log('✅ Wallet synced with backend successfully');
            } else {
                console.log('❌ Failed to sync wallet with backend');
            }
        }
        
        // Update global variable and UI
        window.userAccount = connectedAccount;
        if (currentUser) {
            updateUserInfoUI(currentUser.username, connectedAccount, true);
        }
        
        // Reload documents to reflect any changes
        if (currentUser) {
            loadMyDocuments();
            loadSharedDocuments();
        }
        
        return connectedAccount;
    } catch (error) {
        console.error('❌ MetaMask connection error:', error);
        
        if (error.code === 4001) {
            console.log('❌ User rejected MetaMask connection');
        } else if (error.code === -32002) {
            console.log('⏳ MetaMask connection pending - check for popup window');
        } else {
            console.log('❌ MetaMask error:', error.message);
        }
        return false;
    }
}

// Make function globally available
window.connectMetaMask = connectMetaMask;

// Update UI with current MetaMask address
function updateUserInfoUI(username, walletAddress, isMetaMask = false) {
    const userInfoElement = document.getElementById('userInfo');
    const connectBtn = document.getElementById('connectMetaMaskBtn');
    
    console.log('🔄 Updating UI - Username:', username, 'Wallet:', walletAddress, 'IsMetaMask:', isMetaMask);
    
    if (userInfoElement) {
        const isZeroAddress = walletAddress === '0x0000000000000000000000000000000000000000' || 
                              walletAddress === '0x000000...000000';
        
        if (isZeroAddress) {
            userInfoElement.textContent = `👤 ${username} | 💼 No wallet connected`;
            // Always show connect button for zero addresses
            if (connectBtn) {
                connectBtn.style.display = 'inline-block';
                console.log('✅ Showing Connect MetaMask button - zero address detected');
            }
        } else {
            const icon = isMetaMask ? '🦊' : '💼';
            userInfoElement.textContent = 
                `👤 ${username} | ${icon} ${walletAddress.substring(0, 8)}...${walletAddress.substring(36)}`;
            // Show connect button always (allow wallet switching)
            if (connectBtn) {
                connectBtn.style.display = 'inline-block';
                console.log('✅ Showing Connect MetaMask button - allow wallet switching');
            }
        }
    }
}

// Sync MetaMask wallet address with backend
async function syncWalletAddress(walletAddress) {
    try {
        const response = await fetch(`${API_URL}/sync-wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                walletAddress: walletAddress
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ Wallet address synced:', result.message);
            
            // Update UI immediately after successful sync
            if (currentUser) {
                updateUserInfoUI(currentUser.username, walletAddress, true);
                
                // Update the currentUser object with new address
                currentUser.walletAddress = walletAddress;
            }
            
            // If address was changed in database, reload users list for sharing
            if (result.addressChanged) {
                console.log('🔄 Address changed in database, reloading users...');
                await loadUsers();
            }
            
            return true;
        } else {
            console.warn('⚠️ Failed to sync wallet address:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error syncing wallet address:', error);
        return false;
    }
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/current-user`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            // Check if user has a zero address (needs MetaMask connection)
            const isZeroAddress = currentUser.walletAddress === '0x0000000000000000000000000000000000000000';
            
            if (isZeroAddress) {
                console.log('⚠️ User has zero address - needs MetaMask connection');
                updateUserInfoUI(currentUser.username, currentUser.walletAddress, false);
            } else {
                // First show the database address
                updateUserInfoUI(currentUser.username, currentUser.walletAddress, false);
            }
            
            // Don't automatically sync - let user choose to connect MetaMask
            console.log('💡 User logged in. Showing Connect MetaMask button for wallet selection.');
            
            // Always show Connect MetaMask button after login (don't auto-sync)
            if (isZeroAddress) {
                // Show zero address and Connect button
                updateUserInfoUI(currentUser.username, '0x000000...000000', false);
                console.log('🔘 User needs to connect MetaMask (zero address)');
            } else {
                // Show database address but still allow connecting different wallet
                updateUserInfoUI(currentUser.username, currentUser.walletAddress, false);
                console.log('🔘 User can connect different MetaMask wallet if desired');
            }
            
            console.log('⚠️ Click "Connect MetaMask" to choose wallet');
            
            await loadUsers();
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'upload') {
        document.getElementById('uploadTab').classList.add('active');
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else if (tabName === 'myDocs') {
        document.getElementById('myDocsTab').classList.add('active');
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        loadMyDocuments();
    } else if (tabName === 'shared') {
        document.getElementById('sharedTab').classList.add('active');
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        loadSharedDocuments();
    }
}

// Upload Document with MetaMask Integration
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const documentType = document.getElementById('documentType').value;
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!fileInput.files[0]) {
        statusDiv.innerHTML = '<p class="error">Please select a file</p>';
        return;
    }

    const file = fileInput.files[0];
    
    try {
        // Check MetaMask connection first
        if (!isWalletConnected()) {
            statusDiv.innerHTML = '<p class="error">❌ Please connect MetaMask first!</p>';
            return;
        }
        
        statusDiv.innerHTML = '<p class="info">⏳ Step 1/3: Uploading to IPFS...</p>';
        
        // Step 1: Upload to IPFS
        const formData = new FormData();
        formData.append('file', file);
        
        const ipfsResponse = await fetch(`${API_URL}/upload-to-ipfs`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const ipfsData = await ipfsResponse.json();
        
        if (!ipfsData.success) {
            throw new Error(ipfsData.error);
        }
        
        statusDiv.innerHTML = `
            <p class="success">✅ Uploaded to IPFS: ${ipfsData.ipfsHash}</p>
            <p class="info">⏳ Step 2/3: Sending blockchain transaction...</p>
            <p class="warning">🦊 Please confirm the transaction in MetaMask</p>
        `;
        
        // Step 2: Upload to Blockchain via MetaMask
        const blockchainResult = await uploadDocumentToBlockchain(ipfsData.ipfsHash, file.name, documentType, file.size);
        
        statusDiv.innerHTML = `
            <p class="success">✅ Uploaded to IPFS: ${ipfsData.ipfsHash}</p>
            <p class="success">✅ Blockchain transaction confirmed!</p>
            <p class="info">⏳ Step 3/3: Updating backend database...</p>
        `;
        
        // Step 3: Update backend with blockchain transaction data
        const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
        
        const backendResponse = await fetch(`${API_URL}/upload-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                ipfsHash: ipfsData.ipfsHash,
                fileName: file.name,
                fileSize: file.size,
                documentType: documentType,
                transactionHash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber,
                documentId: blockchainResult.documentId, // Use blockchain-generated document ID
                ownerAddress: currentAccount  // Add the actual MetaMask address
            })
        });
        
        const backendData = await backendResponse.json();
        
        if (backendData.success) {
            statusDiv.innerHTML = `
                <p class="success">🎉 Document uploaded successfully to blockchain!</p>
                <p><strong>Transaction Hash:</strong> <a href="https://sepolia.etherscan.io/tx/${blockchainResult.transactionHash}" target="_blank">${blockchainResult.transactionHash}</a></p>
                <p><strong>Document ID:</strong> ${backendData.documentId}</p>
                <p><strong>Block Number:</strong> ${blockchainResult.blockNumber}</p>
                <p><strong>IPFS:</strong> <a href="${ipfsData.ipfsUrl}" target="_blank">View File</a></p>
                <p class="info">✅ Real blockchain transaction completed!</p>
            `;
            
            // Reset form
            document.getElementById('uploadForm').reset();
            
            // Refresh documents list
            setTimeout(() => loadMyDocuments(), 2000);
        } else {
            throw new Error(backendData.error);
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        statusDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
        
        // If MetaMask error, provide helpful message
        if (error.message.includes('User denied')) {
            statusDiv.innerHTML += '<p class="info">💡 You cancelled the transaction in MetaMask</p>';
        } else if (error.message.includes('insufficient funds')) {
            statusDiv.innerHTML += '<p class="info">💡 You need Sepolia ETH for transactions. Get some from a faucet!</p>';
        }
    }
});

// Helper function to ensure proper UTF-8 display
function sanitizeDisplayText(text) {
    if (!text) return 'Untitled';
    
    console.log('Sanitizing:', text, 'Char codes:', [...text].map(c => c.charCodeAt(0)));
    
    // Remove the specific corrupt Unicode sequence we're seeing
    let sanitized = text;
    
    // Remove âÿ" pattern specifically
    sanitized = sanitized.replace(/âÿ"/g, '');
    
    // Remove other variations
    sanitized = sanitized.replace(/[^\x20-\x7E\x80-\xFF]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    console.log('Result:', sanitized);
    
    return sanitized || 'Untitled';
}

async function loadMyDocuments() {
    console.log('=== LOADING MY DOCUMENTS ===');
    const listDiv = document.getElementById('myDocumentsList');
    console.log('Found myDocumentsList element:', !!listDiv);
    
    if (!listDiv) {
        console.error('myDocumentsList element not found!');
        alert('Error: Document list container not found!');
        return;
    }
    listDiv.innerHTML = '<p class="info">⏳ Loading your documents...</p>';
    
    try {
        console.log('Fetching documents from:', `${API_URL}/my-documents`);
        const response = await fetch(`${API_URL}/my-documents`, {
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Clean only the document fileName fields, not the entire JSON
        if (data.documents) {
            data.documents = data.documents.map((doc, index) => {
                console.log(`Processing document ${index}:`, doc.fileName);
                
                // For testing, let's temporarily force clean names
                const cleanName = doc.fileName
                    .replace(/âÿ"/g, '')  // Remove specific corruption
                    .replace(/[^\x20-\x7E]/g, '') // Keep only ASCII printable
                    .trim();
                
                console.log(`Clean name for doc ${index}:`, cleanName);
                
                return {
                    ...doc,
                    fileName: cleanName || `Document_${index + 1}.pdf`
                };
            });
            console.log('Final cleaned documents:', data.documents);
        }
        
        if (data.success) {
            if (data.documents.length === 0) {
                listDiv.innerHTML = '<p class="info">No documents yet. Upload your first document!</p>';
                return;
            }
            
            // Generate HTML using the already cleaned data
            let htmlContent = '';
            data.documents.forEach(doc => {
                htmlContent += `
                <div class="document-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="doc-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div class="doc-icon" style="font-size: 24px; margin-right: 10px;">&nbsp;📄&nbsp;</div>
                        <h3 style="margin: 0; color: #333;">${doc.fileName}</h3>
                    </div>
                    <div class="doc-details" style="margin-bottom: 15px;">
                        <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${doc.documentType}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Size:</strong> ${(doc.fileSize / 1024).toFixed(1)} KB</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(doc.timestamp * 1000).toLocaleDateString()}</p>
                    </div>
                    <div class="doc-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                        <a href="${doc.ipfsUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px;">View</a>
                        <button onclick="openShareModal('${doc.documentId}', '${doc.fileName}')" class="btn btn-success" style="padding: 6px 12px; border: none; border-radius: 4px; background: #28a745; color: white; font-size: 12px; cursor: pointer;">Share</button>

                    </div>
                    <div class="blockchain-info" style="border-top: 1px solid #eee; padding-top: 10px;">
                        <small style="color: #888; font-family: monospace;">Document ID: ${doc.documentId.substring(0, 16)}...</small>
                    </div>
                </div>
                `;
            });
            
            listDiv.innerHTML = htmlContent;
            
            // Additional cleanup after DOM insertion
            setTimeout(() => {
                const docTitles = listDiv.querySelectorAll('h3');
                docTitles.forEach(title => {
                    if (title.textContent.includes('âÿ')) {
                        console.log('Found corrupted title, cleaning:', title.textContent);
                        title.textContent = sanitizeDisplayText(title.textContent);
                    }
                });
            }, 100);
        } else {
            console.error('API returned success=false:', data);
            listDiv.innerHTML = `<p class="error">Server error: ${data.error || 'Unknown error'}</p>`;
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        listDiv.innerHTML = `<p class="error">Network error: ${error.message}</p>`;
    }
    console.log('=== END LOADING DOCUMENTS ===');
}

async function loadSharedDocuments() {
        const listDiv = document.getElementById('sharedDocumentsList');
    if (!listDiv) {
        console.error('❌ Could not find sharedDocumentsList element');
        return;
    }
    listDiv.innerHTML = '<p class="info">⏳ Loading shared documents...</p>';
    
    try {
        const response = await fetch(`${API_URL}/shared-documents`, {
            credentials: 'include'
        });
        
        const data = await response.json();        // Clean only the document fileName fields
        if (data.documents) {
            data.documents = data.documents.map(doc => ({
                ...doc,
                fileName: sanitizeDisplayText(doc.fileName)
            }));
        }
        
        if (data.success) {
            if (data.documents.length === 0) {
                listDiv.innerHTML = '<p class="info">No shared documents yet.</p>';
                return;
            }
            
            // Generate HTML using the already cleaned data
            let htmlContent = '';
            data.documents.forEach(doc => {
                htmlContent += `
                <div class="document-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px; background: #f8f9fa; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="doc-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div class="doc-icon" style="font-size: 24px; margin-right: 10px;">&nbsp;📄&nbsp;</div>
                        <h3 style="margin: 0; color: #333;">${doc.fileName}</h3>
                    </div>
                    <div class="doc-details" style="margin-bottom: 15px;">
                        <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${doc.documentType}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Size:</strong> ${(doc.fileSize / 1024).toFixed(1)} KB</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(doc.timestamp * 1000).toLocaleDateString()}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Owner:</strong> ${doc.owner.substring(0, 16)}...</p>
                        <p style="margin: 5px 0; color: #17a2b8;"><strong>Shared with you</strong></p>
                    </div>
                    <div class="doc-actions" style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <a href="${doc.ipfsUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px;">View Document</a>
                    </div>
                    <div class="blockchain-info" style="border-top: 1px solid #eee; padding-top: 10px;">
                        <small style="color: #888; font-family: monospace;">Document ID: ${doc.documentId.substring(0, 16)}...</small>
                    </div>
                </div>
                `;
            });
            
            listDiv.innerHTML = htmlContent;
        } else {
            listDiv.innerHTML = '<p class="error">Failed to load shared documents</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="error">Error loading shared documents</p>';
        console.error('Error loading shared documents:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function openShareModal(documentId, fileName) {
    console.log('Opening share modal for document:', documentId, 'fileName:', fileName);
    currentDocumentToShare = documentId;
    
    // Debug: Check if elements exist
    const modal = document.getElementById('shareModal');
    const shareDocumentName = document.getElementById('shareDocumentName');
    const userSelect = document.getElementById('shareWithUser');
    
    console.log('Modal element:', modal);
    console.log('shareDocumentName element:', shareDocumentName);
    console.log('userSelect element:', userSelect);
    
    if (!shareDocumentName) {
        console.error('shareDocumentName element not found! Check if HTML is loaded properly.');
        alert('Error: Share modal not properly loaded. Please refresh the page.');
        return;
    }
    
    if (!userSelect) {
        console.error('shareWithUser element not found! Check if HTML is loaded properly.');
        alert('Error: Share modal not properly loaded. Please refresh the page.');
        return;
    }
    
    shareDocumentName.textContent = fileName;
    userSelect.innerHTML = '<option value="">Select a user...</option>';
    
    // Get current connected MetaMask account
    const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
    console.log('Current connected account:', currentAccount);
    
    // Get current connected MetaMask account  
    console.log('Current connected account:', currentAccount);
    console.log('All available users for sharing:', allUsers);
    
    // First option: Share with any MetaMask address (most flexible)
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = '🦊 Enter any MetaMask address (Recommended)';
    customOption.style.fontWeight = 'bold';
    userSelect.appendChild(customOption);
    
    // Add separator
    const separatorOption = document.createElement('option');
    separatorOption.value = '';
    separatorOption.textContent = '--- Or select registered users (may have outdated addresses) ---';
    separatorOption.disabled = true;
    separatorOption.style.fontSize = '12px';
    separatorOption.style.color = '#666';
    userSelect.appendChild(separatorOption);
    
    // Show registered users with warning about addresses
    if (allUsers.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No registered users available';
        option.disabled = true;
        userSelect.appendChild(option);
    } else {
        allUsers.forEach(user => {
            // Skip the current user (don't allow sharing with yourself)
            if (user.walletAddress.toLowerCase() !== currentAccount?.toLowerCase()) {
                const option = document.createElement('option');
                option.value = user.walletAddress;
                option.textContent = `${user.username} (${user.walletAddress.substring(0, 8)}... - May be outdated)`;
                option.style.color = '#888';
                userSelect.appendChild(option);
            }
        });
    }
    
    // Add event listener for custom address input
    userSelect.addEventListener('change', function() {
        const customAddressDiv = document.getElementById('customAddressDiv') || createCustomAddressInput();
        if (this.value === 'custom') {
            customAddressDiv.style.display = 'block';
            customAddressDiv.style.border = '2px solid #007bff';
            customAddressDiv.style.backgroundColor = '#f8f9fa';
        } else {
            customAddressDiv.style.display = 'none';
        }
    });
    
    // Set custom as default selection
    userSelect.value = 'custom';
    
    modal.style.display = 'block';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
    currentDocumentToShare = null;
}

// Create custom address input
function createCustomAddressInput() {
    const customAddressDiv = document.createElement('div');
    customAddressDiv.id = 'customAddressDiv';
    customAddressDiv.style.display = 'block'; // Show by default since it's the recommended option
    customAddressDiv.style.marginTop = '10px';
    customAddressDiv.style.padding = '15px';
    customAddressDiv.style.backgroundColor = '#f8f9fa';
    customAddressDiv.style.border = '2px solid #007bff';
    customAddressDiv.style.borderRadius = '8px';
    customAddressDiv.innerHTML = `
        <label for="customAddress" style="font-weight: bold; color: #007bff;">🦊 Enter Recipient's MetaMask Address:</label>
        <input type="text" id="customAddress" placeholder="0x1234567890abcdef..." 
               style="width: 100%; margin-top: 8px; padding: 10px; border: 2px solid #007bff; border-radius: 6px; font-family: monospace;">
        <div style="margin-top: 8px; padding: 8px; background: #e7f3ff; border-radius: 4px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>📍 Your current address:</strong>
                <button type="button" onclick="copyCurrentAddress()" style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    Copy My Address
                </button>
            </div>
            <code style="display: block; background: white; padding: 5px; border-radius: 3px; font-size: 11px; word-break: break-all;" id="currentAddressDisplay">
                ${currentAccount || 'Connect MetaMask first'}
            </code>
            <div style="margin-top: 8px;">
                <strong>💡 To share with someone:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Ask them for their MetaMask address</li>
                    <li>Or tell them to use "Copy My Address" button</li>
                </ul>
                <em style="color: #666;">They must connect with the exact address you enter here.</em>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('shareModal');
    const form = document.getElementById('shareForm');
    form.insertBefore(customAddressDiv, form.querySelector('button'));
    
    return customAddressDiv;
}

// Share document with MetaMask integration
document.getElementById('shareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let shareWith = document.getElementById('shareWithUser').value;
    const permission = document.getElementById('permission').value;
    
    // Handle custom address input
    if (shareWith === 'custom') {
        const customAddress = document.getElementById('customAddress')?.value;
        if (!customAddress || !customAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            document.getElementById('shareStatus').innerHTML = '<p class="error">❌ Please enter a valid MetaMask address (0x...)</p>';
            return;
        }
        shareWith = customAddress;
    }
    const statusDiv = document.getElementById('shareStatus');
    
    if (!shareWith || !permission) {
        statusDiv.innerHTML = '<p class="error">Please select a user and permission</p>';
        return;
    }
    
    if (!isWalletConnected()) {
        statusDiv.innerHTML = '<p class="error">❌ Please connect MetaMask first!</p>';
        return;
    }
    
    try {
        console.log('Share document starting - documentId:', currentDocumentToShare, 'shareWith:', shareWith, 'permission:', permission);
        statusDiv.innerHTML = '<p class="info">⏳ Step 1/2: Sending blockchain transaction...</p><p class="warning">🦊 Please confirm the transaction in MetaMask</p>';
        
        // Step 1: Share on blockchain via MetaMask
        const blockchainResult = await shareDocumentOnBlockchain(currentDocumentToShare, shareWith, permission);
        console.log('Blockchain result:', blockchainResult);
        
        statusDiv.innerHTML = '<p class="success">✅ Blockchain transaction confirmed!</p><p class="info">⏳ Step 2/2: Updating backend...</p>';
        
        // Step 2: Update backend with transaction data
        const currentAccount = window.getUserAccount ? window.getUserAccount() : window.userAccount;
        
        const response = await fetch(`${API_URL}/share-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                documentId: currentDocumentToShare,
                shareWith: shareWith,
                permission: permission,
                transactionHash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber,
                ownerAddress: currentAccount  // Add the actual MetaMask address
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <p class="success">🎉 Document shared successfully!</p>
                <p><strong>Transaction Hash:</strong> <a href="https://sepolia.etherscan.io/tx/${blockchainResult.transactionHash}" target="_blank">${blockchainResult.transactionHash}</a></p>
                <p class="info">✅ Real blockchain transaction completed!</p>
            `;
            
            setTimeout(() => {
                closeShareModal();
                loadMyDocuments();
            }, 3000);
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Share error:', error);
        statusDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
        
        if (error.message.includes('User denied')) {
            statusDiv.innerHTML += '<p class="info">💡 You cancelled the transaction in MetaMask</p>';
        } else if (error.message.includes('insufficient funds')) {
            statusDiv.innerHTML += '<p class="info">💡 You need Sepolia ETH for transactions. Get some from a faucet!</p>';
        }
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('shareModal');
    if (event.target === modal) {
        closeShareModal();
    }
}

// Add warning styles for MetaMask messages
const style = document.createElement('style');
style.textContent = `
    .warning {
        color: #ff6b35;
        background: #fff3e0;
        padding: 8px;
        border-radius: 4px;
        border-left: 4px solid #ff6b35;
        margin: 8px 0;
    }
    
    .blockchain-info {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #eee;
        font-family: monospace;
    }
    
    .blockchain-info small {
        color: #666;
    }
`;
document.head.appendChild(style);

// Removed dangerous debugging and ownership functions