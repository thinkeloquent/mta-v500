from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="figma_api",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Unified Python SDK for Figma API - Simplified interface for FastAPI integration",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/figma-api",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Framework :: FastAPI",
        "Framework :: AsyncIO",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
)
