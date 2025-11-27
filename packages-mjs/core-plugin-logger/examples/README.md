# @thinkeloquent/core-plugin-logger Examples

This directory contains examples demonstrating how to use the `@thinkeloquent/core-plugin-logger` plugin.

## Running the Examples

Before running any examples, make sure to build the module:

```bash
pnpm run build
```

### Basic Usage

The basic usage example demonstrates the core functionality of the plugin logger:

```bash
npx tsx examples/basic-usage.ts
```

This example shows:
- Registering the plugin logger plugin
- Configuring output options (console, file, pretty print)
- Logging plugins when the server is ready
- Accessing the plugin log result

### Expected Output

When you run the basic usage example, you should see:
1. Plugin tree displayed in the console (pretty formatted)
2. Plugins written to `./examples/plugins.log`
3. Server startup confirmation with plugin count

## Configuration Options

The plugin logger supports the following configuration options:

```typescript
{
  enabled: true,              // Enable/disable plugin logging
  outputPath: './plugins.log', // Path to log file
  consoleOutput: true,         // Log to console
  fileOutput: true,            // Write to file
  prettyPrint: true,           // Format output
  includeTimestamp: true,      // Add timestamp to output
  outputMode: 'pretty',        // 'pretty', 'json', or 'both'
}
```

## Output Modes

### Pretty Mode (default)
Formatted text output to console and/or file:
```
================================================================================
Fastify Plugins
================================================================================
Generated at: 2025-01-22T10:30:00.000Z

└── root
    ├── example-plugin-1
    ├── example-plugin-2
    └── core-plugin-logger
================================================================================
```

### JSON Mode
Structured JSON output to fastify.log only:
```json
{
  "event": "plugins_registered",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "count": 3,
  "plugins": ["└── root", "    ├── example-plugin-1", ...]
}
```

### Both Mode
Both pretty output AND JSON logging combined.

## Additional Examples

You can create your own examples by:
1. Importing the plugin logger
2. Registering it with your desired configuration
3. Starting your Fastify server
4. Checking the console and/or log file for output

## Troubleshooting

If plugins are not being logged:
- Ensure the plugin is registered before `server.listen()`
- Check that `enabled: true` in the configuration
- Verify file permissions for the output path
- Check the Fastify logger configuration
