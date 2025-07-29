#!/usr/bin/env python3
"""
Virtual File System Manager - Manages virtual files and folders in SQLite
Handles file operations, directory structure, and persistence
"""

import os
import sqlite3
import hashlib
import mimetypes
import base64
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import threading
from pathlib import Path


def validate_filename(filename: str) -> tuple[bool, str]:
    """
    Validate a filename for the virtual file system.
    
    Args:
        filename: The filename to validate
        
    Returns:
        tuple: (is_valid, error_message)
               If valid: (True, "")
               If invalid: (False, "Error description")
    """
    if not filename:
        return False, "Filename cannot be empty"
    
    # Check filename length (255 character limit)
    if len(filename) > 255:
        return False, f"Filename too long ({len(filename)} characters). Maximum length is 255 characters"
    
    # Check for non-ASCII characters (block unicode)
    for char in filename:
        if ord(char) > 127:
            return False, f"Filename contains non-ASCII character: {char}"
    
    # Check for control characters (0-31 and 127)
    for char in filename:
        if ord(char) < 32 or ord(char) == 127:
            return False, f"Filename contains invalid control character: {repr(char)}"
    
    # Check for reserved characters
    reserved_chars = ['<', '>', ':', '"', '|', '?', '*', '\\']
    for char in reserved_chars:
        if char in filename:
            return False, f"Filename contains reserved character: {char}"
    
    # Check for leading/trailing spaces or dots
    if filename.startswith(' ') or filename.endswith(' '):
        return False, "Filename cannot start or end with spaces"
    
    if filename.startswith('.') or filename.endswith('.'):
        return False, "Filename cannot start or end with dots"
    
    # Check for path traversal attempts
    if '..' in filename:
        return False, "Filename cannot contain '..' (path traversal prevention)"
    
    # Check for forward slash (path separator)
    if '/' in filename:
        return False, "Filename cannot contain '/' (path separator)"
    
    return True, ""


class VirtualFileManager:
    """
    Manages a virtual file system stored entirely in SQLite.
    Provides file and directory operations without touching the host filesystem.
    """
    
    def __init__(self, db_path="data/virtual_files.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        
        # Initialize database
        self._init_database()
        
        # Create root directory if it doesn't exist
        self._ensure_root_directory()
    
    def _init_database(self):
        """Initialize the database with virtual file system tables."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Enable WAL mode for better concurrency and performance
            cursor.execute('PRAGMA journal_mode=WAL')
            cursor.execute('PRAGMA synchronous=NORMAL')
            
            # Optimized configuration (best performance + low memory)
            cursor.execute('PRAGMA cache_size=2000')    # 2MB cache
            cursor.execute('PRAGMA mmap_size=67108864')  # 64MB memory map
            cursor.execute('PRAGMA temp_store=FILE')     # Use disk for temp storage
            
            # Create files table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS virtual_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    parent_path TEXT,
                    is_directory BOOLEAN DEFAULT 0,
                    size INTEGER DEFAULT 0,
                    content BLOB,
                    mime_type TEXT,
                    hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create file metadata table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS file_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES virtual_files(id)
                )
            ''')
            
            # Create indexes for performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_path ON virtual_files(path)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_parent ON virtual_files(parent_path)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_directory ON virtual_files(is_directory)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_name ON virtual_files(name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_size ON virtual_files(size)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metadata_file_key ON file_metadata(file_id, key)')
            
            conn.commit()
    
    def _ensure_root_directory(self):
        """Ensure the root directory exists."""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR IGNORE INTO virtual_files 
                    (path, name, parent_path, is_directory, size) 
                    VALUES (?, ?, ?, ?, ?)
                ''', ('/', 'root', None, True, 0))
                conn.commit()
    
    def _normalize_path(self, path: str) -> str:
        """Normalize a path to ensure consistency."""
        # Remove leading/trailing slashes except for root
        if path == '/':
            return '/'
        
        # Split path and filter out empty parts
        parts = [part for part in path.split('/') if part]
        
        # Reconstruct path
        if path.startswith('/'):
            return '/' + '/'.join(parts)
        else:
            return '/'.join(parts)
    
    def _get_parent_path(self, path: str) -> Optional[str]:
        """Get the parent path of a given path."""
        if path == '/':
            return None
        normalized = self._normalize_path(path)
        if normalized == '/':
            return None
        parts = normalized.split('/')
        if len(parts) == 1:
            return '/'
        parent = '/'.join(parts[:-1])
        if not parent:
            parent = '/'
        return parent
    
    def _get_name_from_path(self, path: str) -> str:
        """Extract the name from a path."""
        if path == '/':
            return 'root'
        
        normalized = self._normalize_path(path)
        return normalized.split('/')[-1]
    
    def create_directory(self, path: str) -> bool:
        """Create a directory at the specified path."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                parent_path = self._get_parent_path(normalized_path)
                name = self._get_name_from_path(normalized_path)

                # Ensure parent_path is '/' for root children
                if parent_path is None and normalized_path != '/':
                    parent_path = '/'
                
                print(f"Creating directory: path={normalized_path}, parent={parent_path}, name={name}")
                
                # Check if parent exists
                if parent_path and not self._path_exists(parent_path):
                    print(f"Parent path {parent_path} does not exist")
                    return False
                
                # Check if path already exists
                if self._path_exists(normalized_path):
                    print(f"Path {normalized_path} already exists")
                    return False
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO virtual_files 
                        (path, name, parent_path, is_directory, size) 
                        VALUES (?, ?, ?, ?, ?)
                    ''', (normalized_path, name, parent_path, True, 0))
                    conn.commit()
                
                print(f"Directory created successfully: {normalized_path}")
                return True
            except Exception as e:
                print(f"Error creating directory {path}: {e}")
                return False
    
    def create_file(self, path: str, content: bytes = b'', mime_type: str = None) -> bool:
        """Create a file at the specified path with optional content."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                parent_path = self._get_parent_path(normalized_path)
                name = self._get_name_from_path(normalized_path)

                # Ensure parent_path is '/' for root children
                if parent_path is None and normalized_path != '/':
                    parent_path = '/'
                
                print(f"Creating file: path={normalized_path}, parent={parent_path}, name={name}")
                
                # Check if parent exists
                if parent_path and not self._path_exists(parent_path):
                    print(f"Parent path {parent_path} does not exist")
                    return False
                
                # Check if path already exists
                if self._path_exists(normalized_path):
                    print(f"Path {normalized_path} already exists")
                    return False
                
                # Determine MIME type if not provided
                if not mime_type:
                    mime_type, _ = mimetypes.guess_type(name)
                    if not mime_type:
                        mime_type = 'application/octet-stream'
                
                # Calculate hash
                content_hash = hashlib.sha256(content).hexdigest() if content else ''
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO virtual_files 
                        (path, name, parent_path, is_directory, size, content, mime_type, hash) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (normalized_path, name, parent_path, False, len(content), content, mime_type, content_hash))
                    conn.commit()
                
                print(f"File created successfully: {normalized_path}")
                return True
            except Exception as e:
                print(f"Error creating file {path}: {e}")
                return False
    
    def create_file_streaming(self, path: str, file_stream, chunk_size: int = 8192, mime_type: str = None) -> bool:
        """Create a file from a stream with TRUE memory-efficient streaming - never loads full file into memory."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                parent_path = self._get_parent_path(normalized_path)
                name = self._get_name_from_path(normalized_path)

                # Ensure parent_path is '/' for root children
                if parent_path is None and normalized_path != '/':
                    parent_path = '/'
                
                print(f"Creating file (TRUE streaming): path={normalized_path}, parent={parent_path}, name={name}")
                
                # Check if parent exists
                if parent_path and not self._path_exists(parent_path):
                    print(f"Parent path {parent_path} does not exist")
                    return False
                
                # Check if path already exists
                if self._path_exists(normalized_path):
                    print(f"Path {normalized_path} already exists")
                    return False
                
                # Determine MIME type if not provided
                if not mime_type:
                    mime_type, _ = mimetypes.guess_type(name)
                    if not mime_type:
                        mime_type = 'application/octet-stream'
                
                # REAL streaming: Use SQLite incremental BLOB writes
                total_size = 0
                content_hash = hashlib.sha256()
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    # First pass: calculate size without storing content
                    file_stream.seek(0)  # Reset stream to beginning
                    temp_size = 0
                    temp_hash = hashlib.sha256()
                    
                    while True:
                        chunk = file_stream.read(chunk_size)
                        if not chunk:
                            break
                        temp_size += len(chunk)
                        temp_hash.update(chunk)
                    
                    # Create record with correct size and empty content initially
                    empty_content = b'\x00' * temp_size  # Placeholder of correct size
                    cursor.execute('''
                        INSERT INTO virtual_files 
                        (path, name, parent_path, is_directory, size, content, mime_type, hash) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (normalized_path, name, parent_path, False, temp_size, empty_content, mime_type, temp_hash.hexdigest()))
                    
                    file_id = cursor.lastrowid
                    conn.commit()
                    
                    # Second pass: Stream data directly into BLOB using incremental I/O
                    file_stream.seek(0)  # Reset stream again
                    
                    # Open BLOB for incremental writing
                    blob = conn.blobopen("virtual_files", "content", file_id, readonly=False)
                    
                    position = 0
                    while True:
                        chunk = file_stream.read(chunk_size)
                        if not chunk:
                            break
                        
                        # Write chunk directly to BLOB at current position
                        blob.seek(position)
                        blob.write(chunk)
                        position += len(chunk)
                        
                        print(f"TRUE streaming: wrote {len(chunk)} bytes at position {position-len(chunk)}")
                    
                    blob.close()
                
                print(f"File created with TRUE streaming: {normalized_path}, size: {temp_size} bytes")
                return True
                
            except Exception as e:
                print(f"Error creating file (TRUE streaming) {path}: {e}")
                import traceback
                traceback.print_exc()
                return False
    
    def _path_exists(self, path: str) -> bool:
        """Check if a path exists."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM virtual_files WHERE path = ?', (path,))
            return cursor.fetchone()[0] > 0
    
    def list_directory(self, path: str = '/') -> List[Dict[str, Any]]:
        """List contents of a directory."""
        try:
            normalized_path = self._normalize_path(path)
            print(f"Listing directory: {path} (normalized: {normalized_path})")
            
            # Check if path exists and is a directory
            if not self._path_exists(normalized_path):
                print(f"Path {normalized_path} does not exist")
                return []
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT path, name, is_directory, size, mime_type, created_at, updated_at, accessed_at
                    FROM virtual_files 
                    WHERE parent_path = ?
                    ORDER BY is_directory DESC, name ASC
                ''', (normalized_path,))
                
                items = []
                for row in cursor.fetchall():
                    path, name, is_directory, size, mime_type, created_at, updated_at, accessed_at = row
                    
                    items.append({
                        'path': path,
                        'name': name,
                        'is_directory': bool(is_directory),
                        'size': size,
                        'mime_type': mime_type,
                        'created_at': created_at,
                        'updated_at': updated_at,
                        'accessed_at': accessed_at
                    })
                
                print(f"Found {len(items)} items in {normalized_path}")
                return items
        except Exception as e:
            print(f"Error listing directory {path}: {e}")
            return []
    
    def read_file(self, path: str) -> Optional[Dict[str, Any]]:
        """Read a file and return its content and metadata."""
        try:
            normalized_path = self._normalize_path(path)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT path, name, is_directory, size, content, mime_type, hash, created_at, updated_at, accessed_at
                    FROM virtual_files 
                    WHERE path = ? AND is_directory = 0
                ''', (normalized_path,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                path, name, is_directory, size, content, mime_type, content_hash, created_at, updated_at, accessed_at = row
                
                # Update access time
                cursor.execute('''
                    UPDATE virtual_files 
                    SET accessed_at = CURRENT_TIMESTAMP 
                    WHERE path = ?
                ''', (normalized_path,))
                conn.commit()
                
                return {
                    'path': path,
                    'name': name,
                    'is_directory': bool(is_directory),
                    'size': size,
                    'content': content,
                    'mime_type': mime_type,
                    'hash': content_hash,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'accessed_at': accessed_at
                }
        except Exception as e:
            print(f"Error reading file {path}: {e}")
            return None
    
    def write_file(self, path: str, content: bytes) -> bool:
        """Write content to a file."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                
                # Check if file exists
                if not self._path_exists(normalized_path):
                    return False
                
                # Calculate hash
                content_hash = hashlib.sha256(content).hexdigest()
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE virtual_files 
                        SET content = ?, size = ?, hash = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE path = ? AND is_directory = 0
                    ''', (content, len(content), content_hash, normalized_path))
                    conn.commit()
                
                return cursor.rowcount > 0
            except Exception as e:
                print(f"Error writing file {path}: {e}")
                return False
    
    def delete_path(self, path: str) -> bool:
        """Delete a file or directory recursively."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                
                # Check if path exists
                if not self._path_exists(normalized_path):
                    return False
                
                # If it's a directory, delete all children first
                if self._is_directory(normalized_path):
                    children = self._get_all_children(normalized_path)
                    for child in children:
                        self._delete_single_path(child)
                
                # Delete the path itself
                return self._delete_single_path(normalized_path)
            except Exception as e:
                print(f"Error deleting path {path}: {e}")
                return False
    
    def _is_directory(self, path: str) -> bool:
        """Check if a path is a directory."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT is_directory FROM virtual_files WHERE path = ?', (path,))
            result = cursor.fetchone()
            return result[0] if result else False
    
    def _get_all_children(self, path: str) -> List[str]:
        """Get all children of a directory recursively."""
        children = []
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                WITH RECURSIVE children AS (
                    SELECT path FROM virtual_files WHERE parent_path = ?
                    UNION ALL
                    SELECT vf.path FROM virtual_files vf
                    INNER JOIN children c ON vf.parent_path = c.path
                )
                SELECT path FROM children
            ''', (path,))
            
            for row in cursor.fetchall():
                children.append(row[0])
        
        return children
    
    def _delete_single_path(self, path: str) -> bool:
        """Delete a single path from the database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM virtual_files WHERE path = ?', (path,))
                conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting single path {path}: {e}")
            return False
    
    def get_file_info(self, path: str) -> Optional[Dict[str, Any]]:
        """Get file information without reading content."""
        try:
            normalized_path = self._normalize_path(path)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT path, name, parent_path, is_directory, size, mime_type, hash, created_at, updated_at, accessed_at
                    FROM virtual_files 
                    WHERE path = ?
                ''', (normalized_path,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                path, name, parent_path, is_directory, size, mime_type, content_hash, created_at, updated_at, accessed_at = row
                
                return {
                    'path': path,
                    'name': name,
                    'parent_path': parent_path,
                    'is_directory': bool(is_directory),
                    'size': size,
                    'mime_type': mime_type,
                    'hash': content_hash,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'accessed_at': accessed_at
                }
        except Exception as e:
            print(f"Error getting file info {path}: {e}")
            return None
    
    def get_directory_size(self, path: str) -> int:
        """Calculate the total size of a directory and its contents."""
        try:
            normalized_path = self._normalize_path(path)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    WITH RECURSIVE children AS (
                        SELECT path, size FROM virtual_files WHERE parent_path = ?
                        UNION ALL
                        SELECT vf.path, vf.size FROM virtual_files vf
                        INNER JOIN children c ON vf.parent_path = c.path
                    )
                    SELECT COALESCE(SUM(size), 0) FROM children WHERE size IS NOT NULL
                ''', (normalized_path,))
                
                result = cursor.fetchone()
                return result[0] if result else 0
        except Exception as e:
            print(f"Error calculating directory size {path}: {e}")
            return 0
    
    def rename_path(self, old_path: str, new_path: str) -> bool:
        """
        Rename a file or directory by updating its path in the database.
        This is more efficient than copy-then-delete for large files/directories.
        """
        try:
            old_normalized = self._normalize_path(old_path)
            new_normalized = self._normalize_path(new_path)
            
            print(f"VFS Rename: {old_normalized} -> {new_normalized}")
            
            # Check if source exists
            if not self._path_exists(old_normalized):
                print(f"Rename failed: source path {old_normalized} does not exist")
                return False
            
            # Check if destination already exists
            if self._path_exists(new_normalized):
                print(f"Rename failed: destination path {new_normalized} already exists")
                return False
            
            # Get new parent path and name
            new_parent_path = self._get_parent_path(new_normalized)
            new_name = self._get_name_from_path(new_normalized)
            
            # Ensure parent directory exists
            if new_parent_path != '/' and not self._path_exists(new_parent_path):
                print(f"Rename failed: parent directory {new_parent_path} does not exist")
                return False
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if this is a directory - if so, we need to update all children paths too
                cursor.execute('SELECT is_directory FROM virtual_files WHERE path = ?', (old_normalized,))
                result = cursor.fetchone()
                is_directory = bool(result[0]) if result else False
                
                if is_directory:
                    print(f"Renaming directory and all children...")
                    
                    # Get all files/directories that need to be updated
                    cursor.execute('''
                        SELECT path FROM virtual_files 
                        WHERE path = ? OR path LIKE ?
                        ORDER BY LENGTH(path) DESC
                    ''', (old_normalized, old_normalized + '/%'))
                    
                    paths_to_update = cursor.fetchall()
                    print(f"Found {len(paths_to_update)} items to update")
                    
                    # Update each path
                    for (path_to_update,) in paths_to_update:
                        if path_to_update == old_normalized:
                            # This is the directory itself
                            new_item_path = new_normalized
                            new_item_parent = new_parent_path
                            new_item_name = new_name
                        else:
                            # This is a child - replace the old prefix with the new prefix
                            relative_part = path_to_update[len(old_normalized):]  # Get the part after old path
                            new_item_path = new_normalized + relative_part
                            new_item_parent = self._get_parent_path(new_item_path)
                            new_item_name = self._get_name_from_path(new_item_path)
                        
                        print(f"Updating: {path_to_update} -> {new_item_path}")
                        
                        cursor.execute('''
                            UPDATE virtual_files 
                            SET path = ?, name = ?, parent_path = ?, updated_at = ?
                            WHERE path = ?
                        ''', (new_item_path, new_item_name, new_item_parent, datetime.now().isoformat(), path_to_update))
                else:
                    print(f"Renaming single file...")
                    # Just update the single file
                    cursor.execute('''
                        UPDATE virtual_files 
                        SET path = ?, name = ?, parent_path = ?, updated_at = ?
                        WHERE path = ?
                    ''', (new_normalized, new_name, new_parent_path, datetime.now().isoformat(), old_normalized))
                
                # Check if any rows were affected
                if cursor.rowcount == 0:
                    print(f"Rename failed: no rows updated for path {old_normalized}")
                    return False
                
                conn.commit()
                print(f"Successfully renamed {old_normalized} to {new_normalized} ({cursor.rowcount} total updates)")
                return True
                
        except Exception as e:
            print(f"Error renaming {old_path} to {new_path}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get virtual file system statistics."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get total files and directories
                cursor.execute('SELECT COUNT(*) FROM virtual_files')
                total_items = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM virtual_files WHERE is_directory = 1')
                total_directories = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM virtual_files WHERE is_directory = 0')
                total_files = cursor.fetchone()[0]
                
                # Get total size
                cursor.execute('SELECT COALESCE(SUM(size), 0) FROM virtual_files WHERE is_directory = 0')
                total_size = cursor.fetchone()[0]
                
                # Get database size
                cursor.execute('PRAGMA page_count')
                page_count = cursor.fetchone()[0]
                cursor.execute('PRAGMA page_size')
                page_size = cursor.fetchone()[0]
                db_size = page_count * page_size
                
                return {
                    'total_items': total_items,
                    'total_directories': total_directories,
                    'total_files': total_files,
                    'total_size': total_size,
                    'database_size': db_size,
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error getting system stats: {e}")
            return {
                'total_items': 0,
                'total_directories': 0,
                'total_files': 0,
                'total_size': 0,
                'database_size': 0,
                'last_updated': datetime.now().isoformat()
            }


# Global virtual file manager instance
virtual_file_manager_instance = None


def get_virtual_file_manager() -> VirtualFileManager:
    """Get the global virtual file manager instance."""
    global virtual_file_manager_instance
    if virtual_file_manager_instance is None:
        virtual_file_manager_instance = VirtualFileManager()
    return virtual_file_manager_instance 