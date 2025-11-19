#!/usr/bin/env python3
"""
Verification script for AWS S3 Files migration.

This script verifies:
1. All files are in place
2. Frontend is built
3. Configuration is correct
4. Structure matches requirements
"""

import sys
from pathlib import Path


def verify_structure():
    """Verify directory structure."""
    print("="*70)
    print("Verifying AWS S3 Files Migration")
    print("="*70)

    base_path = Path("app/aws_s3_files")

    # Check base directory exists
    if not base_path.exists():
        print("✗ Base directory app/aws_s3_files does not exist")
        return False

    print("✓ Base directory exists")

    # Check required directories
    required_dirs = [
        "config",
        "models",
        "routers",
        "services",
        "middleware",
        "frontend",
        "frontend/dist",
        "tests",
    ]

    all_dirs_exist = True
    for dir_name in required_dirs:
        dir_path = base_path / dir_name
        if dir_path.exists():
            print(f"✓ {dir_name}/")
        else:
            print(f"✗ {dir_name}/ missing")
            all_dirs_exist = False

    if not all_dirs_exist:
        return False

    # Check required files
    required_files = [
        "main.py",
        "requirements.txt",
        ".env.example",
        "README.md",
        "__init__.py",
        "frontend/dist/index.html",
        "frontend/package.json",
    ]

    all_files_exist = True
    for file_name in required_files:
        file_path = base_path / file_name
        if file_path.exists():
            print(f"✓ {file_name}")
        else:
            print(f"✗ {file_name} missing")
            all_files_exist = False

    if not all_files_exist:
        return False

    # Check orchestrator integration
    print("\n" + "="*70)
    print("Checking Orchestrator Integration")
    print("="*70)

    orchestrator_main = Path("app/main.py")
    if orchestrator_main.exists():
        content = orchestrator_main.read_text()

        checks = [
            ("aws_s3_files import", "aws_s3_files" in content),
            ("mount path", "/api/apps/aws-s3-files" in content),
            ("health check", "aws-s3-files" in content or "aws_s3_files" in content),
        ]

        for check_name, result in checks:
            if result:
                print(f"✓ {check_name}")
            else:
                print(f"✗ {check_name} not found")
                all_files_exist = False
    else:
        print("✗ Orchestrator main.py not found")
        return False

    # Check reference route
    ref_route = Path("app/routes/aws_s3_files.routes.py")
    if ref_route.exists():
        print(f"✓ Reference route exists")
    else:
        print(f"✗ Reference route missing")
        all_files_exist = False

    # Check frontend build
    print("\n" + "="*70)
    print("Checking Frontend Build")
    print("="*70)

    dist_path = base_path / "frontend/dist"
    if dist_path.exists():
        index_html = dist_path / "index.html"
        assets_dir = dist_path / "assets"

        if index_html.exists():
            print(f"✓ index.html exists")
        else:
            print(f"✗ index.html missing")
            all_files_exist = False

        if assets_dir.exists():
            assets = list(assets_dir.glob("*"))
            print(f"✓ Assets built ({len(assets)} files)")
        else:
            print(f"✗ Assets directory missing")
            all_files_exist = False
    else:
        print(f"✗ Dist directory missing")
        all_files_exist = False

    # Check API URL updated
    api_file = base_path / "frontend/src/services/api.js"
    if api_file.exists():
        content = api_file.read_text()
        if "/api/apps/aws-s3-files/api" in content:
            print(f"✓ API URL updated correctly")
        else:
            print(f"✗ API URL not updated")
            all_files_exist = False
    else:
        print(f"✗ API service file missing")
        all_files_exist = False

    return all_files_exist


def print_summary():
    """Print migration summary."""
    print("\n" + "="*70)
    print("Migration Summary")
    print("="*70)

    print("""
    Backend Location:  app/aws_s3_files/
    Frontend Location: app/aws_s3_files/frontend/
    Mount Path:        /api/apps/aws-s3-files
    Reference Route:   /s3-admin/info

    Access URLs (when running orchestrator on port 8000):
    - Web Interface:   http://localhost:8000/api/apps/aws-s3-files/
    - API Docs:        http://localhost:8000/api/apps/aws-s3-files/docs
    - Health Check:    http://localhost:8000/api/apps/aws-s3-files/health
    - Ref Route Info:  http://localhost:8000/s3-admin/info

    Next Steps:
    1. Set environment variables (see app/aws_s3_files/.env.example)
    2. Start orchestrator: python -m uvicorn app.main:app --reload --port 8000
    3. Access the application at http://localhost:8000/api/apps/aws-s3-files/
    """)


if __name__ == "__main__":
    success = verify_structure()
    print_summary()

    if success:
        print("\n✓ Migration verification PASSED")
        sys.exit(0)
    else:
        print("\n✗ Migration verification FAILED")
        sys.exit(1)
