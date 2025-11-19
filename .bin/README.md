# Build Scripts

This directory contains utility scripts for building and managing the application.

## dist-copy-frontend-folders.sh

Automates building and copying frontend application dist folders to the static directory.

### What it does

1. **Discovers** all frontend apps in `app/*/frontend`
2. **Installs** dependencies with `npm install`
3. **Builds** each frontend with `npm run build`
4. **Copies** the built `dist` folder to `static/app/*/frontend/dist`

### Usage

```bash
# Build and copy all frontends
.bin/dist-copy-frontend-folders.sh

# Skip build, just copy existing dist folders
.bin/dist-copy-frontend-folders.sh --skip-build
```

### Example

For a project with:
- `app/persona-editor/frontend/`
- `app/react-component-esm/frontend/`

The script will:
1. Build `app/persona-editor/frontend/` → creates `app/persona-editor/frontend/dist/`
2. Copy to `static/app/persona-editor/frontend/dist/`
3. Build `app/react-component-esm/frontend/` → creates `app/react-component-esm/frontend/dist/`
4. Copy to `static/app/react-component-esm/frontend/dist/`

### Output

```
================================================
Frontend Build & Copy Script
================================================

Found 2 frontend directory(ies)

──────────────────────────────────────────────
Processing: persona-editor
──────────────────────────────────────────────
📦 Running npm install...
✓ npm install completed
🔨 Running npm run build...
✓ Build completed successfully
📋 Copying dist to static/app/persona-editor/frontend/dist...
✓ Copied 42 files to static/app/persona-editor/frontend/dist

──────────────────────────────────────────────
Processing: react-component-esm
──────────────────────────────────────────────
📦 Running npm install...
✓ npm install completed
🔨 Running npm run build...
✓ Build completed successfully
📋 Copying dist to static/app/react-component-esm/frontend/dist...
✓ Copied 38 files to static/app/react-component-esm/frontend/dist

================================================
Summary
================================================
✓ Successful: 2
All frontend builds and copies completed successfully! 🎉
```

### When to use

- **Development**: When you want to test the built frontend apps in the orchestrator
- **Deployment**: As part of your build pipeline before deploying
- **After changes**: After making changes to frontend code that you want to serve through the orchestrator

### Integration with MTA_ENV

The main application's `MTA_ENV` environment variable controls static file mounting:

- `MTA_ENV` **not set**: Serves frontend apps from `app/*/frontend/dist` (development mode)
- `MTA_ENV` **set**: Serves frontend apps from `static/app/*/frontend/dist` (production mode)

Use this script when deploying with `MTA_ENV` set to ensure the static directory is populated.

### Requirements

- Node.js and npm installed
- `package.json` with `build` script in each `app/*/frontend/` directory
- Build script must create a `dist` folder

### Exit codes

- `0`: All builds and copies succeeded
- `1`: One or more builds or copies failed
