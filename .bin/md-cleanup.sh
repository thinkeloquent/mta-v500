  #!/bin/bash
  # Empty all .md files in packages-py
  find "${1:-.}" -name "*.md" -exec truncate -s 0 {} \;