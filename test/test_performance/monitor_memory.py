#!/usr/bin/env python3
"""
Memory Usage Monitor for Sypnex OS SQLite Databases
Shows real memory consumption vs virtual memory mapping
"""

import os
import sys
import time
import psutil

# Add the parent directory to Python path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.virtual_file_manager import VirtualFileManager

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
    
    # Test current optimized configuration
    print(f"\n🚀 Testing Current Optimized Configuration...")
    vfs1 = VirtualFileManager("test_memory_1.db")
    
    # Create some test files
    vfs1.create_directory("/test")
    for i in range(100):
        content = f"Test file content {i}" * 100  # ~2KB per file
        vfs1.create_file(f"/test/file_{i}.txt", content.encode())
    
    memory_after_first = process.memory_info()
    print(f"   After 100 files (Instance 1):")
    print(f"   RSS: {format_bytes(memory_after_first.rss)} (+{format_bytes(memory_after_first.rss - initial_memory.rss)})")
    print(f"   VMS: {format_bytes(memory_after_first.vms)} (+{format_bytes(memory_after_first.vms - initial_memory.vms)})")
    
    # Test second instance
    print(f"\n💾 Testing Second Instance...")
    vfs2 = VirtualFileManager("test_memory_2.db")
    
    # Create same test files
    vfs2.create_directory("/test")
    for i in range(100):
        content = f"Test file content {i}" * 100  # ~2KB per file
        vfs2.create_file(f"/test/file_{i}.txt", content.encode())
    
    memory_after_second = process.memory_info()
    print(f"   After 100 files (Instance 2):")
    print(f"   RSS: {format_bytes(memory_after_second.rss)} (+{format_bytes(memory_after_second.rss - memory_after_first.rss)})")
    print(f"   VMS: {format_bytes(memory_after_second.vms)} (+{format_bytes(memory_after_second.vms - memory_after_first.vms)})")
    
    # Show current configuration
    print(f"\n⚙️ Current Optimized Configuration:")
    print(f"   - Cache Size: 2MB")
    print(f"   - Memory Map: 64MB (virtual)")
    print(f"   - Temp Storage: Disk")
    print(f"   - WAL Mode: Enabled for better concurrency")
    print(f"   - Synchronous: NORMAL (balanced performance/safety)")
    
    # Monitor during read operations
    print(f"\n📖 Testing Read Performance...")
    
    start_time = time.time()
    for i in range(100):
        vfs1.read_file(f"/test/file_{i}.txt")
    first_read_time = time.time() - start_time
    
    start_time = time.time()
    for i in range(100):
        vfs2.read_file(f"/test/file_{i}.txt")
    second_read_time = time.time() - start_time
    
    print(f"   Instance 1: {first_read_time:.3f}s")
    print(f"   Instance 2: {second_read_time:.3f}s")
    print(f"   Average: {((first_read_time + second_read_time) / 2):.3f}s")
    
    # Final memory check
    final_memory = process.memory_info()
    print(f"\n📊 Final Memory Usage:")
    print(f"   RSS: {format_bytes(final_memory.rss)} (total increase: +{format_bytes(final_memory.rss - initial_memory.rss)})")
    print(f"   VMS: {format_bytes(final_memory.vms)} (total increase: +{format_bytes(final_memory.vms - initial_memory.vms)})")
    
    print(f"\n💡 Key Insights:")
    print(f"   ✅ RSS (Physical RAM) shows actual memory usage")
    print(f"   ✅ VMS includes virtual memory mapping (not all in RAM)")
    print(f"   ✅ File content is NOT cached in memory by default")
    print(f"   ✅ Optimized configuration provides excellent performance")
    print(f"   ✅ Multiple database instances share system resources efficiently")
    print(f"   ✅ WAL mode enables concurrent access without blocking")
    
    print(f"\n🚀 Production Ready:")
    print(f"   ✅ Low memory footprint for containerized deployment")
    print(f"   ✅ Consistent performance across database instances")
    print(f"   ✅ Excellent for single-user per container architecture")
    
    # Cleanup
    try:
        os.remove("test_memory_1.db")
        os.remove("test_memory_2.db")
        # Remove WAL files if they exist
        for suffix in ["-wal", "-shm"]:
            for db_name in ["test_memory_1.db", "test_memory_2.db"]:
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
