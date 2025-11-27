"""
Feature flag configuration for FastAPI app mounting.

This module is the central point for all FEATURE_FLAG management.

Logic:
1. Load defaults from common/config/env_feature_flag.json
2. Environment variables can override config values (if explicitly set)
   Format: FEATURE_FLAG_APP_MOUNT_{APP_NAME}=true|false

Example:
    # In env_feature_flag.json: {"PERSONA_EDITOR": true}
    # ENV not set -> uses config value (true)
    # FEATURE_FLAG_APP_MOUNT_PERSONA_EDITOR=false -> overrides to false
"""

import os
import json
from pathlib import Path
from typing import Dict


def _load_config_flags() -> Dict[str, bool]:
    """
    Load default feature flag values from common/config/env_feature_flag.json

    Returns:
        Dictionary of app names to their default enabled status
    """
    # Go up to monorepo root (fastapi-apps -> mta-v500) then to common/config
    config_path = Path(__file__).parent.parent.parent / "common" / "config" / "env_feature_flag.json"

    print(f"[FEATURE_FLAGS] Loading from: {config_path}")
    print(f"[FEATURE_FLAGS] File exists: {config_path.exists()}")

    try:
        with open(config_path, 'r') as f:
            flags = json.load(f)
            print(f"[FEATURE_FLAGS] Config defaults: {flags}")
            return flags
    except FileNotFoundError:
        print(f"[FEATURE_FLAGS] ERROR: Config not found at {config_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"[FEATURE_FLAGS] ERROR: Invalid JSON in config: {e}")
        return {}


# Load config at module import time (cached)
_CONFIG_FLAGS = _load_config_flags()


def is_app_mount_enabled(app_name: str) -> bool:
    """
    Check if a FastAPI app should be mounted.

    Logic:
    1. Get default value from config (defaults to False if not in config)
    2. If ENV variable is set, override with ENV value
    3. Otherwise, use config value

    Args:
        app_name: The app name key (e.g., "PERSONA_EDITOR", "AWS_S3_FILES")

    Returns:
        True if the app should be mounted, False otherwise

    Environment variable format:
        FEATURE_FLAG_APP_MOUNT_{APP_NAME}=true|false
    """
    # Step 1: Get default from config
    default_value = _CONFIG_FLAGS.get(app_name, False)

    # Step 2: Check if ENV override exists
    env_key = f"FEATURE_FLAG_APP_MOUNT_{app_name}"
    env_value = os.environ.get(env_key)

    # Step 3: If ENV is set, use it; otherwise use config default
    if env_value is not None:
        result = env_value.lower() in ('true', '1', 'yes', 'on')
        print(f"[FEATURE_FLAGS] {app_name}: ENV override -> {result}")
        return result

    return default_value


def get_all_mount_statuses() -> Dict[str, bool]:
    """
    Get the mount status for all configured apps.

    Returns:
        Dictionary mapping app names to their mount enabled status
    """
    statuses = {
        app_name: is_app_mount_enabled(app_name)
        for app_name in _CONFIG_FLAGS.keys()
    }
    print(f"[FEATURE_FLAGS] Final mount statuses: {statuses}")
    return statuses


# Convenience function to get config flags (for reference)
def get_config_flags() -> Dict[str, bool]:
    """
    Get the raw config flags (without ENV overrides).

    Returns:
        Dictionary of config-defined flags
    """
    return _CONFIG_FLAGS.copy()
