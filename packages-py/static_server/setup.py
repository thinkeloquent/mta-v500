#!/usr/bin/env python
"""Setup script for static-server package."""

from setuptools import setup, find_packages

setup(
    name="static-server",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.115.0",
    ],
)
