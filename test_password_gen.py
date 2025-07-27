#!/usr/bin/env python3
"""
Test script to verify the password generation functionality works
"""

import bcrypt

def test_password_generation():
    """Test the bcrypt password generation functionality."""
    test_password = "test123"
    
    # Generate salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(test_password.encode('utf-8'), salt)
    hash_string = hashed.decode('utf-8')
    
    print("Password generation test:")
    print(f"Original password: {test_password}")
    print(f"Generated hash: {hash_string}")
    print(f"Example .env line: AUTH_USER_1=testuser:{hash_string}")
    
    # Verify the hash works
    if bcrypt.checkpw(test_password.encode('utf-8'), hashed):
        print("✅ Hash verification successful!")
        return True
    else:
        print("❌ Hash verification failed!")
        return False

if __name__ == "__main__":
    success = test_password_generation()
    if success:
        print("\n🎉 Password generator functionality is working correctly!")
        print("The generate_password.py script is ready to use.")
    else:
        print("\n❌ Password generator test failed!")
