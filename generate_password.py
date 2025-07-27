#!/usr/bin/env python3
"""
Sypnex OS Password Generator

This script helps you generate bcrypt-hashed passwords for use in your .env configuration.
Run this script to create properly hashed credentials for AUTH_USER_X entries.

Requirements:
- bcrypt==3.2.0 (already in requirements.txt)

Usage:
    python generate_password.py           # Interactive mode
    python generate_password.py --demo    # Demo mode (shows example output)

The script will prompt you for a username and password, then output the properly
formatted AUTH_USER_X line that you can copy directly into your .env file.
"""

import bcrypt
import getpass
import sys

def generate_password_hash(password):
    """Generate a bcrypt hash for the given password."""
    # Generate salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def main():
    print("=" * 60)
    print("🔐 SYPNEX OS PASSWORD GENERATOR")
    print("=" * 60)
    print()
    print("This tool generates bcrypt-hashed passwords for your .env configuration.")
    print("The output can be copied directly into your .env file.")
    print()
    
    # Check for demo mode
    if len(sys.argv) > 1 and sys.argv[1] == '--demo':
        print("🎯 DEMO MODE - Generating example credentials")
        print()
        demo_username = "demo_user"
        demo_password = "secure_password_123"
        demo_hash = generate_password_hash(demo_password)
        
        print("=" * 60)
        print("📋 DEMO OUTPUT:")
        print("=" * 60)
        print()
        print(f"AUTH_USER_1={demo_username}:{demo_hash}")
        print()
        print("=" * 60)
        print("📝 DEMO EXPLANATION:")
        print("=" * 60)
        print(f"Username: {demo_username}")
        print(f"Password: {demo_password}")
        print("Hash: (securely generated bcrypt hash)")
        print()
        print("Run without --demo to create your own credentials interactively.")
        return
    
    try:
        # Get username
        username = input("Enter username: ").strip()
        if not username:
            print("❌ Username cannot be empty!")
            sys.exit(1)
        
        # Get password (hidden input)
        password = getpass.getpass("Enter password (input hidden): ").strip()
        if not password:
            print("❌ Password cannot be empty!")
            sys.exit(1)
        
        # Confirm password
        password_confirm = getpass.getpass("Confirm password: ").strip()
        if password != password_confirm:
            print("❌ Passwords do not match!")
            sys.exit(1)
        
        print()
        print("🔄 Generating hash...")
        
        # Generate the hash
        password_hash = generate_password_hash(password)
        
        print("✅ Hash generated successfully!")
        print()
        print("=" * 60)
        print("📋 COPY THIS LINE TO YOUR .env FILE:")
        print("=" * 60)
        print()
        print(f"AUTH_USER_X={username}:{password_hash}")
        print()
        print("=" * 60)
        print("📝 INSTRUCTIONS:")
        print("=" * 60)
        print("1. Replace 'X' with the next available number (e.g., AUTH_USER_1, AUTH_USER_2)")
        print("2. Copy the line above to your .env file")
        print("3. Restart Sypnex OS to apply the new credentials")
        print("4. The user can now log in with:")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print()
        print("🔒 Security Note: The password is now safely hashed and cannot be reversed.")
        print()
        
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
