{
  "id": "flow_editor",
  "name": "Flow Editor",
  "description": "Visual node-based workflow editor for creating and executing data processing pipelines",
  "icon": "fas fa-project-diagram",
  "keywords": ["flow", "workflow", "nodes", "pipeline", "visual", "editor"],
  "author": "Sypnex OS",
  "version": "1.0.0",
  "type": "user_app",
  "scripts": [
    "utils.js",
    "node-registry.js",
    "canvas.js",
    "node-config.js",
    "node-renderer.js",
    "data-executors.js",
    "http-executors.js",
    "media-executors.js",
    "flow-executors.js",
    "ai-executors.js",
    "execution-engine.js",
    "workflow.js",
    "canvas-manager.js",
    "main.js"
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