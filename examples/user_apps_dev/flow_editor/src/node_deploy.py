#!/usr/bin/env python3
"""
Node Deploy Script - Deploy packed node definitions to VFS /nodes/ directory
Usage: python node_deploy.py [options]
"""

import os
import sys
import requests
import json

def check_and_create_nodes_directory(server_url="http://localhost:5000"):
    """Check if /nodes directory exists, create it if it doesn't"""
    try:
        # Try to get info about the /nodes directory
        response = requests.get(f'{server_url}/api/virtual-files/info/nodes')
        
        if response.status_code == 200:
            print(f"✅ /nodes directory already exists")
            return True
        elif response.status_code == 404:
            # Directory doesn't exist, create it
            print(f"📁 Creating /nodes directory...")
            create_response = requests.post(f'{server_url}/api/virtual-files/create-folder', 
                json={'name': 'nodes', 'parent_path': '/'})
            
            if create_response.status_code == 200:
                print(f"✅ Created /nodes directory")
                return True
            else:
                try:
                    error_data = create_response.json()
                    print(f"❌ Failed to create /nodes directory: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"❌ Failed to create /nodes directory: {create_response.status_code}")
                return False
        else:
            print(f"❌ Error checking /nodes directory: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Could not connect to server")
        print(f" Make sure your Sypnex OS server is running at {server_url}")
        return False
    except Exception as e:
        print(f"❌ Error checking/creating nodes directory: {e}")
        return False

def deploy_packed_nodes(server_url="http://localhost:5000"):
    """Deploy nodes-pack.json to VFS /nodes/ directory"""
    
    print(f"🚀 Node Deploy: Deploying packed node definitions")
    print(f"🌐 Server: {server_url}")
    
    # Get the current script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    node_definitions_dir = os.path.join(script_dir, 'node-definitions')
    pack_file = os.path.join(node_definitions_dir, 'nodes-pack.json')
    
    # Check if nodes-pack.json exists
    if not os.path.exists(pack_file):
        print(f"❌ Error: nodes-pack.json not found at {pack_file}")
        print(f"💡 Run 'python pack_nodes.py' first to create the packed file")
        return False
    
    # Step 1: Ensure /nodes directory exists
    print(f"\n📁 Step 1: Ensuring /nodes directory exists...")
    if not check_and_create_nodes_directory(server_url):
        return False
    
    # Step 2: Read and validate packed file
    print(f"\n� Step 2: Reading packed node file...")
    try:
        with open(pack_file, 'r', encoding='utf-8') as f:
            content = f.read()
            pack_data = json.loads(content)
        
        node_count = pack_data.get('total_nodes', 0)
        version = pack_data.get('version', 'unknown')
        print(f"✅ Loaded packed file: {node_count} nodes, version {version}")
        
    except Exception as e:
        print(f"❌ Error reading packed file: {e}")
        return False
    
    # Step 3: Deploy packed file to VFS
    print(f"\n📝 Step 3: Deploying nodes-pack.json to VFS...")
    filename = 'nodes-pack.json'
    file_vfs_path = f'/nodes/{filename}'
    
    try:
        # Check if file already exists in VFS
        check_response = requests.get(f'{server_url}/api/virtual-files/info{file_vfs_path}')
        
        if check_response.status_code == 200:
            print(f"    🔄 File already exists, overwriting...")
            # Delete existing file first
            delete_response = requests.delete(f'{server_url}/api/virtual-files/delete{file_vfs_path}')
            if delete_response.status_code != 200:
                print(f"    ❌ Failed to delete existing file: {delete_response.status_code}")
                return False
        
        # Create the file in VFS
        create_response = requests.post(f'{server_url}/api/virtual-files/create-file', 
            json={
                'name': filename,
                'parent_path': '/nodes',
                'content': content
            })
        
        if create_response.status_code == 200:
            result = create_response.json()
            print(f"    ✅ Success: {result.get('message', 'File written successfully')}")
        else:
            try:
                error_data = create_response.json()
                error_msg = error_data.get('error', 'Unknown error')
            except:
                error_msg = f"Status {create_response.status_code}"
            
            print(f"    ❌ Failed: {error_msg}")
            return False
            
    except Exception as e:
        print(f"    ❌ Error deploying {filename}: {e}")
        return False
    
    # Step 4: Summary
    print(f"\n📊 Step 4: Deployment Summary")
    print(f"✅ Successfully deployed nodes-pack.json with {node_count} nodes")
    print(f"🎉 Packed node definitions deployed successfully!")
    print(f"💡 Flow Editor will now load all nodes with a single HTTP request")
    return True

def main():
    """Main function"""
    server_url = "http://localhost:5000"
    
    # Parse options
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--server" and i + 1 < len(sys.argv):
            server_url = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--help" or sys.argv[i] == "-h":
            print("Node Deploy Script - Deploy packed node definitions to VFS /nodes/ directory")
            print("Usage: python node_deploy.py [options]")
            print("\nThis script deploys the nodes-pack.json file containing all node definitions.")
            print("Run 'python pack_nodes.py' first to create/update the packed file.")
            print("\nExamples:")
            print("  python node_deploy.py                    # Deploy packed nodes")
            print("  python node_deploy.py --server http://localhost:5000")
            print("\nOptions:")
            print("  --server <url>  # Server URL (default: http://localhost:5000)")
            print("  --help, -h      # Show this help message")
            return
        else:
            i += 1
    
    deploy_packed_nodes(server_url)

if __name__ == "__main__":
    main() 