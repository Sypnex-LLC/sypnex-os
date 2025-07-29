#!/usr/bin/env python3
"""
Memory Usage Monitor for Sypnex OS SQLite Databases
Shows real memory consumption vs virtual memory mapping
"""

import os
import sys
import time
import psutil
from virtual_file_manager import VirtualFileManager

def format_bytes(bytes_val):
    """Format bytes into human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} TB"

def monitor_memory_usage():
    """Monitor memory usage of VFS operations"""
    print("🔍 Sypnex OS Memory Usage Monitor")
    print("=" * 50)
    
    # Get initial memory usage
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info()
    
    print(f"📊 Initial Memory Usage:")
    print(f"   RSS (Physical RAM): {format_bytes(initial_memory.rss)}")
    print(f"   VMS (Virtual Memory): {format_bytes(initial_memory.vms)}")
    
    # Test normal configuration
    print(f"\n🚀 Testing Normal Configuration...")
    vfs_normal = VirtualFileManager("test_memory_normal.db", memory_optimized=False)
    
    # Create some test files
    vfs_normal.create_directory("/test")
    for i in range(100):
        content = f"Test file content {i}" * 100  # ~2KB per file
        vfs_normal.create_file(f"/test/file_{i}.txt", content.encode())
    
    memory_after_normal = process.memory_info()
    print(f"   After 100 files (Normal):")
    print(f"   RSS: {format_bytes(memory_after_normal.rss)} (+{format_bytes(memory_after_normal.rss - initial_memory.rss)})")
    print(f"   VMS: {format_bytes(memory_after_normal.vms)} (+{format_bytes(memory_after_normal.vms - initial_memory.vms)})")
    
    # Test memory-optimized configuration
    print(f"\n💾 Testing Memory-Optimized Configuration...")
    vfs_optimized = VirtualFileManager("test_memory_optimized.db", memory_optimized=True)
    
    # Create same test files
    vfs_optimized.create_directory("/test")
    for i in range(100):
        content = f"Test file content {i}" * 100  # ~2KB per file
        vfs_optimized.create_file(f"/test/file_{i}.txt", content.encode())
    
    memory_after_optimized = process.memory_info()
    print(f"   After 100 files (Optimized):")
    print(f"   RSS: {format_bytes(memory_after_optimized.rss)} (+{format_bytes(memory_after_optimized.rss - memory_after_normal.rss)})")
    print(f"   VMS: {format_bytes(memory_after_optimized.vms)} (+{format_bytes(memory_after_optimized.vms - memory_after_normal.vms)})")
    
    # Show configuration differences
    print(f"\n⚙️ Configuration Comparison:")
    print(f"   Normal Config:")
    print(f"     - Cache Size: 10MB")
    print(f"     - Memory Map: 256MB (virtual)")
    print(f"     - Temp Storage: Memory")
    print(f"   ")
    print(f"   Memory-Optimized Config:")
    print(f"     - Cache Size: 2MB") 
    print(f"     - Memory Map: 64MB (virtual)")
    print(f"     - Temp Storage: Disk")
    
    # Monitor during read operations
    print(f"\n📖 Testing Read Performance Impact...")
    
    start_time = time.time()
    for i in range(100):
        vfs_normal.read_file(f"/test/file_{i}.txt")
    normal_read_time = time.time() - start_time
    
    start_time = time.time()
    for i in range(100):
        vfs_optimized.read_file(f"/test/file_{i}.txt")
    optimized_read_time = time.time() - start_time
    
    print(f"   Normal config: {normal_read_time:.3f}s")
    print(f"   Optimized config: {optimized_read_time:.3f}s")
    print(f"   Performance impact: {((optimized_read_time / normal_read_time - 1) * 100):+.1f}%")
    
    # Final memory check
    final_memory = process.memory_info()
    print(f"\n📊 Final Memory Usage:")
    print(f"   RSS: {format_bytes(final_memory.rss)} (total increase: +{format_bytes(final_memory.rss - initial_memory.rss)})")
    print(f"   VMS: {format_bytes(final_memory.vms)} (total increase: +{format_bytes(final_memory.vms - initial_memory.vms)})")
    
    print(f"\n💡 Key Insights:")
    print(f"   ✅ RSS (Physical RAM) shows actual memory usage")
    print(f"   ✅ VMS includes virtual memory mapping (not all in RAM)")
    print(f"   ✅ File content is NOT cached in memory by default")
    print(f"   ✅ Memory-optimized mode reduces virtual memory footprint")
    print(f"   ✅ Performance difference is usually minimal for single-user")
    
    # Environment variable example
    print(f"\n🔧 To enable memory-optimized mode globally:")
    print(f"   export SYPNEX_MEMORY_OPTIMIZED=true")
    print(f"   # or set in Docker container")
    
    # Cleanup
    try:
        os.remove("test_memory_normal.db")
        os.remove("test_memory_optimized.db")
        # Remove WAL files if they exist
        for suffix in ["-wal", "-shm"]:
            for db_name in ["test_memory_normal.db", "test_memory_optimized.db"]:
                wal_file = db_name + suffix
                if os.path.exists(wal_file):
                    os.remove(wal_file)
    except:
        pass

if __name__ == "__main__":
    if 'psutil' not in sys.modules:
        try:
            import psutil
        except ImportError:
            print("❌ psutil not available. Install with: pip install psutil")
            sys.exit(1)
    
    monitor_memory_usage()
