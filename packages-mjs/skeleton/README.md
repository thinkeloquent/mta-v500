# @mta/skeleton

Fastify skeleton application with TypeScript, hot-reload for development, and production build support.

## Features

- **Fastify** - Fast and low overhead web framework
- **TypeScript** - Type-safe development
- **Hot Reload** - Automatic restart on file changes using `tsx watch`
- **Production Build** - Compiled TypeScript for production deployment
- **Structured Logging** - Pretty logs via pino-pretty

## Quick Start

### Install Dependencies

From the workspace root:
```bash
npm install
```

Or from this package directory:
```bash
npm install
```

### Development

Run with hot-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000` and automatically restart when you make changes.

### Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

### Other Scripts

- `npm run clean` - Remove build artifacts
- `npm run type-check` - Run TypeScript type checking without building

## API Endpoints

- `GET /` - Hello World response
- `GET /health` - Health check endpoint

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

## Project Structure

```
skeleton/
├── src/
│   └── index.ts       # Main application entry point
├── dist/              # Compiled JavaScript (generated)
├── package.json       # Package configuration
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```
