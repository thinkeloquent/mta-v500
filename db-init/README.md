# Database Initialization Scripts

This directory contains SQL scripts that run when PostgreSQL starts for the first time.

## Usage

Place `.sql` or `.sh` files in this directory. They will be executed in alphabetical order during database initialization.

### Example SQL Script

```sql
-- db-init/01-create-schema.sql
CREATE SCHEMA IF NOT EXISTS app_schema;
```

### Example Shell Script

```bash
#!/bin/bash
# db-init/02-seed-data.sh
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    INSERT INTO users (name, email) VALUES ('Admin', 'admin@example.com');
EOSQL
```

## Execution Order

1. Scripts are executed in **alphabetical order**
2. Use numeric prefixes to control order (e.g., `01-`, `02-`, `03-`)
3. `.sql` files are executed directly by PostgreSQL
4. `.sh` files are executed as shell scripts

## Environment Variables

Scripts have access to:
- `$POSTGRES_USER` - Database user
- `$POSTGRES_PASSWORD` - Database password
- `$POSTGRES_DB` - Database name
- `$POSTGRES_HOST` - Database host
- `$POSTGRES_PORT` - Database port
- `$POSTGRES_SCHEMA` - Database schema

## Notes

- Scripts only run on **first initialization** (when data volume is empty)
- If you need to re-run scripts, use `make -f Makefile.database db-reset`
- Scripts run before the database accepts connections
- Errors in scripts will prevent PostgreSQL from starting

## Example: Create App Schema

```sql
-- db-init/01-setup.sql
-- Create schema for application
CREATE SCHEMA IF NOT EXISTS ${POSTGRES_SCHEMA};

-- Set search path
ALTER DATABASE ${POSTGRES_DB} SET search_path TO ${POSTGRES_SCHEMA}, public;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

## Docker Integration

These scripts are copied to `/docker-entrypoint-initdb.d/` in the Postgres container via `Dockerfile.database`.
