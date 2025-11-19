# @thinkeloquent/core-exceptions

Result<T,E> pattern and custom exception classes for consistent error handling in the MTA Framework v2.0.

## Features

- **Result<T,E> Pattern**: Functional error handling without throwing exceptions
- **Error Hierarchy**: Structured exception classes with categorization
- **Error Codes**: Numeric codes (1000-5999) for easy error identification
- **Type Safety**: Full TypeScript support with strict typing
- **JSON Serialization**: Structured error output for APIs

## Installation

```bash
pnpm install @thinkeloquent/core-exceptions
```

## Quick Start

```typescript
import { Result, Ok, Err, ValidationError } from '@thinkeloquent/core-exceptions';

function parseAge(input: string): Result<number, ValidationError> {
  const age = parseInt(input, 10);
  if (isNaN(age) || age < 0) {
    return Err(new ValidationError('Invalid age'));
  }
  return Ok(age);
}

const result = parseAge('25');
if (result.isOk()) {
  console.log(`Age: ${result.value}`);
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## Error Categories and Codes

- **Validation** (1000-1999): Input validation, schema errors
- **Business Rule** (2000-2999): Domain logic violations
- **Database** (3000-3999): Database operations
- **External Service** (4000-4999): Third-party API failures
- **System** (5000-5999): File system, configuration errors

## License

MIT
