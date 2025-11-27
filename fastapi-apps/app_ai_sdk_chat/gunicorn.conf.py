"""
Gunicorn configuration for production deployment.
"""

import multiprocessing
import os

# Bind to host:port
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Number of worker processes
# Rule of thumb: (2 x $num_cores) + 1
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))

# Worker class - use uvicorn for async support
worker_class = "uvicorn.workers.UvicornWorker"

# Timeout for worker processes
timeout = int(os.environ.get("GUNICORN_TIMEOUT", 120))

# Graceful timeout for worker shutdown
graceful_timeout = int(os.environ.get("GUNICORN_GRACEFUL_TIMEOUT", 30))

# Maximum requests per worker before restart
max_requests = int(os.environ.get("GUNICORN_MAX_REQUESTS", 1000))

# Random jitter for max requests to prevent thundering herd
max_requests_jitter = int(os.environ.get("GUNICORN_MAX_REQUESTS_JITTER", 50))

# Keep-alive connections
keepalive = int(os.environ.get("GUNICORN_KEEPALIVE", 5))

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log to stderr
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")

# Process naming
proc_name = "app-ai-sdk-chat"

# Preload app for faster worker startup
preload_app = True
