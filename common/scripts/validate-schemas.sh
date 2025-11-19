#!/bin/bash
# Validate all schemas in ./common/schemas/

set -e

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMAS_DIR="$COMMON_DIR/schemas"

echo "Validating schemas in $SCHEMAS_DIR..."

# Count schema files
JSON_COUNT=$(find "$SCHEMAS_DIR/json" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
YAML_COUNT=$(find "$SCHEMAS_DIR/yaml" -name "*.yaml" -o -name "*.yml" 2>/dev/null | wc -l | tr -d ' ')
PROTO_COUNT=$(find "$SCHEMAS_DIR/proto" -name "*.proto" 2>/dev/null | wc -l | tr -d ' ')

echo "Found schemas:"
echo "  - JSON: $JSON_COUNT"
echo "  - YAML: $YAML_COUNT"
echo "  - Proto: $PROTO_COUNT"

# Validate JSON schemas
if [ "$JSON_COUNT" -gt 0 ]; then
    echo ""
    echo "Validating JSON schemas..."
    for schema in "$SCHEMAS_DIR/json"/*.json; do
        if [ -f "$schema" ]; then
            echo "  Checking $(basename "$schema")..."
            # Basic JSON syntax validation
            if ! python3 -m json.tool "$schema" > /dev/null 2>&1; then
                echo "  ✗ Invalid JSON: $schema"
                exit 1
            fi
            echo "    ✓ Valid"
        fi
    done
fi

# Validate YAML schemas
if [ "$YAML_COUNT" -gt 0 ]; then
    echo ""
    echo "Validating YAML schemas..."
    for schema in "$SCHEMAS_DIR/yaml"/*.{yaml,yml}; do
        if [ -f "$schema" ]; then
            echo "  Checking $(basename "$schema")..."
            # Basic YAML syntax validation with Python
            if ! python3 -c "import yaml; yaml.safe_load(open('$schema'))" > /dev/null 2>&1; then
                echo "  ✗ Invalid YAML: $schema"
                exit 1
            fi
            echo "    ✓ Valid"
        fi
    done
fi

# Proto validation
if [ "$PROTO_COUNT" -gt 0 ]; then
    echo ""
    echo "Proto files found. Validation requires protoc (skipping for now)."
fi

echo ""
echo "✓ Schema validation complete"
