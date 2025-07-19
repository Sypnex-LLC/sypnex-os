from flask import Flask
from flasgger import Swagger, swag_from
import inspect
import re
from typing import Dict, List, Any
import json

class AutoSwaggerConfig:
    """Configuration class for automatic Swagger documentation generation"""
    
    def __init__(self, app: Flask):
        self.app = app
        self.swagger_config = {
            "headers": [],
            "specs": [
                {
                    "endpoint": 'apispec_1',
                    "route": '/apispec_1.json',
                    "rule_filter": lambda rule: True,  # include all rules
                    "model_filter": lambda tag: True,  # include all models
                }
            ],
            "static_url_path": "/flasgger_static",
            "swagger_ui": True,
            "specs_route": "/apidocs/",
            "swagger_ui_config": {
                "dom_id": "#swagger-ui",
                "layout": "BaseLayout",
                "deepLinking": True,
                "persistAuthorization": True,
                "displayOperationId": False,
                "defaultModelsExpandDepth": 1,
                "defaultModelExpandDepth": 1,
                "defaultModelRendering": "example",
                "displayRequestDuration": True,
                "docExpansion": "list",
                "filter": True,
                "showExtensions": True,
                "showCommonExtensions": True,
                "syntaxHighlight.theme": "monokai"
            }
        }
        
        self.template = {
            "swagger": "2.0",
            "info": {
                "title": "Sypnex OS API",
                "description": "API documentation for Sypnex OS - A modular operating system interface",
                "version": "1.0.0",
                "contact": {
                    "name": "Sypnex OS",
                    "url": "https://github.com/Sypnex-LLC/sypnex-os"
                }
            },
            "host": "localhost:5000",
            "basePath": "/",
            "schemes": ["http"],
            "consumes": ["application/json"],
            "produces": ["application/json"],
            "tags": [
                {"name": "Core", "description": "Core system endpoints"},
                {"name": "User Apps", "description": "User application management"},
                {"name": "Events", "description": "Event bus endpoints"},
                {"name": "WebSocket", "description": "WebSocket communication endpoints"},
                {"name": "Terminal", "description": "Terminal and command endpoints"},
                {"name": "Services", "description": "Service management endpoints"},
                {"name": "Preferences", "description": "User preferences and settings"},
                {"name": "Virtual Files", "description": "Virtual file system management endpoints"}
            ]
        }
        
        self.swagger = None
    
    def auto_discover_routes(self) -> Dict[str, Any]:
        """Automatically discover all routes from the Flask app and its blueprints"""
        routes_info = {}
        
        # Get all registered rules (routes)
        for rule in self.app.url_map.iter_rules():
            if rule.endpoint != 'static':  # Skip static files
                route_info = self._analyze_route(rule)
                if route_info:
                    routes_info[rule.endpoint] = route_info
        
        return routes_info
    
    def _analyze_route(self, rule) -> Dict[str, Any]:
        """Analyze a single route to extract information for Swagger"""
        try:
            # Get the view function
            view_func = self.app.view_functions.get(rule.endpoint)
            if not view_func:
                return None
            
            # Get function signature and docstring
            sig = inspect.signature(view_func)
            doc = inspect.getdoc(view_func) or ""
            
            # Determine HTTP methods
            methods = list(rule.methods - {'HEAD', 'OPTIONS'})
            if not methods:
                methods = ['GET']
            
            # Extract path parameters
            path_params = []
            for arg in rule.arguments:
                path_params.append({
                    "name": arg,
                    "in": "path",
                    "required": True,
                    "type": "string",
                    "description": f"Path parameter: {arg}"
                })
            
            # Determine tag based on endpoint
            tag = self._determine_tag(rule.endpoint, None)
            
            # Create operation object
            operation = {
                "tags": [tag],
                "summary": self._generate_summary(rule.endpoint, doc),
                "description": doc,
                "parameters": path_params,
                "responses": {
                    "200": {
                        "description": "Successful operation",
                        "schema": {"type": "object"}
                    },
                    "400": {
                        "description": "Bad request",
                        "schema": {"type": "object"}
                    },
                    "404": {
                        "description": "Not found",
                        "schema": {"type": "object"}
                    },
                    "500": {
                        "description": "Internal server error",
                        "schema": {"type": "object"}
                    }
                }
            }
            
            # Add request body for POST/PUT/PATCH methods
            if any(method in ['POST', 'PUT', 'PATCH'] for method in methods):
                operation["parameters"].append({
                    "name": "body",
                    "in": "body",
                    "required": False,
                    "schema": {"type": "object"}
                })
            
            return {
                "path": str(rule),
                "methods": methods,
                "operation": operation
            }
            
        except Exception as e:
            print(f"Error analyzing route {rule.endpoint}: {e}")
            return None
    
    def _determine_tag(self, endpoint: str, blueprint=None) -> str:
        """Determine the appropriate tag for a route based on its endpoint"""
        # Use endpoint-based tagging
        endpoint_lower = endpoint.lower()
        
        # Check for blueprint patterns in endpoint names
        if 'user' in endpoint_lower and 'app' in endpoint_lower:
            return "User Apps"
        elif 'event' in endpoint_lower or 'event_bus' in endpoint_lower:
            return "Events"
        elif 'websocket' in endpoint_lower or 'websocket_service' in endpoint_lower:
            return "WebSocket"
        elif 'terminal' in endpoint_lower:
            return "Terminal"
        elif 'service' in endpoint_lower:
            return "Services"
        elif 'preference' in endpoint_lower or 'setting' in endpoint_lower:
            return "Preferences"
        elif 'virtual' in endpoint_lower:
            return "Virtual Files"
        else:
            return "Core"
    
    def _generate_summary(self, endpoint: str, doc: str) -> str:
        """Generate a summary for the endpoint"""
        if doc:
            # Take first line of docstring as summary
            first_line = doc.split('\n')[0].strip()
            if first_line:
                return first_line
        
        # Generate summary from endpoint name
        words = endpoint.replace('_', ' ').split('.')
        if len(words) > 1:
            return f"{words[-1].title()} operation"
        else:
            return f"{endpoint.replace('_', ' ').title()} operation"
    
    def generate_swagger_spec(self) -> Dict[str, Any]:
        """Generate the complete Swagger specification"""
        routes_info = self.auto_discover_routes()
        
        # Create paths object
        paths = {}
        for endpoint, route_info in routes_info.items():
            if route_info:
                path = route_info["path"]
                methods = route_info["methods"]
                operation = route_info["operation"]
                
                if path not in paths:
                    paths[path] = {}
                
                # Add operations for each HTTP method
                for method in methods:
                    method_lower = method.lower()
                    paths[path][method_lower] = operation
        
        # Create final swagger spec
        swagger_spec = self.template.copy()
        swagger_spec["paths"] = paths
        
        return swagger_spec
    
    def setup_swagger(self):
        """Set up Swagger with automatic route discovery"""
        # Generate the swagger spec
        swagger_spec = self.generate_swagger_spec()
        
        # Update the template with the generated spec
        self.template.update(swagger_spec)
        
        # Initialize Swagger
        self.swagger = Swagger(
            self.app,
            config=self.swagger_config,
            template=self.template
        )
        
        print(f"Swagger initialized with {len(swagger_spec.get('paths', {}))} discovered routes")
        
        return self.swagger

def setup_auto_swagger(app: Flask):
    """Convenience function to set up automatic Swagger documentation"""
    config = AutoSwaggerConfig(app)
    return config.setup_swagger() 