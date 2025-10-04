const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentDocumentToShare = null;
let allUsers = [];

// Blockchain configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const CONTRACT_ADDRESS = '0x8FA367e26E1c9f303c9e87c32d595d02679BA621';

// MetaMask connection state
let web3 = null;
let userAccount = null;

// Smart Contract ABI (simplified for document operations)
const CONTRACT_ABI = [
    {
        "inputs": [{"name": "_ipfsHash", "type": "string"}, {"name": "_fileName", "type": "string"}, {"name": "_fileType", "type": "string"}],
        "name": "uploadDocument",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_documentId", "type": "uint256"}, {"name": "_userAddress", "type": "address"}, {"name": "_permission", "type": "string"}],
        "name": "shareDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await initializeMetaMask();
    if (currentUser) {
        loadMyDocuments();
    }
});

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/current-user`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('userInfo').textContent = 
                `👤 ${currentUser.username} | 💼 ${currentUser.walletAddress.substring(0, 8)}...`;
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

// Upload Document
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
    
    statusDiv.innerHTML = '<p class="info">⏳ Step 1/2: Uploading to IPFS...</p>';
    
    try {
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
            <p class="info">⏳ Step 2/2: Recording on Blockchain...</p>
        `;
        
        // Step 2: Upload to Blockchain
        const blockchainResponse = await fetch(`${API_URL}/upload-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                ipfsHash: ipfsData.ipfsHash,
                fileName: file.name,
                fileSize: file.size,
                documentType: documentType
            })
        });
        
        const blockchainData = await blockchainResponse.json();
        
        if (blockchainData.success) {
            statusDiv.innerHTML = `
                <p class="success">✅ Document uploaded successfully!</p>
                <p><strong>Transaction Hash:</strong> ${blockchainData.transactionHash}</p>
                <p><strong>Document ID:</strong> ${blockchainData.documentId}</p>
                <p><strong>Block Number:</strong> ${blockchainData.blockNumber}</p>
                <p><a href="${ipfsData.ipfsUrl}" target="_blank">View on IPFS</a></p>
            `;
            
            // Reset form
            document.getElementById('uploadForm').reset();
            
            // Refresh documents list
            setTimeout(() => loadMyDocuments(), 2000);
        } else {
            throw new Error(blockchainData.error);
        }
        
    } catch (error) {
        statusDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
    }
});

async function loadMyDocuments() {
    const listDiv = document.getElementById('myDocsList');
    listDiv.innerHTML = '<p class="info">⏳ Loading your documents...</p>';
    
    try {
        const response = await fetch(`${API_URL}/my-documents`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.documents.length === 0) {
                listDiv.innerHTML = '<p class="info">No documents yet. Upload your first document!</p>';
                return;
            }
            
            listDiv.innerHTML = data.documents.map(doc => `
                <div class="document-card">
                    <div class="doc-icon">📄</div>
                    <h3>${doc.fileName}</h3>
                    <p><strong>Type:</strong> ${doc.documentType}</p>
                    <p><strong>Size:</strong> ${formatFileSize(doc.fileSize)}</p>
                    <p><strong>Uploaded:</strong> ${formatDate(doc.timestamp)}</p>
                    <p class="doc-hash"><strong>IPFS:</strong> ${doc.ipfsHash.substring(0, 15)}...</p>
                    <div class="doc-actions">
                        <a href="${doc.ipfsUrl}" target="_blank" class="btn btn-small btn-primary">View</a>
                        <button onclick="downloadDocument('${doc.ipfsUrl}', '${doc.fileName}')" class="btn btn-small btn-secondary">Download</button>
                        <button onclick="openShareModal('${doc.documentId}')" class="btn btn-small btn-success">Share</button>
                    </div>
                </div>
            `).join('');
        } else {
            listDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        listDiv.innerHTML = `<p class="error">Error loading documents: ${error.message}</p>`;
    }
}

async function loadSharedDocuments() {
    const listDiv = document.getElementById('sharedDocsList');
    listDiv.innerHTML = '<p class="info">⏳ Loading shared documents...</p>';
    
    try {
        const response = await fetch(`${API_URL}/shared-documents`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.documents.length === 0) {
                listDiv.innerHTML = '<p class="info">No documents shared with you yet.</p>';
                return;
            }
            
            listDiv.innerHTML = data.documents.map(doc => `
                <div class="document-card">
                    <div class="doc-icon">📄</div>
                    <h3>${doc.fileName}</h3>
                    <p><strong>Type:</strong> ${doc.documentType}</p>
                    <p><strong>Size:</strong> ${formatFileSize(doc.fileSize)}</p>
                    <p><strong>Owner:</strong> ${doc.owner.substring(0, 10)}...</p>
                    <p><strong>Shared:</strong> ${formatDate(doc.timestamp)}</p>
                    <div class="doc-actions">
                        <a href="${doc.ipfsUrl}" target="_blank" class="btn btn-small btn-primary">View</a>
                        <button onclick="downloadDocument('${doc.ipfsUrl}', '${doc.fileName}')" class="btn btn-small btn-secondary">Download</button>
                    </div>
                </div>
            `).join('');
        } else {
            listDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        listDiv.innerHTML = `<p class="error">Error loading documents: ${error.message}</p>`;
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

function openShareModal(documentId) {
    currentDocumentToShare = documentId;
    
    const select = document.getElementById('shareUserSelect');
    select.innerHTML = '<option value="">Select user...</option>' +
        allUsers.map(user => 
            `<option value="${user.walletAddress}">${user.username} (${user.email})</option>`
        ).join('');
    
    document.getElementById('shareModal').style.display = 'block';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
    document.getElementById('shareStatus').innerHTML = '';
}

async function shareDocument() {
    const shareWith = document.getElementById('shareUserSelect').value;
    const permission = document.getElementById('sharePermission').value;
    const statusDiv = document.getElementById('shareStatus');
    
    if (!shareWith) {
        statusDiv.innerHTML = '<p class="error">Please select a user</p>';
        return;
    }
    
    statusDiv.innerHTML = '<p class="info">⏳ Sharing document on blockchain...</p>';
    
    try {
        const response = await fetch(`${API_URL}/share-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                documentId: currentDocumentToShare,
                shareWith: shareWith,
                permission: permission
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <p class="success">✅ Document shared successfully!</p>
                <p><strong>Transaction:</strong> ${data.transactionHash}</p>
            `;
            
            setTimeout(() => closeShareModal(), 3000);
        } else {
            statusDiv.innerHTML = `<p class="error">❌ Error: ${data.error}</p>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
    }
}

async function downloadDocument(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        alert('Error downloading file: ' + error.message);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('shareModal');
    if (event.target == modal) {
        closeShareModal();
    }
}