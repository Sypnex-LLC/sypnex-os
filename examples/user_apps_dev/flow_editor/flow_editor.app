{
  "id": "flow_editor",
  "name": "Flow Editor",
  "description": "Visual node-based workflow editor for creating and executing data processing pipelines",
  "icon": "fas fa-project-diagram",
  "keywords": ["flow", "workflow", "nodes", "pipeline", "visual", "editor"],
  "author": "Sypnex OS",
  "version": "1.0.3",
  "type": "user_app",
  "scripts": [
    "js/utils.js",
    "js/node-registry.js",
    "js/canvas.js",
    "js/node-config.js",
    "js/node-renderer.js",
    "js/data-executors.js",
    "js/http-executors.js",
    "js/media-executors.js",
    "js/flow-executors.js",
    "js/ai-executors.js",
    "js/execution-engine.js",
    "js/workflow.js",
    "js/canvas-manager.js",
    "js/tag-manager.js",
    "js/file-manager.js",
    "js/ui-manager.js",
    "js/main.js"
  ],
  "styles": [
    "css/layout.css",
    "css/nodes.css",
    "css/components.css",
    "css/node-types.css",
    "css/responsive.css"
  ],
  "additional_files": [
    {
      "vfs_path": "/nodes/nodes-pack.json",
      "source_file": "node-definitions/nodes-pack.json"
    }
  ],
  "settings": [
    {
      "key": "DEFAULT_HTTP_TIMEOUT",
      "name": "HTTP Timeout (ms)",
      "type": "number",
      "value": 30000,
      "description": "Default timeout for HTTP requests in milliseconds"
    },
    {
      "key": "AUTO_SAVE_INTERVAL",
      "name": "Auto Save Interval (s)",
      "type": "number",
      "value": 30,
      "description": "Auto save workflows every N seconds (0 = disabled)"
    },
    {
      "key": "MAX_NODES",
      "name": "Maximum Nodes",
      "type": "number",
      "value": 50,
      "description": "Maximum number of nodes allowed in a workflow"
    }
  ]
}