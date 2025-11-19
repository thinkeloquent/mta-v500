"""
Core modules for FastAPI application.

This package contains shared utilities and configurations including:
- cors: Enterprise CORS policy management
"""

from .cors import (
    CorsConfig,
    CorsDecision,
    CorsPolicyEngine,
    load_cors_config,
    create_cors_middleware,
    get_cors_config_summary,
)

__all__ = [
    "CorsConfig",
    "CorsDecision",
    "CorsPolicyEngine",
    "load_cors_config",
    "create_cors_middleware",
    "get_cors_config_summary",
]
