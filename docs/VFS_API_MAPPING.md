# Virtual File System (VFS) API Mapping Reference

This document provides a comprehensive mapping between the VFS Manager methods, Flask endpoints, and SypnexAPI helper methods.

## Complete Mapping Table

| **VFS Manager Method** | **Flask Route/Endpoint** | **HTTP Method** | **SypnexAPI Helper Method** | **Notes** |
|------------------------|---------------------------|-----------------|------------------------------|-----------|
| `get_system_stats()` | `/api/virtual-files/stats` | GET | `getVirtualFileStats()` | Returns VFS statistics (total files, dirs, size, etc.) |
| `list_directory(path)` | `/api/virtual-files/list?path=<path>` | GET | `listVirtualFiles(path)` | Lists directory contents with metadata (includes file sizes) |
| `create_directory(path)` | `/api/virtual-files/create-folder` | POST | `createVirtualFolder(name, parentPath)` | Creates new directories |
| `create_file(path, content, mime_type)` | `/api/virtual-files/create-file` | POST | `createVirtualFile(name, content, parentPath)` | Creates files with text content |
| `create_file(path, content)` | `/api/virtual-files/upload-file` | POST | `uploadVirtualFile(file, parentPath)` | Upload binary files from host filesystem |
| `read_file(path)` | `/api/virtual-files/read/<path:file_path>` | GET | `readVirtualFile(filePath)` | Returns complete file data and metadata |
| `read_file(path)` | `/api/virtual-files/read/<path:file_path>` | GET | `readVirtualFileText(filePath)` | Returns file content as text string |
| `read_file(path)` | `/api/virtual-files/read/<path:file_path>` | GET | `readVirtualFileJSON(filePath)` | Returns parsed JSON content |
| `read_file(path)` | `/api/virtual-files/serve/<path:file_path>` | GET | `getVirtualFileUrl(filePath)` | Serves file directly (binary/images/downloads) |
| `delete_path(path)` | `/api/virtual-files/delete/<path:item_path>` | DELETE | `deleteVirtualItem(itemPath)` | Recursively deletes files and directories |
| `get_file_info(path)` | `/api/virtual-files/info/<path:item_path>` | GET | `getVirtualItemInfo(itemPath)` | Returns file/directory metadata |
| `get_file_info(path)` | `/api/virtual-files/info/<path:item_path>` | GET | `virtualItemExists(itemPath)` | Checks if item exists (returns boolean) |
| `write_file(path, content)` | **❌ No direct endpoint** | - | `writeVirtualFile(filePath, content)` | **⚠️ Uses delete + create workaround** |
| `write_file(path, content)` | **❌ No direct endpoint** | - | `writeVirtualFileJSON(filePath, data)` | **⚠️ Uses delete + create workaround** |
| **🔧 Helper only** | **❌ No endpoint** | - | `createVirtualDirectoryStructure(dirPath)` | Creates parent directories recursively |

## Missing Implementations

### 🚨 Critical Missing Features

1. **Write/Update File Endpoint**
   - VFS Manager: ✅ `write_file(path, content)` exists
   - Flask Route: ❌ Missing endpoint for updating existing files
   - API Helper: ⚠️ Uses workaround (delete + recreate)

2. **Move/Rename Operations**
   - VFS Manager: ❌ No `move_file()` or `rename_file()` methods
   - Flask Route: ❌ No move/rename endpoints
   - API Helper: ❌ No move/rename helpers

3. **Copy Operations**
   - VFS Manager: ❌ No `copy_file()` or `copy_directory()` methods
   - Flask Route: ❌ No copy endpoints
   - API Helper: ❌ No copy helpers

4. **Directory Size Calculation**
   - VFS Manager: ✅ `get_directory_size(path)` exists
   - Flask Route: ❌ No endpoint to get directory size
   - API Helper: ❌ No helper for directory size
   - **Note:** ℹ️ File sizes are included in `list_directory()` response, so individual file sizes are available without separate endpoint

## API Method Details

### VFS Manager Core Methods

```python
# File Operations
create_file(path, content=b'', mime_type=None) -> bool
read_file(path) -> Optional[Dict[str, Any]]
write_file(path, content) -> bool  # ⚠️ No corresponding endpoint
delete_path(path) -> bool

# Directory Operations
create_directory(path) -> bool
list_directory(path='/') -> List[Dict[str, Any]]

# Information & Utilities
get_file_info(path) -> Optional[Dict[str, Any]]
get_directory_size(path) -> int  # ⚠️ No corresponding endpoint
get_system_stats() -> Dict[str, Any]
_path_exists(path) -> bool
```

### Flask Endpoints

```python
# GET endpoints
GET  /api/virtual-files/stats
GET  /api/virtual-files/list?path=<path>
GET  /api/virtual-files/read/<path:file_path>
GET  /api/virtual-files/serve/<path:file_path>
GET  /api/virtual-files/info/<path:item_path>

# POST endpoints
POST /api/virtual-files/create-folder
POST /api/virtual-files/create-file
POST /api/virtual-files/upload-file

# DELETE endpoints
DELETE /api/virtual-files/delete/<path:item_path>

# ❌ Missing endpoints
PUT    /api/virtual-files/write/<path:file_path>  # Update file content
PUT    /api/virtual-files/move                   # Move/rename items
POST   /api/virtual-files/copy                   # Copy items
GET    /api/virtual-files/size/<path:dir_path>   # Get directory size
```

### SypnexAPI Helper Methods

```javascript
// File Operations
async createVirtualFile(name, content, parentPath)
async readVirtualFile(filePath)
async readVirtualFileText(filePath)
async readVirtualFileJSON(filePath)
async writeVirtualFile(filePath, content)      // ⚠️ Workaround implementation
async writeVirtualFileJSON(filePath, data)     // ⚠️ Workaround implementation
async uploadVirtualFile(file, parentPath)
async deleteVirtualItem(itemPath)

// Directory Operations
async createVirtualFolder(name, parentPath)
async listVirtualFiles(path)
async createVirtualDirectoryStructure(dirPath) // 🔧 Helper utility

// Information & Utilities
async getVirtualItemInfo(itemPath)
async virtualItemExists(itemPath)
async getVirtualFileStats()
getVirtualFileUrl(filePath)                    // Returns direct URL
```

## Workaround Implementations

### Write File Workaround
The `writeVirtualFile()` API helper currently implements a workaround for updating files:

```javascript
async writeVirtualFile(filePath, content) {
    // 1. Check if file exists
    const exists = await this.virtualItemExists(filePath);
    
    if (exists) {
        // 2. Delete existing file
        await this.deleteVirtualItem(filePath);
    }
    
    // 3. Create new file with updated content
    const pathParts = filePath.split('/');
    const name = pathParts.pop();
    const parentPath = pathParts.join('/') || '/';
    
    return await this.createVirtualFile(name, content, parentPath);
}
```

**Issues with this approach:**
- ❌ File timestamps are reset
- ❌ File metadata is lost
- ❌ Not atomic (potential data loss if creation fails)
- ❌ Inefficient for large files

## Recommended Improvements

### 1. Add Write/Update Endpoint

```python
@app.route('/api/virtual-files/write/<path:file_path>', methods=['PUT'])
def write_virtual_file(file_path):
    """Write/update file content"""
    try:
        if not file_path.startswith('/'):
            file_path = '/' + file_path
            
        data = request.json
        content = data.get('content', '')
        content_bytes = content.encode('utf-8')
        
        success = managers['virtual_file_manager'].write_file(file_path, content_bytes)
        if success:
            return jsonify({'message': f'File {file_path} updated successfully'})
        else:
            return jsonify({'error': 'File not found or failed to update'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to write file'}), 500
```

### 2. Add Directory Size Endpoint

```python
@app.route('/api/virtual-files/size/<path:dir_path>', methods=['GET'])
def get_virtual_directory_size(dir_path):
    """Get directory size"""
    try:
        if not dir_path.startswith('/'):
            dir_path = '/' + dir_path
            
        size = managers['virtual_file_manager'].get_directory_size(dir_path)
        return jsonify({'path': dir_path, 'size': size})
    except Exception as e:
        return jsonify({'error': 'Failed to get directory size'}), 500
```

**Note:** This is for calculating total directory size recursively. Individual file sizes are already included in the `list_directory()` response.

### 3. Add Move/Rename Methods to VFS Manager

```python
def move_path(self, source_path: str, dest_path: str) -> bool:
    """Move/rename a file or directory"""
    # Implementation needed
    
def copy_path(self, source_path: str, dest_path: str) -> bool:
    """Copy a file or directory"""
    # Implementation needed
```

---

**Last Updated:** July 18, 2025  
**Version:** 1.0  
**Status:** Current implementation analysis
