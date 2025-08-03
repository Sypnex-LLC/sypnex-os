# Performance Testing Suite

This directory contains all performance testing scripts, test databases, and performance reports for Sypnex OS.

## Scripts

### `test_sqlite_performance.py`
Comprehensive performance testing script that benchmarks:
- Virtual File System (VFS) operations
- User preferences operations  
- Concurrent access patterns
- Memory usage monitoring

Generates detailed performance reports in JSON format.

### `monitor_memory.py`
Real-time memory usage monitoring tool that:
- Tracks memory consumption during operations
- Compares different configuration modes
- Provides insights into memory optimization

## Test Databases

### Core VFS Testing
- `test_virtual_files.db` - Main VFS performance testing database
- `test_memory_vfs.db` - Memory-focused VFS testing database
- `test_concurrent_vfs.db` - Concurrent access testing database

### User Preferences Testing
- `test_user_preferences.db` - User preferences performance testing database

### Memory Configuration Testing
- `test_memory_normal.db` - Standard configuration memory testing
- `test_memory_optimized.db` - Optimized configuration memory testing

## Reports

### `performance_report.json`
Latest comprehensive performance report containing:
- VFS operation benchmarks (create, read, directory operations)
- Large file throughput testing
- User preferences performance metrics
- Concurrent access performance data
- Memory usage analysis

## Usage

Run the main performance test suite:
```bash
cd test_performance
python test_sqlite_performance.py
```

Monitor memory usage during operations:
```bash
cd test_performance
python monitor_memory.py
```

## Performance Benchmarks (Latest)

Based on the latest performance report:
- **File Creation**: 248 files/second
- **File Reading**: 237 reads/second  
- **Preferences**: 2,734 reads/second
- **Concurrent Operations**: 1,404 ops/second (5 threads)
- **Memory Usage**: ~32-45MB RAM footprint
- **Large File Throughput**: ~12MB/s

All tests validate that SQLite with WAL mode and optimized PRAGMA settings provides excellent performance for single-user containerized deployments.
