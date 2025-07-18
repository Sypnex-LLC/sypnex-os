#!/usr/bin/env python3
"""
Node Deploy Script - Deploy node definition files to VFS /nodes/ directory
Usage: python node_deploy.py [options]
"""

import os
import sys
import requests
import json
import glob

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

def deploy_node_files(server_url="http://localhost:5000", specific_node=None):
    """Deploy .node files to VFS /nodes/ directory"""
    
    if specific_node:
        print(f"🚀 Node Deploy: Deploying {specific_node}")
    else:
        print(f"🚀 Node Deploy: Deploying all node definitions")
    print(f"🌐 Server: {server_url}")
    
    # Get the current script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    node_definitions_dir = os.path.join(script_dir, 'node-definitions')
    
    # Check if node-definitions directory exists
    if not os.path.exists(node_definitions_dir):
        print(f"❌ Error: node-definitions directory not found at {node_definitions_dir}")
        return False
    
    # Step 1: Ensure /nodes directory exists
    print(f"\n📁 Step 1: Ensuring /nodes directory exists...")
    if not check_and_create_nodes_directory(server_url):
        return False
    
    # Step 2: Find .node files
    print(f"\n🔍 Step 2: Finding .node files...")
    
    if specific_node:
        # Deploy specific node file
        if not specific_node.endswith('.node'):
            specific_node += '.node'
        
        node_file = os.path.join(node_definitions_dir, specific_node)
        if not os.path.exists(node_file):
            print(f"❌ Error: Node file '{specific_node}' not found in {node_definitions_dir}")
            return False
        
        node_files = [node_file]
        print(f"✅ Found specific node file: {specific_node}")
    else:
        # Deploy all .node files
        node_files = glob.glob(os.path.join(node_definitions_dir, '*.node'))
        
        if not node_files:
            print(f"❌ Error: No .node files found in {node_definitions_dir}")
            return False
        
        print(f"✅ Found {len(node_files)} .node files")
    
    # Step 3: Deploy each .node file
    print(f"\n📝 Step 3: Deploying node files to VFS...")
    success_count = 0
    failed_files = []
    
    for node_file in node_files:
        filename = os.path.basename(node_file)
        print(f"  📦 Deploying {filename}...")
        
        try:
            # Read the node file content
            with open(node_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file already exists in VFS
            file_vfs_path = f'/nodes/{filename}'
            check_response = requests.get(f'{server_url}/api/virtual-files/info{file_vfs_path}')
            
            if check_response.status_code == 200:
                print(f"    🔄 File already exists, overwriting...")
                # Delete existing file first
                delete_response = requests.delete(f'{server_url}/api/virtual-files/delete{file_vfs_path}')
                if delete_response.status_code != 200:
                    print(f"    ❌ Failed to delete existing file: {delete_response.status_code}")
                    failed_files.append(filename)
                    continue
            
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
                success_count += 1
            else:
                try:
                    error_data = create_response.json()
                    error_msg = error_data.get('error', 'Unknown error')
                except:
                    error_msg = f"Status {create_response.status_code}"
                
                print(f"    ❌ Failed: {error_msg}")
                failed_files.append(filename)
                
        except Exception as e:
            print(f"    ❌ Error deploying {filename}: {e}")
            failed_files.append(filename)
    
    # Step 4: Summary
    print(f"\n📊 Step 4: Deployment Summary")
    print(f"✅ Successfully deployed: {success_count}/{len(node_files)} files")
    
    if failed_files:
        print(f"❌ Failed files: {', '.join(failed_files)}")
        return False
    else:
        if specific_node:
            print(f"🎉 Node '{specific_node}' deployed successfully!")
        else:
            print(f"🎉 All node files deployed successfully!")
        return True

def main():
    """Main function"""
    server_url = "http://localhost:5000"
    specific_node = None
    
    # Parse options
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--server" and i + 1 < len(sys.argv):
            server_url = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--help" or sys.argv[i] == "-h":
            print("Node Deploy Script - Deploy node definition files to VFS /nodes/ directory")
            print("Usage: python node_deploy.py [node_name] [options]")
            print("\nExamples:")
            print("  python node_deploy.py                    # Deploy all nodes")
            print("  python node_deploy.py audio              # Deploy audio.node")
            print("  python node_deploy.py llm_chat.node      # Deploy llm_chat.node")
            print("  python node_deploy.py http --server http://localhost:5000")
            print("\nOptions:")
            print("  --server <url>  # Server URL (default: http://localhost:5000)")
            print("  --help, -h      # Show this help message")
            return
        elif not sys.argv[i].startswith('--'):
            # This is a node name argument
            specific_node = sys.argv[i]
            i += 1
        else:
            i += 1
    
    deploy_node_files(server_url, specific_node)

if __name__ == "__main__":
    main() 