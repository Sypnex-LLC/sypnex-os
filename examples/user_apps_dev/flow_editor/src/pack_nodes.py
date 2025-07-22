#!/usr/bin/env python3
"""
Flow Editor Node Packer
Packs all .node definition files into a single JSON file for efficient loading
"""

import os
import json
from pathlib import Path

def pack_node_definitions(source_dir, output_file="nodes-pack.json"):
    """
    Pack all .node files from source directory into a single JSON file
    
    Args:
        source_dir: Directory containing .node files
        output_file: Output file name for the packed nodes
    """
    source_path = Path(source_dir)
    
    if not source_path.exists():
        print(f"❌ Source directory '{source_dir}' does not exist")
        return False
    
    packed_nodes = {
        "version": "1.0.0",
        "packed_at": None,  # Will be set when packing
        "total_nodes": 0,
        "nodes": {}
    }
    
    # Find all .node files
    node_files = list(source_path.glob("*.node"))
    
    if not node_files:
        print(f"⚠️  No .node files found in '{source_dir}'")
        return False
    
    print(f"📦 Packing {len(node_files)} node definition files...")
    
    for node_file in node_files:
        try:
            with open(node_file, 'r', encoding='utf-8') as f:
                node_data = json.load(f)
            
            # Use the node's ID as the key, or filename if no ID
            node_id = node_data.get('id', node_file.stem)
            packed_nodes["nodes"][node_id] = node_data
            
            print(f"✓ Packed: {node_file.name} -> {node_id}")
            
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in {node_file.name}: {e}")
            continue
        except Exception as e:
            print(f"❌ Error reading {node_file.name}: {e}")
            continue
    
    # Set metadata
    from datetime import datetime
    packed_nodes["packed_at"] = datetime.now().isoformat()
    packed_nodes["total_nodes"] = len(packed_nodes["nodes"])
    
    # Write packed file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(packed_nodes, f, indent=2, ensure_ascii=False)
        
        print(f"\n🎉 Successfully packed {packed_nodes['total_nodes']} nodes!")
        print(f"📄 Output file: {output_file}")
        print(f"📊 File size: {os.path.getsize(output_file):,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ Error writing output file: {e}")
        return False

def main():
    """Main function"""
    import sys
    
    # Default paths
    default_source = "node-definitions"
    default_output = "node-definitions/nodes-pack.json"
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        source_dir = sys.argv[1]
    else:
        source_dir = default_source
    
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = default_output
    
    print("🔧 Flow Editor Node Packer")
    print("=" * 40)
    print(f"📂 Source: {source_dir}")
    print(f"📄 Output: {output_file}")
    print()
    
    success = pack_node_definitions(source_dir, output_file)
    
    if success:
        print("\n✅ Packing completed successfully!")
        print("\n📋 Next steps:")
        print("1. Upload the nodes-pack.json to your VFS at /nodes/")
        print("2. Update Flow Editor to load from the packed file")
        print("3. Enjoy single-request node loading! 🚀")
    else:
        print("\n❌ Packing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
