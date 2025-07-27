"""
Virtual file system routes for the Sypnex OS application
"""
from flask import request, jsonify, Response
from virtual_file_manager import validate_filename

def register_virtual_file_routes(app, managers):
    """Register virtual file system routes"""
    
    @app.route('/api/virtual-files/stats', methods=['GET'])
    def get_virtual_files_stats():
        """Get virtual file system statistics"""
        try:
            stats = managers['virtual_file_manager'].get_system_stats()
            return jsonify(stats)
        except Exception as e:
            print(f"Error getting virtual files stats: {e}")
            return jsonify({'error': 'Failed to get virtual files stats'}), 500

    @app.route('/api/virtual-files/list', methods=['GET'])
    def list_virtual_files():
        """List files and directories in a path"""
        try:
            path = request.args.get('path', '/')
            print(f"Listing files for path: {path}")
            
            items = managers['virtual_file_manager'].list_directory(path)
            print(f"Found {len(items)} items: {items}")
            
            return jsonify({
                'path': path,
                'items': items,
                'total': len(items)
            })
        except Exception as e:
            print(f"Error listing virtual files: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to list virtual files'}), 500

    @app.route('/api/virtual-files/create-folder', methods=['POST'])
    def create_virtual_folder():
        """Create a new folder"""
        try:
            data = request.json
            folder_name = data.get('name')
            parent_path = data.get('parent_path', '/')
            
            print(f"Creating folder: {folder_name} in {parent_path}")
            
            if not folder_name:
                return jsonify({'error': 'Folder name is required'}), 400
            
            # Validate folder name
            is_valid, error_message = validate_filename(folder_name)
            if not is_valid:
                return jsonify({'error': error_message}), 400
            
            # Construct full path
            if parent_path == '/':
                full_path = f'/{folder_name}'
            else:
                full_path = f'{parent_path}/{folder_name}'
            
            print(f"Full path: {full_path}")
            
            success = managers['virtual_file_manager'].create_directory(full_path)
            print(f"Create directory result: {success}")
            
            if success:
                return jsonify({
                    'message': f'Folder {folder_name} created successfully',
                    'path': full_path
                })
            else:
                return jsonify({'error': f'Failed to create folder {folder_name}'}), 400
        except Exception as e:
            print(f"Error creating virtual folder: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to create folder'}), 500

    @app.route('/api/virtual-files/create-file', methods=['POST'])
    def create_virtual_file():
        """Create a new file"""
        try:
            data = request.json
            file_name = data.get('name')
            parent_path = data.get('parent_path', '/')
            content = data.get('content', '')
            
            if not file_name:
                return jsonify({'error': 'File name is required'}), 400
            
            # Validate file name
            is_valid, error_message = validate_filename(file_name)
            if not is_valid:
                return jsonify({'error': error_message}), 400
            
            # Construct full path
            if parent_path == '/':
                full_path = f'/{file_name}'
            else:
                full_path = f'{parent_path}/{file_name}'
            
            # Convert content to bytes
            content_bytes = content.encode('utf-8')
            
            success = managers['virtual_file_manager'].create_file(full_path, content_bytes)
            if success:
                return jsonify({
                    'message': f'File {file_name} created successfully',
                    'path': full_path
                })
            else:
                return jsonify({'error': f'Failed to create file {file_name}'}), 400
        except Exception as e:
            print(f"Error creating virtual file: {e}")
            return jsonify({'error': 'Failed to create file'}), 500

    @app.route('/api/virtual-files/upload-file', methods=['POST'])
    def upload_virtual_file():
        """Upload a file from the host system"""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            parent_path = request.form.get('parent_path', '/')
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Get file content
            file_content = file.read()
            file_name = file.filename
            
            # Validate file name
            is_valid, error_message = validate_filename(file_name)
            if not is_valid:
                return jsonify({'error': error_message}), 400
            
            # Construct full path
            if parent_path == '/':
                full_path = f'/{file_name}'
            else:
                full_path = f'{parent_path}/{file_name}'
            
            # Check if file already exists
            existing_file = managers['virtual_file_manager'].get_file_info(full_path)
            if existing_file:
                return jsonify({'error': f'File {file_name} already exists'}), 400
            
            # Create the file
            success = managers['virtual_file_manager'].create_file(full_path, file_content)
            if success:
                return jsonify({
                    'message': f'File {file_name} uploaded successfully',
                    'path': full_path,
                    'size': len(file_content)
                })
            else:
                return jsonify({'error': f'Failed to upload file {file_name}'}), 400
        except Exception as e:
            print(f"Error uploading virtual file: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to upload file'}), 500

    @app.route('/api/virtual-files/read/<path:file_path>', methods=['GET'])
    def read_virtual_file(file_path):
        """Read a file's content"""
        try:
            # Ensure path starts with /
            if not file_path.startswith('/'):
                file_path = '/' + file_path
            
            file_data = managers['virtual_file_manager'].read_file(file_path)
            if not file_data:
                return jsonify({'error': 'File not found'}), 404
            
            # Convert content to string for JSON response
            content = file_data['content'].decode('utf-8') if file_data['content'] else ''
            
            return jsonify({
                'path': file_data['path'],
                'name': file_data['name'],
                'content': content,
                'size': file_data['size'],
                'mime_type': file_data['mime_type'],
                'created_at': file_data['created_at'],
                'updated_at': file_data['updated_at']
            })
        except Exception as e:
            print(f"Error reading virtual file: {e}")
            return jsonify({'error': 'Failed to read file'}), 500

    @app.route('/api/virtual-files/serve/<path:file_path>', methods=['GET'])
    def serve_virtual_file(file_path):
        """Serve a file directly to the browser (for binary files, images, etc.)"""
        try:
            # Ensure path starts with /
            if not file_path.startswith('/'):
                file_path = '/' + file_path

            file_data = managers['virtual_file_manager'].read_file(file_path)
            if not file_data:
                return jsonify({'error': 'File not found'}), 404

            # Get the content as bytes
            content = file_data['content'] or b''
            mime_type = file_data['mime_type'] or 'application/octet-stream'

            # Check if this is a download request
            download = request.args.get('download', 'false').lower() == 'true'

            response = Response(content, mimetype=mime_type)
            
            if download:
                # Set attachment disposition for downloads
                response.headers['Content-Disposition'] = f'attachment; filename=\"{file_data['name']}\"'
            else:
                # Set inline disposition for viewing
                response.headers['Content-Disposition'] = f'inline; filename=\"{file_data['name']}\"'
                
            response.headers['Content-Length'] = str(len(content))
            return response
        except Exception as e:
            print(f"Error serving virtual file: {e}")
            return jsonify({'error': 'Failed to serve file'}), 500

    @app.route('/api/virtual-files/delete/<path:item_path>', methods=['DELETE'])
    def delete_virtual_item(item_path):
        """Delete a file or directory"""
        try:
            # Ensure path starts with /
            if not item_path.startswith('/'):
                item_path = '/' + item_path
            
            success = managers['virtual_file_manager'].delete_path(item_path)
            if success:
                return jsonify({
                    'message': f'Item {item_path} deleted successfully'
                })
            else:
                return jsonify({'error': f'Failed to delete item {item_path}'}), 400
        except Exception as e:
            print(f"Error deleting virtual item: {e}")
            return jsonify({'error': 'Failed to delete item'}), 500

    @app.route('/api/virtual-files/rename', methods=['POST'])
    def rename_virtual_item():
        """Rename a file or directory"""
        try:
            data = request.json
            old_path = data.get('old_path')
            new_path = data.get('new_path')
            
            if not old_path or not new_path:
                return jsonify({'error': 'Both old_path and new_path are required'}), 400
            
            # Ensure paths start with /
            if not old_path.startswith('/'):
                old_path = '/' + old_path
            if not new_path.startswith('/'):
                new_path = '/' + new_path
            
            # Extract the new filename from the new path and validate it
            new_filename = new_path.split('/')[-1]
            is_valid, error_message = validate_filename(new_filename)
            if not is_valid:
                return jsonify({'error': error_message}), 400
            
            # Check if source exists
            source_info = managers['virtual_file_manager'].get_file_info(old_path)
            if not source_info:
                return jsonify({'error': f'Source path {old_path} does not exist'}), 404
            
            # Check if destination already exists
            dest_info = managers['virtual_file_manager'].get_file_info(new_path)
            if dest_info:
                return jsonify({'error': f'Destination path {new_path} already exists'}), 400
            
            success = managers['virtual_file_manager'].rename_path(old_path, new_path)
            if success:
                return jsonify({
                    'message': f'Successfully renamed {old_path} to {new_path}',
                    'old_path': old_path,
                    'new_path': new_path
                })
            else:
                return jsonify({'error': f'Failed to rename {old_path} to {new_path}'}), 500
        except Exception as e:
            print(f"Error renaming virtual item: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to rename item'}), 500

    @app.route('/api/virtual-files/info/<path:item_path>', methods=['GET'])
    def get_virtual_item_info(item_path):
        """Get information about a file or directory"""
        try:
            # Ensure path starts with /
            if not item_path.startswith('/'):
                item_path = '/' + item_path
            
            info = managers['virtual_file_manager'].get_file_info(item_path)
            if not info:
                return jsonify({'error': 'Item not found'}), 404
            
            return jsonify(info)
        except Exception as e:
            print(f"Error getting virtual item info: {e}")
            return jsonify({'error': 'Failed to get item info'}), 500 