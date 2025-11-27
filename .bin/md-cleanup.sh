  #!/bin/bash
# Empty all .md files in project, excluding node_modules and Python virtual environments
find "${1:-.}" -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.venv/*" \
  -not -path "*/venv/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/site-packages/*" \
  -exec truncate -s 0 {} \;