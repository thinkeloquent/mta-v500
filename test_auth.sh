#!/bin/bash

# Test script for BasicAuth on documentation and debug endpoints
# This script demonstrates the two separate authentication mechanisms
# and the disabled state when credentials are not configured

echo "============================================================"
echo "Testing Authentication on Documentation and Debug Endpoints"
echo "============================================================"
echo ""

BASE_URL="${1:-http://localhost:8000}"

echo "Base URL: $BASE_URL"
echo ""

echo "============================================================"
echo "SCENARIO 1: Endpoints DISABLED (No ENV credentials set)"
echo "============================================================"
echo ""
echo "When DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD are not set,"
echo "documentation endpoints should return 503 Service Unavailable"
echo ""

# Test /docs endpoint without credentials configured
echo "1. Testing /docs endpoint (should return 503 if not configured)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/docs")
echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "503" ]; then
    echo "   ✓ Endpoint properly disabled"
else
    echo "   ℹ Endpoint appears to be enabled (credentials configured)"
fi
echo ""

echo "============================================================"
echo "SCENARIO 2: Endpoints ENABLED (ENV credentials configured)"
echo "============================================================"
echo ""
echo "When credentials are set, endpoints should require authentication"
echo ""

# Test /docs endpoint
echo "2. Testing /docs endpoint with credentials"
echo "   a) Without auth (should return 401 if enabled, 503 if disabled):"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/docs")
echo "      Status: $HTTP_CODE"
echo ""
echo "   b) With DOCS_AUTH credentials (username from env or 'admin'):"
echo "      curl -u <username>:<password> $BASE_URL/docs"
echo "      (Try this manually with your configured credentials)"
echo ""

# Test /redoc endpoint
echo "3. Testing /redoc endpoint"
echo "   Without auth:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/redoc")
echo "   Status: $HTTP_CODE"
echo ""

# Test /openapi.json endpoint
echo "4. Testing /openapi.json endpoint"
echo "   Without auth:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/openapi.json")
echo "   Status: $HTTP_CODE"
echo ""

echo "============================================================"
echo "Debug Endpoints"
echo "============================================================"
echo ""

# Test /debug/vault/vault-secrets endpoint
echo "5. Testing /debug/vault/vault-secrets endpoint"
echo "   Without auth:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug/vault/vault-secrets")
echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "503" ]; then
    echo "   ✓ Endpoint properly disabled"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "   ℹ Endpoint enabled and requires authentication"
else
    echo "   Status code: $HTTP_CODE"
fi
echo ""

# Test /debug/vault/vault-info endpoint
echo "6. Testing /debug/vault/vault-info endpoint"
echo "   Without auth:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug/vault/vault-info")
echo "   Status: $HTTP_CODE"
echo ""

# Test /debug/vault/global endpoint
echo "7. Testing /debug/vault/global endpoint"
echo "   Without auth:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug/vault/global")
echo "   Status: $HTTP_CODE"
echo ""

echo "============================================================"
echo "Summary"
echo "============================================================"
echo ""
echo "HTTP Status Code Meanings:"
echo "  200 - OK (Endpoint accessible)"
echo "  401 - Unauthorized (Credentials required but not provided/invalid)"
echo "  404 - Not Found (Route not registered)"
echo "  503 - Service Unavailable (Endpoint disabled, credentials not configured)"
echo ""
echo "Two separate authentication mechanisms:"
echo ""
echo "1. Documentation Endpoints (/docs, /redoc, /openapi.json)"
echo "   - Environment Variables: DOCS_AUTH_USERNAME, DOCS_AUTH_PASSWORD"
echo "   - If not set: Endpoints return 503 Service Unavailable"
echo "   - If set: Endpoints require Basic Authentication"
echo ""
echo "2. Debug Endpoints (/debug/vault/*)"
echo "   - Environment Variables: DEBUG_AUTH_USERNAME, DEBUG_AUTH_PASSWORD"
echo "   - If not set: Endpoints return 503 Service Unavailable"
echo "   - If set: Endpoints require Basic Authentication"
echo ""
echo "To enable endpoints, set the appropriate environment variables:"
echo ""
echo "  export DOCS_AUTH_USERNAME=admin"
echo "  export DOCS_AUTH_PASSWORD=your_secure_password"
echo ""
echo "  export DEBUG_AUTH_USERNAME=admin"
echo "  export DEBUG_AUTH_PASSWORD=your_debug_password"
echo ""
echo "Then restart the application."
echo ""
