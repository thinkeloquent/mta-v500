"""
ID generation utilities for consistent ID formats across the application.
"""

from uuid import uuid4
from nanoid import generate as nanoid_generate


def generate_persona_id() -> str:
    """
    Generate a unique persona ID.

    Format: "persona-{uuid}"

    Returns:
        Persona ID string
    """
    return f"persona-{uuid4()}"


def generate_audit_id() -> str:
    """
    Generate a unique audit log ID.

    Format: "audit-{uuid}"

    Returns:
        Audit log ID string
    """
    return f"audit-{uuid4()}"


def generate_llm_default_id() -> str:
    """
    Generate a unique LLM default ID.

    Uses nanoid for shorter, URL-friendly IDs.

    Returns:
        LLM default ID string (nanoid)
    """
    return nanoid_generate(size=21)  # Default nanoid size
