# Performance Monitoring Endpoints

This document tracks all endpoints that have performance monitoring decorators applied for identifying slow operations.

## 📊 Monitoring Coverage Overview

### Bundle Routes (app.py)
**Purpose**: Monitor JavaScript/CSS bundle generation performance
- ✅ `/static/js/os.js` - `@monitor_performance(threshold=1.0)` 
- ✅ `/static/js/api.js` - `@monitor_performance(threshold=1.0)`
- ✅ `/static/css/bundle.css` - `@monitor_performance(threshold=0.5)`

### Core Routes (routes/core.py)
**Purpose**: Monitor critical app operations
- ✅ `/api/apps/<app_id>/launch` - `@monitor_critical_performance(threshold=0.5)` ⚡

### Virtual File System Routes (routes/virtual_files.py)
**Purpose**: Monitor VFS operations which are frequently used by apps
- ✅ `/api/virtual-files/write/<path:file_path>` (PUT) - `@monitor_critical_performance(threshold=0.3)` ⚡
- ✅ `/api/virtual-files/read/<path:file_path>` (GET) - `@monitor_performance(threshold=0.5)`
- ❌ `/api/virtual-files/upload-file-streaming` (POST) - **Not monitored** (file size/network dependent)
- ❌ `/api/virtual-files/serve/<path:file_path>` (GET) - **Not monitored** (file size/network dependent)

### Service Management Routes (routes/services.py)
**Purpose**: Monitor system service operations
- ✅ `/api/services/<service_id>/start` (POST) - `@monitor_critical_performance(threshold=1.0)` ⚡
- ✅ `/api/services/<service_id>/stop` (POST) - `@monitor_critical_performance(threshold=1.0)` ⚡

### User App Management Routes (routes/user_apps.py)
**Purpose**: Monitor app management operations
- ✅ `/api/user-apps/install` (POST) - `@monitor_critical_performance(threshold=5.0)` ⚡
- ✅ `/api/user-apps/refresh` (POST) - `@monitor_performance(threshold=3.0)`

## 🎯 Performance Thresholds Explained

### Critical Operations (`@monitor_critical_performance`)
These operations are logged as **ERROR** level if they exceed thresholds:
- **App Launch** (0.5s): User expects instant app opens
- **VFS Write** (0.3s): File saves should be near-instant with our new atomic write implementation
- **Service Start/Stop** (1.0s): System services should respond quickly
- **App Install** (5.0s): While slower, installations taking longer than 5s indicate problems

### Regular Operations (`@monitor_performance`)
These operations are logged as **WARN** level if they exceed thresholds:
- **Bundle Generation** (0.5-1.0s): JavaScript/CSS bundles should build quickly
- **File Reads** (0.5s): Reading files should be fast with our SQLite optimizations
- **App Discovery** (3.0s): Scanning for apps can take time but shouldn't hang

### Intentionally Not Monitored
These endpoints are **not monitored** to avoid false positives:
- **File Uploads** (`/upload-file-streaming`): Performance depends on file size and network speed
- **File Downloads** (`/serve`): Performance depends on file size and network speed
- **File Creation** (`/create-file`): Fast operation, rarely problematic

## 📈 Using Performance Logs for Metrics

All slow operations are logged to the logs manager with structured data:

```json
{
  "level": "warn|error",
  "message": "Slow request detected: function_name took 2.34s (threshold: 1.0s)",
  "component": "core-os",
  "source": "performance-monitor",
  "details": {
    "function": "write_virtual_file", 
    "duration_seconds": 2.34,
    "threshold_seconds": 1.0
  }
}
```

### Key Metrics to Track:
1. **Frequency** of slow operations by endpoint
2. **Average duration** for each monitored operation
3. **Peak times** when slowdowns occur
4. **Specific endpoints** that consistently exceed thresholds

## 🔍 Additional Endpoints to Consider

These endpoints are currently **not monitored** but could be added if issues arise:

### Lower Priority VFS Operations:
- `/api/virtual-files/list` - Directory listings
- `/api/virtual-files/create-file` - File creation
- `/api/virtual-files/create-folder` - Folder creation
- `/api/virtual-files/delete/<path>` - File/folder deletion

### System Operations:
- `/api/heartbeat` - System status (should always be fast)
- `/api/search` - App search functionality
- `/api/time` - Time queries (should be instant)

### User Management:
- Authentication endpoints in `/routes/auth.py`
- Preference operations in `/routes/preferences.py`

## 🚨 Alert Thresholds

Consider setting up alerts if you see:
- **>10 slow operations per hour** on any critical endpoint
- **>50% increase** in average response times
- **Any operation consistently exceeding 2x threshold**
- **VFS write operations >1s** (indicates SQLite performance issues)

## 📝 Adding New Monitoring

To monitor a new endpoint:

1. Import the decorators:
```python
from utils.performance_utils import monitor_performance, monitor_critical_performance
```

2. Add decorator to route:
```python
@app.route('/api/new-endpoint')
@monitor_critical_performance(threshold=0.5)  # or monitor_performance
def new_endpoint():
    # endpoint logic
```

3. Choose appropriate threshold based on operation type
4. Update this documentation

---

**Total Monitored Endpoints**: 9
**Critical Operations**: 5
**Regular Operations**: 4
