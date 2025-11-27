# Secret Parsers

This directory contains parser functions for transforming secrets loaded from host-mounted files.

## Overview

Secret parsers allow you to transform secrets **after** they are loaded from:

- `/opt/secrets/vault_secrets` (vault secrets)
- `/etc/secrets/MTA_DEV` (environment secrets)

These files are typically mounted by container orchestration systems (Kubernetes, Docker, etc.) at runtime.

## How It Works

1. **Secrets are loaded** from host-mounted files during application startup
2. **Parsers are applied** to transform the secrets (reassign keys, append additional keys)
3. **Transformed secrets** are stored in the global state
4. **Application routes** access the transformed secrets via dependency injection

## Parser Functions

### `vault_secret_parser(key: str, value: str) -> SecretTransform | None`

Transforms vault secrets loaded from `/opt/secrets/vault_secrets`.

**Location**: `app/parsers/secret_transformers.py`

### `env_secret_parser(key: str, value: str) -> SecretTransform | None`

Transforms environment secrets loaded from `/etc/secrets/MTA_DEV`.

**Location**: `app/parsers/secret_transformers.py`

## Transformation Types

### 1. **Reassign** (Rename Key)

Removes the old key and creates a new key with the same value.

```python
def vault_secret_parser(key: str, value: str):
    # Rename *** to ****
    if key == "***":
        return SecretTransform(reassign={"****": value})
    return None
```

**Result**:

- Input: `{"***": "*****"}`
- Output: `{"****": "*****"}` (\*\*\* removed)

### 2. **Append** (Add Additional Keys)

Keeps the original key and adds additional keys with the same value.

```python
def env_secret_parser(key: str, value: str):
    # Keep DATABASE_URL and add variants
    if key == "DATABASE_URL":
        return SecretTransform(append={
            "DATABASE_URL_PRIMARY": value,
            "DATABASE_URL_REPLICA": value
        })
    return None
```

**Result**:

- Input: `{"DATABASE_URL": "postgres://localhost"}`
- Output: `{"DATABASE_URL": "postgres://localhost", "DATABASE_URL_PRIMARY": "postgres://localhost", "DATABASE_URL_REPLICA": "postgres://localhost"}`

### 3. **No Transformation**

Return `None` to keep the key unchanged.

```python
def vault_secret_parser(key: str, value: str):
    # Keep all keys unchanged
    return None
```

## Namespace vs Global Injection

By default, transformed secrets are stored in the **namespace** (accessible via dependency injection). You can also inject secrets into the **global** `os.environ` for access by all processes.

### Namespace Storage (Default)

Secrets stay isolated and accessed via FastAPI dependency injection:

```python
# Stored in namespace
return SecretTransform(reassign={"NEW_KEY": value})

# Access in routes
from vault_secrets.fastapi import get_vault_properties

@app.get("/endpoint")
def endpoint(props = Depends(get_vault_properties)):
    api_key = props.get("NEW_KEY")  # Only accessible via dependency injection
```

### Global Injection (`os.environ`)

Secrets injected into `os.environ` for system-wide access:

```python
# Injected into os.environ
return SecretTransform(reassign_global={"NODE_ENV": value})

# Access anywhere in your application
import os
node_env = os.environ.get("NODE_ENV")  # Available to all processes
```

### Transformation Field Reference

| Field | Storage | Original Key | Use Case |
|-------|---------|--------------|----------|
| `reassign` | Namespace | Removed | Rename keys for namespace access |
| `append` | Namespace | Kept | Add variants for namespace access |
| `reassign_global` | `os.environ` | Removed | Rename keys for global access |
| `append_global` | `os.environ` | Kept | Add variants for global access |

### Mixed Storage Example

Store the same secret in both namespace AND global:

```python
def vault_secret_parser(key: str, value: str):
    if key == "API_KEY":
        return SecretTransform(
            reassign={"API_KEY_NS": value},      # Namespace access
            reassign_global={"API_KEY": value}   # Global os.environ access
        )
    return None
```

**Result**:
- `API_KEY_NS` → Available via `get_vault_properties()` dependency injection
- `API_KEY` → Available via `os.environ.get("API_KEY")` everywhere

## Example Use Cases

### Legacy Key Migration

Migrate old key names to new naming convention:

```python
def vault_secret_parser(key: str, value: str):
    if key.startswith("OLD_"):
        new_key = key.replace("OLD_", "NEW_")
        return SecretTransform(reassign={new_key: value})
    return None
```

### Versioned API Keys

Add versioned variants of API keys:

```python
def vault_secret_parser(key: str, value: str):
    if "API_KEY" in key or "TOKEN" in key:
        return SecretTransform(append={f"{key}_V2": value})
    return None
```

### Clean Up FILE\_ Prefix

Remove `FILE_CONFIG_` prefix from vault secrets:

```python
def vault_secret_parser(key: str, value: str):
    if key.startswith("FILE_CONFIG_"):
        clean_key = key.replace("FILE_CONFIG_", "CONFIG_")
        return SecretTransform(reassign={clean_key: value})
    return None
```

### Environment Variables to Global

Inject environment variables globally for all processes:

```python
def env_secret_parser(key: str, value: str):
    # Inject runtime environment to os.environ
    if key in ["NODE_ENV", "PYTHON_ENV", "ENVIRONMENT"]:
        return SecretTransform(reassign_global={key: value})
    return None
```

**Why?** Node.js processes, Python scripts, and shell commands all expect `NODE_ENV` / `PYTHON_ENV` to be in `os.environ`.

### Database Connection Expansion

Create multiple connection strings from a single URL:

```python
def env_secret_parser(key: str, value: str):
    if key == "DATABASE_URL":
        return SecretTransform(append={
            "DB_URL_PRIMARY": value,
            "DB_URL_REPLICA": value.replace("db", "db_replica"),
            "DB_URL_BACKUP": value.replace("db", "db_backup")
        })
    return None
```

## Conflict Resolution

If a parser returns **both** reassign and append transformations for the same storage location:

1. **Reassign takes priority** (old key is removed, new keys are added)
2. **Append is skipped** (not applied)
3. **Warning is logged** to alert you of the conflict

### Namespace Conflict Example

```python
# ⚠️ This creates a namespace conflict!
return SecretTransform(
    reassign={"NEW_KEY": value},  # This wins
    append={"EXTRA_KEY": value}   # This is ignored
)
```

**Log output**:
```
WARNING: [vault_secrets] Namespace conflict for key 'MY_KEY': both reassign and append rules defined. Reassign takes priority, skipping append.
```

### Global Conflict Example

```python
# ⚠️ This creates a global conflict!
return SecretTransform(
    reassign_global={"NEW_KEY": value},  # This wins
    append_global={"EXTRA_KEY": value}   # This is ignored
)
```

**Log output**:
```
WARNING: [env_secrets] Global conflict for key 'MY_KEY': both reassign_global and append_global rules defined. Reassign takes priority, skipping append.
```

### No Conflict: Namespace + Global

This is **NOT** a conflict (different storage locations):

```python
# ✓ Valid: namespace reassign + global reassign
return SecretTransform(
    reassign={"API_KEY_NS": value},      # Namespace
    reassign_global={"API_KEY": value}   # Global os.environ
)
```

## Configuration

The parsers are automatically applied during startup in `app/main.py`:

```python
# Vault secrets
vault_secrets_lifespan = create_lifespan_handler(
    secrets_file=vault_secret_file,
    file_formatter=file_formatter,
    transformer=vault_secret_parser  # Parser applied here
)

# Environment secrets
env_secrets_lifespan = create_env_lifespan_handler(
    file_path=env_secret_file,
    mode=load_mode,
    transformer=env_secret_parser  # Parser applied here
)
```

## Testing

Run the secret parser tests:

```bash
python -m pytest tests/test_secret_parser.py -v
```

## API Reference

See `app/core/secret_parser.py` for the full API:

- `SecretTransform`: Dataclass for transformation rules
- `apply_transformations()`: Apply parser function to all secrets
- `merge_transforms()`: Merge multiple transformations
- `SecretParserFunc`: Type alias for parser functions
