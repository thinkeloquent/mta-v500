#!/usr/bin/env python3
"""Setup script for google_gemini_openai_client package."""
from setuptools import setup, find_packages

setup(
    name="google_gemini_openai_client",
    version="1.0.0",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=["httpx>=0.28.0"],
    python_requires=">=3.9",
)
