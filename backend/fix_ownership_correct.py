#!/usr/bin/env python3
"""
Fix document ownership in database
"""

import sqlite3

def fix_ownership():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Check users
    c.execute('SELECT id, username, wallet_address FROM users')
    users = c.fetchall()
    print("=== USERS ===")
    for user in users:
        print(f"ID: {user['id']}, Username: {user['username']}, Address: {user['wallet_address']}")
    
    # Check current document ownership
    c.execute('SELECT id, owner_address, file_name FROM documents ORDER BY id')
    docs = c.fetchall()
    print("\n=== CURRENT DOCUMENT OWNERSHIP ===")
    for doc in docs:
        print(f"ID: {doc['id']}, Owner: {doc['owner_address']}, File: {doc['file_name']}")
    
    # The correct ownership should be:
    # mk (0xb4b587d39539e1dad0e7a720ab7fce48532dc793) should own most documents
    # mk2 (0x8fa367e26e1c9f303c9e87c32d595d02679ba621) should own only their own uploads
    
    mk_address = "0xb4b587d39539e1dad0e7a720ab7fce48532dc793"
    mk2_address = "0x8fa367e26e1c9f303c9e87c32d595d02679ba621"
    
    print(f"\n=== FIXING OWNERSHIP ===")
    print(f"mk address: {mk_address}")
    print(f"mk2 address: {mk2_address}")
    
    # Fix ownership based on file names - mk2 should only own files they uploaded
    mk2_files = ['1mk.pdf']  # Files that mk2 actually uploaded
    
    # Update mk's documents back to mk
    for doc in docs:
        if doc['file_name'] in mk2_files:
            # mk2 should own this
            if doc['owner_address'] != mk2_address:
                print(f"✅ Keeping {doc['file_name']} with mk2")
                c.execute('UPDATE documents SET owner_address = ? WHERE id = ?', 
                         (mk2_address, doc['id']))
        else:
            # mk should own this
            if doc['owner_address'] != mk_address:
                print(f"🔄 Fixing {doc['file_name']} ownership: {doc['owner_address']} → {mk_address}")
                c.execute('UPDATE documents SET owner_address = ? WHERE id = ?', 
                         (mk_address, doc['id']))
    
    conn.commit()
    
    # Check final result
    c.execute('SELECT id, owner_address, file_name FROM documents ORDER BY id')
    docs = c.fetchall()
    print("\n=== FIXED DOCUMENT OWNERSHIP ===")
    for doc in docs:
        owner = "mk" if doc['owner_address'] == mk_address else "mk2" if doc['owner_address'] == mk2_address else "unknown"
        print(f"ID: {doc['id']}, Owner: {owner} ({doc['owner_address']}), File: {doc['file_name']}")
    
    conn.close()
    print("\n✅ Ownership fixed!")

if __name__ == "__main__":
    fix_ownership()