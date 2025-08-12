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
            
            # Check current schema version
            cursor.execute('PRAGMA user_version')
            current_version = cursor.fetchone()[0]
            
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
            
            # Run schema migrations
            self._run_schema_migrations(cursor, current_version)
            
            # Create indexes for performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_path ON virtual_files(path)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_parent ON virtual_files(parent_path)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_directory ON virtual_files(is_directory)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_name ON virtual_files(name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_virtual_files_size ON virtual_files(size)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metadata_file_key ON file_metadata(file_id, key)')
            
            conn.commit()
    
    def _run_schema_migrations(self, cursor, current_version):
        """Run database schema migrations based on current version."""
        target_version = 2  # Latest schema version
        
        print(f"🔄 Database schema: current={current_version}, target={target_version}")
        
        if current_version < 1:
            # Migration 1: Add is_chunked column to virtual_files table
            self._migrate_to_version_1(cursor)
            
        if current_version < 2:
            # Migration 2: Add file_chunks table for chunked storage
            self._migrate_to_version_2(cursor)
            
        # Update schema version
        if current_version < target_version:
            cursor.execute(f'PRAGMA user_version = {target_version}')
            print(f"✅ Database schema updated to version {target_version}")
    
    def _migrate_to_version_1(self, cursor):
        """Migration 1: Add is_chunked column to virtual_files table."""
        try:
            # Check if column already exists
            cursor.execute("PRAGMA table_info(virtual_files)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'is_chunked' not in columns:
                print("📝 Adding is_chunked column to virtual_files table...")
                cursor.execute('ALTER TABLE virtual_files ADD COLUMN is_chunked BOOLEAN DEFAULT 0')
                print("✅ Added is_chunked column")
            else:
                print("✅ is_chunked column already exists")
                
        except Exception as e:
            eprint(f"❌ Error in migration 1: {e}")
            raise
    
    def _migrate_to_version_2(self, cursor):
        """Migration 2: Add file_chunks table for chunked storage."""
        try:
            print("📝 Creating file_chunks table...")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS file_chunks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chunk_data BLOB NOT NULL,
                    chunk_size INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES virtual_files(id) ON DELETE CASCADE,
                    UNIQUE(file_id, chunk_index)
                )
            ''')
            
            # Create index for chunk retrieval performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_index ON file_chunks(file_id, chunk_index)')
            
            print("✅ Created file_chunks table and indexes")
            
        except Exception as e:
            eprint(f"❌ Error in migration 2: {e}")
            raise
    
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
                eprint(f"Error creating directory {path}: {e}")
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
                eprint(f"Error creating file {path}: {e}")
                return False
    
    def create_file_streaming(self, path: str, file_stream, chunk_size: int = 8192, mime_type: str = None) -> bool:
        """Create a file from a stream with intelligent chunked storage for large files."""
        with self.lock:
            try:
                normalized_path = self._normalize_path(path)
                parent_path = self._get_parent_path(normalized_path)
                name = self._get_name_from_path(normalized_path)

                # Ensure parent_path is '/' for root children
                if parent_path is None and normalized_path != '/':
                    parent_path = '/'
                
                print(f"Creating file (streaming): path={normalized_path}, parent={parent_path}, name={name}")
                
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
                
                # Stream the file content with true memory efficiency
                total_size = 0
                content_hash = hashlib.sha256()
                chunk_storage_size = 1024 * 1024  # 1MB chunks for chunked storage
                small_file_buffer = []  # Only for files < 1MB
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    # Start with a placeholder record to get file_id
                    cursor.execute('''
                        INSERT INTO virtual_files 
                        (path, name, parent_path, is_directory, size, content, mime_type, hash, is_chunked) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (normalized_path, name, parent_path, False, 0, None, mime_type, '', None))
                    
                    file_id = cursor.lastrowid
                    chunk_index = 0
                    current_chunk_buffer = b''
                    
                    print(f"📥 Streaming file in {chunk_size} byte chunks...")
                    
                    # Stream and process chunks immediately
                    while True:
                        chunk = file_stream.read(chunk_size)
                        if not chunk:
                            break
                        
                        content_hash.update(chunk)
                        total_size += len(chunk)
                        
                        # Check if we should switch to chunked storage
                        if total_size >= (1024 * 1024) and len(small_file_buffer) > 0:
                            # Convert from small file buffer to chunked storage
                            print(f"🔄 Converting to chunked storage at {total_size} bytes")
                            
                            # Process accumulated small file buffer first
                            accumulated_data = b''.join(small_file_buffer) + current_chunk_buffer + chunk
                            small_file_buffer = []  # Clear buffer
                            
                            # Store first chunk(s) from accumulated data
                            offset = 0
                            while offset < len(accumulated_data):
                                chunk_data = accumulated_data[offset:offset + chunk_storage_size]
                                
                                cursor.execute('''
                                    INSERT INTO file_chunks 
                                    (file_id, chunk_index, chunk_data, chunk_size) 
                                    VALUES (?, ?, ?, ?)
                                ''', (file_id, chunk_index, chunk_data, len(chunk_data)))
                                
                                print(f"  📦 Stored chunk {chunk_index}: {len(chunk_data)} bytes")
                                chunk_index += 1
                                offset += chunk_storage_size
                            
                            current_chunk_buffer = b''
                            
                        elif total_size < (1024 * 1024):
                            # Still in small file territory - buffer it
                            small_file_buffer.append(chunk)
                            
                        else:
                            # Already in chunked mode - process directly
                            current_chunk_buffer += chunk
                            
                            # When buffer reaches chunk size, store it
                            while len(current_chunk_buffer) >= chunk_storage_size:
                                chunk_data = current_chunk_buffer[:chunk_storage_size]
                                current_chunk_buffer = current_chunk_buffer[chunk_storage_size:]
                                
                                cursor.execute('''
                                    INSERT INTO file_chunks 
                                    (file_id, chunk_index, chunk_data, chunk_size) 
                                    VALUES (?, ?, ?, ?)
                                ''', (file_id, chunk_index, chunk_data, len(chunk_data)))
                                
                                print(f"  📦 Stored chunk {chunk_index}: {len(chunk_data)} bytes")
                                chunk_index += 1
                    
                    # Handle final data
                    final_hash = content_hash.hexdigest()
                    use_chunked_storage = total_size >= (1024 * 1024)
                    
                    if use_chunked_storage:
                        # Store any remaining data in final chunk
                        if current_chunk_buffer:
                            cursor.execute('''
                                INSERT INTO file_chunks 
                                (file_id, chunk_index, chunk_data, chunk_size) 
                                VALUES (?, ?, ?, ?)
                            ''', (file_id, chunk_index, current_chunk_buffer, len(current_chunk_buffer)))
                            
                            print(f"  📦 Stored final chunk {chunk_index}: {len(current_chunk_buffer)} bytes")
                            chunk_index += 1
                        
                        # Update file record for chunked storage
                        cursor.execute('''
                            UPDATE virtual_files 
                            SET size = ?, hash = ?, is_chunked = ?
                            WHERE id = ?
                        ''', (total_size, final_hash, True, file_id))
                        
                        print(f"✅ Stored {chunk_index} chunks for large file ({total_size / (1024*1024):.2f} MB)")
                        
                    else:
                        # Small file - use traditional storage
                        full_content = b''.join(small_file_buffer)
                        cursor.execute('''
                            UPDATE virtual_files 
                            SET size = ?, content = ?, hash = ?, is_chunked = ?
                            WHERE id = ?
                        ''', (total_size, full_content, final_hash, False, file_id))
                        
                        print(f"✅ Stored small file using traditional storage ({total_size} bytes)")
                    
                    conn.commit()
                
                storage_type = "chunked" if use_chunked_storage else "traditional"
                print(f"✅ File created successfully ({storage_type}): {normalized_path}, size: {total_size} bytes, max memory: ~1MB")
                return True
                
            except Exception as e:
                eprint(f"❌ Error creating file (streaming) {path}: {e}")
                import traceback
                traceback.print_exc()
                
                # Clean up any partial data on failure/cancellation
                try:
                    with sqlite3.connect(self.db_path) as cleanup_conn:
                        cleanup_cursor = cleanup_conn.cursor()
                        
                        # Get the file_id if it exists
                        cleanup_cursor.execute('SELECT id FROM virtual_files WHERE path = ?', (normalized_path,))
                        file_record = cleanup_cursor.fetchone()
                        
                        if file_record:
                            file_id_to_clean = file_record[0]
                            eprint(f"🧹 Cleaning up orphaned data for file_id: {file_id_to_clean}")
                            
                            # Delete any chunks that were stored
                            cleanup_cursor.execute('DELETE FROM file_chunks WHERE file_id = ?', (file_id_to_clean,))
                            chunks_deleted = cleanup_cursor.rowcount
                            
                            # Delete the incomplete file record
                            cleanup_cursor.execute('DELETE FROM virtual_files WHERE id = ?', (file_id_to_clean,))
                            
                            cleanup_conn.commit()
                            eprint(f"✅ Cleaned up orphaned file record and {chunks_deleted} chunks")
                        
                except Exception as cleanup_error:
                    eprint(f"⚠️ Warning: Failed to clean up orphaned data: {cleanup_error}")
                
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
            eprint(f"Error listing directory {path}: {e}")
            return []
    
    def read_file(self, path: str) -> Optional[Dict[str, Any]]:
        """Read a file and return its content and metadata, handling both chunked and traditional storage."""
        try:
            normalized_path = self._normalize_path(path)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT path, name, is_directory, size, content, mime_type, hash, created_at, updated_at, accessed_at, is_chunked, id
                    FROM virtual_files 
                    WHERE path = ? AND is_directory = 0
                ''', (normalized_path,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                path, name, is_directory, size, content, mime_type, content_hash, created_at, updated_at, accessed_at, is_chunked, file_id = row
                
                # Handle chunked vs traditional storage
                if is_chunked:
                    print(f"📖 Reading chunked file: {normalized_path}")
                    # Reconstruct content from chunks
                    cursor.execute('''
                        SELECT chunk_data FROM file_chunks 
                        WHERE file_id = ? 
                        ORDER BY chunk_index
                    ''', (file_id,))
                    
                    chunk_rows = cursor.fetchall()
                    content_chunks = [row[0] for row in chunk_rows]
                    content = b''.join(content_chunks)
                    print(f"📦 Reconstructed content from {len(content_chunks)} chunks")
                else:
                    print(f"📄 Reading traditional file: {normalized_path}")
                
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
                    'accessed_at': accessed_at,
                    'is_chunked': bool(is_chunked) if is_chunked is not None else False
                }
        except Exception as e:
            eprint(f"❌ Error reading file {path}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def read_file_streaming(self, path: str):
        """Generator that yields file content in chunks for memory-efficient streaming."""
        try:
            normalized_path = self._normalize_path(path)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT name, is_directory, size, mime_type, hash, created_at, updated_at, accessed_at, is_chunked, id
                    FROM virtual_files 
                    WHERE path = ? AND is_directory = 0
                ''', (normalized_path,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                name, is_directory, size, mime_type, content_hash, created_at, updated_at, accessed_at, is_chunked, file_id = row
                
                # Update access time
                cursor.execute('''
                    UPDATE virtual_files 
                    SET accessed_at = CURRENT_TIMESTAMP 
                    WHERE path = ?
                ''', (normalized_path,))
                conn.commit()
                
                # Return metadata and content generator
                metadata = {
                    'path': normalized_path,
                    'name': name,
                    'is_directory': bool(is_directory),
                    'size': size,
                    'mime_type': mime_type,
                    'hash': content_hash,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'accessed_at': accessed_at,
                    'is_chunked': bool(is_chunked) if is_chunked is not None else False
                }
                
                def content_generator():
                    """Generator that yields file content in chunks."""
                    if is_chunked:
                        print(f"📺 Streaming chunked file: {normalized_path} ({size} bytes)")
                        # Stream chunks from database
                        with sqlite3.connect(self.db_path) as stream_conn:
                            stream_cursor = stream_conn.cursor()
                            stream_cursor.execute('''
                                SELECT chunk_data FROM file_chunks 
                                WHERE file_id = ? 
                                ORDER BY chunk_index
                            ''', (file_id,))
                            
                            chunk_count = 0
                            for chunk_row in stream_cursor:
                                chunk_data = chunk_row[0]
                                chunk_count += 1
                                print(f"  📦 Streaming chunk {chunk_count}: {len(chunk_data)} bytes")
                                yield chunk_data
                            
                            print(f"✅ Streamed {chunk_count} chunks for chunked file")
                    else:
                        print(f"📺 Streaming traditional file: {normalized_path} ({size} bytes)")
                        # Stream traditional file in chunks
                        with sqlite3.connect(self.db_path) as stream_conn:
                            stream_cursor = stream_conn.cursor()
                            stream_cursor.execute('''
                                SELECT content FROM virtual_files 
                                WHERE path = ? AND is_directory = 0
                            ''', (normalized_path,))
                            
                            content_row = stream_cursor.fetchone()
                            if content_row and content_row[0]:
                                content = content_row[0]
                                # Yield in 64KB chunks for optimal streaming
                                chunk_size = 64 * 1024  # 64KB
                                for i in range(0, len(content), chunk_size):
                                    yield content[i:i + chunk_size]
                            
                            print(f"✅ Streamed traditional file in chunks")
                
                return metadata, content_generator()
                
        except Exception as e:
            eprint(f"❌ Error streaming file {path}: {e}")
            import traceback
            traceback.print_exc()
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
                eprint(f"Error writing file {path}: {e}")
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
                eprint(f"Error deleting path {path}: {e}")
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
            eprint(f"Error deleting single path {path}: {e}")
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
            eprint(f"Error getting file info {path}: {e}")
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
            eprint(f"Error calculating directory size {path}: {e}")
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
            eprint(f"Error renaming {old_path} to {new_path}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get virtual file system statistics."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Single query for all file/directory stats
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_items,
                        SUM(CASE WHEN is_directory = 1 THEN 1 ELSE 0 END) as total_directories,
                        SUM(CASE WHEN is_directory = 0 THEN 1 ELSE 0 END) as total_files,
                        COALESCE(SUM(CASE WHEN is_directory = 0 THEN size ELSE 0 END), 0) as total_size
                    FROM virtual_files
                ''')
                
                stats_row = cursor.fetchone()
                total_items, total_directories, total_files, total_size = stats_row
                
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
            eprint(f"Error getting system stats: {e}")
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