---
title: "Agent SDK Quickstart"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "beginner"
prerequisites:
  - "Read [Agent SDK Overview](./overview.md)"
  - "Node.js 18+ or Python 3.8+ installed"
next_steps:
  - "Explore [TypeScript Setup](./typescript/setup.md) for detailed configuration"
  - "Learn [Custom Tools](./typescript/custom-tools.md) to extend capabilities"
  - "See [Examples](./examples/simple-cli-agent.md) for complete implementations"
related_guides:
  - overview.md
  - typescript/setup.md
  - typescript/custom-tools.md
tags:
  - quickstart
  - getting-started
  - installation
  - first-agent
  - tutorial
---

# Agent SDK Quickstart

Get started with the Agent SDK in under 10 minutes. This guide walks you through installation, basic setup, and creating your first AI agent.

## Prerequisites

- **Node.js:** Version 18+ (check with `node --version`)
- **npm or yarn:** Package manager
- **Anthropic API key:** Get one from [console.anthropic.com](https://console.anthropic.com/)
- **Basic TypeScript knowledge:** Helpful but not required

## Installation

### Step 1: Create a New Project

```bash
mkdir my-first-agent
cd my-first-agent
npm init -y
```

### Step 2: Install Dependencies

```bash
npm install @anthropic-ai/agent-sdk zod
npm install -D typescript @types/node ts-node
```

**Dependencies explained:**
- `@anthropic-ai/agent-sdk` - Core Agent SDK
- `zod` - Schema validation for custom tools
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `ts-node` - Run TypeScript directly

### Step 3: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Step 4: Set Your API Key

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

**Get your API key:**
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new key

**Security note:** Never hardcode API keys in your code. Always use environment variables.

## Your First Agent (Simple Query)

Create `src/simple-query.ts`:

```typescript
/**
 * Example: Simple query to Claude
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { query } from '@anthropic-ai/agent-sdk';

async function main() {
  try {
    const response = await query({
      apiKey: process.env.ANTHROPIC_API_KEY,
      prompt: 'What are the three most important principles of software design?',
    });

    console.log('Claude says:');
    console.log(response.text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

**Run it:**
```bash
npx ts-node src/simple-query.ts
```

**Expected output:**
```
Claude says:
The three most important principles of software design are:
1. Separation of Concerns - Keep different functionality isolated
2. DRY (Don't Repeat Yourself) - Avoid code duplication
3. SOLID Principles - Single Responsibility, Open/Closed, etc.
```

## Adding a Custom Tool

Now let's make Claude more powerful by adding a custom tool. Create `src/agent-with-tool.ts`:

```typescript
/**
 * Example: Agent with file reading capability
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';

// Define a custom tool for reading files
const readFile = tool({
  name: 'read_file',
  description: 'Read the contents of a file from the filesystem',
  input_schema: z.object({
    path: z.string().describe('Path to the file to read'),
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

// Create client with the custom tool
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  tools: [readFile],
});

async function main() {
  try {
    // Create a sample file for testing
    await fs.writeFile('test.txt', 'Hello from Agent SDK!');

    // Ask Claude to read it
    const response = await client.query({
      prompt: 'Read the file test.txt and tell me what it says.',
    });

    console.log('Claude says:');
    console.log(response.text);

    // Cleanup
    await fs.unlink('test.txt');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();

/**
 * Expected output:
 * Claude will use the read_file tool to access test.txt
 * and report back: "The file contains: Hello from Agent SDK!"
 */
```

**Run it:**
```bash
npx ts-node src/agent-with-tool.ts
```

**What's happening:**
1. We define a `readFile` tool with Zod schema validation
2. The tool's `handler` function reads the file
3. We register the tool with `ClaudeSDKClient`
4. Claude automatically uses the tool when needed
5. The response includes the file's contents

## Multi-Turn Conversation

Create `src/chatbot.ts` for a simple interactive chatbot:

```typescript
/**
 * Example: Multi-turn conversation with memory
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';
import readline from 'readline';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat() {
  console.log('Chat with Claude (type "exit" to quit)\n');

  rl.on('line', async (input) => {
    if (input.trim().toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    try {
      const response = await client.query({ prompt: input });
      console.log(`\nClaude: ${response.text}\n`);
      rl.prompt();
    } catch (error) {
      console.error('Error:', error.message);
      rl.prompt();
    }
  });

  rl.prompt();
}

chat();

/**
 * Expected behavior:
 * You: My name is Alice
 * Claude: Nice to meet you, Alice!
 *
 * You: What's my name?
 * Claude: Your name is Alice.
 *
 * Claude remembers context from earlier in the conversation.
 */
```

**Run it:**
```bash
npx ts-node src/chatbot.ts
```

**Try this conversation:**
```
You: My name is Bob
Claude: Nice to meet you, Bob! How can I help you today?

You: What's my name?
Claude: Your name is Bob.
```

Notice how Claude remembers your name from earlier in the conversation!

## Understanding the Basics

### Query vs Client

**Use `query()` for:**
- Single-shot questions
- No conversation context needed
- Simple, stateless operations

**Use `ClaudeSDKClient` for:**
- Multi-turn conversations
- Need to remember context
- Complex workflows with state

See: [Query Pattern](./typescript/query-pattern.md) | [Client Pattern](./typescript/client-pattern.md)

### Custom Tools

Custom tools extend Claude's capabilities:

```typescript
const myTool = tool({
  name: 'tool_name',              // Unique identifier
  description: 'What it does',     // Helps Claude decide when to use it
  input_schema: z.object({         // Zod schema for input validation
    param: z.string(),
  }),
  handler: async (input) => {      // Your implementation
    // Do something with input.param
    return 'result';
  },
});
```

**Best practices:**
- Clear, descriptive names
- Detailed descriptions (helps Claude understand when to use)
- Comprehensive input schemas
- Robust error handling in handlers

See: [Custom Tools Guide](./typescript/custom-tools.md)

## Common Patterns

### Pattern 1: Environment Variables

Always use environment variables for API keys:

```typescript
// ✓ Good
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY not set');
}

// ✗ Bad - Never do this
const apiKey = 'sk-ant-api03-...';  // NEVER hardcode keys!
```

### Pattern 2: Error Handling

Always wrap SDK calls in try-catch:

```typescript
async function safeQuery(prompt: string) {
  try {
    const response = await client.query({ prompt });
    return response.text;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Query failed:', error.message);
    }
    throw error;
  }
}
```

### Pattern 3: Tool Registration

Register all tools when creating the client:

```typescript
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  tools: [
    readFileTool,
    writeFileTool,
    apiCallTool,
    calculatorTool,
  ],
});
```

## Next Steps

### Learn More Concepts

- **[Tools Overview](./concepts/tools.md)** - Built-in vs custom tools
- **[Permissions](./concepts/permissions.md)** - Control what agents can do
- **[Sessions](./concepts/sessions.md)** - State management strategies
- **[MCP](./concepts/mcp.md)** - Model Context Protocol integration

### Explore TypeScript Guides

- **[Setup Guide](./typescript/setup.md)** - Complete TypeScript configuration
- **[Query Pattern](./typescript/query-pattern.md)** - Stateless queries
- **[Client Pattern](./typescript/client-pattern.md)** - Stateful clients
- **[Custom Tools](./typescript/custom-tools.md)** - Advanced tool creation
- **[Streaming](./typescript/streaming.md)** - Real-time responses

### Try Complete Examples

- **[Simple CLI Agent](./examples/simple-cli-agent.md)** - Beginner (50 lines)
- **[Web API Agent](./examples/web-api-agent.md)** - Intermediate (100 lines)
- **[Stateful Chatbot](./examples/stateful-chatbot.md)** - Intermediate (150 lines)
- **[Multi-Tool Agent](./examples/multi-tool-agent.md)** - Advanced (200 lines)

### Advanced Features

Once comfortable with the basics:

- **Streaming responses** - Get output as it's generated
- **Permission systems** - Fine-grained security control
- **Hooks** - Intercept tool execution for logging/validation
- **Cost tracking** - Monitor token usage and costs
- **MCP servers** - Integrate with external tool providers

## Project Structure Recommendations

For larger projects, organize like this:

```
my-agent-project/
├── src/
│   ├── tools/           # Custom tool definitions
│   │   ├── filesystem.ts
│   │   ├── api.ts
│   │   └── index.ts
│   ├── client.ts        # SDK client setup
│   ├── config.ts        # Configuration
│   └── index.ts         # Main application
├── tests/
│   └── tools.test.ts    # Unit tests
├── tsconfig.json
├── package.json
└── .env                 # Environment variables (gitignored!)
```

**Always add to `.gitignore`:**
```
node_modules/
dist/
.env
*.log
```

## Troubleshooting

### "Cannot find module '@anthropic-ai/agent-sdk'"

**Solution:** Install the package
```bash
npm install @anthropic-ai/agent-sdk
```

### "API key not found"

**Solution:** Set the environment variable
```bash
export ANTHROPIC_API_KEY=your-key-here
```

### "Permission denied"

**Solution:** Check file/directory permissions or configure SDK permissions

See: [Troubleshooting Guide](./troubleshooting.md) for more issues

### TypeScript compilation errors

**Solution:** Ensure tsconfig.json has correct settings
```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "strict": true
  }
}
```

## Getting Help

- **Documentation:** Browse other guides in `~/.claude/docs/agent-sdk/`
- **Examples:** See complete working examples in `examples/`
- **Official Docs:** https://docs.anthropic.com/en/api/agent-sdk/
- **Troubleshooting:** See [Troubleshooting Guide](./troubleshooting.md)

## Summary

You've learned how to:
- ✅ Install and configure the Agent SDK
- ✅ Make simple queries to Claude
- ✅ Create custom tools
- ✅ Build multi-turn conversations
- ✅ Structure an agent project

**Ready to build more?** Explore the [examples directory](./examples/simple-cli-agent.md) for complete applications!

## Related Documentation

**Core Guides:**
- [Overview](./overview.md) - What is Agent SDK
- [Troubleshooting](./troubleshooting.md) - Common issues

**TypeScript:**
- [Setup Guide](./typescript/setup.md) - Complete setup
- [Query Pattern](./typescript/query-pattern.md) - Stateless usage
- [Custom Tools](./typescript/custom-tools.md) - Tool creation

**Concepts:**
- [Tools](./concepts/tools.md) - Tool system overview
- [Permissions](./concepts/permissions.md) - Security model
- [Sessions](./concepts/sessions.md) - State management

**Examples:**
- [Simple CLI Agent](./examples/simple-cli-agent.md) - Start here
- [Web API Agent](./examples/web-api-agent.md) - REST API example
- [Multi-Tool Agent](./examples/multi-tool-agent.md) - Complex agent
