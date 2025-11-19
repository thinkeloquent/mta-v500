# AWS S3 Files Admin

Full-featured AWS S3 bucket and file management system integrated into the MTA orchestrator.

## Overview

This application is a Python FastAPI implementation for AWS S3 resource administration, maintaining 100% API compatibility with the original Node.js/Fastify backend.

**Mounted Path**: `/api/apps/aws-s3-files/`

## Integration Status

This app has been successfully migrated and integrated into the MTA orchestrator as a mounted sub-application.

## Features

- **Bucket Operations**: Create, list, delete buckets with access point management
- **File Operations**: Upload, download, delete files with streaming support
- **Presigned URLs**: Generate temporary URLs for secure file access (1-hour expiry)
- **Rate Limiting**: 500 requests per minute per IP
- **Security**: CORS, CSP, security headers, input validation
- **Logging**: Structured logging with correlation IDs
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Type Safety**: Full type hints with Pydantic models
- **Testing**: Pytest-ready test structure

## Requirements

- Python 3.11+
- AWS Account with S3 access
- pip or virtualenv

## Installation

### 1. Create Virtual Environment (Recommended)

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Production dependencies
pip install -r requirements.txt

# Or development dependencies (includes testing tools)
pip install -r requirements-dev.txt
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your AWS credentials:

```env
# AWS Configuration
AWS_S3_ACCESS_KEY=your_access_key_here
AWS_S3_SECRET_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id_here  # Optional, for access point management

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_FILE_TYPES=image/*,application/pdf,text/*,video/*,audio/*,application/zip

# Presigned URL Configuration
PRESIGNED_URL_EXPIRY=3600  # 1 hour

# Rate Limiting
RATE_LIMIT_PER_MINUTE=500

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## Running the Server

### Development Mode (with auto-reload)

```bash
# Using Make
make dev

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

### Production Mode

```bash
# Using Make
make start

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 3001
```

### Using Python directly

```bash
python main.py
```

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - API information

### Bucket Operations
- `GET /api/buckets` - List all buckets
- `POST /api/buckets` - Create a new bucket
- `GET /api/buckets/{name}` - Get bucket details
- `DELETE /api/buckets/{name}` - Delete empty bucket
- `DELETE /api/buckets/{name}/force` - Force delete bucket with access points

### File Operations
- `GET /api/buckets/{bucket}/files` - List files (with pagination)
- `POST /api/buckets/{bucket}/files` - Upload file (multipart)
- `GET /api/buckets/{bucket}/files/{key}` - Download file (streaming)
- `DELETE /api/buckets/{bucket}/files/{key}` - Delete file
- `GET /api/buckets/{bucket}/files/{key}/metadata` - Get file metadata
- `GET /api/buckets/{bucket}/download-url?key={key}` - Generate presigned download URL

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3001/docs
- **ReDoc**: http://localhost:3001/redoc
- **OpenAPI JSON**: http://localhost:3001/openapi.json

## Development

### Code Quality Tools

```bash
# Format code
make format

# Check formatting
make format-check

# Run linter
make lint

# Fix linting issues
make lint-fix

# Run type checker
make type-check

# Run all checks
make check
```

### Testing

```bash
# Run tests
make test

# Run tests with coverage
make test-cov
```

### Clean Generated Files

```bash
make clean
```

## Project Structure

```
server-py/
├── main.py                 # Application entry point
├── config/
│   ├── __init__.py
│   ├── aws.py             # AWS client configuration
│   └── settings.py        # Environment settings
├── models/
│   ├── __init__.py        # Common models
│   ├── bucket.py          # Bucket models
│   └── file.py            # File models
├── services/
│   ├── __init__.py
│   └── s3_service.py      # S3 business logic
├── routers/
│   ├── __init__.py
│   ├── buckets.py         # Bucket endpoints
│   ├── files.py           # File endpoints
│   └── health.py          # Health endpoints
├── middleware/
│   ├── __init__.py
│   ├── cors.py            # CORS configuration
│   ├── rate_limit.py      # Rate limiting
│   ├── security.py        # Security headers
│   ├── logging.py         # Request logging
│   └── error_handlers.py  # Exception handlers
├── utils/
│   ├── __init__.py
│   └── validators.py      # Validation utilities
├── tests/
│   ├── __init__.py
│   ├── conftest.py        # Test fixtures
│   ├── test_s3_service.py
│   ├── test_buckets.py
│   ├── test_files.py
│   └── test_middleware.py
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
├── requirements.txt       # Production dependencies
├── requirements-dev.txt   # Development dependencies
├── pyproject.toml        # Python project config
├── Makefile              # Development commands
└── README.md             # This file
```

## Migration from Fastify

This FastAPI backend is a drop-in replacement for the original Fastify implementation:

### API Compatibility

- **100% compatible** with existing frontend (no changes required)
- All endpoints maintain the same paths and request/response formats
- Same port (3001) and CORS configuration

### Key Differences

| Feature | Fastify (Node.js) | FastAPI (Python) |
|---------|------------------|------------------|
| Language | JavaScript | Python 3.11+ |
| Framework | Fastify 4.x | FastAPI 0.109+ |
| AWS SDK | @aws-sdk/client-s3 | boto3 |
| Validation | Joi | Pydantic |
| Rate Limiting | @fastify/rate-limit | SlowAPI |
| Logging | Pino | Python logging |
| Type Safety | JSDoc/TypeScript | Type hints + Pydantic |
| Async | Native async/await | Native async/await |

### Performance

- Similar performance for I/O-bound operations (S3 API calls)
- Python's asyncio handles concurrent requests efficiently
- Uvicorn provides comparable performance to Fastify

### Migration Steps

1. **Stop the Fastify server**:
   ```bash
   # In the server/ directory
   npm stop
   ```

2. **Start the FastAPI server**:
   ```bash
   # In the server-py/ directory
   make dev
   ```

3. **Verify the frontend connects successfully**:
   - The React frontend should work without any modifications
   - Check browser console for any errors

4. **Run existing E2E tests**:
   ```bash
   # In the root directory
   npm run test:e2e
   ```

All tests should pass without modification!

### Rollback Procedure

If you need to rollback to the Fastify backend:

1. Stop the FastAPI server
2. Start the Fastify server:
   ```bash
   cd server
   npm run dev
   ```

## Environment Configuration

### Required Variables

- `AWS_S3_ACCESS_KEY` - AWS access key ID
- `AWS_S3_SECRET_KEY` - AWS secret access key

### Optional Variables

- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCOUNT_ID` - Required for access point management
- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 100MB)
- `ALLOWED_FILE_TYPES` - Comma-separated MIME types
- `PRESIGNED_URL_EXPIRY` - URL expiry in seconds (default: 3600)
- `RATE_LIMIT_PER_MINUTE` - Requests per minute (default: 500)
- `LOG_LEVEL` - Logging level (default: INFO)
- `LOG_FORMAT` - Log format: json or text (default: json)

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate AWS credentials regularly**
3. **Use IAM roles** with minimal permissions (principle of least privilege)
4. **Enable HTTPS** in production
5. **Configure CORS** carefully (avoid `*` in production)
6. **Monitor rate limits** and adjust based on usage
7. **Review logs** for suspicious activity

## Troubleshooting

### AWS Credentials Invalid

```
Error: AWS credentials not configured
```

**Solution**: Verify AWS credentials in `.env` file

### Port Already in Use

```
Error: Address already in use
```

**Solution**: Change port in `.env` or stop the conflicting process

### Import Errors

```
ModuleNotFoundError: No module named 'xxx'
```

**Solution**: Install dependencies with `pip install -r requirements.txt`

### CORS Errors

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution**: Verify `CORS_ORIGIN` in `.env` matches frontend URL

## Performance Tuning

### Production Deployment

```bash
# Use multiple workers
uvicorn main:app --host 0.0.0.0 --port 3001 --workers 4

# With Gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:3001
```

### Rate Limiting Adjustment

Adjust `RATE_LIMIT_PER_MINUTE` in `.env` based on your needs:
- **Low traffic**: 100-200 req/min
- **Medium traffic**: 500-1000 req/min
- **High traffic**: 1000+ req/min (consider Redis backend for SlowAPI)

## Contributing

1. Follow PEP 8 style guide
2. Use type hints for all functions
3. Add docstrings (Google style)
4. Write tests for new features
5. Run `make check` before committing
6. Keep dependencies up to date

## License

MIT

## Support

For issues and questions:
- Check existing issues in the repository
- Review API documentation at `/docs`
- Check AWS S3 documentation for bucket/file operations
