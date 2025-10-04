# Backend endpoints for multiple wallet support

# Add these routes to app.py

@app.route('/api/user-wallets', methods=['GET'])
def get_user_wallets():
    """Get all wallets connected to current user's account"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user_id = session['user_id']
        
        conn = get_db()
        c = conn.cursor()
        
        # Get user's primary wallet
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Check if user_wallets table exists, if not create it
        c.execute('''CREATE TABLE IF NOT EXISTS user_wallets (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            wallet_address TEXT,
            is_active BOOLEAN DEFAULT 0,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, wallet_address)
        )''')
        
        # Get all connected wallets
        c.execute('SELECT wallet_address, is_active FROM user_wallets WHERE user_id = ?', (user_id,))
        wallet_rows = c.fetchall()
        
        wallets = []
        active_wallet = user[0]  # Default to primary wallet
        
        # Add primary wallet if not in user_wallets table
        primary_wallet = user[0]
        if primary_wallet and primary_wallet != '0x0000000000000000000000000000000000000000':
            wallets.append(primary_wallet)
        
        # Add additional wallets
        for wallet_address, is_active in wallet_rows:
            if wallet_address not in wallets:
                wallets.append(wallet_address)
            if is_active:
                active_wallet = wallet_address
        
        conn.close()
        
        return jsonify({
            'success': True,
            'wallets': wallets,
            'activeWallet': active_wallet
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add-wallet', methods=['POST'])
def add_wallet():
    """Add a new wallet to user's account"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        wallet_address = data.get('walletAddress')
        
        if not wallet_address:
            return jsonify({'success': False, 'error': 'Wallet address required'}), 400
        
        user_id = session['user_id']
        
        conn = get_db()
        c = conn.cursor()
        
        # Create user_wallets table if it doesn't exist
        c.execute('''CREATE TABLE IF NOT EXISTS user_wallets (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            wallet_address TEXT,
            is_active BOOLEAN DEFAULT 0,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, wallet_address)
        )''')
        
        # Check if wallet is already connected to this user
        c.execute('SELECT id FROM user_wallets WHERE user_id = ? AND wallet_address = ?', 
                 (user_id, wallet_address))
        existing = c.fetchone()
        
        if existing:
            return jsonify({'success': False, 'error': 'Wallet already connected to this account'}), 400
        
        # Check if wallet is connected to another user
        c.execute('SELECT username FROM users WHERE wallet_address = ?', (wallet_address,))
        other_user = c.fetchone()
        if other_user:
            return jsonify({'success': False, 'error': f'Wallet is already connected to user: {other_user[0]}'}), 400
        
        c.execute('SELECT username FROM user_wallets uw JOIN users u ON uw.user_id = u.id WHERE uw.wallet_address = ?', 
                 (wallet_address,))
        other_user_wallet = c.fetchone()
        if other_user_wallet:
            return jsonify({'success': False, 'error': f'Wallet is already connected to user: {other_user_wallet[0]}'}), 400
        
        # Add wallet to user's account
        c.execute('INSERT INTO user_wallets (user_id, wallet_address, is_active) VALUES (?, ?, ?)',
                 (user_id, wallet_address, False))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Wallet {wallet_address} added successfully'
        })
        
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Wallet already connected'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/switch-wallet', methods=['POST'])
def switch_wallet():
    """Switch to a different connected wallet"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        wallet_address = data.get('walletAddress')
        
        if not wallet_address:
            return jsonify({'success': False, 'error': 'Wallet address required'}), 400
        
        user_id = session['user_id']
        
        conn = get_db()
        c = conn.cursor()
        
        # Check if wallet belongs to this user
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        
        is_primary = user and user[0] == wallet_address
        
        if not is_primary:
            c.execute('SELECT id FROM user_wallets WHERE user_id = ? AND wallet_address = ?', 
                     (user_id, wallet_address))
            wallet_exists = c.fetchone()
            
            if not wallet_exists:
                return jsonify({'success': False, 'error': 'Wallet not connected to this account'}), 400
        
        # Deactivate all wallets for this user
        c.execute('UPDATE user_wallets SET is_active = 0 WHERE user_id = ?', (user_id,))
        
        # Activate the selected wallet
        if not is_primary:
            c.execute('UPDATE user_wallets SET is_active = 1 WHERE user_id = ? AND wallet_address = ?',
                     (user_id, wallet_address))
        
        # Update user's primary wallet address for compatibility
        c.execute('UPDATE users SET wallet_address = ? WHERE id = ?', (wallet_address, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Switched to wallet: {wallet_address}',
            'activeWallet': wallet_address
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/remove-wallet', methods=['POST'])
def remove_wallet():
    """Remove a wallet from user's account"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        wallet_address = data.get('walletAddress')
        
        if not wallet_address:
            return jsonify({'success': False, 'error': 'Wallet address required'}), 400
        
        user_id = session['user_id']
        
        conn = get_db()
        c = conn.cursor()
        
        # Count total wallets for this user
        c.execute('SELECT COUNT(*) FROM user_wallets WHERE user_id = ?', (user_id,))
        wallet_count = c.fetchone()[0]
        
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        has_primary = user and user[0] != '0x0000000000000000000000000000000000000000'
        
        total_wallets = wallet_count + (1 if has_primary else 0)
        
        if total_wallets <= 1:
            return jsonify({'success': False, 'error': 'Cannot remove the last wallet'}), 400
        
        # Check if this is the primary wallet
        if user and user[0] == wallet_address:
            # Get another wallet to make primary
            c.execute('SELECT wallet_address FROM user_wallets WHERE user_id = ? LIMIT 1', (user_id,))
            new_primary = c.fetchone()
            
            if new_primary:
                # Make another wallet the primary
                c.execute('UPDATE users SET wallet_address = ? WHERE id = ?', (new_primary[0], user_id))
                c.execute('DELETE FROM user_wallets WHERE user_id = ? AND wallet_address = ?', 
                         (user_id, new_primary[0]))
            else:
                return jsonify({'success': False, 'error': 'Cannot remove primary wallet without replacement'}), 400
        else:
            # Remove from user_wallets
            c.execute('DELETE FROM user_wallets WHERE user_id = ? AND wallet_address = ?', 
                     (user_id, wallet_address))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Wallet {wallet_address} removed successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500