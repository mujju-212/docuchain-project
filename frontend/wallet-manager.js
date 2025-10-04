// Wallet Manager - Handle Multiple Wallets per Account
class WalletManager {
    constructor() {
        this.connectedWallets = new Set();
        this.activeWallet = null;
        this.currentUser = null;
    }

    // Initialize wallet manager
    async init(user) {
        this.currentUser = user;
        await this.loadConnectedWallets();
        this.setupUI();
    }

    // Load user's connected wallets from backend
    async loadConnectedWallets() {
        try {
            const response = await fetch(`${API_URL}/user-wallets`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.connectedWallets = new Set(data.wallets);
                this.activeWallet = data.activeWallet || Array.from(this.connectedWallets)[0];
                console.log('📱 Loaded connected wallets:', Array.from(this.connectedWallets));
            }
        } catch (error) {
            console.error('Error loading wallets:', error);
        }
    }

    // Add a new wallet to user's account
    async addWallet(walletAddress) {
        try {
            const response = await fetch(`${API_URL}/add-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            if (result.success) {
                this.connectedWallets.add(walletAddress);
                console.log('✅ Wallet added:', walletAddress);
                this.updateWalletUI();
                return true;
            } else {
                console.error('Failed to add wallet:', result.error);
                
                // Show helpful error message for wallet conflicts
                if (result.code === 'WALLET_ALREADY_CONNECTED') {
                    alert(`❌ Wallet Already Connected\n\n${result.error}\n\n💡 ${result.suggestion}`);
                } else {
                    alert(`❌ Failed to add wallet: ${result.error}`);
                }
                return false;
            }
        } catch (error) {
            console.error('Error adding wallet:', error);
            return false;
        }
    }

    // Switch to a different connected wallet
    async switchWallet(walletAddress) {
        if (!this.connectedWallets.has(walletAddress)) {
            console.error('Wallet not connected to this account');
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/switch-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            if (result.success) {
                this.activeWallet = walletAddress;
                window.userAccount = walletAddress;
                console.log('🔄 Switched to wallet:', walletAddress);
                this.updateWalletUI();
                
                // Reload documents for new wallet
                if (window.loadMyDocuments) window.loadMyDocuments();
                if (window.loadSharedDocuments) window.loadSharedDocuments();
                
                return true;
            }
        } catch (error) {
            console.error('Error switching wallet:', error);
        }
        return false;
    }

    // Connect current MetaMask wallet to account
    async connectCurrentMetaMaskWallet() {
        if (typeof window.ethereum === 'undefined') {
            alert('❌ MetaMask not installed');
            return false;
        }

        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length === 0) {
                alert('❌ No MetaMask accounts found');
                return false;
            }

            const newWallet = accounts[0];
            
            // Check if wallet is already connected
            if (this.connectedWallets.has(newWallet)) {
                // Just switch to it
                await this.switchWallet(newWallet);
                alert(`🔄 Switched to existing wallet:\n${newWallet}`);
            } else {
                // Add new wallet
                const added = await this.addWallet(newWallet);
                if (added) {
                    await this.switchWallet(newWallet);
                    alert(`✅ New wallet connected:\n${newWallet}`);
                } else {
                    alert('❌ Failed to connect wallet');
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error connecting MetaMask wallet:', error);
            if (error.code === 4001) {
                alert('❌ MetaMask connection rejected');
            } else {
                alert('❌ Error connecting to MetaMask: ' + error.message);
            }
            return false;
        }
    }

    // Remove a wallet from account
    async removeWallet(walletAddress) {
        if (this.connectedWallets.size <= 1) {
            alert('❌ Cannot remove the last wallet. Add another wallet first.');
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/remove-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            if (result.success) {
                this.connectedWallets.delete(walletAddress);
                
                // If removing active wallet, switch to another
                if (this.activeWallet === walletAddress) {
                    const remainingWallets = Array.from(this.connectedWallets);
                    if (remainingWallets.length > 0) {
                        await this.switchWallet(remainingWallets[0]);
                    }
                }
                
                this.updateWalletUI();
                alert(`✅ Wallet removed: ${walletAddress}`);
                return true;
            }
        } catch (error) {
            console.error('Error removing wallet:', error);
        }
        return false;
    }

    // Setup wallet manager UI
    setupUI() {
        // Add wallet selector to header
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.connectedWallets.size > 1) {
            const walletSelector = this.createWalletSelector();
            userInfoElement.parentNode.insertBefore(walletSelector, userInfoElement.nextSibling);
        }

        // Add wallet management buttons
        this.addWalletManagementButtons();
    }

    // Create wallet selector dropdown
    createWalletSelector() {
        const selector = document.createElement('select');
        selector.id = 'walletSelector';
        selector.className = 'wallet-selector';
        selector.title = 'Switch between connected wallets';
        
        this.connectedWallets.forEach(wallet => {
            const option = document.createElement('option');
            option.value = wallet;
            option.textContent = `🦊 ${wallet.substring(0, 6)}...${wallet.substring(38)}`;
            if (wallet === this.activeWallet) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        selector.addEventListener('change', async (e) => {
            const selectedWallet = e.target.value;
            await this.switchWallet(selectedWallet);
        });

        return selector;
    }

    // Add wallet management buttons to dashboard
    addWalletManagementButtons() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const walletSection = document.createElement('div');
            walletSection.className = 'wallet-section';
            walletSection.innerHTML = `
                <h3>🦊 Wallet Management</h3>
                <button onclick="walletManager.connectCurrentMetaMaskWallet()" class="btn btn-primary">
                    + Add Current MetaMask
                </button>
                <button onclick="walletManager.showWalletList()" class="btn btn-secondary">
                    📋 Manage Wallets
                </button>
            `;
            sidebar.appendChild(walletSection);
        }
    }

    // Show wallet list management modal
    showWalletList() {
        const modal = document.createElement('div');
        modal.className = 'wallet-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Connected Wallets</h3>
                <div class="wallet-list">
                    ${Array.from(this.connectedWallets).map(wallet => `
                        <div class="wallet-item ${wallet === this.activeWallet ? 'active' : ''}">
                            <span>${wallet}</span>
                            <div class="wallet-actions">
                                ${wallet === this.activeWallet ? 
                                    '<span class="active-badge">Active</span>' : 
                                    `<button onclick="walletManager.switchWallet('${wallet}')" class="btn btn-sm">Switch</button>`
                                }
                                ${this.connectedWallets.size > 1 ? 
                                    `<button onclick="walletManager.removeWallet('${wallet}')" class="btn btn-sm btn-danger">Remove</button>` : ''
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Update wallet UI elements
    updateWalletUI() {
        // Update wallet selector if it exists
        const selector = document.getElementById('walletSelector');
        if (selector) {
            selector.innerHTML = '';
            this.connectedWallets.forEach(wallet => {
                const option = document.createElement('option');
                option.value = wallet;
                option.textContent = `🦊 ${wallet.substring(0, 6)}...${wallet.substring(38)}`;
                if (wallet === this.activeWallet) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });
        }

        // Update user info display
        if (this.currentUser && window.updateUserInfoUI) {
            window.updateUserInfoUI(this.currentUser.username, this.activeWallet, true);
        }
    }

    // Get current active wallet
    getActiveWallet() {
        return this.activeWallet;
    }

    // Get all connected wallets
    getConnectedWallets() {
        return Array.from(this.connectedWallets);
    }
}

// Create global wallet manager instance
window.walletManager = new WalletManager();

// CSS for wallet management
const walletStyles = `
<style>
.wallet-selector {
    margin-left: 10px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}

.wallet-section {
    margin-top: 20px;
    padding: 15px;
    border-top: 1px solid #eee;
}

.wallet-section h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
}

.wallet-section button {
    width: 100%;
    margin-bottom: 5px;
    padding: 8px;
    font-size: 12px;
}

.wallet-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
}

.wallet-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border: 1px solid #eee;
    margin-bottom: 5px;
    border-radius: 4px;
}

.wallet-item.active {
    background: #e8f5e8;
    border-color: #4CAF50;
}

.wallet-actions {
    display: flex;
    gap: 5px;
}

.active-badge {
    background: #4CAF50;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 12px;
}

.btn-danger {
    background: #f44336;
    color: white;
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', walletStyles);