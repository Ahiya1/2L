---
title: "Configuration Options Reference"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "intermediate"
prerequisites:
  - "Completed [TypeScript Setup](./setup.md)"
  - "Understanding of basic SDK patterns"
next_steps:
  - "Configure [Permissions](../concepts/permissions.md) for security"
  - "Set up [Hooks](../concepts/hooks.md) for monitoring"
  - "Connect [MCP Servers](../concepts/mcp.md) for extended capabilities"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - custom-tools.md
  - ../concepts/permissions.md
  - ../concepts/hooks.md
tags:
  - configuration
  - options
  - settings
  - parameters
---

# Configuration Options Reference

## Overview

This guide documents all configuration options available in the Claude Agent SDK for TypeScript. Options control model selection, behavior, permissions, tools, hooks, and more. Options can be set at initialization (for ClaudeSDKClient) or per-request (for query() and client.query()).

## When to Use

Reference this guide when you need to:
- **Configure model selection:** Choose between Claude models
- **Control behavior:** Temperature, max tokens, stop sequences
- **Set permissions:** Define what the agent can access
- **Register tools:** Add custom capabilities
- **Configure hooks:** Add event handlers
- **Optimize performance:** Token limits, timeouts

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)

## Options Interface

### Complete TypeScript Interface

```typescript
interface SDKOptions {
  // Authentication (required)
  apiKey: string;

  // Model selection
  model?: string;

  // Behavior control
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];

  // Tool configuration
  tools?: Tool[];

  // Permission configuration
  permissions?: PermissionConfig;

  // Hook configuration
  hooks?: HookConfig;

  // MCP configuration
  mcpServers?: MCPServerConfig[];
}
```

## Required Options

### apiKey (string, required)

Your Anthropic API key for authentication.

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

// Required: API key must be provided
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Alternative: Per-query
import { query } from '@anthropic-ai/agent-sdk';

const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Hello!',
});
```

**Best practices:**
- Never hardcode API keys in source code
- Use environment variables: `process.env.ANTHROPIC_API_KEY`
- Validate key exists before use
- Keep keys secure and rotate regularly

**Getting your API key:**
```bash
# Sign up at console.anthropic.com
# Generate API key in settings
export ANTHROPIC_API_KEY=your-key-here
```

## Model Selection

### model (string, optional)

Claude model to use for requests.

**Default:** `'claude-3-5-sonnet-20241022'` (most capable)

```typescript
// Use default model (Sonnet)
const client1 = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  // model not specified, uses default
});

// Use Haiku (fast, cost-effective)
const client2 = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-haiku-20240307',
});

// Use Opus (highest capability)
const client3 = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
});
```

**Available models:**

| Model | ID | Best For | Speed | Cost |
|-------|----|---------| ------|------|
| **Sonnet 3.5** | `claude-3-5-sonnet-20241022` | General use, balanced | Fast | $$ |
| **Haiku 3** | `claude-3-haiku-20240307` | High speed, low cost | Fastest | $ |
| **Opus 3** | `claude-3-opus-20240229` | Complex tasks, highest quality | Slower | $$$ |

**Model selection guide:**
```typescript
// Development/testing: Use Haiku (fast & cheap)
const devClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-haiku-20240307',
});

// Production: Use Sonnet (balanced)
const prodClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
});

// Complex reasoning: Use Opus (highest capability)
const complexClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
});
```

## Behavior Control

### temperature (number, optional)

Controls randomness and creativity in responses.

**Range:** 0.0 to 1.0
**Default:** 0.7

```typescript
// Deterministic, consistent responses (factual tasks)
const factualClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 0,
});

// Balanced creativity (default)
const balancedClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 0.7, // Default
});

// Maximum creativity (creative writing)
const creativeClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 1,
});
```

**Temperature guidelines:**

| Temperature | Use Case | Example |
|-------------|----------|---------|
| 0 | Deterministic | Math, facts, code |
| 0.3 | Mostly consistent | Documentation |
| 0.7 | Balanced (default) | General conversation |
| 1.0 | Maximum creativity | Creative writing |

```typescript
// Example: Temperature for different tasks
async function summarize(text: string) {
  return await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt: `Summarize: ${text}`,
    temperature: 0, // Consistent summaries
  });
}

async function writeStory(prompt: string) {
  return await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt: `Write a creative story: ${prompt}`,
    temperature: 1, // Maximum creativity
  });
}
```

### maxTokens (number, optional)

Maximum number of tokens in the response.

**Range:** 1 to model's maximum (varies by model)
**Default:** Model-specific default

```typescript
// Short responses
const briefClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 100,
});

// Standard responses
const standardClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 1024,
});

// Long-form content
const longFormClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 4096,
});
```

**Token estimation:**
- 1 token ≈ 4 characters of English text
- 1 token ≈ 0.75 words on average

```typescript
// Calculate max tokens for desired word count
function tokensForWords(wordCount: number): number {
  return Math.ceil(wordCount / 0.75);
}

// Example: 500-word response
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: tokensForWords(500), // ≈ 667 tokens
});
```

**Handle truncation:**
```typescript
const response = await client.query({
  prompt: 'Write a long essay...',
  maxTokens: 500,
});

if (response.stopReason === 'max_tokens') {
  console.warn('Response truncated. Consider increasing maxTokens.');
}
```

### stopSequences (string[], optional)

Sequences that stop generation when encountered.

**Default:** None

```typescript
// Stop at specific marker
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  stopSequences: ['END', '---'],
});

// Example: Generate code until marker
const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Write a Python function and add END when complete.',
  stopSequences: ['END'],
});

// Response stops when it generates 'END'
console.log(response.text);
// Won't include 'END' in output
```

**Common use cases:**
```typescript
// Stop at section markers
stopSequences: ['---', '###']

// Stop at code block end
stopSequences: ['```']

// Stop at custom markers
stopSequences: ['STOP', 'DONE', 'COMPLETE']
```

## Tool Configuration

### tools (Tool[], optional)

Array of custom tools to make available to the agent.

**Default:** None

```typescript
import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Define tools
const readFile = tool({
  name: 'read_file',
  description: 'Read a file',
  input_schema: z.object({ path: z.string() }),
  handler: async (input) => {
    return await fs.readFile(input.path, 'utf-8');
  },
});

const calculate = tool({
  name: 'calculate',
  description: 'Perform calculations',
  input_schema: z.object({ expression: z.string() }),
  handler: async (input) => {
    return String(eval(input.expression));
  },
});

// Register tools with client
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [readFile, calculate],
});

// Use tools
const response = await client.query({
  prompt: 'Calculate 15 * 7, then read data.txt',
});
```

**Tool configuration patterns:**
```typescript
// Conditional tools based on user permissions
function getToolsForUser(userRole: string): Tool[] {
  const baseTool = [readTool];

  if (userRole === 'admin') {
    return [...baseTools, writeTool, deleteTool];
  }

  return baseTools;
}

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: getToolsForUser('admin'),
});
```

See [Custom Tools Guide](./custom-tools.md) for complete documentation.

## Permission Configuration

### permissions (PermissionConfig, optional)

Configure what tools and operations the agent can perform.

**Default:** Restrictive defaults (read-only file access, no network)

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

// Minimal permissions (safest)
const restrictedClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'read',
    network: 'none',
  },
});

// Full permissions (development only!)
const developmentClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'readwrite',
    network: 'full',
    execute: 'allowed',
  },
});

// Balanced permissions (production)
const productionClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'read',
    network: 'allowed',
    execute: 'none',
  },
});
```

**Permission types:**

```typescript
interface PermissionConfig {
  filesystem?: 'none' | 'read' | 'readwrite';
  network?: 'none' | 'allowed' | 'full';
  execute?: 'none' | 'allowed';
}
```

**Permission levels:**

| Permission | Level | Description |
|------------|-------|-------------|
| `filesystem` | `'none'` | No file access |
| | `'read'` | Read files only |
| | `'readwrite'` | Read and write files |
| `network` | `'none'` | No network access |
| | `'allowed'` | HTTP/HTTPS requests |
| | `'full'` | All network operations |
| `execute` | `'none'` | No command execution |
| | `'allowed'` | Can execute commands |

**Security recommendations:**
```typescript
// Production: Minimal necessary permissions
const safeClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'read', // Only if needed
    network: 'allowed', // Only specific endpoints
    execute: 'none', // Never in production
  },
});
```

See [Permissions Concept](../concepts/permissions.md) for complete documentation.

## Hook Configuration

### hooks (HookConfig, optional)

Event handlers for tool execution lifecycle.

**Default:** None

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  hooks: {
    // Before tool execution
    preToolUse: async (toolName, input) => {
      console.log(`About to execute tool: ${toolName}`);
      console.log('Input:', input);

      // Can validate, log, or prevent execution
      // Return false to prevent execution
      return true;
    },

    // After tool execution
    postToolUse: async (toolName, input, output) => {
      console.log(`Tool ${toolName} completed`);
      console.log('Output:', output);

      // Can log, monitor, or transform output
      // Return output (modified or original)
      return output;
    },
  },
});
```

**Hook interface:**
```typescript
interface HookConfig {
  preToolUse?: (toolName: string, input: any) => Promise<boolean>;
  postToolUse?: (toolName: string, input: any, output: string) => Promise<string>;
}
```

**Common hook patterns:**

```typescript
// Authentication check
preToolUse: async (toolName, input) => {
  if (toolName === 'write_file' && !user.hasWritePermission()) {
    console.error('Permission denied');
    return false; // Prevent execution
  }
  return true;
}

// Rate limiting
const rateLimiter = new RateLimiter();
preToolUse: async (toolName) => {
  if (!rateLimiter.checkLimit(toolName)) {
    console.warn('Rate limit exceeded');
    return false;
  }
  return true;
}

// Audit logging
postToolUse: async (toolName, input, output) => {
  await auditLog.record({
    tool: toolName,
    input,
    output,
    timestamp: Date.now(),
  });
  return output;
}

// Output transformation
postToolUse: async (toolName, input, output) => {
  // Redact sensitive data
  const redacted = output.replace(/password=\w+/g, 'password=***');
  return redacted;
}
```

See [Hooks Concept](../concepts/hooks.md) for complete documentation.

## MCP Configuration

### mcpServers (MCPServerConfig[], optional)

Configure Model Context Protocol servers for extended capabilities.

**Default:** None

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  mcpServers: [
    {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path'],
    },
    {
      name: 'database',
      command: 'node',
      args: ['./mcp-servers/database.js'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
      },
    },
  ],
});
```

**MCP server configuration:**
```typescript
interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

**Built-in MCP servers:**
```typescript
// Filesystem server
{
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/data'],
}

// SQLite server
{
  name: 'sqlite',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-sqlite', './database.db'],
}

// GitHub server
{
  name: 'github',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  },
}
```

See [MCP Concept](../concepts/mcp.md) for complete documentation.

## Per-Request Options

Options can be overridden per-request for both `query()` and `client.query()`.

### With query()

```typescript
import { query } from '@anthropic-ai/agent-sdk';

// Base call
const response1 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Hello',
  model: 'claude-3-haiku-20240307',
  temperature: 0,
});

// Different options per call
const response2 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Be creative',
  model: 'claude-3-opus-20240229',
  temperature: 1,
});
```

### With ClaudeSDKClient

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

// Client has default options
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
});

// Use defaults
const response1 = await client.query({
  prompt: 'Standard query',
});

// Override per query
const response2 = await client.query({
  prompt: 'Creative query',
  temperature: 1, // Override default
  maxTokens: 2000, // Override default
});

// Defaults still apply to future queries
const response3 = await client.query({
  prompt: 'Another standard query',
  // Uses client defaults again
});
```

## Common Patterns

### Environment-Based Configuration

```typescript
/**
 * Configure based on environment
 */
const isDevelopment = process.env.NODE_ENV === 'development';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: isDevelopment
    ? 'claude-3-haiku-20240307' // Fast & cheap for dev
    : 'claude-3-5-sonnet-20241022', // Quality for prod
  temperature: isDevelopment ? 0 : 0.7,
  maxTokens: isDevelopment ? 500 : 2000,
  permissions: {
    filesystem: isDevelopment ? 'readwrite' : 'read',
    execute: isDevelopment ? 'allowed' : 'none',
  },
});
```

### Configuration Factory

```typescript
/**
 * Create configured clients for different use cases
 */
function createClient(profile: 'dev' | 'prod' | 'admin'): ClaudeSDKClient {
  const baseConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY!,
  };

  switch (profile) {
    case 'dev':
      return new ClaudeSDKClient({
        ...baseConfig,
        model: 'claude-3-haiku-20240307',
        temperature: 0,
        permissions: { filesystem: 'readwrite', execute: 'allowed' },
      });

    case 'prod':
      return new ClaudeSDKClient({
        ...baseConfig,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        permissions: { filesystem: 'read', execute: 'none' },
      });

    case 'admin':
      return new ClaudeSDKClient({
        ...baseConfig,
        model: 'claude-3-opus-20240229',
        tools: [...baseTools, ...adminTools],
        permissions: { filesystem: 'readwrite', execute: 'allowed' },
      });
  }
}

// Usage
const devClient = createClient('dev');
const prodClient = createClient('prod');
```

### Typed Configuration

```typescript
/**
 * Type-safe configuration management
 */
interface AppConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  permissions: PermissionConfig;
}

const config: AppConfig = {
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 2000,
  permissions: {
    filesystem: 'read',
    network: 'allowed',
    execute: 'none',
  },
};

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  ...config,
});
```

## Common Pitfalls

### Missing API Key

```typescript
// Wrong: No validation
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!, // Might be undefined!
});

// Correct: Validate first
function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY required');
  }
  return key;
}

const client = new ClaudeSDKClient({
  apiKey: getApiKey(),
});
```

### Incorrect Temperature Range

```typescript
// Wrong: Temperature out of range
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 2, // ✗ Must be 0-1
});

// Correct: Clamp to valid range
function clampTemperature(temp: number): number {
  return Math.max(0, Math.min(1, temp));
}

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: clampTemperature(temperature),
});
```

### Overly Permissive Permissions

```typescript
// Wrong: Too permissive in production
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'readwrite', // Risky!
    execute: 'allowed', // Very risky!
  },
});

// Correct: Minimal necessary permissions
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'read', // Only if needed
    execute: 'none', // Default to none
  },
});
```

## Troubleshooting

### Invalid model specified

**Cause:** Model ID incorrect or not available

**Solution:**
```typescript
const validModels = [
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
];

if (!validModels.includes(model)) {
  throw new Error(`Invalid model: ${model}`);
}
```

### Permission denied errors

**Cause:** Insufficient permissions for operation

**Solution:**
```typescript
// Check and adjust permissions
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  permissions: {
    filesystem: 'readwrite', // If writing files
    network: 'allowed', // If making API calls
  },
});
```

### Hook errors breaking execution

**Cause:** Unhandled exceptions in hooks

**Solution:**
```typescript
// Always handle errors in hooks
hooks: {
  preToolUse: async (toolName, input) => {
    try {
      // Hook logic
      return true;
    } catch (error) {
      console.error('Hook error:', error);
      return true; // Don't break execution
    }
  },
}
```

## Next Steps

1. **Explore permissions:** [Permissions Concept](../concepts/permissions.md)
2. **Learn hooks:** [Hooks Concept](../concepts/hooks.md)
3. **Review patterns:** [Query Pattern](./query-pattern.md) | [Client Pattern](./client-pattern.md)
4. **Build examples:** [Simple CLI Agent](../examples/simple-cli-agent.md) | [Multi-Tool Agent](../examples/multi-tool-agent.md)

## Related Documentation

**Core Concepts:**
- [Permissions](../concepts/permissions.md) - Security and access control
- [Hooks](../concepts/hooks.md) - Event handling
- [MCP](../concepts/mcp.md) - External server integration
- [Cost Tracking](../concepts/cost-tracking.md) - Token and cost monitoring

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Stateless usage
- [Client Pattern](./client-pattern.md) - Stateful usage
- [Custom Tools](./custom-tools.md) - Tool creation

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex configuration
