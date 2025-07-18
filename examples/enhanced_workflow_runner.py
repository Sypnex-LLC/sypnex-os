#!/usr/bin/env python3
"""
Enhanced Workflow Runner with Real-time Feedback and Better Data Handling
Fully dynamic version - no type mapper dependency
"""

import json
import sys
import time
import os
import base64
import re
from typing import Dict, Any, List, Set
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class EnhancedWorkflowRunner:
    """Enhanced workflow runner with real-time feedback and better data handling"""
    
    def __init__(self, server_url="http://localhost:5000"):
        self.server_url = server_url
        self.session = self._create_optimized_session()
        self.node_definitions = {}
        self.executed_nodes = set()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
    def _create_optimized_session(self):
        """Create an optimized requests session with connection pooling and retries"""
        session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
        self.executor.shutdown(wait=True)
    
    def api_request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Make API request with error handling"""
        try:
            response = self.session.request(method, f'{self.server_url}{path}', **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': str(e)}
    
    def load_workflow(self, workflow_path: str) -> Dict[str, Any]:
        """Load workflow from VFS"""
        try:
            print(f"🔍 Loading workflow from: {workflow_path}")
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{workflow_path}')
            print(f"🔍 Response status: {response.status_code}")
            if response.status_code == 200:
                file_data = response.json()
                workflow = json.loads(file_data['content'])
                print(f"🔍 Loaded workflow with {len(workflow.get('nodes', []))} nodes")
                return workflow
            else:
                print(f"🔍 Response text: {response.text}")
                raise Exception(f"Failed to load workflow: {response.status_code}")
        except Exception as e:
            print(f"🔍 Exception: {e}")
            raise Exception(f"Error loading workflow: {e}")
    
    def load_node_definition(self, node_type: str) -> Dict[str, Any]:
        """Load node definition from VFS"""
        if node_type in self.node_definitions:
            return self.node_definitions[node_type]
        
        try:
            node_def_path = f"/nodes/{node_type}.node"
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{node_def_path}')
            
            if response.status_code == 200:
                file_data = response.json()
                node_def = json.loads(file_data['content'])
                self.node_definitions[node_type] = node_def
                return node_def
            else:
                default_def = {
                    "id": node_type,
                    "execution_mode": "both",
                    "inputs": [],
                    "outputs": []
                }
                self.node_definitions[node_type] = default_def
                return default_def
                
        except Exception as e:
            print(f"Warning: Could not load node definition for {node_type}: {e}")
            default_def = {
                "id": node_type,
                "execution_mode": "both",
                "inputs": [],
                "outputs": []
            }
            self.node_definitions[node_type] = default_def
            return default_def
    
    def build_execution_graph(self, workflow: Dict[str, Any]):
        """Build dependency graph for parallel execution, skipping frontend-only nodes and repeater nodes"""
        nodes = {node['id']: node for node in workflow.get('nodes', [])}
        connections = workflow.get('connections', [])
        
        # Identify frontend-only nodes and repeater nodes
        frontend_only_nodes = set()
        repeater_nodes = set()
        for node in nodes.values():
            node_def = self.load_node_definition(node['type'])
            if node_def.get('execution_mode') == 'frontend_only':
                frontend_only_nodes.add(node['id'])
            if node['type'] == 'repeater':
                repeater_nodes.add(node['id'])
        
        print(f"🔍 DEBUG: frontend_only_nodes = {frontend_only_nodes}")
        print(f"🔍 DEBUG: repeater_nodes = {repeater_nodes}")
        
        # Helper: recursively find the last backend node upstream
        def find_last_backend_node(node_id):
            if node_id not in frontend_only_nodes and node_id not in repeater_nodes:
                return node_id
            # Find all connections going into this node
            for conn in connections:
                if conn['to']['nodeId'] == node_id:
                    upstream = conn['from']['nodeId']
                    return find_last_backend_node(upstream)
            return None
        
        # Build dependencies and dependents, skipping frontend-only nodes and repeater nodes
        excluded_nodes = frontend_only_nodes | repeater_nodes
        dependencies = {node_id: [] for node_id in nodes if node_id not in excluded_nodes}
        dependents = {node_id: [] for node_id in nodes if node_id not in excluded_nodes}
        
        print(f"🔍 DEBUG: excluded_nodes = {excluded_nodes}")
        print(f"🔍 DEBUG: dependencies keys = {list(dependencies.keys())}")
        
        for conn in connections:
            from_node = conn['from']['nodeId']
            to_node = conn['to']['nodeId']
            # Only add edges if both nodes are not excluded
            if to_node in excluded_nodes:
                print(f"🔍 DEBUG: Skipping connection to excluded node {to_node}")
                continue
            # Rewire: if from_node is excluded, walk back to last non-excluded node
            actual_from = find_last_backend_node(from_node)
            if actual_from and actual_from != to_node and actual_from not in excluded_nodes:
                dependencies[to_node].append(actual_from)
                dependents[actual_from].append(to_node)
                print(f"🔍 DEBUG: Added dependency {actual_from} -> {to_node}")
        
        return dependencies, dependents, frontend_only_nodes, repeater_nodes
    
    def find_ready_nodes(self, dependencies: Dict[str, List[str]], executed: Set[str]) -> List[str]:
        """Find nodes ready for execution"""
        ready = []
        for node_id, deps in dependencies.items():
            if node_id not in executed and all(dep in executed for dep in deps):
                ready.append(node_id)
        return ready
    
    def normalize_data_for_vfs(self, data: Any, format_type: str = "auto") -> tuple[bytes, str]:
        """Normalize data for VFS storage with proper format detection"""
        print(f"    🔍 DEBUG normalize_data_for_vfs: input type={type(data)}, format_type={format_type}")
        print(f"    🔍 DEBUG normalize_data_for_vfs: input data={data}")
        
        if format_type == "auto":
            # Auto-detect format
            if isinstance(data, dict):
                format_type = "json"
            elif isinstance(data, str):
                # Check if it's JSON
                try:
                    json.loads(data)
                    format_type = "json"
                except:
                    format_type = "text"
            elif isinstance(data, bytes):
                format_type = "binary"
            else:
                format_type = "text"
            print(f"    🔍 DEBUG normalize_data_for_vfs: auto-detected format={format_type}")
        
        # Convert to appropriate format
        if format_type == "json":
            if isinstance(data, dict):
                content = json.dumps(data, indent=2).encode('utf-8')
            elif isinstance(data, str):
                content = data.encode('utf-8')
            else:
                content = json.dumps(str(data)).encode('utf-8')
        elif format_type == "binary":
            if isinstance(data, bytes):
                content = data
            elif isinstance(data, str):
                # Try to decode base64 if it looks like base64
                if len(data) > 100 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in data):
                    try:
                        content = base64.b64decode(data)
                    except:
                        content = data.encode('utf-8')
                else:
                    content = data.encode('utf-8')
            else:
                content = str(data).encode('utf-8')
        else:  # text
            if isinstance(data, str):
                content = data.encode('utf-8')
            else:
                content = str(data).encode('utf-8')
        
        print(f"    🔍 DEBUG normalize_data_for_vfs: output type={type(content)}, length={len(content)}")
        print(f"    🔍 DEBUG normalize_data_for_vfs: output preview={content[:50] if content else 'None'}")
        
        return content, format_type
    
    def execute_http_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute HTTP node using the /api/proxy/http endpoint for CORS and network consistency"""
        config = node['config']
        url = config['url']['value']
        method = config['method']['value']
        headers_str = config['headers']['value']
        body_str = config['body']['value']
        
        try:
            # Parse headers
            headers = {}
            if headers_str.strip():
                try:
                    headers = json.loads(headers_str)
                except json.JSONDecodeError:
                    print(f"Warning: Invalid headers JSON for {node['id']}")
            
            # Parse body
            body = None
            if body_str.strip():
                try:
                    body = json.loads(body_str)
                except json.JSONDecodeError:
                    body = body_str
            
            # Use the /api/proxy/http endpoint
            proxy_payload = {
                'url': url,
                'method': method,
                'headers': headers,
                'body': body,
                'timeout': 30
            }
            print(f"  🌐 [PROXY] Requesting {url} via /api/proxy/http")
            response = self.session.post(f'{self.server_url}/api/proxy/http', json=proxy_payload)
            
            # Handle response
            if response.status_code == 200:
                proxy_result = response.json()
                is_binary = proxy_result.get('is_binary', False)
                content_type = proxy_result.get('headers', {}).get('content-type', 'unknown')
                print(f"  🌐 [PROXY] Response content-type: {content_type}, is_binary: {is_binary}")
                
                if is_binary:
                    import base64
                    binary_data = base64.b64decode(proxy_result.get('content', ''))
                    print(f"  📦 [PROXY] Received binary data: {len(binary_data)} bytes, type: {content_type}")
                    # Decide output port based on content-type
                    if 'image' in content_type:
                        return {
                            'image_data': binary_data,
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                    elif 'audio' in content_type:
                        return {
                            'audio_data': binary_data,
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                    else:
                        return {
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                else:
                    # For text responses, content is already text
                    text_content = proxy_result.get('content', '')
                    print(f"  🌐 [PROXY] Text content: {text_content[:200]}...")
                    parsed_json = None
                    
                    # Try to parse as JSON regardless of content-type
                    try:
                        parsed_json = json.loads(text_content)
                        print(f"  🌐 [PROXY] Successfully parsed JSON: {parsed_json}")
                    except json.JSONDecodeError:
                        print(f"  🌐 [PROXY] Failed to parse as JSON: {text_content[:100]}...")
                        # Only try content-type based parsing if direct parsing failed
                        if 'json' in content_type.lower():
                            try:
                                parsed_json = json.loads(text_content)
                                print(f"  🌐 [PROXY] Parsed JSON via content-type: {parsed_json}")
                            except json.JSONDecodeError:
                                pass
                    
                    return {
                        'response': text_content,
                        'data': text_content,
                        'parsed_json': parsed_json,
                        'json': parsed_json,  # Add json output to match frontend expectations
                        'content_type': content_type
                    }
            else:
                return {
                    'response': response.text,
                    'status_code': response.status_code,
                    'headers': {},
                    'parsed_json': None,
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {'error': str(e)}

    def extract_actual_data_for_vfs(self, input_data, node_results=None, parent_node_id=None):
        """Robustly extract binary or text data for VFS save, even if input is None or a dict with None values."""
        print(f"  🔍 [VFS EXTRACT] input_data type: {type(input_data)}")
        print(f"  🔍 [VFS EXTRACT] input_data: {input_data}")
        
        def recursive_search_for_binary_data(data, depth=0):
            """Recursively search for binary_data or response fields in nested dicts"""
            indent = "  " * depth
            print(f"{indent}🔍 [RECURSIVE] Searching at depth {depth}, type: {type(data)}")
            
            if isinstance(data, dict):
                print(f"{indent}🔍 [RECURSIVE] Dict keys: {list(data.keys())}")
                # First, check for binary_data or response (bytes) at this level
                if 'binary_data' in data and data['binary_data'] is not None:
                    print(f"{indent}✅ [RECURSIVE] Found binary_data at depth {depth}")
                    return data['binary_data']
                elif 'response' in data and isinstance(data['response'], bytes):
                    print(f"{indent}✅ [RECURSIVE] Found response (bytes) at depth {depth}")
                    return data['response']
                elif 'data' in data and data['data'] is not None:
                    print(f"{indent}✅ [RECURSIVE] Found data at depth {depth}")
                    return data['data']
                
                # If not found, recursively search all values
                for key, value in data.items():
                    if value is not None:
                        result = recursive_search_for_binary_data(value, depth + 1)
                        if result is not None:
                            return result
            elif isinstance(data, list):
                # Search through list items
                for i, item in enumerate(data):
                    if item is not None:
                        result = recursive_search_for_binary_data(item, depth + 1)
                        if result is not None:
                            return result
            elif data is not None:
                # If it's not None and not a container, return it
                print(f"{indent}✅ [RECURSIVE] Found non-None value at depth {depth}: {type(data)}")
                return data
            
            return None
        
        # If input_data is a dict with only None values, try to look up parent node output
        if isinstance(input_data, dict):
            # If all values are None, try to look for binary_data or response in parent node output
            if all(v is None for v in input_data.values()):
                print(f"  🔍 [VFS EXTRACT] All values None, trying to find binary_data in parent node output")
                if node_results and parent_node_id and parent_node_id in node_results:
                    parent_output = node_results[parent_node_id]
                    print(f"  🔍 [VFS EXTRACT] parent_output: {parent_output}")
                    result = recursive_search_for_binary_data(parent_output)
                    if result is not None:
                        return result
                # If not found, just return None
                return None
            else:
                # Try recursive search on the input_data itself
                result = recursive_search_for_binary_data(input_data)
                if result is not None:
                    return result
                # Fallback: try to extract the first non-None value
                for v in input_data.values():
                    if v is not None:
                        return v
                return None
        else:
            return input_data

    def execute_timer_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute timer node"""
        config = node['config']
        interval = int(config['interval']['value'])
        
        print(f"  ⏰ Timer: waiting {interval}ms")
        time.sleep(interval / 1000.0)  # Convert to seconds
        
        return {'trigger': time.time()}
    
    def execute_repeater_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute repeater node - triggers workflow repetition"""
        config = node['config']
        interval = int(config['interval']['value'])
        count = int(config['count']['value'])
        
        # For now, just return trigger data - the looping logic is handled in execute_workflow_with_repeater
        return {
            'trigger': time.time(),
            'interval': interval,
            'count': count,
            'iteration': 1  # Will be updated by the loop logic
        }
    
    def execute_vfs_load_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute VFS load node"""
        config = node['config']
        file_path = config['file_path']['value']
        
        try:
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
            
            if response.status_code == 200:
                file_data = response.json()
                content = file_data.get('content', '')
                return {
                    'data': content,
                    'file_path': file_path
                }
            else:
                return {'error': f'File not found: {file_path}'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def execute_vfs_save_node(self, node: Dict[str, Any], input_data: Any, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute VFS save node with robust data extraction and enhanced data handling"""
        config = node['config']
        file_path = config['file_path']['value']
        format_type = config['format']['value']
        overwrite = config['overwrite']['value'] == 'true'
        
        try:
            print(f"  Saving to {file_path} (format: {format_type})")
            print(f"  🔍 DEBUG: input_data type: {type(input_data)}")
            print(f"  🔍 DEBUG: input_data: {input_data}")
            
            # Robustly extract actual data
            actual_data = self.extract_actual_data_for_vfs(input_data, node_results, parent_node_id)
            print(f"  🔍 DEBUG: actual_data type: {type(actual_data)}")
            print(f"  🔍 DEBUG: actual_data: {actual_data}")
            
            # Normalize data for storage
            content, detected_format = self.normalize_data_for_vfs(actual_data, format_type)
            
            # Check if file exists and handle overwrite
            check_response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
            file_exists = check_response.status_code == 200
            
            if file_exists:
                if not overwrite:
                    return {'error': f'File exists and overwrite is false: {file_path}'}
                else:
                    print(f"  🔄 File exists, deleting for overwrite...")
                    # Delete existing file first
                    delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                    if delete_response.status_code != 200:
                        print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
            
            # Save file based on format
            if detected_format == "binary" or format_type == "binary":
                # Use upload-file endpoint for binary data
                from io import BytesIO
                file_obj = BytesIO(content)
                
                files = {
                    'file': (os.path.basename(file_path), file_obj, 'application/octet-stream')
                }
                data = {
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/'
                }
                
                save_response = self.session.post(
                    f'{self.server_url}/api/virtual-files/upload-file', 
                    files=files, 
                    data=data
                )
            else:
                # Use create-file endpoint for text/JSON data
                content_str = content.decode('utf-8') if isinstance(content, bytes) else str(content)
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': content_str
                }
                
                save_response = self.session.post(
                    f'{self.server_url}/api/virtual-files/create-file', 
                    json=save_data
                )
            
            if save_response.status_code == 200:
                result = save_response.json()
                # Check for success in different response formats
                success = (
                    result.get('success', False) or 
                    'created successfully' in result.get('message', '').lower() or
                    'uploaded successfully' in result.get('message', '').lower()
                )
                if success:
                    print(f"  ✓ Successfully saved {file_path}")
                    return {'success': True, 'file_path': file_path}
                else:
                    error_msg = result.get('error', 'Unknown error')
                    print(f"  ✗ Failed to save {file_path}: {error_msg}")
                    return {'error': f'Failed to save file: {error_msg}'}
            else:
                error_msg = f'API request failed: {save_response.status_code}'
                try:
                    error_data = save_response.json()
                    error_msg += f' - {error_data.get("error", "Unknown error")}'
                except:
                    error_msg += f' - {save_response.text}'
                print(f"  ✗ Failed to save {file_path}: {error_msg}")
                return {'error': error_msg}
                
        except Exception as e:
            print(f"  ✗ Exception saving {file_path}: {str(e)}")
            return {'error': str(e)}
    
    def execute_node(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute a single node with real-time feedback, using dynamic execution"""
        return self.execute_node_dynamically(node, input_data, node_results, parent_node_id)
    
    def process_input_data_for_node(self, node: Dict[str, Any], input_data: Any, node_def: Dict[str, Any]) -> Any:
        """Process input data to match frontend's structured approach"""
        if input_data is None:
            return None
        
        print(f"  🔄 Processing input data for {node['id']}: type={type(input_data)}")
        if isinstance(input_data, dict):
            print(f"  🔄 Input data keys: {list(input_data.keys())}")
        
        # If input_data is already a dict with port names, use it directly
        if isinstance(input_data, dict):
            # Check if it looks like port-based data (has keys that match input ports)
            input_ports = [inp['id'] for inp in node_def.get('inputs', [])]
            if any(port in input_data for port in input_ports):
                print(f"  🔄 Input data appears to be port-based: {list(input_data.keys())}")
                return input_data
        
        # If it's a dict, try to map it to the appropriate input port
        # This matches frontend's intelligent field mapping
        if isinstance(input_data, dict):
            # Look for common field names that might match input ports
            input_ports = [inp['id'] for inp in node_def.get('inputs', [])]
            mapped_data = {}
            
            for port in input_ports:
                # Try to find a matching field in input_data
                if port in input_data:
                    mapped_data[port] = input_data[port]
                    print(f"  🔄 Found exact port match '{port}' for {node['id']}")
                else:
                    # Try common field mappings (like frontend)
                    field_mappings = {
                        'json_data': ['data', 'json_data', 'json', 'response', 'parsed_json', 'file_path'],
                        'text': ['data', 'content', 'text', 'value', 'file_path'],
                        'data': ['data', 'content', 'text', 'value', 'file_path'],
                        'value': ['extracted_value', 'data', 'content', 'text', 'value'],
                        'condition': ['result', 'data', 'content', 'text', 'value'],
                        'image_data': ['data', 'image_data', 'image', 'url', 'file_path'],
                        'audio_data': ['data', 'audio_data', 'audio', 'url', 'file_path'],
                        'prompt': ['text', 'prompt', 'data', 'content', 'value'],
                        'trigger': ['trigger', 'data', 'value']
                    }
                    
                    possible_fields = field_mappings.get(port, [port])
                    for field in possible_fields:
                        if field in input_data:
                            mapped_data[port] = input_data[field]
                            print(f"  🔄 Mapped '{field}' to '{port}' for {node['id']}")
                            break
                    
                    # If no mapping found, use the first available value
                    if port not in mapped_data and input_data:
                        first_value = next(iter(input_data.values()))
                        mapped_data[port] = first_value
                        print(f"  🔄 Using first available value for '{port}' in {node['id']}: {first_value}")
            
            if mapped_data:
                print(f"  🔄 Final mapped data for {node['id']}: {mapped_data}")
                return mapped_data
        
        # Fallback: return input_data as-is
        return input_data
    
    def should_execute_node(self, node: Dict[str, Any]) -> bool:
        """Check if a node should be executed based on execution_mode"""
        node_def = self.load_node_definition(node['type'])
        return node_def.get('execution_mode') != 'frontend_only'
    
    def execute_node_dynamically(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute a node dynamically based on its type and definition"""
        node_def = self.load_node_definition(node['type'])
        
        # Check if node should be executed
        if node_def.get('execution_mode') == 'frontend_only':
            print(f"  ⚡ {node['id']} ({node['type']}) is frontend-only, skipping execution in backend")
            return None
            
        if node['id'] in self.executed_nodes:
            return None
        self.executed_nodes.add(node['id'])
        
        node_type = node['type']
        print(f"  Executing {node['id']} ({node_type})...")
        
        # Enhanced input data handling - match frontend structure
        processed_input_data = self.process_input_data_for_node(node, input_data, node_def)
        print(f"  🔄 Processed input data for {node['id']}: {processed_input_data}")
        
        try:
            # Dynamic execution based on node type
            if node_type == 'http':
                result = self.execute_http_node(node)
            elif node_type == 'timer':
                result = self.execute_timer_node(node)
            elif node_type == 'vfs_load':
                result = self.execute_vfs_load_node(node)
            elif node_type == 'vfs_save':
                result = self.execute_vfs_save_node(node, processed_input_data, node_results, parent_node_id)
            elif node_type == 'json_extract':
                result = self.execute_json_extract_node(node, processed_input_data)
            elif node_type == 'text':
                result = self.execute_text_node(node)
            elif node_type == 'llm_chat':
                result = self.execute_llm_chat_node(node, processed_input_data)
            elif node_type == 'condition':
                result = self.execute_condition_node(node, processed_input_data)
            elif node_type == 'logical_gate':
                result = self.execute_logical_gate_node(node, processed_input_data)
            elif node_type == 'repeater':
                result = self.execute_repeater_node(node)
            else:
                # For unknown node types, try to execute based on node definition
                result = self.execute_unknown_node(node, processed_input_data, node_def)
                
            if 'error' in result:
                print(f"  ✗ {node['id']} failed: {result['error']}")
            else:
                print(f"  ✓ {node['id']} completed successfully")
            return result
        except Exception as e:
            print(f"  ✗ {node['id']} exception: {str(e)}")
            return {'error': str(e)}
    
    def execute_unknown_node(self, node: Dict[str, Any], input_data: Any, node_def: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an unknown node type based on its definition"""
        node_type = node['type']
        config = node.get('config', {})
        
        print(f"  🔍 Executing unknown node type: {node_type}")
        print(f"  🔍 Node definition: {node_def}")
        
        # Try to determine what this node should do based on its definition
        outputs = node_def.get('outputs', [])
        inputs = node_def.get('inputs', [])
        
        # Create a basic result based on outputs
        result = {}
        for output in outputs:
            output_id = output.get('id', 'data')
            output_type = output.get('type', 'data')
            
            # Generate appropriate default values based on output type
            if output_type == 'text':
                result[output_id] = f"Processed {node_type} output"
            elif output_type == 'json':
                result[output_id] = {"node_type": node_type, "processed": True}
            elif output_type == 'number':
                result[output_id] = 1
            elif output_type == 'boolean':
                result[output_id] = True
            elif output_type == 'binary':
                result[output_id] = b"default_binary_data"
            else:  # data or any other type
                result[output_id] = f"Default {node_type} data"
        
        # Add input data if available
        if input_data:
            result['input_data'] = input_data
        
        # Add node metadata
        result['node_type'] = node_type
        result['node_id'] = node['id']
        result['processed'] = True
        
        return result
    
    def execute_json_extract_node(self, node: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
        """Execute JSON extract node - enhanced to match frontend behavior"""
        config = node['config']
        field_path = config['field_path']['value']
        display_format = config['display_format']['value']
        
        print(f"  🔍 JSON Extract: field_path='{field_path}', display_format='{display_format}'")
        print(f"  🔍 JSON Extract: input_data type={type(input_data)}")
        print(f"  🔍 JSON Extract: input_data={input_data}")
        print(f"  🔍 JSON Extract: input_data keys={list(input_data.keys()) if isinstance(input_data, dict) else 'N/A'}")
        
        try:
            # Handle structured input data (like frontend)
            json_data = None
            
            # If input_data is a dict, look for json port first (matching frontend connections)
            if isinstance(input_data, dict):
                if 'json' in input_data:
                    json_data = input_data['json']
                    print(f"  🔍 JSON Extract: Found json port: {json_data}")
                elif 'parsed_json' in input_data:
                    json_data = input_data['parsed_json']
                    print(f"  🔍 JSON Extract: Found parsed_json port: {json_data}")
                elif 'data' in input_data:
                    json_data = input_data['data']
                    print(f"  🔍 JSON Extract: Found data port: {json_data}")
                else:
                    # Fallback: use the input_data directly
                    json_data = input_data
                    print(f"  🔍 JSON Extract: Using input_data directly: {json_data}")
            else:
                # Direct value input
                json_data = input_data
                print(f"  🔍 JSON Extract: Using direct input: {json_data}")
            
            # Parse JSON if it's a string
            if isinstance(json_data, str):
                try:
                    json_data = json.loads(json_data)
                    print(f"  🔍 JSON Extract: Parsed string to JSON: {json_data}")
                except json.JSONDecodeError:
                    print(f"  🔍 JSON Extract: Failed to parse as JSON: {json_data[:100]}...")
                    # If it's not valid JSON, try to treat it as a file path or other data
                    if json_data.startswith('/'):
                        # Might be a file path, return as-is
                        print(f"  🔍 JSON Extract: Treating as file path: {json_data}")
                        return {'extracted_value': json_data}
                    else:
                        return {'error': 'Invalid JSON data'}
            
            # Extract value using enhanced dot notation with array support
            value = self.extract_nested_value(json_data, field_path)
            
            if value is None:
                return {'error': f'Field path "{field_path}" not found'}
            
            print(f"  🔍 JSON Extract: Extracted value: {value}, type: {type(value)}")
            
            # Format output based on display_format (matching frontend)
            formatted_value = value
            if display_format == 'json':
                formatted_value = json.dumps(value, indent=2)
            elif display_format == 'text':
                # For text format, return the actual value without JSON stringification
                if isinstance(value, str):
                    formatted_value = value  # Keep as-is, don't add quotes
                else:
                    formatted_value = str(value)
            
            print(f"  🔍 JSON Extract: Final formatted value: {formatted_value}")
            return {
                'data': formatted_value,
                'text': formatted_value,
                'json': value,
                'extracted_value': formatted_value,
                'field_path': field_path,
                'original': json_data
            }
            
        except Exception as e:
            print(f"  🔍 JSON Extract: Exception: {e}")
            return {'error': str(e)}
    
    def extract_nested_value(self, obj: Any, path: str) -> Any:
        """Extract nested value using dot notation with array support (matching frontend)"""
        if obj is None:
            return None
        
        keys = path.split('.')
        current = obj
        
        for key in keys:
            if current is None:
                return None
            
            # Handle array access like "items[0].name"
            array_match = re.match(r'^(.+)\[(\d+)\]$', key)
            if array_match:
                array_key = array_match.group(1)
                array_index = int(array_match.group(2))
                
                if isinstance(current, dict) and array_key in current:
                    if isinstance(current[array_key], list) and 0 <= array_index < len(current[array_key]):
                        current = current[array_key][array_index]
                    else:
                        return None
                else:
                    return None
            else:
                # Regular key access
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
        
        return current
    
    def execute_text_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute text node"""
        config = node['config']
        text_value = config['text_content']['value']
        return {'text': text_value}
    
    def execute_llm_chat_node(self, node: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
        """Execute LLM chat node"""
        config = node['config']
        endpoint = config['endpoint']['value']
        model = config['model']['value']
        temperature = float(config['temperature']['value'])
        max_tokens = int(config['max_tokens']['value'])
        system_prompt = config['system_prompt']['value']
        
        # Get prompt from input or use default
        if input_data:
            if isinstance(input_data, dict) and 'prompt' in input_data:
                prompt = input_data['prompt']
            elif isinstance(input_data, str):
                prompt = input_data
            else:
                prompt = str(input_data)
        else:
            prompt = "Hello, how can you help me?"
        
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            messages.append({'role': 'user', 'content': prompt})
            
            data = {
                'model': model,
                'messages': messages,
                'options': {
                    'temperature': temperature,
                    'num_predict': max_tokens
                }
            }
            
            response = self.session.post(
                f'{endpoint}/chat/completions',
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_message = result['choices'][0]['message']['content']
                usage = result.get('usage', {})
                return {
                    'response': ai_message,
                    'tokens_used': usage.get('total_tokens', 0),
                    'model_used': model,
                    'full_response': result
                }
            else:
                return {'error': f'API request failed: {response.status_code} - {response.text}'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def execute_condition_node(self, node: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
        """Execute condition node for comparing values - enhanced to match frontend behavior"""
        config = node['config']
        operator = config['operator']['value']
        compare_value = config['compare_value']['value']
        case_sensitive = config.get('case_sensitive', {}).get('value', 'true') == 'true'
        
        try:
            # Handle structured input data (like frontend)
            value = None
            
            # If input_data is a dict, look for value port first
            if isinstance(input_data, dict):
                if 'value' in input_data:
                    value = input_data['value']
                    print(f"  🔍 Condition: Found value port: {value}")
                else:
                    # Try common field names
                    for field in ['extracted_value', 'data', 'response', 'text']:
                        if field in input_data and input_data[field] is not None:
                            value = input_data[field]
                            print(f"  🔍 Condition: Found {field} field: {value}")
                            break
                    
                    if value is None:
                        # If no common field found, use the first non-None value
                        for v in input_data.values():
                            if v is not None:
                                value = v
                                print(f"  🔍 Condition: Using first available value: {value}")
                                break
                        else:
                            return {'error': 'No valid input value found'}
            else:
                value = input_data
            
            # Map operator names to actual operators
            operator_map = {
                'equals': '==',
                'not_equals': '!=',
                'greater_than': '>',
                'less_than': '<',
                'greater_than_or_equal': '>=',
                'less_than_or_equal': '<=',
                'contains': 'contains',
                'not_contains': 'not_contains',
                'starts_with': 'starts_with',
                'ends_with': 'ends_with',
                'is_empty': 'is_empty',
                'is_not_empty': 'is_not_empty'
            }
            
            actual_operator = operator_map.get(operator, operator)
            
            # Convert values for comparison
            try:
                # Handle special operators first
                if actual_operator == 'is_empty':
                    result = not value or str(value).strip() == ''
                elif actual_operator == 'is_not_empty':
                    result = value and str(value).strip() != ''
                elif actual_operator == 'not_contains':
                    result = compare_value not in str(value)
                # Handle boolean comparisons
                elif actual_operator in ['==', '!='] and (isinstance(value, bool) or compare_value.lower() in ['true', 'false']):
                    # Convert both to boolean for comparison
                    if isinstance(value, bool):
                        value_bool = value
                    else:
                        value_bool = str(value).lower() == 'true'
                    
                    if isinstance(compare_value, bool):
                        compare_bool = compare_value
                    else:
                        compare_bool = str(compare_value).lower() == 'true'
                    
                    if actual_operator == '==':
                        result = value_bool == compare_bool
                    else:  # !=
                        result = value_bool != compare_bool
                # Try to convert both to numbers for numeric comparison
                elif actual_operator in ['==', '!=', '>', '<', '>=', '<=']:
                    value_num = float(value) if isinstance(value, (int, float, str)) else value
                    compare_num = float(compare_value) if isinstance(compare_value, (int, float, str)) else compare_value
                    
                    # Perform numeric comparison
                    if actual_operator == '==':
                        result = value_num == compare_num
                    elif actual_operator == '!=':
                        result = value_num != compare_num
                    elif actual_operator == '>':
                        result = value_num > compare_num
                    elif actual_operator == '<':
                        result = value_num < compare_num
                    elif actual_operator == '>=':
                        result = value_num >= compare_num
                    elif actual_operator == '<=':
                        result = value_num <= compare_num
                else:
                    # String comparison
                    value_str = str(value)
                    compare_str = str(compare_value)
                    
                    if actual_operator == 'contains':
                        result = compare_str in value_str
                    elif actual_operator == 'starts_with':
                        result = value_str.startswith(compare_str)
                    elif actual_operator == 'ends_with':
                        result = value_str.endswith(compare_str)
                    else:
                        result = value_str == compare_str
                        
            except (ValueError, TypeError):
                # Fallback to string comparison
                value_str = str(value)
                compare_str = str(compare_value)
                
                if actual_operator == 'contains':
                    result = compare_str in value_str
                elif actual_operator == 'starts_with':
                    result = value_str.startswith(compare_str)
                elif actual_operator == 'ends_with':
                    result = value_str.endswith(compare_str)
                elif actual_operator == '==':
                    result = value_str == compare_str
                elif actual_operator == '!=':
                    result = value_str != compare_str
                else:
                    result = False
            
            print(f"  🔍 Condition: {value} {operator} ({actual_operator}) {compare_value} = {result}")
            return {'result': result, 'value': value, 'compare_value': compare_value}
            
        except Exception as e:
            return {'error': str(e)}
    
    def execute_logical_gate_node(self, node: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
        """Execute logical gate node for conditional execution control - enhanced to match frontend behavior"""
        config = node['config']
        invert = config['invert']['value'] == 'true'
        description = config.get('description', {}).get('value', '')
        
        try:
            # Handle structured input data (like frontend)
            condition = None
            
            # If input_data is a dict, look for condition port first
            if isinstance(input_data, dict):
                if 'condition' in input_data:
                    condition = input_data['condition']
                    print(f"  🔀 Logical Gate: Found condition port: {condition}")
                elif 'value' in input_data:
                    # Convert value to boolean
                    condition = bool(input_data['value'])
                    print(f"  🔀 Logical Gate: Using value port as condition: {condition}")
                else:
                    # Try common field names
                    for field in ['result', 'data', 'response', 'text']:
                        if field in input_data and input_data[field] is not None:
                            condition = bool(input_data[field])
                            print(f"  🔀 Logical Gate: Using {field} field as condition: {condition}")
                            break
                    
                    if condition is None:
                        # Use any non-None value as True
                        condition = any(v is not None for v in input_data.values())
                        print(f"  🔀 Logical Gate: Using any non-None value as condition: {condition}")
            else:
                condition = bool(input_data)
                print(f"  🔀 Logical Gate: Using direct input as condition: {condition}")
            
            # Apply invert logic
            if invert:
                condition = not condition
            
            print(f"  🔀 Logical Gate: condition={condition}, invert={invert}")
            
            if condition:
                # Continue execution - pass through the input data
                return {'trigger': input_data if input_data is not None else True}
            else:
                # Stop execution
                print(f"  🛑 Logical Gate: Stopping execution (condition={condition})")
                return {'__stop_execution': True}
                
        except Exception as e:
            return {'error': str(e)}
    
    def execute_workflow_parallel(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow with parallel processing and real-time feedback, skipping frontend-only nodes"""
        start_time = time.time()
        
        print(f"🚀 Starting workflow execution...")
        print(f"📊 Total nodes: {len(workflow.get('nodes', []))}")
        print(f"🔗 Total connections: {len(workflow.get('connections', []))}")
        print()
        
        # Check if workflow has a repeater start node
        repeater_nodes = [n for n in workflow.get('nodes', []) if n['type'] == 'repeater']
        
        if repeater_nodes:
            # Execute in loop mode
            results = self.execute_workflow_loop(workflow, repeater_nodes[0])
        else:
            # Execute once (current behavior)
            results = self.execute_workflow_once(workflow)
        
        execution_time = time.time() - start_time
        print()
        print(f"✅ Workflow execution completed in {execution_time:.2f} seconds")
        print(f"📈 Executed {len(results)} nodes")
        return results
    
    def execute_workflow_loop(self, workflow: Dict[str, Any], repeater_node: Dict[str, Any]) -> list:
        """Execute workflow in a loop based on repeater configuration - SIMPLEST APPROACH"""
        config = repeater_node['config']
        interval = int(config['interval']['value']) / 1000.0  # Convert to seconds
        max_count = int(config['count']['value'])  # 0 = infinite
        
        print(f"🔄 Repeater mode: interval={interval}s, max_count={max_count if max_count > 0 else 'infinite'}")
        print()
        
        # SIMPLEST APPROACH: Just execute all non-repeater nodes in sequence
        execution_nodes = [n for n in workflow['nodes'] if n['type'] != 'repeater']
        print(f"🎯 Repeater will execute these nodes: {[n['id'] for n in execution_nodes]}")
        
        count = 0
        all_results = []
        
        while max_count == 0 or count < max_count:
            count += 1
            print(f"🔄 Repeater iteration {count}")
            print("=" * 50)
            
            # Execute all nodes in sequence (simple approach)
            results = self.execute_nodes_simple(execution_nodes, workflow)
            all_results.extend(results)
            
            # Wait for next iteration (unless it's the last one)
            if max_count == 0 or count < max_count:
                print(f"⏰ Waiting {interval}s before next iteration...")
                time.sleep(interval)
                print()
        
        print(f"✅ Repeater completed {count} iterations")
        return all_results
    
    def execute_nodes_simple(self, nodes: List[Dict[str, Any]], workflow: Dict[str, Any] = None) -> list:
        """Execute nodes in simple sequence without complex dependency tracking"""
        results = []
        node_results = {}
        
        for node in nodes:
            print(f"  Executing {node['id']} ({node['type']})...")
            try:
                # Prepare input data from connections if workflow is provided
                input_data = None
                parent_node_id = None
                if workflow:
                    connections = workflow.get('connections', [])
                    # Group connections by input port to handle multiple connections
                    port_connections = {}
                    for conn in connections:
                        if conn['to']['nodeId'] == node['id']:
                            input_port = conn['to']['portName']
                            if input_port not in port_connections:
                                port_connections[input_port] = []
                            port_connections[input_port].append(conn)
                    
                    # Process each input port
                    if port_connections:
                        input_data = {}
                        for input_port, conns in port_connections.items():
                            if len(conns) == 1:
                                # Single connection - use the value directly
                                conn = conns[0]
                                from_node = conn['from']['nodeId']
                                output_port = conn['from']['portName']
                                
                                # Find the result from the source node
                                for prev_result in results:
                                    if prev_result['node_id'] == from_node:
                                        if output_port in prev_result['result']:
                                            input_data[input_port] = prev_result['result'][output_port]
                                        break
                            else:
                                # Multiple connections - combine them (use the last one for now)
                                print(f"  🔗 Multiple connections to {input_port}: {len(conns)} connections")
                                for conn in conns:
                                    from_node = conn['from']['nodeId']
                                    output_port = conn['from']['portName']
                                    
                                    # Find the result from the source node
                                    for prev_result in results:
                                        if prev_result['node_id'] == from_node:
                                            if output_port in prev_result['result']:
                                                input_data[input_port] = prev_result['result'][output_port]
                                                print(f"  🔗 Using {from_node}.{output_port} for {input_port}")
                                            break
                
                result = self.execute_node(node, input_data, node_results, parent_node_id)
                if result:
                    results.append({'node_id': node['id'], 'result': result})
                    node_results[node['id']] = result
                    print(f"  ✓ {node['id']} completed successfully")
                    
                    # Check for stop execution flag
                    if isinstance(result, dict) and result.get('__stop_execution'):
                        print(f"  🛑 Execution stopped by {node['id']}")
                        return results
                else:
                    print(f"  ⚡ {node['id']} skipped (frontend-only)")
            except Exception as e:
                print(f"  ✗ {node['id']} failed: {str(e)}")
                results.append({'node_id': node['id'], 'result': {'error': str(e)}})
        
        return results
    
    def execute_workflow_once(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow once (original parallel execution logic)"""
        # Build execution graph, skipping frontend-only nodes
        dependencies, dependents, frontend_only_nodes, repeater_nodes = self.build_execution_graph(workflow)
        nodes = {node['id']: node for node in workflow.get('nodes', [])}
        connections = workflow.get('connections', [])
        
        # Find start nodes (no dependencies)
        start_nodes = [node_id for node_id, deps in dependencies.items() if not deps]
        
        if not start_nodes:
            print("❌ No start nodes found")
            return []
        
        # Store node results
        node_results = {}
        executed = set()
        results = []
        
        # Execute start nodes first
        print(f"🎯 Executing start nodes: {start_nodes}")
        start_futures = []
        for node_id in start_nodes:
            node = nodes[node_id]
            future = self.executor.submit(self.execute_node, node, None, node_results, None)
            start_futures.append((node_id, future))
        
        # Wait for start nodes to complete
        for node_id, future in start_futures:
            result = future.result()
            if result:
                node_results[node_id] = result
                executed.add(node_id)
                results.append({'node_id': node_id, 'result': result})
                
                # Check for stop execution flag
                if isinstance(result, dict) and result.get('__stop_execution'):
                    print(f"  🛑 Execution stopped by {node_id}")
                    return results
        
        # Continue with dependent nodes
        while len(executed) < len(dependencies):
            ready_nodes = self.find_ready_nodes(dependencies, executed)
            
            if not ready_nodes:
                # Check for cycles or unreachable nodes
                remaining = set(dependencies.keys()) - executed
                if remaining:
                    print(f"⚠️  Warning: Unreachable nodes: {remaining}")
                break
            
            print(f"🔄 Executing {len(ready_nodes)} nodes in parallel: {ready_nodes}")
            
            # Execute ready nodes in parallel
            futures = []
            for node_id in ready_nodes:
                node = nodes[node_id]
                # Prepare input data from connections, rewiring through frontend-only nodes
                input_data = None
                parent_node_id = None
                
                # Group connections by input port to handle multiple connections
                port_connections = {}
                for conn in connections:
                    if conn['to']['nodeId'] == node_id:
                        input_port = conn['to']['portName']
                        if input_port not in port_connections:
                            port_connections[input_port] = []
                        port_connections[input_port].append(conn)
                
                # Process each input port
                if port_connections:
                    input_data = {}
                    for input_port, conns in port_connections.items():
                        if len(conns) == 1:
                            # Single connection - use the value directly
                            conn = conns[0]
                            from_node = conn['from']['nodeId']
                            # Rewire: if from_node is frontend-only, walk back to last backend node
                            actual_from = from_node
                            if from_node in frontend_only_nodes:
                                # Find the last backend node upstream
                                def walk_upstream(fnode):
                                    for c in connections:
                                        if c['to']['nodeId'] == fnode:
                                            up = c['from']['nodeId']
                                            if up in frontend_only_nodes:
                                                return walk_upstream(up)
                                            return up
                                    return None
                                actual_from = walk_upstream(from_node)
                            parent_node_id = actual_from
                            if actual_from in node_results:
                                output_port = conn['from']['portName']
                                if output_port in node_results[actual_from]:
                                    input_data[input_port] = node_results[actual_from][output_port]
                        else:
                            # Multiple connections - combine them (use the last one for now)
                            print(f"  🔗 Multiple connections to {input_port}: {len(conns)} connections")
                            for conn in conns:
                                from_node = conn['from']['nodeId']
                                # Rewire: if from_node is frontend-only, walk back to last backend node
                                actual_from = from_node
                                if from_node in frontend_only_nodes:
                                    # Find the last backend node upstream
                                    def walk_upstream(fnode):
                                        for c in connections:
                                            if c['to']['nodeId'] == fnode:
                                                up = c['from']['nodeId']
                                                if up in frontend_only_nodes:
                                                    return walk_upstream(up)
                                                return up
                                        return None
                                    actual_from = walk_upstream(from_node)
                                parent_node_id = actual_from
                                if actual_from in node_results:
                                    output_port = conn['from']['portName']
                                    if output_port in node_results[actual_from]:
                                        input_data[input_port] = node_results[actual_from][output_port]
                                        print(f"  🔗 Using {actual_from}.{output_port} for {input_port}")
                future = self.executor.submit(self.execute_node, node, input_data, node_results, parent_node_id)
                futures.append((node_id, future))
            # Wait for all ready nodes to complete
            for node_id, future in futures:
                result = future.result()
                if result:
                    node_results[node_id] = result
                    executed.add(node_id)
                    results.append({'node_id': node_id, 'result': result})
                    
                    # Check for stop execution flag
                    if isinstance(result, dict) and result.get('__stop_execution'):
                        print(f"  🛑 Execution stopped by {node_id}")
                        return results
        
        return results

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python enhanced_workflow_runner.py <workflow_path> [server_url]")
        print("Example: python enhanced_workflow_runner.py /AANEW.json")
        print("Example: python enhanced_workflow_runner.py /AANEW.json http://localhost:5000")
        sys.exit(1)
    
    workflow_path = sys.argv[1]
    server_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:5000"
    
    try:
        with EnhancedWorkflowRunner(server_url) as runner:
            # Load workflow
            workflow = runner.load_workflow(workflow_path)
            
            # Execute workflow with parallel processing
            results = runner.execute_workflow_parallel(workflow)
            
            # Print summary
            print("\n📋 Execution Summary:")
            print("=" * 50)
            success_count = 0
            error_count = 0
            frontend_only_count = 0
            
            # Get node info for better reporting
            nodes = {node['id']: node for node in workflow.get('nodes', [])}
            
            for result in results:
                node_id = result['node_id']
                result_data = result['result']
                node_info = nodes.get(node_id, {})
                node_type = node_info.get('type', 'unknown')
                
                if 'error' in result_data:
                    print(f"  ❌ {node_id} ({node_type}): Error - {result_data['error']}")
                    error_count += 1
                else:
                    # Show a brief summary of what the node produced
                    output_summary = ""
                    if isinstance(result_data, dict):
                        # Show key outputs (first few)
                        outputs = list(result_data.keys())
                        if outputs:
                            output_summary = f" → {', '.join(outputs[:3])}"
                            if len(outputs) > 3:
                                output_summary += f" (+{len(outputs)-3} more)"
                    print(f"  ✅ {node_id} ({node_type}): Success{output_summary}")
                    success_count += 1
            
            print()
            print(f"📊 Results: {success_count} successful, {error_count} errors")
            
            # Check for frontend-only nodes that were skipped
            for node_id, node in nodes.items():
                if node_id not in [r['node_id'] for r in results]:
                    node_def = runner.load_node_definition(node['type'])
                    if node_def.get('execution_mode') == 'frontend_only':
                        print(f"  ⚡ {node_id} ({node['type']}): Frontend-only (skipped in backend)")
                        frontend_only_count += 1
            
            if frontend_only_count > 0:
                print(f"  📱 {frontend_only_count} frontend-only nodes skipped")
            
            # Show execution order
            print(f"\n🔄 Execution Order:")
            for i, result in enumerate(results, 1):
                node_id = result['node_id']
                node_type = nodes.get(node_id, {}).get('type', 'unknown')
                print(f"  {i:2d}. {node_id} ({node_type})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 