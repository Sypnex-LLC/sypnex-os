# Gunicorn configuration for Sypnex OS
# Using gevent for better SocketIO compatibility

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 1  # SocketIO typically works best with 1 worker
worker_class = "gevent"  # Better for SocketIO than eventlet
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "sypnex-os"

# Server mechanics
daemon = False
preload_app = False
