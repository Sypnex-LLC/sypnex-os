"""
App validation policies and rules for Sypnex OS user apps
This module contains all validation rules used by both server-side sanitization
and dev tools for consistent policy enforcement.
"""

def get_validation_rules():
    """
    Get all app validation rules for user apps
    Returns a structured dictionary with all validation policies
    """
    
    # JavaScript security rules - actively enforced server-side
    javascript_security = {
        "blacklisted_methods": [
            # Remote request methods - specific API calls
            'fetch(',           # Fetch API call
            'fetch (',          # Fetch API call with space
            'xmlhttprequest(',  # XMLHttpRequest constructor
            'new xmlhttprequest',  # XMLHttpRequest constructor
            'activexobject(',   # ActiveX constructor
            'new activexobject', # ActiveX constructor
            'new websocket(',   # WebSocket constructor (specific)
            'websocket.prototype', # WebSocket prototype access
            'window.websocket', # Direct WebSocket access
            'eventsource(',     # EventSource constructor
            'new eventsource',  # EventSource constructor
            'navigator.sendbeacon(', # Beacon API call
            'importscripts(',   # Web Workers import
            'window.postmessage(', # Cross-frame messaging (specific to window)
            'parent.postmessage(', # Cross-frame messaging to parent
            'top.postmessage(',    # Cross-frame messaging to top
            
            # Navigation and window methods - specific API calls
            'window.open(',     # Opening new windows/tabs
            'location.href =',  # Page navigation assignment
            'location.assign(', # Page navigation method
            'location.replace(', # Page navigation method
            'document.domain =', # Domain manipulation assignment
            'document.domain=',  # Domain manipulation assignment (no space)
            
            # Browser storage methods - specific API calls
            'localstorage.',    # Local storage access (any method)
            'sessionstorage.',  # Session storage access (any method)
            'document.cookie =', # Cookie assignment
            'document.cookie=',  # Cookie assignment (no space)
            'indexeddb.',       # IndexedDB access
            'window.indexeddb', # IndexedDB via window
            'websql(',          # WebSQL (deprecated)
            'caches.',          # Cache API (specific methods)
            'serviceworker',    # Service worker registration
            'navigator.storage.', # Storage API
            'storagemanager.',  # Storage Manager API
        ],
        "enforced_server_side": True,
        "severity": "error",
        "description": "User apps must use SypnexAPI methods instead of direct browser APIs for security reasons"
    }
    
    # JavaScript structure rules - enforced everywhere
    javascript_structure = {
        "rules": {
            "dom_ready_pattern": {
                "enforced_server_side": True,  # Required for proper app initialization
                "severity": "error",
                "description": "JavaScript files must include proper DOM ready checking: if (document.readyState === 'loading')",
                "required_pattern": "if (document.readyState === 'loading')"
            }
        }
    }
    
    # HTML structure rules - dev-time validation
    html_structure = {
        "rules": {
            "no_inline_scripts": {
                "enforced_server_side": False,
                "severity": "error",
                "description": "Inline <script> tags are not allowed. Use external JavaScript files or SypnexAPI methods.",
                "patterns": ["<script", "<script>"]
            },
            "no_inline_styles": {
                "enforced_server_side": False,
                "severity": "warning",
                "description": "Inline <style> tags should be avoided. Use external CSS files for better maintainability.",
                "patterns": ["<style", "<style>"]
            },
            "must_have_app_container": {
                "enforced_server_side": True,  # Server MUST enforce this
                "severity": "error", 
                "description": "All app content must be wrapped in <div class=\"app-container\">",
                "required_pattern": '<div class="app-container">'
            },
            "no_html_head_body": {
                "enforced_server_side": True,  # Server MUST enforce this
                "severity": "error",
                "description": "Do not include <html>, <head>, or <body> tags. Apps are HTML fragments.",
                "patterns": ["<html", "<head", "<body"]
            },
            "no_inline_event_handlers": {
                "enforced_server_side": True,  # Server MUST enforce this for security
                "severity": "error",
                "description": "Inline event handlers (onclick, onload, etc.) are not allowed. Use addEventListener() instead.",
                "patterns": [
                    "onclick=", "ondblclick=", "onmousedown=", "onmouseup=", "onmouseover=", 
                    "onmouseout=", "onmousemove=", "onkeydown=", "onkeyup=", "onkeypress=",
                    "onload=", "onunload=", "onresize=", "onscroll=", "onfocus=", "onblur=",
                    "onchange=", "onselect=", "onsubmit=", "onreset=", "onerror=", "onabort=",
                    "ondrag=", "ondrop=", "ondragstart=", "ondragend=", "ondragover=", 
                    "ondragenter=", "ondragleave=", "ontouchstart=", "ontouchend=", "ontouchmove="
                ]
            }
        }
    }
    
    return {
        "version": "1.0",
        "last_updated": "2025-08-09",
        "validation_rules": {
            "javascript_security": javascript_security,
            "javascript_structure": javascript_structure,
            "html_structure": html_structure
        },
        "policy_info": {
            "description": "Sypnex OS user app validation policies",
            "documentation_url": "https://docs.sypnex.com/user-apps/validation",
            "contact": "support@sypnex.com"
        }
    }

def validate_javascript_content(content, app_id=None):
    """
    Validate JavaScript content against security policies
    Returns tuple: (is_valid, violations_found)
    """
    rules = get_validation_rules()
    blacklisted = rules["validation_rules"]["javascript_security"]["blacklisted_methods"]
    
    content_lower = content.lower()
    violations = []
    
    for method in blacklisted:
        if method in content_lower:
            violations.append(method)
    
    return len(violations) == 0, violations

def validate_javascript_structure(content, app_id=None, enforce_server_side_only=False):
    """
    Validate JavaScript structure against best practices
    Args:
        content: JavaScript content to validate
        app_id: Optional app ID for context
        enforce_server_side_only: If True, only check rules where enforced_server_side=True
    Returns tuple: (is_valid, issues_found)
    """
    rules = get_validation_rules()
    js_rules = rules["validation_rules"]["javascript_structure"]["rules"]
    
    issues = []
    
    # Check for DOM ready pattern
    dom_ready_rule = js_rules["dom_ready_pattern"]
    if not enforce_server_side_only or dom_ready_rule.get("enforced_server_side", False):
        required_pattern = dom_ready_rule["required_pattern"]
        if required_pattern not in content:
            issues.append({
                "rule": "dom_ready_pattern",
                "severity": dom_ready_rule["severity"],
                "description": dom_ready_rule["description"],
                "missing_pattern": required_pattern
            })
    
    # Check if any errors (vs warnings)
    errors = [issue for issue in issues if issue["severity"] == "error"]
    is_valid = len(errors) == 0
    
    return is_valid, issues

def validate_html_structure(content, app_id=None, enforce_server_side_only=False):
    """
    Validate HTML structure against policies
    Args:
        content: HTML content to validate
        app_id: Optional app ID for context
        enforce_server_side_only: If True, only check rules where enforced_server_side=True
    Returns tuple: (is_valid, issues_found)
    """
    rules = get_validation_rules()
    html_rules = rules["validation_rules"]["html_structure"]["rules"]
    
    content_lower = content.lower()
    issues = []
    
    # Check for inline scripts
    if not enforce_server_side_only or html_rules["no_inline_scripts"].get("enforced_server_side", False):
        for pattern in html_rules["no_inline_scripts"]["patterns"]:
            if pattern.lower() in content_lower:
                issues.append({
                    "rule": "no_inline_scripts",
                    "severity": html_rules["no_inline_scripts"]["severity"],
                    "description": html_rules["no_inline_scripts"]["description"],
                    "found_pattern": pattern
                })
    
    # Check for inline styles
    if not enforce_server_side_only or html_rules["no_inline_styles"].get("enforced_server_side", False):
        for pattern in html_rules["no_inline_styles"]["patterns"]:
            if pattern.lower() in content_lower:
                issues.append({
                    "rule": "no_inline_styles", 
                    "severity": html_rules["no_inline_styles"]["severity"],
                    "description": html_rules["no_inline_styles"]["description"],
                    "found_pattern": pattern
                })
    
    # Check for app-container (always enforced)
    if not enforce_server_side_only or html_rules["must_have_app_container"].get("enforced_server_side", False):
        # Use regex to check for app-container as a complete class name
        import re
        app_container_pattern = r'<div[^>]*class\s*=\s*["\'][^"\']*\bapp-container\b[^"\']*["\'][^>]*>'
        has_app_container = bool(re.search(app_container_pattern, content, re.IGNORECASE))
        if not has_app_container:
            issues.append({
                "rule": "must_have_app_container",
                "severity": html_rules["must_have_app_container"]["severity"],
                "description": html_rules["must_have_app_container"]["description"],
                "missing_pattern": "app-container div"
            })
    
    # Check for forbidden HTML tags (always enforced)
    if not enforce_server_side_only or html_rules["no_html_head_body"].get("enforced_server_side", False):
        for pattern in html_rules["no_html_head_body"]["patterns"]:
            if pattern.lower() in content_lower:
                issues.append({
                    "rule": "no_html_head_body",
                    "severity": html_rules["no_html_head_body"]["severity"], 
                    "description": html_rules["no_html_head_body"]["description"],
                    "found_pattern": pattern
                })
    
    # Check for inline event handlers (security enforcement)
    if not enforce_server_side_only or html_rules["no_inline_event_handlers"].get("enforced_server_side", False):
        for pattern in html_rules["no_inline_event_handlers"]["patterns"]:
            if pattern.lower() in content_lower:
                issues.append({
                    "rule": "no_inline_event_handlers",
                    "severity": html_rules["no_inline_event_handlers"]["severity"],
                    "description": html_rules["no_inline_event_handlers"]["description"],
                    "found_pattern": pattern
                })
    
    # Check if any errors (vs warnings)
    errors = [issue for issue in issues if issue["severity"] == "error"]
    is_valid = len(errors) == 0
    
    return is_valid, issues

def validate_user_app_files(files_dict, enforce_server_side_only=False):
    """
    Validate a complete user app package
    Args:
        files_dict: {filename: content_string}
        enforce_server_side_only: If True, only enforce rules marked as enforced_server_side=True
    Returns validation results
    """
    results = {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "files_validated": []
    }
    
    for filename, content in files_dict.items():
        file_result = {
            "filename": filename,
            "is_valid": True,
            "issues": []
        }
        
        # Validate HTML files
        if filename.endswith('.html'):
            html_valid, html_issues = validate_html_structure(content, enforce_server_side_only=enforce_server_side_only)
            if not html_valid:
                file_result["is_valid"] = False
                results["is_valid"] = False
            file_result["issues"].extend(html_issues)
            
            # Also check for JavaScript in HTML
            js_valid, js_violations = validate_javascript_content(content)
            if not js_valid:
                file_result["is_valid"] = False
                results["is_valid"] = False
                for violation in js_violations:
                    file_result["issues"].append({
                        "rule": "javascript_security",
                        "severity": "error",
                        "description": f"Blacklisted JavaScript method: {violation}",
                        "found_pattern": violation
                    })
        
        # Validate JS files
        elif filename.endswith('.js'):
            # Check JavaScript security
            js_valid, js_violations = validate_javascript_content(content)
            if not js_valid:
                file_result["is_valid"] = False
                results["is_valid"] = False
                for violation in js_violations:
                    file_result["issues"].append({
                        "rule": "javascript_security",
                        "severity": "error", 
                        "description": f"Blacklisted JavaScript method: {violation}",
                        "found_pattern": violation
                    })
            
            # Check JavaScript structure (DOM ready pattern)
            js_struct_valid, js_struct_issues = validate_javascript_structure(content, enforce_server_side_only=enforce_server_side_only)
            if not js_struct_valid:
                file_result["is_valid"] = False
                results["is_valid"] = False
            file_result["issues"].extend(js_struct_issues)
        
        # Collect errors and warnings
        for issue in file_result["issues"]:
            if issue["severity"] == "error":
                results["errors"].append(f"{filename}: {issue['description']}")
            else:
                results["warnings"].append(f"{filename}: {issue['description']}")
        
        results["files_validated"].append(file_result)
    
    return results
