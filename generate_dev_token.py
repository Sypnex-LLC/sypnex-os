#!/usr/bin/env python3
"""
Developer Token Generator for Sypnex OS

This script generates long-lived JWT tokens for development tools like
dev_deploy.py and workflow_runner.py to authenticate with the Sypnex OS API.

Usage:
    python generate_dev_token.py
    python generate_dev_token.py --username bruce --days 365
    python generate_dev_token.py --help
"""

import jwt
import time
import argparse
import sys

def generate_dev_token(username="developer", days=365, secret_key="change-this-to-a-strong-secret-key-for-jwt-signing", instance_name="dev-server"):
    """
    Generate a long-lived JWT token for development tools
    
    Args:
        username: Username for the token (default: "developer")
        days: Token validity period in days (default: 365)
        secret_key: JWT signing secret (should match server)
        instance_name: Instance identifier (default: "dev-server")
    
    Returns:
        str: JWT token
    """
    current_time = time.time()
    expiration_time = current_time + (days * 24 * 60 * 60)  # Convert days to seconds
    
    # JWT payload
    payload = {
        'username': username,
        'created_at': current_time,
        'exp': expiration_time,
        'iss': instance_name,  # issuer
        'iat': current_time,   # issued at
        'dev_token': True      # Mark as developer token
    }
    
    # Sign with secret key
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    
    # Calculate expiration date for display
    from datetime import datetime, timezone
    exp_date = datetime.fromtimestamp(expiration_time, tz=timezone.utc)
    
    print(f"🔑 Generated Developer Token")
    print(f"   Username: {username}")
    print(f"   Valid for: {days} days")
    print(f"   Expires: {exp_date.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   Instance: {instance_name}")
    print(f"")
    print(f"Token:")
    print(f"{token}")
    print(f"")
    print(f"💡 Usage in Python scripts:")
    print(f"   headers = {{'X-Session-Token': '{token}'}}")
    print(f"   response = requests.post(url, headers=headers, json=data)")
    print(f"")
    print(f"⚠️  Keep this token secure - it provides full API access!")
    
    return token

def main():
    parser = argparse.ArgumentParser(description='Generate developer tokens for Sypnex OS API access')
    parser.add_argument('--username', '-u', default='developer', 
                       help='Username for the token (default: developer)')
    parser.add_argument('--days', '-d', type=int, default=365,
                       help='Token validity period in days (default: 365)')
    parser.add_argument('--secret', '-s', default='change-this-to-a-strong-secret-key-for-jwt-signing',
                       help='JWT signing secret (should match server)')
    parser.add_argument('--instance', '-i', default='dev-server',
                       help='Instance name (default: dev-server)')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Only output the token (for scripting)')
    
    args = parser.parse_args()
    
    try:
        if args.quiet:
            # For quiet mode, generate token without output
            current_time = time.time()
            expiration_time = current_time + (args.days * 24 * 60 * 60)
            
            payload = {
                'username': args.username,
                'created_at': current_time,
                'exp': expiration_time,
                'iss': args.instance,
                'iat': current_time,
                'dev_token': True
            }
            
            token = jwt.encode(payload, args.secret, algorithm='HS256')
            print(token)
        else:
            token = generate_dev_token(
                username=args.username,
                days=args.days,
                secret_key=args.secret,
                instance_name=args.instance
            )
        
        return 0
        
    except Exception as e:
        print(f"❌ Error generating token: {e}", file=sys.stderr)
        return 1

if __name__ == '__main__':
    exit(main())
