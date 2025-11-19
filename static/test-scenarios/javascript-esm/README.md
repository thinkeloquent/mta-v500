# JavaScript ESM Test Scenarios

This directory contains test cases for native ES Modules (ESM) that can be loaded directly in modern browsers.

## Files

### Core Modules

- **math-utils.mjs** - Mathematical operations and utilities
  - Basic operations: add, subtract, multiply, divide
  - Constants: PI
  - Default export with all utilities

- **string-utils.mjs** - String manipulation utilities
  - capitalize, reverse, truncate, countWords
  - StringProcessor class for text processing

- **calculator.mjs** - Calculator class that imports from other modules
  - Demonstrates cross-module imports
  - History tracking
  - Circle area calculation

- **async-operations.mjs** - Asynchronous operations
  - Async/await examples
  - Dynamic imports
  - Sequential and parallel processing
  - AsyncQueue class

### Testing Framework

- **test-runner.mjs** - Lightweight test framework
  - TestRunner class
  - Assertion functions: assert, assertEquals, assertThrows

- **test-suite.mjs** - Complete test suite
  - Tests for all modules
  - Can be run programmatically or standalone

### Demo

- **index.html** - Interactive test interface
  - Visual test runner
  - Console output capture
  - Individual and full test suite execution

## Usage

### Running in Browser

1. Serve this directory with a local web server:
   ```bash
   npx http-server . -p 8080
   ```

2. Open http://localhost:8080 in your browser

3. Click buttons to run different test scenarios

### Module Import Examples

```javascript
// Named imports
import { add, subtract } from './math-utils.mjs';

// Default import
import mathUtils from './math-utils.mjs';

// Import all as namespace
import * as MathUtils from './math-utils.mjs';

// Dynamic import
const module = await import('./math-utils.mjs');

// Class import
import { Calculator } from './calculator.mjs';
```

## Features Demonstrated

1. **Named Exports/Imports** - Individual function exports
2. **Default Exports** - Single default export per module
3. **Cross-Module Imports** - Modules importing from other modules
4. **Dynamic Imports** - Runtime module loading
5. **Async/Await** - Asynchronous operations
6. **Classes** - ES6 class exports and usage
7. **Constants** - Exporting constant values

## Browser Requirements

- Modern browser with ES6+ module support
- Chrome 61+, Firefox 60+, Safari 11+, Edge 16+

## Notes

- All module files use the `.mjs` extension
- Files must be served over HTTP/HTTPS (not file://)
- CORS headers may be needed for cross-origin requests
- Module scripts are automatically in strict mode
- Modules are deferred by default
