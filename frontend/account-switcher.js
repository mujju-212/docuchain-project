// Account Switcher - Switch between different user accounts based on MetaMask wallet
class AccountSwitcher {
    constructor() {
        this.availableAccounts = [];
        this.currentAccount = null;
    }

    // Check what accounts are available for current MetaMask wallet
    async checkAvailableAccounts(walletAddress) {
        try {
            const response = await fetch(`${API_URL}/check-wallet-accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            if (result.success) {
                this.availableAccounts = result.accounts;
                return result.accounts;
            }
            return [];
        } catch (error) {
            console.error('Error checking accounts:', error);
            return [];
        }
    }

    // Show account switcher if multiple accounts available
    async showAccountSwitcher(walletAddress) {
        const accounts = await this.checkAvailableAccounts(walletAddress);
        
        if (accounts.length === 0) {
            // No accounts for this wallet - can register new account
            const shouldRegister = confirm(
                `🔗 No Account Found for This Wallet\n\n` +
                `Wallet: ${walletAddress}\n\n` +
                `Would you like to:\n` +
                `✅ Register a new account with this wallet\n` +
                `❌ Cancel and switch to a different MetaMask account`
            );
            
            if (shouldRegister) {
                window.location.href = 'register.html';
            }
            return false;
        } else if (accounts.length === 1) {
            // One account - auto login
            return await this.switchToAccount(accounts[0]);
        } else {
            // Multiple accounts - show selector
            return this.showAccountSelector(accounts, walletAddress);
        }
    }

    // Show account selector modal
    showAccountSelector(accounts, walletAddress) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'account-switch-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>🦊 Choose Account</h3>
                    <p>This wallet is connected to multiple accounts:</p>
                    <p class="wallet-address">${walletAddress}</p>
                    
                    <div class="account-list">
                        ${accounts.map((account, index) => `
                            <button class="account-option" onclick="selectAccount(${index})">
                                <div class="account-info">
                                    <strong>${account.username}</strong>
                                    <small>${account.email}</small>
                                </div>
                                <div class="account-stats">
                                    ${account.documentCount || 0} documents
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="modal-actions">
                        <button onclick="cancelSwitch()" class="btn btn-secondary">Cancel</button>
                        <button onclick="createNewAccount()" class="btn btn-primary">+ Create New Account</button>
                    </div>
                </div>
            `;
            
            // Add event handlers
            window.selectAccount = async (index) => {
                const success = await this.switchToAccount(accounts[index]);
                modal.remove();
                resolve(success);
            };
            
            window.cancelSwitch = () => {
                modal.remove();
                resolve(false);
            };
            
            window.createNewAccount = () => {
                modal.remove();
                window.location.href = 'register.html';
                resolve(false);
            };
            
            document.body.appendChild(modal);
        });
    }

    // Switch to specific account
    async switchToAccount(account) {
        try {
            const response = await fetch(`${API_URL}/switch-to-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: account.username,
                    walletAddress: account.walletAddress 
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Account switched successfully - reload page to update UI
                alert(`✅ Switched to account: ${account.username}`);
                window.location.reload();
                return true;
            } else {
                alert(`❌ Failed to switch account: ${result.error}`);
                return false;
            }
        } catch (error) {
            console.error('Error switching account:', error);
            alert('❌ Error switching account: ' + error.message);
            return false;
        }
    }

    // Check if current MetaMask wallet matches logged in account
    async checkWalletAccountMatch() {
        if (typeof window.ethereum === 'undefined') {
            return true; // No MetaMask, can't check
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) {
                return true; // No MetaMask connected
            }

            const currentMetaMaskWallet = accounts[0];
            const currentUserWallet = currentUser?.walletAddress;

            if (!currentUserWallet || currentUserWallet === '0x0000000000000000000000000000000000000000') {
                return true; // User has no wallet set
            }

            if (currentMetaMaskWallet.toLowerCase() !== currentUserWallet.toLowerCase()) {
                // Wallet mismatch - show switcher
                console.log('🔄 Wallet mismatch detected:', {
                    metamask: currentMetaMaskWallet,
                    account: currentUserWallet
                });

                const shouldSwitch = confirm(
                    `🦊 Wallet Mismatch Detected\n\n` +
                    `Your MetaMask wallet doesn't match your logged-in account:\n\n` +
                    `MetaMask: ${currentMetaMaskWallet}\n` +
                    `Account: ${currentUserWallet}\n\n` +
                    `Would you like to switch to an account that matches your current MetaMask wallet?`
                );

                if (shouldSwitch) {
                    return await this.showAccountSwitcher(currentMetaMaskWallet);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking wallet match:', error);
            return true;
        }
    }
}

// Create global account switcher
window.accountSwitcher = new AccountSwitcher();

// Add CSS for account switcher
const accountSwitcherStyles = `
<style>
.account-switch-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.account-switch-modal .modal-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.account-switch-modal h3 {
    margin: 0 0 20px 0;
    color: #333;
    text-align: center;
}

.wallet-address {
    background: #f5f5f5;
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    text-align: center;
    margin-bottom: 20px;
    word-break: break-all;
}

.account-list {
    margin: 20px 0;
}

.account-option {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    margin-bottom: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
}

.account-option:hover {
    background: #f8f9fa;
    border-color: #007bff;
    transform: translateY(-1px);
}

.account-info {
    text-align: left;
}

.account-info strong {
    display: block;
    color: #333;
    font-size: 16px;
}

.account-info small {
    color: #666;
    font-size: 12px;
}

.account-stats {
    color: #666;
    font-size: 12px;
    text-align: right;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.modal-actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
}

.modal-actions .btn-secondary {
    background: #6c757d;
    color: white;
}

.modal-actions .btn-primary {
    background: #007bff;
    color: white;
}

.modal-actions button:hover {
    opacity: 0.8;
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', accountSwitcherStyles);