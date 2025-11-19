---
title: "Custom Tools in TypeScript"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "intermediate"
prerequisites:
  - "Completed [TypeScript Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)"
  - "Familiarity with Zod schema validation"
next_steps:
  - "Build [Multi-Tool Agent Example](../examples/multi-tool-agent.md)"
  - "Learn about [Hooks](../concepts/hooks.md) for tool lifecycle events"
  - "Explore [MCP Integration](../concepts/mcp.md) for external tools"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../concepts/tools.md
tags:
  - custom-tools
  - zod-schema
  - tool-creation
  - handlers
---

# Custom Tools in TypeScript

## Overview

Custom tools extend Claude's capabilities by giving it access to external functions, APIs, databases, and services. Tools are defined with Zod schemas for type-safe input validation and async handlers for execution. The Agent SDK handles tool discovery, validation, and execution automatically.

## When to Use

Create custom tools when you need Claude to:
- **Read/write files:** Access the filesystem
- **Call APIs:** Fetch data from external services
- **Query databases:** Read or write database records
- **Perform calculations:** Complex math, data processing
- **Execute commands:** Run system operations (with caution)
- **Access services:** Email, SMS, cloud services

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)
- Basic knowledge of Zod schema validation
- Familiarity with async/await patterns

## Basic Pattern

### Minimal Tool Example

```typescript
import { tool, query } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Define tool
const calculator = tool({
  name: 'calculate',
  description: 'Perform basic arithmetic operations',
  input_schema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  handler: async (input) => {
    switch (input.operation) {
      case 'add': return input.a + input.b;
      case 'subtract': return input.a - input.b;
      case 'multiply': return input.a * input.b;
      case 'divide': return input.a / input.b;
    }
  },
});

// Use tool with query
const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'What is 15 multiplied by 7?',
  tools: [calculator],
});

console.log(response.text);
// Output: "15 multiplied by 7 is 105."
```

### File Reading Tool

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';

const readFile = tool({
  name: 'read_file',
  description: 'Read contents of a text file',
  input_schema: z.object({
    path: z.string().describe('File path to read'),
  }),
  handler: async (input) => {
    try {
      const content = await fs.readFile(input.path, 'utf-8');
      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
});
```

## Complete Example

```typescript
/**
 * Example: Weather information tool
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 * - axios@^1.6.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod axios
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import axios from 'axios';

// Weather tool definition
const getWeather = tool({
  name: 'get_weather',
  description: 'Get current weather information for a city. Returns temperature, conditions, and humidity.',
  input_schema: z.object({
    city: z.string().describe('City name (e.g., "San Francisco", "London")'),
    units: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature units'),
  }),
  handler: async (input) => {
    try {
      // Mock API call (replace with real weather API)
      const response = await axios.get(
        `https://api.weatherapi.com/v1/current.json`,
        {
          params: {
            key: process.env.WEATHER_API_KEY,
            q: input.city,
          },
        }
      );

      const data = response.data;
      const temp = input.units === 'fahrenheit'
        ? data.current.temp_f
        : data.current.temp_c;

      const unit = input.units === 'fahrenheit' ? 'F' : 'C';

      return JSON.stringify({
        city: input.city,
        temperature: `${temp}°${unit}`,
        conditions: data.current.condition.text,
        humidity: `${data.current.humidity}%`,
      });
    } catch (error) {
      return `Error fetching weather: ${error.message}`;
    }
  },
});

// Initialize client with weather tool
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [getWeather],
});

// Main execution
async function main() {
  try {
    const response = await client.query({
      prompt: 'What\'s the weather like in Tokyo? And how about Paris?',
    });

    console.log(response.text);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 * The agent will call the get_weather tool twice (once for Tokyo, once for Paris)
 * and provide a natural language response about the weather in both cities.
 *
 * Example: "In Tokyo, it's currently 22°C with partly cloudy skies and 65% humidity.
 * Paris is experiencing 18°C with light rain and 80% humidity."
 */
```

## Tool Definition

### Required Fields

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const myTool = tool({
  // Required: Unique identifier (snake_case recommended)
  name: 'my_tool_name',

  // Required: Clear description for Claude to understand when to use
  description: 'What this tool does and when to use it',

  // Required: Zod schema defining input structure
  input_schema: z.object({
    param1: z.string(),
    param2: z.number(),
  }),

  // Required: Async function that executes the tool
  handler: async (input) => {
    // input is type-safe based on input_schema
    return 'result as string';
  },
});
```

### Tool Naming Best Practices

```typescript
// Good: Descriptive, clear purpose
const readFile = tool({ name: 'read_file', /* ... */ });
const sendEmail = tool({ name: 'send_email', /* ... */ });
const queryDatabase = tool({ name: 'query_database', /* ... */ });

// Bad: Vague, unclear purpose
const doStuff = tool({ name: 'do_stuff', /* ... */ });
const helper = tool({ name: 'helper', /* ... */ });
const tool1 = tool({ name: 'tool1', /* ... */ });
```

### Description Best Practices

```typescript
// Good: Specific, actionable description
const goodTool = tool({
  name: 'calculate_distance',
  description: 'Calculate the distance between two geographic coordinates using the Haversine formula. Returns distance in kilometers.',
  /* ... */
});

// Bad: Vague description
const badTool = tool({
  name: 'calculate_distance',
  description: 'Does calculations', // Too vague!
  /* ... */
});

// Excellent: Includes when to use
const excellentTool = tool({
  name: 'search_products',
  description: 'Search for products in the inventory database. Use when the user asks about product availability, prices, or specifications. Supports fuzzy matching on product names.',
  /* ... */
});
```

## Input Schema with Zod

### Basic Types

```typescript
import { z } from 'zod';

// String
z.object({
  name: z.string(),
  email: z.string().email(), // Email validation
  url: z.string().url(), // URL validation
})

// Number
z.object({
  age: z.number(),
  price: z.number().positive(), // Must be > 0
  quantity: z.number().int(), // Integer only
})

// Boolean
z.object({
  active: z.boolean(),
})

// Enum
z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
})

// Optional fields
z.object({
  required: z.string(),
  optional: z.string().optional(),
})

// Default values
z.object({
  limit: z.number().default(10),
})

// Arrays
z.object({
  tags: z.array(z.string()),
  ids: z.array(z.number()),
})
```

### Complex Schemas

```typescript
import { z } from 'zod';
import { tool } from '@anthropic-ai/agent-sdk';

const complexTool = tool({
  name: 'create_user',
  description: 'Create a new user account',
  input_schema: z.object({
    // Required fields
    username: z.string().min(3).max(20),
    email: z.string().email(),

    // Optional with validation
    age: z.number().min(18).optional(),

    // Nested object
    address: z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string().regex(/^\d{5}$/),
    }).optional(),

    // Array of enums
    roles: z.array(z.enum(['admin', 'user', 'moderator'])),

    // Union types
    contactMethod: z.union([
      z.literal('email'),
      z.literal('sms'),
      z.literal('phone'),
    ]),
  }),
  handler: async (input) => {
    // input is fully type-safe
    console.log(input.username); // string
    console.log(input.age); // number | undefined
    console.log(input.address?.city); // string | undefined

    return 'User created';
  },
});
```

### Field Descriptions

```typescript
import { z } from 'zod';

// Add descriptions to help Claude understand parameters
const toolWithDescriptions = tool({
  name: 'search_products',
  description: 'Search for products in inventory',
  input_schema: z.object({
    query: z.string().describe(
      'Search query. Can be product name, SKU, or description.'
    ),
    category: z.string().optional().describe(
      'Filter by category. Examples: "electronics", "clothing", "books"'
    ),
    minPrice: z.number().optional().describe(
      'Minimum price in USD. Use to filter by price range.'
    ),
    maxPrice: z.number().optional().describe(
      'Maximum price in USD. Use to filter by price range.'
    ),
    inStock: z.boolean().default(true).describe(
      'Only show in-stock items. Set to false to include out-of-stock.'
    ),
  }),
  handler: async (input) => {
    // Implementation
    return JSON.stringify({ results: [] });
  },
});
```

## Tool Handlers

### Basic Handler Pattern

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const basicTool = tool({
  name: 'example',
  description: 'Example tool',
  input_schema: z.object({
    input: z.string(),
  }),
  handler: async (input) => {
    // 1. Input is type-safe (TypeScript knows the shape)
    const value = input.input; // string

    // 2. Perform operation (can be async)
    const result = await performOperation(value);

    // 3. Return string result
    return result;
  },
});
```

### Error Handling in Handlers

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';

const fileReader = tool({
  name: 'read_file',
  description: 'Read a text file',
  input_schema: z.object({
    path: z.string(),
  }),
  handler: async (input) => {
    try {
      // Attempt operation
      const content = await fs.readFile(input.path, 'utf-8');
      return content;

    } catch (error) {
      // Return error message (Claude will see it)
      if (error.code === 'ENOENT') {
        return `Error: File not found at path "${input.path}"`;
      }

      if (error.code === 'EACCES') {
        return `Error: Permission denied reading "${input.path}"`;
      }

      return `Error reading file: ${error.message}`;
    }
  },
});
```

### Returning Structured Data

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const databaseQuery = tool({
  name: 'query_users',
  description: 'Query user database',
  input_schema: z.object({
    role: z.string(),
  }),
  handler: async (input) => {
    // Fetch data
    const users = await database.query(
      'SELECT * FROM users WHERE role = ?',
      [input.role]
    );

    // Return as JSON string (Claude can parse it)
    return JSON.stringify({
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
      })),
    }, null, 2);
  },
});
```

### Async Operations

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import axios from 'axios';

const apiTool = tool({
  name: 'fetch_user_data',
  description: 'Fetch user data from API',
  input_schema: z.object({
    userId: z.string(),
  }),
  handler: async (input) => {
    // Async HTTP request
    const response = await axios.get(
      `https://api.example.com/users/${input.userId}`
    );

    // Multiple async operations
    const [profile, posts, friends] = await Promise.all([
      fetchProfile(input.userId),
      fetchPosts(input.userId),
      fetchFriends(input.userId),
    ]);

    return JSON.stringify({
      profile,
      postsCount: posts.length,
      friendsCount: friends.length,
    });
  },
});
```

## Multiple Tools

### Registering Multiple Tools

```typescript
import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Define multiple tools
const readFile = tool({
  name: 'read_file',
  description: 'Read file contents',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    return await fs.readFile(input.path, 'utf-8');
  },
});

const writeFile = tool({
  name: 'write_file',
  description: 'Write content to file',
  input_schema: z.object({
    path: z.string(),
    content: z.string(),
  }),
  handler: async (input) => {
    await fs.writeFile(input.path, input.content, 'utf-8');
    return `File written to ${input.path}`;
  },
});

const listFiles = tool({
  name: 'list_files',
  description: 'List files in directory',
  input_schema: z.object({ dir: z.string() }),
  handler: async (input) => {
    const files = await fs.readdir(input.dir);
    return JSON.stringify(files);
  },
});

// Register all tools with client
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [readFile, writeFile, listFiles],
});

// Claude can use any of these tools
const response = await client.query({
  prompt: 'List all files in /tmp, then read the first one.',
});
```

### Tool Organization

```typescript
/**
 * Organize tools by category
 */

// tools/file-tools.ts
export const fileTools = [
  tool({ name: 'read_file', /* ... */ }),
  tool({ name: 'write_file', /* ... */ }),
  tool({ name: 'list_files', /* ... */ }),
];

// tools/api-tools.ts
export const apiTools = [
  tool({ name: 'fetch_weather', /* ... */ }),
  tool({ name: 'search_web', /* ... */ }),
];

// tools/db-tools.ts
export const dbTools = [
  tool({ name: 'query_users', /* ... */ }),
  tool({ name: 'update_record', /* ... */ }),
];

// main.ts
import { fileTools } from './tools/file-tools';
import { apiTools } from './tools/api-tools';
import { dbTools } from './tools/db-tools';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [...fileTools, ...apiTools, ...dbTools],
});
```

## Advanced Patterns

### Tool with State

```typescript
/**
 * Tool that maintains internal state
 */
class Counter {
  private count = 0;

  increment() {
    this.count++;
    return this.count;
  }

  reset() {
    this.count = 0;
  }

  getTool() {
    return tool({
      name: 'counter',
      description: 'Increment a counter',
      input_schema: z.object({
        action: z.enum(['increment', 'reset', 'get']),
      }),
      handler: async (input) => {
        switch (input.action) {
          case 'increment':
            return `Count is now ${this.increment()}`;
          case 'reset':
            this.reset();
            return 'Counter reset to 0';
          case 'get':
            return `Current count: ${this.count}`;
        }
      },
    });
  }
}

// Usage
const counter = new Counter();
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [counter.getTool()],
});
```

### Tool Factory Pattern

```typescript
/**
 * Generate tools dynamically
 */
function createDatabaseTool(tableName: string) {
  return tool({
    name: `query_${tableName}`,
    description: `Query the ${tableName} table`,
    input_schema: z.object({
      filters: z.record(z.string()).optional(),
      limit: z.number().default(10),
    }),
    handler: async (input) => {
      const results = await database.query(tableName, input.filters, input.limit);
      return JSON.stringify(results);
    },
  });
}

// Create tools for multiple tables
const tools = ['users', 'products', 'orders'].map(createDatabaseTool);

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools,
});
```

### Conditional Tool Availability

```typescript
/**
 * Enable tools based on permissions or context
 */
function getToolsForUser(userRole: string) {
  const baseTools = [readFile, listFiles];

  if (userRole === 'admin') {
    // Admins get additional tools
    return [...baseTools, writeFile, deleteFile, execCommand];
  }

  return baseTools;
}

// Usage
const userRole = 'user'; // or 'admin'
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: getToolsForUser(userRole),
});
```

### Tool Chaining

```typescript
/**
 * Tools that call other tools
 */
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Low-level tools
const readFile = tool({
  name: 'read_file',
  description: 'Read file',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    return await fs.readFile(input.path, 'utf-8');
  },
});

const analyzeText = tool({
  name: 'analyze_text',
  description: 'Analyze text sentiment',
  input_schema: z.object({ text: z.string() }),
  handler: async (input) => {
    // Analyze sentiment
    return 'Positive'; // or 'Negative', 'Neutral'
  },
});

// High-level tool combining others
const analyzeFileContent = tool({
  name: 'analyze_file',
  description: 'Read and analyze file sentiment',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    // Use other tools internally
    const content = await readFile.handler({ path: input.path });
    const sentiment = await analyzeText.handler({ text: content });

    return `File at ${input.path} has ${sentiment} sentiment`;
  },
});
```

## Type Safety

### Inferred Types from Schema

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const myTool = tool({
  name: 'example',
  description: 'Example',
  input_schema: z.object({
    name: z.string(),
    age: z.number(),
    tags: z.array(z.string()),
  }),
  handler: async (input) => {
    // TypeScript knows the exact type:
    // input: { name: string; age: number; tags: string[] }

    console.log(input.name.toUpperCase()); // ✓ Valid
    console.log(input.age.toFixed(2)); // ✓ Valid
    console.log(input.tags.map(t => t.trim())); // ✓ Valid

    // console.log(input.invalid); // ✗ TypeScript error

    return 'Done';
  },
});
```

### Reusable Schemas

```typescript
import { z } from 'zod';

// Define reusable schemas
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
});

// Use in multiple tools
const createUserTool = tool({
  name: 'create_user',
  description: 'Create user',
  input_schema: z.object({
    user: UserSchema,
    address: AddressSchema.optional(),
  }),
  handler: async (input) => {
    // input.user is typed as User
    // input.address is typed as Address | undefined
    return 'User created';
  },
});
```

## Common Pitfalls

### Returning Non-String Values

```typescript
// Wrong: Returning object directly
const badTool = tool({
  name: 'bad_example',
  description: 'Bad',
  input_schema: z.object({}),
  handler: async () => {
    return { result: 'value' }; // ✗ Type error! Must return string
  },
});

// Correct: Return JSON string
const goodTool = tool({
  name: 'good_example',
  description: 'Good',
  input_schema: z.object({}),
  handler: async () => {
    return JSON.stringify({ result: 'value' }); // ✓ Correct
  },
});
```

### Forgetting Async

```typescript
// Wrong: Handler not async (if doing async work)
const badTool = tool({
  name: 'bad',
  description: 'Bad',
  input_schema: z.object({}),
  handler: (input) => {
    // If you call await here, TypeScript will error
    return 'result';
  },
});

// Correct: Always use async
const goodTool = tool({
  name: 'good',
  description: 'Good',
  input_schema: z.object({}),
  handler: async (input) => {
    // Can use await freely
    const result = await someAsyncOperation();
    return result;
  },
});
```

### Poor Error Handling

```typescript
// Wrong: Throwing errors crashes the agent
const badTool = tool({
  name: 'bad',
  description: 'Bad',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    const content = await fs.readFile(input.path, 'utf-8');
    // If file doesn't exist, error crashes everything!
    return content;
  },
});

// Correct: Catch and return error message
const goodTool = tool({
  name: 'good',
  description: 'Good',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    try {
      const content = await fs.readFile(input.path, 'utf-8');
      return content;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});
```

## Troubleshooting

### Tool not being called

**Cause:** Description unclear or tool name doesn't match usage

**Solution:**
```typescript
// Improve description and examples
const tool = tool({
  name: 'search_products',
  description: 'Search for products in inventory. Use when the user asks about product availability, prices, specs, or wants to find items. Examples: "find red shoes", "check if iPhone 15 is in stock", "what\'s the price of product X"',
  /* ... */
});
```

### Schema validation failures

**Cause:** Input doesn't match schema requirements

**Solution:**
```typescript
// Make schema more permissive or add better descriptions
input_schema: z.object({
  query: z.string().min(1).describe('Search query - required, at least 1 character'),
  limit: z.number().positive().int().default(10).describe('Max results to return'),
})
```

### Handler execution errors

**Cause:** Unhandled exceptions in handler

**Solution:**
```typescript
handler: async (input) => {
  try {
    // Operation
    return await performOperation(input);
  } catch (error) {
    // Always catch and return error message
    console.error('Tool error:', error);
    return `Error executing tool: ${error.message}`;
  }
}
```

## Next Steps

1. **Learn sessions:** [Sessions Concept](../concepts/sessions.md)
2. **Configure options:** [Options Reference](./options.md)
3. **Explore examples:** [Multi-Tool Agent](../examples/multi-tool-agent.md)
4. **Review patterns:** [Client Pattern](./client-pattern.md)

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Built-in vs custom tools
- [Permissions](../concepts/permissions.md) - Tool execution security

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Using tools with query()
- [Client Pattern](./client-pattern.md) - Using tools with client
- [Options Reference](./options.md) - Tool configuration options

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic tool usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex tool coordination
- [Web API Agent](../examples/web-api-agent.md) - API integration tools
